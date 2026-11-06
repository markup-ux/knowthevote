"""Build census/crime.json from the FBI's estimated-crime file.

The page copies the offense counts and the population in that file.
A rate on the page is the count divided by that population, times 100,000.
The script does not fill a missing state.
"""
import json
import os
import re
import tempfile
import urllib.request
import xml.etree.ElementTree as ET
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "census", "crime.json")
CACHE = os.path.join(tempfile.gettempdir(), "leaders-vote-crime")
FILE_KEY = "additional-datasets/srs/estimated_crimes_1979_2025.csv"
SIGNED = "https://cde.ucr.cjis.gov/LATEST/s3/signedurl?key=" + FILE_KEY
UA = {"User-Agent": "Leaders.vote census build"}
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
YEAR = 2025
PRIOR = 2024
COLUMNS = {
    "A": "year",
    "B": "code",
    "C": "name",
    "D": "pop",
    "E": "violent",
    "F": "homicide",
    "H": "rape",
    "I": "robbery",
    "J": "assault",
    "K": "property",
    "L": "burglary",
    "M": "larceny",
    "N": "vehicle",
    "O": "caveat",
}
COUNTS = ("violent", "homicide", "rape", "robbery", "assault", "property", "burglary", "larceny", "vehicle")


def download():
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, "estimated_crimes_1979_2025.xlsx")
    if os.path.exists(path) and os.path.getsize(path) > 100000:
        return path
    req = urllib.request.Request(SIGNED, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as res:
        payload = json.loads(res.read().decode("utf-8"))
    url = payload[FILE_KEY]
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=180) as res, open(path, "wb") as out:
        while True:
            chunk = res.read(1024 * 256)
            if not chunk:
                break
            out.write(chunk)
    return path


def shared_strings(book):
    root = ET.fromstring(book.read("xl/sharedStrings.xml"))
    strings = []
    for item in root.findall("m:si", NS):
        strings.append("".join(node.text or "" for node in item.iter("{%s}t" % NS["m"])))
    return strings


def rows_of(path):
    with zipfile.ZipFile(path) as book:
        strings = shared_strings(book)
        root = ET.fromstring(book.read("xl/worksheets/sheet1.xml"))
    found = []
    for row in root.findall("m:sheetData/m:row", NS):
        record = {}
        for cell in row.findall("m:c", NS):
            ref = cell.get("r") or ""
            column = "".join(ch for ch in ref if ch.isalpha())
            key = COLUMNS.get(column)
            if not key:
                continue
            node = cell.find("m:v", NS)
            if node is None or node.text is None:
                continue
            if cell.get("t") == "s":
                record[key] = strings[int(node.text)]
            else:
                record[key] = int(node.text)
        if record.get("year") in (YEAR, PRIOR):
            found.append(record)
    return found


def clean_name(name):
    name = re.sub(r"\s+", " ", name or "").strip()
    return re.sub(r"\d+$", "", name).strip()


def clean_note(text):
    return re.sub(r"^\d+\s*", "", (text or "").strip())


def pack(record):
    packed = {"pop": record["pop"]}
    for key in COUNTS:
        if key not in record:
            raise SystemExit("missing %s for %s %s" % (key, record.get("year"), record.get("code")))
        packed[key] = record[key]
    parts = packed["homicide"] + packed["rape"] + packed["robbery"] + packed["assault"]
    property_parts = packed["burglary"] + packed["larceny"] + packed["vehicle"]
    if packed["violent"] != parts:
        raise SystemExit("violent parts %s %s" % (record.get("code"), record.get("year")))
    if packed["property"] != property_parts:
        raise SystemExit("property parts %s %s" % (record.get("code"), record.get("year")))
    return packed


def main():
    grouped = {YEAR: {}, PRIOR: {}}
    nation = {}
    for record in rows_of(download()):
        code = record.get("code")
        if not code:
            nation[record["year"]] = pack(record)
            continue
        grouped[record["year"]][code] = record
    if set(grouped[YEAR]) != set(grouped[PRIOR]):
        raise SystemExit("2024 and 2025 state lists differ")
    if len(grouped[YEAR]) != 51 or YEAR not in nation or PRIOR not in nation:
        raise SystemExit("expected the nation and 51 states")

    limited = ""
    for record in grouped[YEAR].values():
        note = clean_note(record.get("caveat"))
        if note.lower().startswith("limited data"):
            limited = note

    states = []
    for code, record in grouped[YEAR].items():
        note = clean_note(record.get("caveat"))
        name = clean_name(record.get("name"))
        if limited and name and name in limited:
            note = limited
        row = {
            "code": code,
            "name": name,
        }
        row.update(pack(record))
        row["prior"] = pack(grouped[PRIOR][code])
        if note:
            row["note"] = note
        states.append(row)
    states.sort(key=lambda row: row["name"])

    payload = {
        "year": YEAR,
        "prior": PRIOR,
        "file": "estimated_crimes_1979_2025",
        "modified": "August 2026",
        "nation": nation[YEAR],
        "nationPrior": nation[PRIOR],
        "states": states,
    }
    with open(OUT, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(payload, handle, separators=(",", ":"))
        handle.write("\n")
    noted = [row["code"] for row in states if row.get("note")]
    print("states", len(states), "notes", noted)
    print("nation violent", nation[YEAR]["violent"], "property", nation[YEAR]["property"])


if __name__ == "__main__":
    main()
