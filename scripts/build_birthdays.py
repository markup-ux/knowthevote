"""Build birthdays.json for the homepage birthday card.

Current House members, senators, and the president and vice president come
from the congress-legislators files. The page keeps the file and shows the
people whose birthday matches the viewer's local date. A state page portrait
and link are used when that page already names the person.
"""
import json
import os
import re
import unicodedata
import urllib.request
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "birthdays.json")
EXECUTIVE_LOCAL = os.path.join(ROOT, "congress", "executive.json")
CURRENT_URL = "https://unitedstates.github.io/congress-legislators/legislators-current.json"
EXECUTIVE_URL = "https://unitedstates.github.io/congress-legislators/executive.json"
PORTRAIT = "https://unitedstates.github.io/images/congress/225x275/{bioguide}.jpg"
UA = "Leaders.vote/1.0 (https://leaders.vote; voter guide)"
ARTICLE = re.compile(r'<article id="([^"]+)" class="candidate\b[^>]*>(.*?)</article>', re.S)
H3 = re.compile(r"<h3[^>]*>([^<]+)</h3>")
IMG = re.compile(r'<img class="avatar" src="([^"]+)"')
INITIAL = re.compile(r"^[A-Za-z]\.?$")

STATES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "DC": "District of Columbia", "FL": "Florida", "GA": "Georgia", "HI": "Hawaii",
    "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
    "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine",
    "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota",
    "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska",
    "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico",
    "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio",
    "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island",
    "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas",
    "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington",
    "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
    "AS": "American Samoa", "GU": "Guam", "MP": "Northern Mariana Islands",
    "PR": "Puerto Rico", "VI": "U.S. Virgin Islands",
}
PARTY = {
    "Democrat": "Democratic",
    "Republican": "Republican",
    "Independent": "Independent",
}


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=90) as response:
        return json.loads(response.read().decode("utf-8"))


def fold(value):
    text = unicodedata.normalize("NFKD", value or "")
    text = "".join(char for char in text if not unicodedata.combining(char))
    return " ".join(re.sub(r"[^a-z0-9]+", " ", text.lower()).split())


def page_for(code):
    name = "illinois.html" if code == "IL" else (code or "").lower() + ".html"
    if code and os.path.isfile(os.path.join(ROOT, name)):
        return name
    return ""


def flag_for(code):
    name = "flags/%s.svg" % (code or "").lower()
    if code and os.path.isfile(os.path.join(ROOT, name)):
        return name
    if os.path.isfile(os.path.join(ROOT, "flags", "us.svg")):
        return "flags/us.svg"
    return ""


def public_name(name):
    official = (name.get("official_full") or "").strip()
    if official:
        kept = [part for part in official.split() if not INITIAL.match(part)]
        if kept:
            return " ".join(kept)
    first = (name.get("nickname") or name.get("first") or "").strip()
    last = (name.get("last") or "").strip()
    return (first + " " + last).strip()


def name_keys(name):
    keys = []
    for value in (
        name.get("official_full"),
        public_name(name),
        " ".join(part for part in [name.get("first"), name.get("last")] if part),
        " ".join(part for part in [name.get("nickname"), name.get("last")] if part),
    ):
        folded = fold(value)
        if folded and folded not in keys:
            keys.append(folded)
    return keys


def current_term(person, today):
    chosen = None
    for term in person.get("terms") or []:
        end = term.get("end") or ""
        if end and end < today.isoformat():
            continue
        chosen = term
    return chosen


def party_line(party, place):
    label = PARTY.get(party, party or "")
    if label and place:
        return label + " · " + place
    return label or place


def load_pages():
    found = {}
    for filename in os.listdir(ROOT):
        if not re.fullmatch(r"[a-z]{2}\.html|illinois\.html", filename):
            continue
        path = os.path.join(ROOT, filename)
        text = open(path, encoding="utf-8").read()
        rows = []
        for match in ARTICLE.finditer(text):
            body = match.group(2)
            title = H3.search(body)
            if not title:
                continue
            image = IMG.search(body)
            rows.append({
                "id": match.group(1),
                "name": title.group(1).strip(),
                "photo": image.group(1) if image else "",
                "href": filename + "#" + match.group(1),
            })
        found[filename] = rows
    return found


def match_page(pages, filename, keys, role, district):
    rows = []
    for key in keys:
        for row in pages.get(filename) or []:
            if fold(row["name"]) == key and row not in rows:
                rows.append(row)
    if not rows:
        return None
    if role == "house" and district:
        prefix = "district-%s-" % district
        for row in rows:
            if row["id"].startswith(prefix):
                return row
    if role == "senate":
        for row in rows:
            if row["id"].startswith("senate-"):
                return row
    for row in rows:
        if row["id"].startswith("district-") or row["id"].startswith("senate-"):
            return row
    return None


def local_executives():
    if not os.path.isfile(EXECUTIVE_LOCAL):
        return {}
    data = json.loads(open(EXECUTIVE_LOCAL, encoding="utf-8").read())
    found = {}
    for person in data.get("people") or []:
        if person.get("id"):
            found[person["id"]] = person
    return found


def executive_id(person):
    ids = person.get("id") or {}
    if ids.get("bioguide"):
        return ids["bioguide"]
    if ids.get("govtrack"):
        return "g" + str(ids["govtrack"])
    return ""


def add_person(people, seen, row):
    key = (row["date"], row["name"], row["role"], row.get("office") or "")
    if key in seen:
        return
    seen.add(key)
    people.append(row)


def main():
    today = date.today()
    current = fetch(CURRENT_URL)
    executive = fetch(EXECUTIVE_URL)
    pages = load_pages()
    local = local_executives()
    people = []
    seen = set()
    matched = 0

    for person in current:
        term = current_term(person, today)
        if not term:
            continue
        kind = term.get("type")
        if kind not in ("rep", "sen"):
            continue
        birthday = ((person.get("bio") or {}).get("birthday") or "")
        if len(birthday) < 10:
            continue
        name = person.get("name") or {}
        code = term.get("state") or ""
        role = "senate" if kind == "sen" else "house"
        district = term.get("district")
        filename = page_for(code)
        page = match_page(pages, filename, name_keys(name), role, district)
        if page:
            matched += 1
        bioguide = ((person.get("id") or {}).get("bioguide") or "")
        photo = (page or {}).get("photo") or (PORTRAIT.format(bioguide=bioguide) if bioguide else "")
        href = (page or {}).get("href") or filename or "house.html"
        office = "Senate" if role == "senate" else (
            "House district %s" % district if district else "House"
        )
        add_person(people, seen, {
            "date": birthday[5:10],
            "name": (page or {}).get("name") or public_name(name),
            "role": role,
            "partyLine": party_line(term.get("party"), STATES.get(code, code)),
            "office": office,
            "href": href,
            "photo": photo,
            "flag": flag_for(code),
        })

    for person in executive:
        term = current_term(person, today)
        if not term or term.get("type") not in ("prez", "viceprez"):
            continue
        birthday = ((person.get("bio") or {}).get("birthday") or "")
        if len(birthday) < 10:
            continue
        role = "president" if term.get("type") == "prez" else "vice"
        eid = executive_id(person)
        saved = local.get(eid) or {}
        label = saved.get("name") or public_name(person.get("name") or {})
        photo = saved.get("photo") or ""
        bioguide = ((person.get("id") or {}).get("bioguide") or "")
        if not photo and bioguide:
            photo = PORTRAIT.format(bioguide=bioguide)
        add_person(people, seen, {
            "date": birthday[5:10],
            "name": label,
            "role": role,
            "partyLine": party_line(term.get("party"), ""),
            "office": "President" if role == "president" else "Vice President",
            "href": "house.html#executive-" + eid if eid else "house.html#executive",
            "photo": photo,
            "flag": "flags/us.svg",
        })

    people.sort(key=lambda row: (row["date"], row["role"], row["name"]))
    payload = {
        "updated": today.isoformat(),
        "source": CURRENT_URL,
        "people": people,
    }
    text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    with open(OUT, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)
    today_key = today.strftime("%m-%d")
    today_names = [row["name"] for row in people if row["date"] == today_key]
    print("people", len(people), "matched", matched)
    print("today", today_key, ", ".join(today_names) or "none")


if __name__ == "__main__":
    main()
