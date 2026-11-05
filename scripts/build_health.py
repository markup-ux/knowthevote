"""Build census/health.json from OpenStreetMap fast-food points and published distribution centers.

Restaurant coordinates come from OpenStreetMap. Distribution centers are the addresses
Martin Brower publishes. The file does not invent a delivery route or a harm score.
"""
import csv
import json
import os
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "census", "health.json")
CACHE = os.path.join(os.environ.get("TEMP", "/tmp"), "leaders-vote-health")
UA = "Leaders.vote health map (local build)"

# Addresses copied from https://www.martinbrower.us/contact-us
CENTERS = [
    ("Atlanta DC", "4261 Southmeadow East Parkway, East Point, Georgia 30349"),
    ("Baton Rouge DC", "15900 Industry Way, Walker, Louisiana 70785"),
    ("Chicago DC", "8901 W. 47th Street, McCook, Illinois 60525"),
    ("Cincinnati DC", "4260 Port Union Road, Fairfield, Ohio 45011"),
    ("City of Industry DC", "21489 Baker Parkway, City of Industry, California 91789"),
    ("Conroe DC", "890 South Trade Center Parkway, Conroe, Texas 77385"),
    ("DFW DC", "400 Patriot Parkway, Roanoke, Texas 76262"),
    ("Dickson DC", "195 Printwood Drive, Dickson, Tennessee 37055"),
    ("Fridley DC", "51-52nd Way N.E., Fridley, Minnesota 55421"),
    ("Garner DC", "1400 N. Greenfield Parkway, Garner, North Carolina 27529"),
    ("Harriman DC", "15 Commerce Drive South, Harriman, New York 10926"),
    ("Las Vegas DC", "498 E Bruner Ave, Henderson, Nevada 89044"),
    ("Lexington DC", "2588 Two Notch Road, Lexington, South Carolina 29072"),
    ("Manassas DC", "12501 Randolph Ridge Lane, Manassas, Virginia 20109"),
    ("Mason City DC", "2400 15th Street SW, Mason City, Iowa 50401"),
    ("New England DC", "191 Moody Road, Enfield, Connecticut 06082"),
    ("North Little Rock DC", "1302 Henderson Drive, North Little Rock, Arkansas 72114"),
    ("Orlando DC", "151 Martin-Brower Road, Orlando, Florida 32824"),
    ("Philadelphia DC", "14515 McNulty Road, Philadelphia, Pennsylvania 19154"),
    ("Phoenix DC", "5516 W. Buchanan Street, Phoenix, Arizona 85043"),
    ("Pompano DC", "1661 NW 12th Avenue, Pompano Beach, Florida 33069"),
    ("Portland DC", "9310 N. Harborgate Street, Portland, Oregon 97203"),
    ("Salt Lake City DC", "1790 South 5200 West, Salt Lake City, Utah 84104"),
    ("St. Johns DC", "1210 Zeeb Drive, St. Johns, Michigan 48820"),
    ("St. Louis DC", "720 W. McAllister Street, Lebanon, Illinois 62254"),
    ("Stockton DC", "4704 Fite Court, Stockton, California 95215"),
    ("Sumner DC", "1409 Puyallup Street, Sumner, Washington 98390"),
    ("Valley DC", "201 Waverly Boulevard, Coatesville, Pennsylvania 19320"),
    ("Whitewater DC", "729 Executive Drive, Whitewater, Wisconsin 53190"),
]

# Detection rates and medians printed in Edwards et al., J Expo Sci Environ Epidemiol, 2021.
# The public article reports foods, not a named-brand harm ranking.
CHEMICALS = [
    {
        "name": "DEHT",
        "full": "Di(2-ethylhexyl) terephthalate",
        "detected": 86,
        "of": "22 foods in the second round of sampling",
        "detail": "Median 2,510 \u00b5g/kg in the foods measured for it (n = 19). Median in burritos 6,000 \u00b5g/kg. Median in hamburgers 2,200 \u00b5g/kg. Not detected in fries.",
    },
    {
        "name": "DnBP",
        "full": "Di-n-butyl phthalate",
        "detected": 81,
        "of": "64 foods",
        "detail": "Detected in every hamburger in the study. A phthalate that U.S. rules have limited in some products.",
    },
    {
        "name": "DEHP",
        "full": "Di(2-ethylhexyl) phthalate",
        "detected": 70,
        "of": "64 foods",
        "detail": "Detected in every hamburger in the study. Median in hamburgers 36.0 \u00b5g/kg.",
    },
    {
        "name": "DEHA",
        "full": "Di(2-ethylhexyl) adipate",
        "detected": 41,
        "of": "64 foods",
        "detail": "Median 45.7 \u00b5g/kg in burritos and 6.7 \u00b5g/kg in hamburgers.",
    },
    {
        "name": "DEP",
        "full": "Diethyl phthalate",
        "detected": 39,
        "of": "64 foods",
        "detail": "Detected in 39 percent of the foods.",
    },
    {
        "name": "DiBP",
        "full": "Diisobutyl phthalate",
        "detected": 38,
        "of": "42 foods in the first round",
        "detail": "Measured only in the first round of sampling.",
    },
    {
        "name": "DiNP",
        "full": "Diisononyl phthalate",
        "detected": 29,
        "of": "42 foods in the first round",
        "detail": "Median 36 \u00b5g/kg in burritos and 5.9 \u00b5g/kg in cheese pizza.",
    },
    {
        "name": "BBzP",
        "full": "Butyl benzyl phthalate",
        "detected": 20,
        "of": "64 foods",
        "detail": "Detected in 20 percent of the foods.",
    },
    {
        "name": "DINCH",
        "full": "1,2-cyclohexane dicarboxylic acid diisononyl ester",
        "detected": 14,
        "of": "64 foods",
        "detail": "Median 7.1 \u00b5g/kg in five hamburgers. Also found in one pair of handling gloves.",
    },
    {
        "name": "DnOP",
        "full": "Di-n-octyl phthalate",
        "detected": 6,
        "of": "64 foods",
        "detail": "Detected in 6 percent of the foods.",
    },
    {
        "name": "DMP",
        "full": "Dimethyl phthalate",
        "detected": 0,
        "of": "64 foods",
        "detail": "Not detected in any food sample.",
    },
]


def post(url, data, timeout=240):
    req = urllib.request.Request(url, data=data, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return res.read()


def overpass():
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, "fast-food.csv")
    if os.path.exists(path) and os.path.getsize(path) > 10000:
        return path
    query = """
[out:csv(::lat, ::lon, brand)][timeout:180];
area["ISO3166-1"="US"][admin_level=2]->.us;
node["amenity"="fast_food"]["brand"](area.us);
out;
""".strip()
    servers = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
    ]
    last = None
    for server in servers:
        try:
            print("query", server)
            raw = post(server, query.encode("utf-8"))
            text = raw.decode("utf-8", "replace")
            if "error" in text[:200].lower() and not text.startswith("@lat"):
                print(text[:300])
                last = text[:200]
                continue
            with open(path, "w", encoding="utf-8", newline="") as handle:
                handle.write(text)
            print("saved", path, len(text))
            return path
        except Exception as exc:
            print(type(exc).__name__, exc)
            last = exc
    raise SystemExit("overpass failed: %s" % last)


def geocode_query(params):
    params = dict(params)
    params["format"] = "jsonv2"
    params["limit"] = "1"
    params["countrycodes"] = "us"
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=40) as res:
        rows = json.loads(res.read().decode("utf-8"))
    if not rows:
        return None
    return round(float(rows[0]["lon"]), 5), round(float(rows[0]["lat"]), 5)


def address_parts(address):
    bits = [part.strip() for part in address.split(",")]
    street = bits[0]
    city = bits[1] if len(bits) > 1 else ""
    state_zip = bits[2] if len(bits) > 2 else ""
    state_bits = state_zip.rsplit(" ", 1)
    state = state_bits[0]
    postal = state_bits[1] if len(state_bits) == 2 and state_bits[1].isdigit() else ""
    if not postal:
        state = state_zip
    return street, city, state, postal


def geocode(address):
    street, city, state, postal = address_parts(address)
    attempts = [{"q": address}]
    structured = {"street": street, "city": city, "state": state}
    if postal:
        structured["postalcode"] = postal
    attempts.append(structured)
    # A few published streets are abbreviated in a way the first search misses.
    if street.startswith("51-52nd"):
        attempts.append({"q": "5152nd Way NE, Fridley, Minnesota 55421"})
    if "Southmeadow" in street:
        attempts.append({"q": "4261 Southmeadow Pkwy, East Point, Georgia 30349"})
    if "Martin-Brower" in street:
        attempts.append({"q": "Martin Brower Road, Orlando, Florida"})
    for params in attempts:
        found = geocode_query(params)
        if found:
            return found
        time.sleep(1.1)
    return None


def main():
    path = overpass()
    counts = {}
    raw_rows = []
    with open(path, newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle, delimiter="\t"):
            brand = (row.get("brand") or "").strip()
            try:
                lat = float(row["@lat"])
                lon = float(row["@lon"])
            except (KeyError, ValueError):
                continue
            if not brand or not (-90 <= lat <= 90 and -180 <= lon <= 180):
                continue
            counts[brand] = counts.get(brand, 0) + 1
            raw_rows.append((brand, lon, lat))
    kept = {brand for brand, count in counts.items() if count >= 25}
    brands = sorted(kept, key=lambda brand: (-counts[brand], brand.lower()))
    index = {brand: i for i, brand in enumerate(brands)}
    places = []
    other = 0
    for brand, lon, lat in raw_rows:
        if brand not in index:
            other += 1
            continue
        places.append([round(lon, 5), round(lat, 5), index[brand]])
    print("brands", len(brands), "places", len(places), "other", other)

    centers = []
    missing_centers = []
    cache_path = os.path.join(CACHE, "centers.json")
    cached = {}
    if os.path.exists(cache_path):
        cached = json.load(open(cache_path, encoding="utf-8"))
    for name, address in CENTERS:
        if address in cached:
            lon, lat = cached[address]
        else:
            found = geocode(address)
            time.sleep(1.1)
            print(name, found)
            if not found:
                missing_centers.append({"name": name, "address": address})
                continue
            lon, lat = found
            cached[address] = [lon, lat]
            json.dump(cached, open(cache_path, "w", encoding="utf-8"))
        row = {"name": name, "address": address, "lon": lon, "lat": lat}
        if "McAllister" in address:
            row["note"] = "The mark is the OpenStreetMap line for West McAllister Street. The building number did not match a Census Bureau address range."
        centers.append(row)

    payload = {
        "placesSource": "OpenStreetMap contributors, amenity=fast_food with a brand, retrieved for this page.",
        "centersSource": "Street addresses published by Martin Brower at martinbrower.us/contact-us. Coordinates are from the Census Bureau public address geocoder, except the Lebanon, Illinois center, which is the OpenStreetMap line for that street.",
        "chemicalsSource": "Edwards et al., Journal of Exposure Science & Environmental Epidemiology, 2021. Foods bought in San Antonio, Texas, in 2017 and 2018.",
        "brands": brands,
        "counts": [counts[brand] for brand in brands],
        "other": other,
        "places": places,
        "centers": centers,
        "missingCenters": missing_centers,
        "chemicals": CHEMICALS,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(payload, handle, separators=(",", ":"))
        handle.write("\n")
    print("wrote", OUT, os.path.getsize(OUT))


if __name__ == "__main__":
    main()
