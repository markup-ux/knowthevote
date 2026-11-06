"""Build census/crime-cities.json from FBI Table 8 and the neighborhood list.

Table 8 is offenses known to law enforcement by city in 2025. A neighborhood
is drawn only when its OpenStreetMap city and state match a Table 8 city.
The rate is that city's count. It is not a count inside the neighborhood.
Four consolidated agencies are matched to the shorter city name OpenStreetMap
uses. The script does not invent a city that Table 8 omits.
"""
import io
import json
import os
import re
import tempfile
import urllib.request
import zipfile

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "census", "crime-cities.json")
HOODS = os.path.join(ROOT, "census", "neighborhoods.json")
CACHE = os.path.join(tempfile.gettempdir(), "leaders-vote-crime")
SIGNED = "https://cde.ucr.cjis.gov/LATEST/s3/signedurl?key="
UA = {"User-Agent": "Leaders.vote census build"}
KEY = "cius/2025/offenses-known-to-le-2025.zip"
SHEET = "CIUS_Table_8_Offenses_Known_to_Law_Enforcement_by_State_by_City_2025.xlsx"
FIELDS = ("violent", "homicide", "rape", "robbery", "assault", "property", "burglary", "larceny", "vehicle")
LIMITED = "Limited data for 2025 were available for Florida and North Dakota."
# Published Table 8 name -> the city name on the neighborhood list.
ALIASES = {
    ("north carolina", "charlotte-mecklenburg"): "charlotte",
    ("georgia", "athens-clarke county"): "athens",
    ("kentucky", "louisville metro"): "louisville",
    ("tennessee", "metropolitan nashville police department"): "nashville",
}


def norm(text):
    text = str(text or "").lower().replace(".", "").replace("'", "")
    text = re.sub(r"\d+$", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text.replace("saint ", "st ")


def signed(key):
    req = urllib.request.Request(SIGNED + key, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as res:
        return json.loads(res.read().decode("utf-8"))[key]


def workbook():
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, "offenses-known-to-le-2025.zip")
    if not (os.path.exists(path) and os.path.getsize(path) > 100000):
        url = signed(KEY)
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=180) as res, open(path, "wb") as out:
            out.write(res.read())
    with zipfile.ZipFile(path) as book:
        raw = book.read(SHEET)
    return openpyxl.load_workbook(io.BytesIO(raw), data_only=True).active


def cities_of(sheet):
    cities = []
    lookup = {}
    skipped = 0
    uneven = 0
    for row in sheet.iter_rows(min_row=5, values_only=True):
        state, city, pop = row[0], row[1], row[2]
        if not state or not city:
            continue
        if str(state).startswith("1 ") or str(state).startswith("2 "):
            break
        counts = row[3:12]
        if not isinstance(pop, (int, float)) or pop <= 0 or any(not isinstance(item, (int, float)) for item in counts):
            skipped += 1
            continue
        counts = [int(item) for item in counts]
        pop = int(pop)
        if counts[0] != counts[1] + counts[2] + counts[3] + counts[4]:
            uneven += 1
        if counts[5] != counts[6] + counts[7] + counts[8]:
            uneven += 1
        state_name = re.sub(r"\d+$", "", str(state)).strip()
        record = {"state": state_name, "city": str(city).strip(), "pop": pop, "counts": counts}
        if state_name in ("Florida", "North Dakota"):
            record["note"] = LIMITED
        index = len(cities)
        cities.append(record)
        key = (norm(state_name), norm(record["city"]))
        lookup[key] = index
        alias = ALIASES.get(key)
        if alias and (key[0], alias) not in lookup:
            lookup[(key[0], alias)] = index
    return cities, lookup, skipped, uneven


def main():
    cities, lookup, skipped, uneven = cities_of(workbook())
    areas = json.load(open(HOODS, encoding="utf-8"))["areas"]
    hoods = []
    for area in areas:
        index = lookup.get((norm(area.get("state")), norm(area.get("city"))))
        if index is None:
            continue
        hoods.append([
            area["name"],
            area["city"],
            area["state"],
            round(area["lon"], 4),
            round(area["lat"], 4),
            index,
        ])
    payload = {
        "year": 2025,
        "table": "Table 8",
        "fields": list(FIELDS),
        "areas": len(areas),
        "matched": len(hoods),
        "cities": cities,
        "hoods": hoods,
    }
    with open(OUT, "w", encoding="utf-8") as out:
        json.dump(payload, out, separators=(",", ":"))
    print("cities", len(cities), "skipped", skipped, "uneven", uneven, "hoods", len(hoods), "of", len(areas))


if __name__ == "__main__":
    main()
