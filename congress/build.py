"""Copy House roll calls and the latest floor list into congress/votes.json.

The House Clerk publishes one XML file per roll call. Congress.gov repeats
those roll calls as JSON and allows a browser to read them. The Senate
publishes its roll calls only on senate.gov, which does not offer them to
this script. Senator offices still come from the congress-legislators file.
"""

import json
import re
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timedelta
from html.parser import HTMLParser
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "votes.json"
SUMMARIES = ROOT / "summaries.json"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
TODAY = date(2026, 11, 6)

BILL_PATTERNS = [
    ("HJRES", re.compile(r"^H\s*J\s*RES\s+(\d+)")),
    ("HCONRES", re.compile(r"^H\s*CON\s*RES\s+(\d+)")),
    ("HRES", re.compile(r"^H\s*RES\s+(\d+)")),
    ("HR", re.compile(r"^H\s*R\s+(\d+)")),
    ("SJRES", re.compile(r"^S\s*J\s*RES\s+(\d+)")),
    ("SCONRES", re.compile(r"^S\s*CON\s*RES\s+(\d+)")),
    ("SRES", re.compile(r"^S\s*RES\s+(\d+)")),
    ("S", re.compile(r"^S\s+(\d+)")),
]
BILL_LABEL = {
    "HJRES": "H.J.Res.",
    "HCONRES": "H.Con.Res.",
    "HRES": "H.Res.",
    "HR": "H.R.",
    "SJRES": "S.J.Res.",
    "SCONRES": "S.Con.Res.",
    "SRES": "S.Res.",
    "S": "S.",
}
BILL_SLUG = {
    "HJRES": "house-joint-resolution",
    "HCONRES": "house-concurrent-resolution",
    "HRES": "house-resolution",
    "HR": "house-bill",
    "SJRES": "senate-joint-resolution",
    "SCONRES": "senate-concurrent-resolution",
    "SRES": "senate-resolution",
    "S": "senate-bill",
}
SUM_SLUG = {
    "HJRES": "hjres",
    "HCONRES": "hconres",
    "HRES": "hres",
    "HR": "hr",
    "SJRES": "sjres",
    "SCONRES": "sconres",
    "SRES": "sres",
    "S": "s",
}
PARTY = {
    "Democrat": "D",
    "Democratic": "D",
    "Republican": "R",
    "Independent": "I",
    "Libertarian": "L",
}


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=50) as response:
        return response.read()


def text_of(node, name):
    child = node.find(name) if node is not None else None
    if child is None or child.text is None:
        return ""
    return re.sub(r"\s+", " ", child.text).strip()


def bill_parts(raw):
    if not raw:
        return None
    cleaned = re.sub(r"[^A-Za-z0-9 ]", " ", raw.upper())
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    for kind, pattern in BILL_PATTERNS:
        match = pattern.match(cleaned)
        if match:
            return kind, match.group(1)
    return None


def bill_label(raw):
    parts = bill_parts(raw)
    if not parts:
        return re.sub(r"\s+", " ", raw or "").strip()
    kind, number = parts
    return BILL_LABEL[kind] + " " + number


def bill_url(raw, congress=119):
    parts = bill_parts(raw)
    if not parts:
        return ""
    kind, number = parts
    return "https://www.congress.gov/bill/%s/%s/%s" % (congress, BILL_SLUG[kind], number)


class SummaryText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.buf = []

    def flush(self):
        text = re.sub(r"\s+", " ", "".join(self.buf)).strip()
        self.buf = []
        if text:
            self.parts.append(text)

    def handle_starttag(self, tag, attrs):
        if tag in ("p", "li", "h1", "h2", "h3", "h4", "div"):
            self.flush()
        elif tag == "br":
            self.buf.append(" ")

    def handle_endtag(self, tag):
        if tag in ("p", "li", "h1", "h2", "h3", "h4", "div"):
            self.flush()

    def handle_data(self, data):
        self.buf.append(data)


def summary_paragraphs(raw, title):
    parser = SummaryText()
    parser.feed(raw or "")
    parser.close()
    parser.flush()
    title_key = re.sub(r"\s+", " ", title or "").strip().casefold()
    paragraphs = []
    for part in parser.parts:
        if title_key and part.casefold() == title_key:
            continue
        paragraphs.append(part)
    return paragraphs


def parse_billsum(body):
    root = ET.fromstring(body)
    item = root.find("item")
    title = text_of(item, "title") if item is not None else ""
    best = None
    best_key = ""
    for summary in root.findall(".//summary"):
        when = text_of(summary, "action-date")
        updated = summary.attrib.get("update-date") or ""
        key = when + " " + updated
        if best is None or key > best_key:
            best = summary
            best_key = key
    if best is None:
        return None
    paragraphs = summary_paragraphs(text_of(best, "summary-text"), title)
    if not paragraphs:
        return None
    return {
        "title": title,
        "asOf": text_of(best, "action-desc"),
        "date": text_of(best, "action-date"),
        "paragraphs": paragraphs,
    }


def fetch_summary(kind, number):
    slug = SUM_SLUG[kind]
    url = "https://www.govinfo.gov/bulkdata/BILLSUM/119/%s/BILLSUM-119%s%s.xml" % (slug, slug, number)
    try:
        body = fetch(url)
    except urllib.error.HTTPError as error:
        if error.code == 404:
            return None
        raise
    return parse_billsum(body)


def write_summaries(votes, floor):
    wanted = {}
    for source in list(votes) + list((floor or {}).get("items") or []):
        parts = bill_parts(source.get("legis"))
        if parts:
            wanted[parts] = True
    found = {}
    missing = 0
    keys = sorted(wanted)
    print("summaries", len(keys), flush=True)
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(fetch_summary, kind, number): (kind, number) for kind, number in keys}
        done = 0
        for future in as_completed(futures):
            kind, number = futures[future]
            done += 1
            try:
                parsed = future.result()
            except Exception as error:
                print("summary failed", kind, number, error, flush=True)
                parsed = None
            if parsed:
                found[kind + number] = parsed
            else:
                missing += 1
            if done % 40 == 0 or done == len(keys):
                print("summaries", done, "of", len(keys), "kept", len(found), flush=True)
    SUMMARIES.write_text(
        json.dumps(found, separators=(",", ":"), ensure_ascii=False, sort_keys=True),
        encoding="utf-8",
    )
    print("summaries kept", len(found), "missing", missing, "bytes", SUMMARIES.stat().st_size, flush=True)


def fetch_sponsor_body(kind, number):
    slug = SUM_SLUG[kind]
    url = "https://www.govinfo.gov/bulkdata/BILLSTATUS/119/%s/BILLSTATUS-119%s%s.xml" % (slug, slug, number)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=60) as response:
        chunks = []
        total = 0
        while total < 2000000:
            block = response.read(32768)
            if not block:
                break
            chunks.append(block)
            total += len(block)
            blob = b"".join(chunks)
            end = blob.find(b"</sponsors>")
            if end >= 0:
                return blob[: end + len(b"</sponsors>")]
        return b"".join(chunks)


def parse_sponsors(body):
    if body is None:
        return None
    text = body.decode("utf-8", "replace")
    match = re.search(r"<sponsors>(.*?)</sponsors>", text, re.S)
    if not match:
        return None
    inner = match.group(1).strip()
    if not inner:
        return []
    root = ET.fromstring("<sponsors>" + inner + "</sponsors>")
    people = []
    for item in root.findall("item"):
        bioguide = text_of(item, "bioguideId")
        if not bioguide:
            continue
        full = text_of(item, "fullName")
        name = (text_of(item, "firstName") + " " + text_of(item, "lastName")).strip() or full
        district_raw = text_of(item, "district")
        chamber = "senate" if full.startswith("Sen") else "house"
        people.append({
            "id": bioguide,
            "name": name,
            "party": party_code(text_of(item, "party")),
            "state": text_of(item, "state"),
            "district": int(district_raw) if chamber == "house" and district_raw.isdigit() else None,
            "chamber": chamber,
            "byRequest": text_of(item, "isByRequest").lower() in ("y", "true", "yes"),
            "phone": "",
            "office": "",
            "url": "",
            "contact": "",
            "current": False,
        })
    return people


def load_sponsor(kind, number):
    for _ in range(2):
        try:
            return parse_sponsors(fetch_sponsor_body(kind, number))
        except urllib.error.HTTPError as error:
            if error.code == 404:
                return None
        except Exception:
            pass
    return None


def historical_contacts(needed):
    if not needed:
        return {}
    raw = fetch("https://unitedstates.github.io/congress-legislators/legislators-historical.json")
    people = json.loads(raw)
    found = {}
    for person in people:
        bioguide = (person.get("id") or {}).get("bioguide") or ""
        if bioguide not in needed or bioguide in found:
            continue
        terms = person.get("terms") or []
        term = terms[-1] if terms else {}
        kind = term.get("type")
        name = (person.get("name") or {}).get("official_full") or ""
        district = term.get("district")
        found[bioguide] = {
            "name": name,
            "party": party_code(term.get("party") or ""),
            "state": term.get("state") or "",
            "district": district if kind == "rep" and district is not None else None,
            "chamber": "senate" if kind == "sen" else "house",
            "phone": term.get("phone") or "",
            "office": term.get("office") or term.get("address") or "",
            "url": term.get("url") or "",
            "contact": term.get("contact_form") or "",
        }
    return found


def apply_sponsor_contact(sponsor, row, past):
    source = None
    current = False
    if row and (row[6] or row[8] or row[9]):
        source = {
            "name": row[1],
            "party": row[2],
            "state": row[3],
            "district": row[4],
            "chamber": row[5],
            "phone": row[6],
            "office": row[7],
            "url": row[8],
            "contact": row[9],
        }
        current = True
    elif past:
        source = past
    elif row:
        source = {
            "name": row[1],
            "party": row[2],
            "state": row[3],
            "district": row[4],
            "chamber": row[5],
            "phone": row[6],
            "office": row[7],
            "url": row[8],
            "contact": row[9],
        }
    if not source:
        return
    if source.get("name"):
        sponsor["name"] = source["name"]
    for field in ("party", "state", "district", "chamber", "phone", "office", "url", "contact"):
        if source.get(field) not in (None, ""):
            sponsor[field] = source[field]
    sponsor["current"] = current


def write_sponsors(votes, floor, members):
    existing = {}
    if SUMMARIES.exists():
        existing = json.loads(SUMMARIES.read_text(encoding="utf-8"))
    wanted = {}
    for source in list(votes) + list((floor or {}).get("items") or []):
        parts = bill_parts(source.get("legis"))
        if parts:
            wanted[parts] = True
    keys = sorted(wanted)
    print("sponsors", len(keys), flush=True)
    loaded = {}
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(load_sponsor, kind, number): (kind, number) for kind, number in keys}
        done = 0
        for future in as_completed(futures):
            kind, number = futures[future]
            done += 1
            try:
                loaded[(kind, number)] = future.result()
            except Exception as error:
                print("sponsor failed", kind, number, error, flush=True)
                loaded[(kind, number)] = None
            if done % 40 == 0 or done == len(keys):
                named = sum(1 for value in loaded.values() if value)
                print("sponsors", done, "of", len(keys), "named", named, flush=True)
    by_id = {row[0]: row for row in members}
    needed = set()
    for people in loaded.values():
        if not people:
            continue
        for sponsor in people:
            row = by_id.get(sponsor["id"])
            if not row or not (row[6] or row[8] or row[9]):
                needed.add(sponsor["id"])
    print("historical contacts", len(needed), flush=True)
    past = historical_contacts(needed)
    named = 0
    for kind, number in keys:
        key = kind + number
        entry = existing.get(key) or {"title": "", "asOf": "", "date": "", "paragraphs": []}
        people = loaded.get((kind, number))
        entry["sponsors"] = people
        if people:
            named += 1
            for sponsor in people:
                apply_sponsor_contact(sponsor, by_id.get(sponsor["id"]), past.get(sponsor["id"]))
        existing[key] = entry
    SUMMARIES.write_text(
        json.dumps(existing, separators=(",", ":"), ensure_ascii=False, sort_keys=True),
        encoding="utf-8",
    )
    print("sponsors named", named, "bytes", SUMMARIES.stat().st_size, flush=True)


def pretty_date(iso):
    try:
        when = datetime.strptime((iso or "")[:10], "%Y-%m-%d")
    except ValueError:
        return iso or ""
    return when.strftime("%B") + " " + str(when.day) + ", " + str(when.year)


def fetch_status(kind, number):
    slug = SUM_SLUG[kind]
    url = "https://www.govinfo.gov/bulkdata/BILLSTATUS/119/%s/BILLSTATUS-119%s%s.xml" % (slug, slug, number)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=60) as response:
        chunks = []
        total = 0
        while total < 4000000:
            block = response.read(65536)
            if not block:
                break
            chunks.append(block)
            total += len(block)
        if total >= 4000000:
            return None
        return ET.fromstring(b"".join(chunks))


def load_status(kind, number):
    for _ in range(2):
        try:
            return fetch_status(kind, number)
        except urllib.error.HTTPError as error:
            if error.code == 404:
                return None
        except Exception:
            pass
    return None


def senate_line(bill):
    actions = bill.find("actions")
    if actions is None:
        return ""
    recorded = ""
    recorded_date = ""
    for item in actions.findall("item"):
        text = re.sub(r"\s+", " ", item.findtext("text") or "").strip()
        date = (item.findtext("actionDate") or "")[:10]
        low = text.lower()
        if "senate" in low and "unanimous consent" in low and ("passed" in low or "agreed" in low):
            return "The Senate passed this measure on %s, by unanimous consent. No senator cast a recorded yes or no." % pretty_date(date)
        if low.startswith("passed/agreed to in senate") or ("record vote number" in low and "senate" in low):
            recorded = text
            recorded_date = date
    if recorded:
        return "The Senate recorded this action on %s: %s" % (pretty_date(recorded_date), recorded)
    return ""


def official_title(bill):
    short = ""
    official = ""
    titles = bill.find("titles")
    if titles is None:
        return short, official
    for item in titles.findall("item"):
        title = re.sub(r"\s+", " ", item.findtext("title") or "").strip()
        kind = (item.findtext("titleType") or "").lower()
        if "short title" in kind and not short:
            short = title
        if kind.startswith("official title as introduced") and not official:
            official = title
    return short, official


def write_actions(votes, floor, members):
    existing = {}
    if SUMMARIES.exists():
        existing = json.loads(SUMMARIES.read_text(encoding="utf-8"))
    wanted = {}
    for source in list(votes) + list((floor or {}).get("items") or []):
        parts = bill_parts(source.get("legis"))
        if parts:
            wanted[parts] = True
    # H.R. 9694 is the second Epstein files bill. It has no House roll call yet.
    wanted[("HR", "9694")] = True
    voted = set()
    for vote in votes:
        parts = bill_parts(vote.get("legis"))
        if parts:
            voted.add(parts[0] + parts[1])
    on_floor = set()
    for item in (floor or {}).get("items") or []:
        parts = bill_parts(item.get("legis"))
        if parts:
            on_floor.add(parts[0] + parts[1])
    by_id = {row[0]: row for row in members}
    keys = sorted(wanted)
    print("actions", len(keys), flush=True)
    loaded = {}
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(load_status, kind, number): (kind, number) for kind, number in keys}
        done = 0
        for future in as_completed(futures):
            kind, number = futures[future]
            done += 1
            try:
                loaded[(kind, number)] = future.result()
            except Exception as error:
                print("action failed", kind, number, error, flush=True)
                loaded[(kind, number)] = None
            if done % 40 == 0 or done == len(keys):
                print("actions", done, "of", len(keys), flush=True)
    senate_count = 0
    for kind, number in keys:
        key = kind + number
        root = loaded.get((kind, number))
        entry = existing.get(key) or {"title": "", "asOf": "", "date": "", "paragraphs": []}
        if root is not None:
            bill = root.find("bill")
            if bill is not None:
                latest = bill.find("latestAction")
                if latest is not None:
                    status = re.sub(r"\s+", " ", latest.findtext("text") or "").strip()
                    if status:
                        entry["status"] = status
                        entry["statusDate"] = (latest.findtext("actionDate") or "")[:10]
                line = senate_line(bill)
                if line:
                    entry["senate"] = line
                    senate_count += 1
                elif "senate" in entry:
                    entry.pop("senate", None)
                if key not in voted:
                    short, official = official_title(bill)
                    if short and not entry.get("title"):
                        entry["title"] = short
                    if official and not entry.get("paragraphs"):
                        entry["paragraphs"] = [official]
                        entry["source"] = "title"
                    people = sponsors_from_element(bill.find("sponsors"))
                    if people:
                        for sponsor in people:
                            apply_sponsor_contact(sponsor, by_id.get(sponsor["id"]), None)
                        entry["sponsors"] = people
                    entry["legis"] = bill_label(kind + " " + number)
                    entry["bill"] = bill_url(entry["legis"])
                    # A floor item is already on the floor list. Listing it again under the search moves the page.
                    if key in on_floor:
                        entry.pop("pending", None)
                    else:
                        entry["pending"] = True
                else:
                    entry.pop("pending", None)
        existing[key] = entry
    SUMMARIES.write_text(
        json.dumps(existing, separators=(",", ":"), ensure_ascii=False, sort_keys=True),
        encoding="utf-8",
    )
    print("senate notes", senate_count, "bytes", SUMMARIES.stat().st_size, flush=True)


def sponsors_from_element(node):
    if node is None:
        return []
    return parse_sponsors(ET.tostring(node, encoding="utf-8")) or []


def parse_clerk_date(raw):
    raw = (raw or "").strip()
    for fmt in ("%d-%b-%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(raw, fmt).date().isoformat()
        except ValueError:
            pass
    return raw


def vote_code(raw):
    word = re.sub(r"\s+", " ", (raw or "").strip().lower())
    if word in ("aye", "yea", "yes"):
        return "Y"
    if word in ("no", "nay"):
        return "N"
    if word.startswith("present"):
        return "P"
    if word in ("not voting", "absent"):
        return "X"
    return "?"


def party_code(raw):
    raw = (raw or "").strip()
    if raw in ("D", "R", "I", "L"):
        return raw
    return PARTY.get(raw, (raw[:1] or "O").upper())


def load_members():
    raw = fetch("https://unitedstates.github.io/congress-legislators/legislators-current.json")
    people = json.loads(raw)
    members = []
    for person in people:
        terms = person.get("terms") or []
        if not terms:
            continue
        term = terms[-1]
        kind = term.get("type")
        if kind not in ("rep", "sen"):
            continue
        roles = []
        for role in person.get("leadership_roles") or []:
            end = role.get("end") or "9999-12-31"
            if end >= TODAY.isoformat():
                title = (role.get("title") or "").strip()
                if title:
                    roles.append(title)
        bioguide = (person.get("id") or {}).get("bioguide") or ""
        if not bioguide:
            continue
        name = (person.get("name") or {}).get("official_full") or ""
        if not name:
            first = (person.get("name") or {}).get("first") or ""
            last = (person.get("name") or {}).get("last") or ""
            name = (first + " " + last).strip()
        district = term.get("district")
        members.append({
            "id": bioguide,
            "name": name,
            "party": party_code(term.get("party") or ""),
            "state": term.get("state") or "",
            "district": district if kind == "rep" and district is not None else None,
            "chamber": "house" if kind == "rep" else "senate",
            "phone": term.get("phone") or "",
            "office": term.get("office") or term.get("address") or "",
            "url": term.get("url") or "",
            "contact": term.get("contact_form") or "",
            "leadership": "; ".join(roles),
            "rank": term.get("state_rank") or "",
            "senateClass": term.get("class") if kind == "sen" else None,
        })
    return members


def roll_exists(year, number):
    url = "https://clerk.house.gov/evs/%s/roll%03d.xml" % (year, number)
    for _ in range(2):
        try:
            body = fetch(url)
        except Exception:
            body = None
        if body is not None and body.lstrip().startswith(b"<?xml"):
            return body
    return None


def parse_roll(year, number, body):
    root = ET.fromstring(body)
    meta = root.find("vote-metadata")
    totals = meta.find("vote-totals/totals-by-vote") if meta is not None else None
    parties = {}
    if meta is not None:
        for party in meta.findall("vote-totals/totals-by-party"):
            code = party_code(text_of(party, "party"))
            parties[code] = [
                int(text_of(party, "yea-total") or "0"),
                int(text_of(party, "nay-total") or "0"),
                int(text_of(party, "present-total") or "0"),
                int(text_of(party, "not-voting-total") or "0"),
            ]
    cast = {}
    other = {}
    seen = {}
    for recorded in root.findall("vote-data/recorded-vote"):
        person = recorded.find("legislator")
        if person is None:
            continue
        bioguide = person.attrib.get("name-id") or ""
        if not bioguide:
            continue
        code = vote_code(text_of(recorded, "vote"))
        cast[bioguide] = code
        if code == "?":
            other[bioguide] = text_of(recorded, "vote")
        seen[bioguide] = {
            "name": (person.attrib.get("unaccented-name") or person.attrib.get("sort-field") or "").strip(),
            "party": party_code(person.attrib.get("party") or ""),
            "state": person.attrib.get("state") or "",
        }
    session_raw = text_of(meta, "session") if meta is not None else ""
    session_digits = re.sub(r"\D", "", session_raw)
    legis = text_of(meta, "legis-num") if meta is not None else ""
    vote = {
        "id": "h-%s-%s" % (year, number),
        "chamber": "house",
        "year": year,
        "session": int(session_digits) if session_digits else None,
        "n": number,
        "date": parse_clerk_date(text_of(meta, "action-date") if meta is not None else ""),
        "time": (meta.find("action-time").attrib.get("time-etz") if meta is not None and meta.find("action-time") is not None else ""),
        "question": text_of(meta, "vote-question") if meta is not None else "",
        "desc": text_of(meta, "vote-desc") if meta is not None else "",
        "legis": bill_label(legis),
        "bill": bill_url(legis),
        "result": text_of(meta, "vote-result") if meta is not None else "",
        "type": text_of(meta, "vote-type") if meta is not None else "",
        "majority": party_code(text_of(meta, "majority") if meta is not None else ""),
        "yea": int(text_of(totals, "yea-total") or "0") if totals is not None else 0,
        "nay": int(text_of(totals, "nay-total") or "0") if totals is not None else 0,
        "present": int(text_of(totals, "present-total") or "0") if totals is not None else 0,
        "notVoting": int(text_of(totals, "not-voting-total") or "0") if totals is not None else 0,
        "parties": parties,
        "cast": cast,
        "source": "https://clerk.house.gov/evs/%s/roll%03d.xml" % (year, number),
    }
    if other:
        vote["other"] = other
    return vote, seen


def download_year(year):
    # Roll numbers can skip. Keep reading until several numbers in a row are missing.
    bodies = {}
    number = 1
    misses = 0
    while number < 2000 and misses < 12:
        batch = list(range(number, number + 20))
        found_in_batch = False
        with ThreadPoolExecutor(max_workers=8) as pool:
            futures = {pool.submit(roll_exists, year, item): item for item in batch}
            for future in as_completed(futures):
                item = futures[future]
                body = future.result()
                if body is not None:
                    bodies[item] = body
                    found_in_batch = True
        if found_in_batch:
            misses = 0
        else:
            misses += len(batch)
        number += 20
        print("scanning", year, "through", number - 1, "kept", len(bodies), flush=True)
    votes = []
    seen = {}
    for number in sorted(bodies):
        vote, people = parse_roll(year, number, bodies[number])
        votes.append(vote)
        seen.update(people)
    return votes, seen


def latest_floor_week():
    raw = fetch("https://docs.house.gov/BillsThisWeek-RSS.xml")
    text = raw.decode("utf-8", "replace")
    found = sorted(set(re.findall(r"billsthisweek/(\d{8})/", text)))
    # The feed lists old weeks. Keep the newest week that is still this Congress.
    found = [item for item in found if item >= "20250101"]
    if not found:
        return None
    return found[-1]


def load_floor(week_stamp):
    raw = fetch("https://docs.house.gov/floor/Download.aspx?file=/billsthisweek/%s/%s.xml" % (week_stamp, week_stamp))
    root = ET.fromstring(raw)
    items = []
    for category in root.findall("category"):
        label = category.attrib.get("type") or ""
        for item in category.findall("floor-items/floor-item"):
            if (item.attrib.get("remove-date") or "").strip():
                continue
            legis = text_of(item, "legis-num")
            title = text_of(item, "floor-text")
            if not legis and not title:
                continue
            items.append({
                "week": "%s-%s-%s" % (week_stamp[0:4], week_stamp[4:6], week_stamp[6:8]),
                "category": label,
                "legis": bill_label(legis),
                "bill": bill_url(legis),
                "title": title,
                "added": (item.attrib.get("add-date") or "")[:10],
            })
    return {
        "week": "%s-%s-%s" % (week_stamp[0:4], week_stamp[4:6], week_stamp[6:8]),
        "updated": root.attrib.get("update-date") or "",
        "source": "https://docs.house.gov/floor/",
        "items": items,
    }


def member_sort_key(member):
    district = member["district"] if member["district"] is not None else 0
    return (
        0 if member["chamber"] == "house" else 1,
        member["state"],
        district,
        member["name"],
    )


def main():
    print("members", flush=True)
    members = load_members()
    by_id = {member["id"]: member for member in members}
    votes = []
    for year in (2025, 2026):
        year_votes, seen = download_year(year)
        votes.extend(year_votes)
        for bioguide, person in seen.items():
            if bioguide not in by_id:
                by_id[bioguide] = {
                    "id": bioguide,
                    "name": person["name"] or bioguide,
                    "party": person["party"],
                    "state": person["state"],
                    "district": None,
                    "chamber": "house",
                    "phone": "",
                    "office": "",
                    "url": "",
                    "contact": "",
                    "leadership": "",
                    "rank": "",
                    "senateClass": None,
                }
    members = sorted(by_id.values(), key=member_sort_key)
    index = {member["id"]: position for position, member in enumerate(members)}
    for vote in votes:
        coded = ["-"] * len(members)
        for bioguide, code in vote["cast"].items():
            coded[index[bioguide]] = code
        vote["cast"] = "".join(coded)
    print("floor", flush=True)
    week = latest_floor_week()
    floor = load_floor(week) if week else {"week": "", "updated": "", "source": "", "items": []}
    payload = {
        "updated": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
        "congress": 119,
        "members": [
            [
                member["id"],
                member["name"],
                member["party"],
                member["state"],
                member["district"],
                member["chamber"],
                member["phone"],
                member["office"],
                member["url"],
                member["contact"],
                member["leadership"],
                member["rank"],
                member["senateClass"],
            ]
            for member in members
        ],
        "votes": votes,
        "floor": floor,
    }
    OUT.write_text(json.dumps(payload, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    dates = [vote["date"] for vote in votes if vote["date"]]
    print("votes", len(votes), "members", len(members), "floor", len(floor["items"]), "week", floor.get("week"))
    print("dates", min(dates) if dates else None, max(dates) if dates else None)
    print("bytes", OUT.stat().st_size)
    write_summaries(votes, floor)
    write_sponsors(votes, floor, payload["members"])
    write_actions(votes, floor, payload["members"])


if __name__ == "__main__":
    main()
