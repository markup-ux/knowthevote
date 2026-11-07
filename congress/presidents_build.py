"""Living presidents for the roster on The House page.

Names, parties, and terms come from the congress-legislators executive file,
the same project as the current member list. A president is left off when
Wikidata records a date of death on or before the date of this copy. A public-
domain portrait is saved when Wikimedia Commons has one.
"""
import json
import os
import re
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "congress", "presidents.json")
CHAT = os.path.join(ROOT, "chat", "messages.json")
PHOTO_DIR = os.path.join(ROOT, "photos", "presidents")
AS_OF = date.today()
EXECUTIVE_URLS = [
    "https://unitedstates.github.io/congress-legislators/executive.json",
    "https://raw.githubusercontent.com/unitedstates/congress-legislators/main/executive.json",
]
SPARQL = """
SELECT ?person ?personLabel ?alt ?death ?image ?site WHERE {
  ?person wdt:P39 wd:Q11696.
  OPTIONAL { ?person wdt:P570 ?death. }
  OPTIONAL { ?person wdt:P18 ?image. }
  OPTIONAL { ?person wdt:P856 ?site. }
  OPTIONAL { ?person skos:altLabel ?alt FILTER(LANG(?alt) = "en"). }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
"""
UA = "Leaders.vote/1.0 (https://leaders.vote; voter guide)"
MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def load_executive():
    last = None
    for url in EXECUTIVE_URLS:
        try:
            people = json.loads(fetch(url))
        except Exception as exc:
            last = exc
            print("executive", url, type(exc).__name__, flush=True)
            continue
        if isinstance(people, list) and people:
            print("executive", url, len(people), flush=True)
            return people
    raise SystemExit("executive file did not load: %s" % last)


def fold(value):
    return "".join(char for char in (value or "").lower() if char.isalnum())


def display_name(person):
    wiki = ((person.get("id") or {}).get("wikipedia") or "").strip()
    if wiki and "," not in wiki and "president" not in wiki.lower():
        return wiki
    name = person.get("name") or {}
    nickname = (name.get("nickname") or "").strip()
    last = (name.get("last") or "").strip()
    first = (name.get("first") or "").strip()
    if nickname and last:
        return nickname + " " + last
    return (first + " " + last).strip()


def name_keys(person):
    found = []
    ident = person.get("id") or {}
    name = person.get("name") or {}
    bits = [
        ident.get("wikipedia") or "",
        name.get("official_full") or "",
        " ".join(part for part in (name.get("nickname"), name.get("last")) if part),
        " ".join(part for part in (name.get("first"), name.get("last")) if part),
        " ".join(part for part in (name.get("first"), name.get("middle"), name.get("last")) if part),
    ]
    for bit in bits:
        token = fold(bit)
        if token and token not in found:
            found.append(token)
    return found


def parse_day(value):
    match = re.match(r"(\d{4})-(\d{2})-(\d{2})", value or "")
    if not match:
        return None
    try:
        return date(int(match.group(1)), int(match.group(2)), int(match.group(3)))
    except ValueError:
        return None


def wikidata():
    url = "https://query.wikidata.org/sparql?format=json&query=" + urllib.parse.quote(SPARQL)
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/sparql-results+json"})
    with urllib.request.urlopen(request, timeout=90) as response:
        payload = json.loads(response.read())
    people = {}
    for row in payload.get("results", {}).get("bindings", []):
        person = row.get("person", {}).get("value") or ""
        qid = person.rsplit("/", 1)[-1]
        if not qid.startswith("Q"):
            continue
        item = people.setdefault(qid, {"id": qid, "names": set(), "death": None, "image": "", "sites": []})
        for field in ("personLabel", "alt"):
            label = (row.get(field) or {}).get("value") or ""
            token = fold(label)
            if token and not token.startswith("q") and len(token) > 2:
                item["names"].add(token)
        death = parse_day((row.get("death") or {}).get("value") or "")
        if death and (item["death"] is None or death < item["death"]):
            item["death"] = death
        image = (row.get("image") or {}).get("value") or ""
        if image and not item["image"]:
            item["image"] = image
        site = (row.get("site") or {}).get("value") or ""
        if site.startswith("https://") and site not in item["sites"]:
            item["sites"].append(site)
    print("wikidata", len(people), flush=True)
    return people


def match_person(person, catalog):
    qid = ((person.get("id") or {}).get("wikidata") or "").strip()
    if qid and qid in catalog:
        return catalog[qid]
    keys = set(name_keys(person))
    hits = [item for item in catalog.values() if item["names"] & keys]
    if len(hits) == 1:
        return hits[0]
    return None


def party_code(raw):
    raw = (raw or "").lower()
    if raw.startswith("dem"):
        return "D"
    if raw.startswith("rep"):
        return "R"
    if raw.startswith("ind"):
        return "I"
    return "O"


def presidency_terms(people):
    rows = []
    for person in people:
        for term in person.get("terms") or []:
            if term.get("type") != "prez" or not term.get("start"):
                continue
            rows.append((term["start"], id(person), term.get("end") or ""))
    rows.sort()
    number = 0
    previous = None
    spans = {}
    for start, ident, end in rows:
        if ident != previous:
            number += 1
        previous = ident
        current = spans.setdefault(ident, {}).get(number)
        if not current:
            spans[ident][number] = {"number": number, "start": start, "end": end}
        else:
            if end and (not current["end"] or end > current["end"]):
                current["end"] = end
    return spans


def ordinal(number):
    if 10 <= number % 100 <= 20:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(number % 10, "th")
    return "%d%s" % (number, suffix)


def written(iso):
    day = parse_day(iso)
    if not day:
        return iso
    return "%s %d, %d" % (MONTHS[day.month - 1], day.day, day.year)


def service_line(service, current):
    bits = []
    for index, term in enumerate(service):
        number = ordinal(term["number"])
        if current and index == len(service) - 1:
            bits.append("%s President, in office since %s" % (number, written(term["start"])))
        else:
            bits.append("%s President, from %s to %s" % (number, written(term["start"]), written(term["end"])))
    if len(bits) == 1:
        return bits[0] + "."
    return bits[0] + ", and " + bits[1] + "."


def slug(name):
    token = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return token or "president"


def license_ok(info):
    meta = info.get("extmetadata") or {}
    name = ((meta.get("LicenseShortName") or {}).get("value") or "").lower()
    return "public domain" in name or name.startswith("pd") or name.startswith("cc0") or "cc-zero" in name


def save_portrait(name, image):
    if not image:
        return ""
    title = urllib.parse.unquote(image.rstrip("/").rsplit("/", 1)[-1])
    if title.lower().startswith("file:"):
        title = title[5:]
    query = urllib.parse.urlencode({
        "action": "query",
        "titles": "File:" + title,
        "prop": "imageinfo",
        "iiprop": "url|mime|extmetadata",
        "iiurlwidth": "450",
        "format": "json",
    })
    try:
        payload = json.loads(fetch("https://commons.wikimedia.org/w/api.php?" + query))
    except Exception as exc:
        print("portrait", name, type(exc).__name__, flush=True)
        return ""
    pages = (payload.get("query") or {}).get("pages") or {}
    info = None
    for page in pages.values():
        rows = page.get("imageinfo") or []
        if rows:
            info = rows[0]
            break
    if not info or not license_ok(info):
        print("portrait skipped", name, flush=True)
        return ""
    url = info.get("thumburl") or info.get("url") or ""
    if not url.startswith("https://"):
        return ""
    mime = info.get("mime") or ""
    ext = ".png" if "png" in mime else ".jpg"
    os.makedirs(PHOTO_DIR, exist_ok=True)
    rel = "photos/presidents/" + slug(name) + ext
    path = os.path.join(ROOT, rel.replace("/", os.sep))
    try:
        body = fetch(url)
    except Exception as exc:
        print("portrait download", name, type(exc).__name__, flush=True)
        return ""
    if len(body) < 800:
        return ""
    with open(path, "wb") as handle:
        handle.write(body)
    print("portrait", rel, len(body), flush=True)
    return rel


def gov_site(sites):
    for site in sites:
        host = urllib.parse.urlparse(site).netloc.lower()
        if host.endswith(".gov") and "whitehouse.gov" not in host:
            return site.split("?")[0]
    return ""


def living_presidents():
    executive = load_executive()
    catalog = wikidata()
    numbers = presidency_terms(executive)
    rows = []
    for person in executive:
        terms = [term for term in (person.get("terms") or []) if term.get("type") == "prez"]
        if not terms:
            continue
        name = display_name(person)
        record = match_person(person, catalog)
        if not record:
            print("unmatched", name, flush=True)
            continue
        if record["death"] and record["death"] <= AS_OF:
            print("died", name, record["death"].isoformat(), flush=True)
            continue
        ident = id(person)
        service = [numbers[ident][number] for number in sorted(numbers.get(ident) or {})]
        if not service:
            continue
        latest = max(terms, key=lambda term: term.get("start") or "")
        current = any(
            (parse_day(term.get("start")) or date.max) <= AS_OF
            and AS_OF <= (parse_day(term.get("end")) or date.max)
            for term in terms
        )
        bioguide = ((person.get("id") or {}).get("bioguide") or "").strip()
        stable = bioguide or ("g" + str((person.get("id") or {}).get("govtrack") or fold(name)))
        url = "https://www.whitehouse.gov/" if current else gov_site(record["sites"])
        rows.append({
            "id": stable,
            "bioguide": bioguide,
            "name": name,
            "party": party_code(latest.get("party") or ""),
            "current": current,
            "numbers": [term["number"] for term in service],
            "service": service,
            "line": service_line(service, current),
            "url": url,
            "photo": save_portrait(name, record["image"]),
        })
    rows.sort(key=lambda row: (not row["current"], -(row["numbers"][-1] if row["numbers"] else 0)))
    return rows


def sync_chat(people):
    try:
        data = json.load(open(CHAT, encoding="utf-8"))
    except (OSError, ValueError):
        print("chat roster skipped", flush=True)
        return
    party_code_map = {"D": "dem", "R": "gop"}
    party_label = {"D": "Democratic", "R": "Republican"}
    roster = []
    for person in people:
        code = person.get("party") or ""
        roster.append({
            "name": person["name"],
            "party": party_code_map.get(code, "other"),
            "partyLabel": party_label.get(code, "Another party"),
            "photo": person.get("photo") or "",
            "office": "President",
            "lines": [person["line"]] if person.get("line") else [],
            "source": person.get("url") or "",
        })
    states = [state for state in (data.get("states") or []) if state.get("code") != "US"]
    states.append({"code": "US", "name": "United States", "people": roster})
    states.sort(key=lambda state: state.get("name") or "")
    data["states"] = states
    text = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    with open(CHAT, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)
    print("chat roster", len(roster), flush=True)


def main():
    people = living_presidents()
    payload = {
        "updated": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "asOf": AS_OF.isoformat(),
        "sources": [
            EXECUTIVE_URLS[0],
            "https://query.wikidata.org/sparql",
        ],
        "people": people,
    }
    with open(OUT, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    sync_chat(people)
    print("presidents", len(people), flush=True)
    for person in people:
        print(person["name"], person["line"], person.get("photo") or "no photo", flush=True)


if __name__ == "__main__":
    main()
