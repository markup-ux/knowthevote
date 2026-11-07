"""Copy judicial nominations from the Senate Judiciary Committee.

A blue slip is the form that committee sends to the two senators of a
nominee's home state. For a district court, the chair does not hold a
hearing unless both senators return the slip. Congress does not publish
the slip itself. A hearing, a place on the Executive Calendar, or a
confirmation is the public sign that both district-court slips came back.
A circuit nomination can be heard without that return, so a circuit
hearing is not recorded here as a returned slip.
"""

import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "slips.json"


def write_if_changed(path, payload):
    text = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
    if path.exists():
        try:
            old = json.loads(path.read_text(encoding="utf-8"))
            fresh = json.loads(text)
        except (OSError, ValueError):
            old = None
        else:
            old.pop("updated", None)
            fresh.pop("updated", None)
            if old == fresh:
                print("unchanged", path.name, flush=True)
                return False
    path.write_text(text, encoding="utf-8")
    return True
SOURCE = "https://www.judiciary.senate.gov/nominations/judicial?keyword=Judge"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"

STATES = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
    "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA",
    "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
    "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
    "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS", "Missouri": "MO",
    "Montana": "MT", "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ",
    "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH",
    "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
    "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT",
    "Virginia": "VA", "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY",
    "District of Columbia": "DC", "the District of Columbia": "DC",
    "Puerto Rico": "PR", "Guam": "GU", "the Virgin Islands": "VI", "Virgin Islands": "VI",
    "the Northern Mariana Islands": "MP", "Northern Mariana Islands": "MP", "American Samoa": "AS",
}
SENATE = {code for code in STATES.values() if code not in {"DC", "PR", "GU", "VI", "MP", "AS"}}
COURT_STATE = re.compile(
    r"(?:Northern|Southern|Eastern|Western|Middle|Central) District of (.+)$"
    r"|District Court of (?:the )?(.+)$"
    r"|District of (.+)$"
)
MOVED = ("hearings held", "executive calendar", "confirmed by the senate", "ordered to be reported", "cloture")


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
    with urllib.request.urlopen(req, timeout=120) as response:
        return response.read().decode("utf-8", "replace")


def clean(text):
    return re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]+>", " ", text or ""))).strip()


def iso(mdy):
    match = re.match(r"(\d{1,2})/(\d{1,2})/(\d{4})", mdy or "")
    if not match:
        return ""
    month, day, year = match.groups()
    return "%s-%02d-%02d" % (year, int(month), int(day))


def state_code(name):
    text = re.sub(r"\s+", " ", name or "").strip(" .")
    return STATES.get(text, "")


def court_state(court):
    match = COURT_STATE.search(court or "")
    if not match:
        return ""
    name = next(part for part in match.groups() if part)
    name = re.split(r"\bfor\b|,", name, maxsplit=1)[0].strip()
    return state_code(name)


def kind_of(court):
    text = court or ""
    if "Circuit Judge" in text:
        return "circuit"
    if "International Trade" in text or "Federal Claims" in text or "Federal Circuit" in text or "Supreme Court" in text:
        return "national"
    if "Virgin Islands" in text or "Guam" in text or "Northern Mariana" in text or "Puerto Rico" in text:
        return "territory"
    if "District Judge" in text or "District Court" in text:
        return "district"
    return "other"


def items(html):
    rows = []
    for part in html.split("js-accordion-item")[1:]:
        when = re.search(r"Accordion__sectionOverline[^>]*>\s*([0-9/]+)", part)
        desc = re.search(r"Accordion__nominationHeader\">\s*<p>\s*(.*?)</p>", part, re.S)
        number = re.search(r'Nomination Number:</b>\s*<a[^>]*href="([^"]+)"[^>]*>\s*([^<]+)', part, re.S)
        received = re.search(r"Received Date:</b>\s*([^<]+)", part)
        action = re.search(r"Last Action:</b>\s*(.*?)</p>", part, re.S)
        if not desc or not number:
            continue
        rows.append({
            "desc": clean(desc.group(1)),
            "url": number.group(1).strip(),
            "pn": clean(number.group(2)),
            "received": clean(received.group(1) if received else ""),
            "action": clean(action.group(1) if action else ""),
            "when": clean(when.group(1) if when else ""),
        })
    return rows


def parse(row):
    desc = row["desc"]
    match = re.match(r"^(?P<name>.+), of (?P<home>[^,]+), to be (?P<court>.+?)(?:, vice .*)?$", desc)
    if not match:
        return None
    name = re.sub(r"\s+", " ", match.group("name")).strip()
    home = state_code(match.group("home"))
    court = match.group("court").strip().rstrip(".")
    kind = kind_of(court)
    seat = court_state(court) if kind in {"district", "territory"} else home
    if not seat:
        seat = home
    pn = row["pn"]
    citation = re.sub(r"-119$", "", pn)
    vote = re.search(r"Record Vote Number:\s*(\d+)", row["action"])
    action = row["action"].lower()
    moved = any(token in action for token in MOVED)
    if seat not in SENATE:
        slip = "none"
    elif kind == "circuit":
        slip = "note"
    elif kind == "district" and moved:
        slip = "back"
    elif kind == "district":
        slip = "out"
    else:
        slip = "none"
    return {
        "id": citation,
        "name": name,
        "state": seat,
        "home": home,
        "court": court,
        "kind": kind,
        "slip": slip,
        "received": iso(row["received"]),
        "date": iso(row["when"]),
        "action": row["action"],
        "vote": int(vote.group(1)) if vote else None,
        "url": row["url"],
    }


SUFFIX = re.compile(r",?\s+(Jr\.?|Sr\.?|II|III|IV)$", re.I)
FREE_LICENSE = ("public domain", "cc0", "cc-by", "cc by", "cc-by-sa", "cc by-sa", "pd", "gfdl")


def name_key(name):
    text = SUFFIX.sub("", (name or "").strip())
    parts = re.findall(r"[A-Za-z]+", text)
    if len(parts) < 2:
        return None
    first = parts[0].lower()
    if len(parts) >= 3 and parts[-2].lower() == "st":
        last = "st-john"
    else:
        last = parts[-1].lower()
    return first, last


def json_get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=90) as response:
        return json.loads(response.read().decode("utf-8"))


def wiki_get(url):
    for attempt in range(4):
        time.sleep(1.2)
        try:
            return json_get(url)
        except urllib.error.HTTPError as error:
            if error.code != 429 or attempt == 3:
                raise
            time.sleep(10 * (attempt + 1))
    return {}


def law_photos(names):
    rows = json_get("https://raw.githubusercontent.com/freelawproject/judge-pics/main/judge_pics/data/people.json")
    paths = [str(row.get("path") or "").lower() for row in rows if row.get("path")]
    photos = {}
    for name in names:
        key = name_key(name)
        if not key:
            continue
        first, last = key
        prefix = last + "-" + first
        hits = [path for path in paths if path == prefix or path.startswith(prefix + "-")]
        exact = [path for path in hits if path == prefix]
        if exact:
            hits = exact
        if len(hits) != 1:
            continue
        photos[name] = "https://portraits.free.law/v2/256/" + hits[0] + ".jpeg"
    return photos


def confirmed_judge_names(names):
    kept = set()
    tokens = ("judge", "nominat", "district court", "court of appeals")
    for name in names:
        query = urllib.parse.urlencode({
            "action": "query",
            "format": "json",
            "prop": "extracts|categories",
            "exchars": "1200",
            "explaintext": "1",
            "cllimit": "40",
            "redirects": "1",
            "titles": name,
        })
        body = wiki_get("https://en.wikipedia.org/w/api.php?" + query)
        pages = (body.get("query") or {}).get("pages") or {}
        page = next((item for item in pages.values() if item.get("pageid")), None)
        if not page:
            continue
        text = (page.get("extract") or "").lower()
        categories = " ".join(item.get("title") or "" for item in page.get("categories") or []).lower()
        if any(token in text or token in categories for token in tokens):
            kept.add(name)
    return kept


def wiki_photos(names):
    photos = {}
    files = {}
    for start in range(0, len(names), 40):
        chunk = names[start:start + 40]
        query = urllib.parse.urlencode({
            "action": "query",
            "format": "json",
            "prop": "pageimages",
            "piprop": "name|thumbnail",
            "pithumbsize": "330",
            "redirects": "1",
            "titles": "|".join(chunk),
        })
        body = wiki_get("https://en.wikipedia.org/w/api.php?" + query)
        pages = (body.get("query") or {}).get("pages") or {}
        for page in pages.values():
            thumb = (page.get("thumbnail") or {}).get("source")
            filename = page.get("pageimage")
            title = page.get("title") or ""
            if not thumb or not filename or title.startswith("File:"):
                continue
            files.setdefault(filename.replace("_", " "), []).append((title, thumb.split("?")[0]))
    if not files:
        return photos
    allowed = set()
    file_names = list(files)
    for start in range(0, len(file_names), 8):
        chunk = file_names[start:start + 8]
        query = urllib.parse.urlencode({
            "action": "query",
            "format": "json",
            "prop": "imageinfo",
            "iiprop": "extmetadata",
            "titles": "|".join("File:" + name for name in chunk),
        })
        body = wiki_get("https://en.wikipedia.org/w/api.php?" + query)
        for page in ((body.get("query") or {}).get("pages") or {}).values():
            info = (page.get("imageinfo") or [{}])[0]
            meta = (info.get("extmetadata") or {}).get("LicenseShortName") or {}
            license_name = str(meta.get("value") or "").lower()
            filename = (page.get("title") or "").replace("File:", "", 1).replace("_", " ")
            if any(token in license_name for token in FREE_LICENSE) and "non-free" not in license_name and "fair use" not in license_name:
                allowed.add(filename)
    by_title = {}
    for filename, pairs in files.items():
        if filename not in allowed:
            continue
        for title, thumb in pairs:
            by_title[title] = thumb
    redirects = {}
    # Titles in the first response are the resolved page titles. Match requested names through a second normalized lookup.
    for title, thumb in by_title.items():
        redirects[re.sub(r"[^a-z]", "", title.lower())] = thumb
    for name in names:
        flat = re.sub(r"[^a-z]", "", name.lower())
        if flat in redirects:
            photos[name] = redirects[flat]
            continue
        # "Lee Philip Rudofsky" can resolve to "Lee Rudofsky".
        parts = re.findall(r"[A-Za-z]+", SUFFIX.sub("", name))
        if len(parts) >= 2:
            short = re.sub(r"[^a-z]", "", (parts[0] + parts[-1]).lower())
            if short in redirects:
                photos[name] = redirects[short]
    judges = confirmed_judge_names([name for name in names if name in photos])
    return {name: url for name, url in photos.items() if name in judges}


def attach_photos(slips):
    names = []
    seen = set()
    for item in slips:
        if item["name"] not in seen:
            seen.add(item["name"])
            names.append(item["name"])
    photos = {}
    try:
        photos.update(wiki_photos(names))
    except Exception as error:
        print("wikipedia photos skipped", error)
    try:
        photos.update(law_photos(names))
    except Exception as error:
        print("judicial portraits skipped", error)
    for item in slips:
        photo = photos.get(item["name"])
        if photo:
            item["photo"] = photo
        else:
            item.pop("photo", None)
    print("portraits", len(photos), "of", len(names))


def main():
    html = fetch(SOURCE)
    parsed = []
    skipped = []
    seen = set()
    for row in items(html):
        if not (row["pn"].endswith("-119") or "/119th-congress/" in row["url"]):
            continue
        if not re.search(r"to be .*(Judge|Justice)", row["desc"]):
            continue
        item = parse(row)
        if not item:
            skipped.append(row["desc"])
            continue
        if item["id"] in seen:
            continue
        seen.add(item["id"])
        parsed.append(item)
    parsed.sort(key=lambda item: (item["date"], item["name"]), reverse=True)
    public = []
    for item in parsed:
        copy = dict(item)
        if copy["home"] == copy["state"]:
            del copy["home"]
        public.append(copy)
    attach_photos(public)
    payload = {
        "updated": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "source": "https://www.judiciary.senate.gov/nominations/judicial",
        "slips": public,
    }
    write_if_changed(OUT, payload)
    counts = {}
    for item in parsed:
        key = item["kind"] + ":" + item["slip"]
        counts[key] = counts.get(key, 0) + 1
    print("slips", len(public), "bytes", OUT.stat().st_size)
    print("counts", counts)
    print("skipped", len(skipped))
    for line in skipped:
        print(" SKIP", line[:180])
    mismatches = [item for item in parsed if item.get("home") and item["home"] != item["state"]]
    print("home differs", [(item["name"], item["home"], item["state"], item["kind"]) for item in mismatches])


if __name__ == "__main__":
    main()
