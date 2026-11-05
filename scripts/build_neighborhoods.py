"""Count mapped fast-food restaurants by the nearest named neighborhood.

Neighborhood, suburb, and quarter names are OpenStreetMap place nodes.
A restaurant is counted with the nearest of those names within 2 kilometers.
The city is the nearest OpenStreetMap city or town. Nothing is invented
when no named neighborhood is that close.
"""
import json
import math
import os
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HEALTH = os.path.join(ROOT, "census", "health.json")
OUT = os.path.join(ROOT, "census", "neighborhoods.json")
CACHE = os.path.join(os.environ.get("TEMP", "/tmp"), "leaders-vote-health", "places")
UA = "Leaders.vote neighborhood rank (local build)"
SERVERS = [
    "https://overpass.openstreetmap.fr/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
]
OUTLINE_URL = "https://eric.clst.org/assets/wiki/uploads/Stuff/gz_2010_us_040_00_500k.json"
STATE_BOX = {
    "MI": (41.69, -90.42, 48.31, -82.12),
    "MN": (43.50, -97.24, 49.38, -89.49),
    "MS": (30.17, -91.66, 34.99, -88.10),
    "MO": (35.99, -95.77, 40.61, -89.10),
    "MT": (44.35, -116.05, 49.00, -104.04),
    "NE": (40.00, -104.05, 43.00, -95.31),
    "NV": (35.00, -120.00, 42.00, -114.04),
    "NH": (42.70, -72.56, 45.31, -70.70),
    "NJ": (38.93, -75.56, 41.36, -73.89),
    "NM": (31.33, -109.05, 37.00, -103.00),
    "NY": (40.50, -79.76, 45.02, -71.85),
    "NC": (33.84, -84.32, 36.59, -75.46),
    "ND": (45.93, -104.05, 49.00, -96.55),
    "OH": (38.40, -84.82, 41.98, -80.52),
    "OK": (33.62, -103.00, 37.00, -94.43),
    "OR": (41.99, -124.57, 46.29, -116.46),
    "PA": (39.72, -80.52, 42.27, -74.69),
    "RI": (41.15, -71.86, 42.02, -71.12),
    "SC": (32.05, -83.35, 35.22, -78.54),
    "SD": (42.48, -104.06, 45.95, -96.44),
    "TN": (34.98, -90.31, 36.68, -81.65),
    "TX": (25.84, -106.65, 36.50, -93.51),
    "UT": (36.99, -114.05, 42.00, -109.04),
    "VT": (42.73, -73.44, 45.02, -71.46),
    "VA": (36.54, -83.68, 39.47, -75.24),
    "WA": (45.54, -124.77, 49.00, -116.91),
    "WV": (37.20, -82.64, 40.64, -77.72),
    "WI": (42.49, -92.89, 47.08, -86.25),
    "WY": (40.99, -111.06, 45.01, -104.05),
}
MAX_KM = 2.0
CITY_KM = 40.0

STATES = [
    ("AL", "Alabama"), ("AK", "Alaska"), ("AZ", "Arizona"), ("AR", "Arkansas"),
    ("CA", "California"), ("CO", "Colorado"), ("CT", "Connecticut"), ("DE", "Delaware"),
    ("DC", "District of Columbia"), ("FL", "Florida"), ("GA", "Georgia"), ("HI", "Hawaii"),
    ("ID", "Idaho"), ("IL", "Illinois"), ("IN", "Indiana"), ("IA", "Iowa"),
    ("KS", "Kansas"), ("KY", "Kentucky"), ("LA", "Louisiana"), ("ME", "Maine"),
    ("MD", "Maryland"), ("MA", "Massachusetts"), ("MI", "Michigan"), ("MN", "Minnesota"),
    ("MS", "Mississippi"), ("MO", "Missouri"), ("MT", "Montana"), ("NE", "Nebraska"),
    ("NV", "Nevada"), ("NH", "New Hampshire"), ("NJ", "New Jersey"), ("NM", "New Mexico"),
    ("NY", "New York"), ("NC", "North Carolina"), ("ND", "North Dakota"), ("OH", "Ohio"),
    ("OK", "Oklahoma"), ("OR", "Oregon"), ("PA", "Pennsylvania"), ("RI", "Rhode Island"),
    ("SC", "South Carolina"), ("SD", "South Dakota"), ("TN", "Tennessee"), ("TX", "Texas"),
    ("UT", "Utah"), ("VT", "Vermont"), ("VA", "Virginia"), ("WA", "Washington"),
    ("WV", "West Virginia"), ("WI", "Wisconsin"), ("WY", "Wyoming"),
]


def post(url, data):
    req = urllib.request.Request(url, data=data, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=40) as res:
        return res.read()


PLACE_FILTER = '["place"~"^(neighbourhood|suburb|quarter|city|town)$"]["name"]'
OUTLINES = {}


def in_ring(lon, lat, ring):
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if (yi > lat) != (yj > lat):
            denom = (yj - yi) or 1e-12
            if lon < (xj - xi) * (lat - yi) / denom + xi:
                inside = not inside
        j = i
    return inside


def in_geom(lon, lat, geom):
    polys = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
    for poly in polys:
        if in_ring(lon, lat, poly[0]) and not any(in_ring(lon, lat, hole) for hole in poly[1:]):
            return True
    return False


def load_outlines():
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, "states-500k.json")
    if not (os.path.exists(path) and os.path.getsize(path) > 1000):
        req = urllib.request.Request(OUTLINE_URL, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=60) as res:
            raw = res.read()
        open(path, "wb").write(raw)
    data = json.load(open(path, encoding="utf-8"))
    for feature in data["features"]:
        OUTLINES[feature["properties"]["NAME"]] = feature["geometry"]


def query_box(south, west, north, east):
    query = """
[out:json][timeout:25];
node%s(%s,%s,%s,%s);
out body;
""".strip() % (PLACE_FILTER, south, west, north, east)
    last = None
    for server in SERVERS:
        try:
            print("query", south, west, server, flush=True)
            raw = post(server, query.encode("utf-8"))
            data = json.loads(raw.decode("utf-8", "replace"))
            if "elements" not in data:
                last = raw[:180]
                print("bad", south, west, last, flush=True)
                time.sleep(3)
                continue
            print("saved", south, west, len(data["elements"]), flush=True)
            time.sleep(0.3)
            return data["elements"]
        except Exception as exc:
            print(type(exc).__name__, south, west, exc, flush=True)
            last = exc
            time.sleep(3)
    raise RuntimeError(last)


def fetch_box(south, west, north, east, depth=0):
    path = os.path.join(CACHE, "box_%s_%s_%s_%s.json" % (south, west, north, east))
    if os.path.exists(path) and os.path.getsize(path) > 2:
        return json.load(open(path, encoding="utf-8"))
    try:
        elements = query_box(south, west, north, east)
    except RuntimeError:
        if depth >= 2:
            raise
        mid_lat = (south + north) / 2.0
        mid_lon = (west + east) / 2.0
        elements = []
        seen = set()
        for box in (
            (south, west, mid_lat, mid_lon),
            (south, mid_lon, mid_lat, east),
            (mid_lat, west, north, mid_lon),
            (mid_lat, mid_lon, north, east),
        ):
            for el in fetch_box(box[0], box[1], box[2], box[3], depth + 1):
                if el.get("id") in seen:
                    continue
                seen.add(el.get("id"))
                elements.append(el)
    json.dump(elements, open(path, "w", encoding="utf-8"))
    return elements


def fetch_state(code, state):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, code + ".json")
    if os.path.exists(path) and os.path.getsize(path) > 50:
        return json.load(open(path, encoding="utf-8"))
    geom = OUTLINES[state]
    south, west, north, east = STATE_BOX[code]
    elements = []
    seen = set()
    lat = math.floor(south)
    while lat < north:
        lon = math.floor(west)
        while lon < east:
            for el in fetch_box(lat, lon, lat + 1, lon + 1):
                if el.get("type") != "node" or el.get("id") in seen:
                    continue
                if not in_geom(el["lon"], el["lat"], geom):
                    continue
                seen.add(el["id"])
                elements.append(el)
            lon += 1
        lat += 1
    data = {"elements": elements}
    json.dump(data, open(path, "w", encoding="utf-8"))
    print("saved", code, len(elements), flush=True)
    return data


def km(lon1, lat1, lon2, lat2):
    mid = math.radians((lat1 + lat2) / 2)
    x = (lon2 - lon1) * math.cos(mid) * 111.32
    y = (lat2 - lat1) * 110.57
    return math.hypot(x, y)


def cell(lon, lat, size):
    return int(math.floor(lon / size)), int(math.floor(lat / size))


def build_grid(nodes, size):
    grid = {}
    for node in nodes:
        key = cell(node["lon"], node["lat"], size)
        grid.setdefault(key, []).append(node)
    return grid


def nearest(grid, lon, lat, size, limit, state=None):
    cx, cy = cell(lon, lat, size)
    reach = int(math.ceil(limit / (size * 111))) + 1
    best = None
    best_d = limit
    for dx in range(-reach, reach + 1):
        for dy in range(-reach, reach + 1):
            for node in grid.get((cx + dx, cy + dy), ()):
                if state and node.get("state") != state:
                    continue
                dist = km(lon, lat, node["lon"], node["lat"])
                if dist < best_d:
                    best_d = dist
                    best = node
    return best


def main():
    health = json.load(open(HEALTH, encoding="utf-8"))
    places = health["places"]
    load_outlines()
    hoods = []
    cities = []
    for code, state in STATES:
        data = fetch_state(code, state)
        for el in data.get("elements", []):
            if el.get("type") != "node" or "lat" not in el:
                continue
            tags = el.get("tags") or {}
            name = (tags.get("name") or "").strip()
            kind = tags.get("place")
            if not name or kind not in ("neighbourhood", "suburb", "quarter", "city", "town"):
                continue
            row = {"name": name, "lon": el["lon"], "lat": el["lat"], "state": state, "kind": kind}
            if kind in ("city", "town"):
                cities.append(row)
            else:
                hoods.append(row)
    print("hoods", len(hoods), "cities", len(cities), flush=True)
    city_grid = build_grid(cities, 0.5)
    for hood in hoods:
        city = nearest(city_grid, hood["lon"], hood["lat"], 0.5, CITY_KM, hood["state"])
        hood["city"] = city["name"] if city else ""
    hood_grid = build_grid(hoods, 0.05)
    def group_key(hood):
        if hood["city"]:
            return (hood["name"], hood["city"], hood["state"])
        return (hood["name"], "", hood["state"], round(hood["lon"], 1), round(hood["lat"], 1))

    groups = {}
    assigned = []
    unassigned = 0
    for lon, lat, brand in places:
        hood = nearest(hood_grid, lon, lat, 0.05, MAX_KM)
        if not hood:
            assigned.append(-1)
            unassigned += 1
            continue
        key = group_key(hood)
        group = groups.get(key)
        if group is None:
            group = {
                "name": hood["name"],
                "city": hood["city"],
                "state": hood["state"],
                "n": 0,
                "lon": 0.0,
                "lat": 0.0,
                "brandCounts": {},
            }
            groups[key] = group
        group["n"] += 1
        group["lon"] += lon
        group["lat"] += lat
        brand = int(brand)
        group["brandCounts"][brand] = group["brandCounts"].get(brand, 0) + 1
        assigned.append(key)
    ordered = sorted(groups.values(), key=lambda row: (-row["n"], row["state"], row["city"], row["name"]))
    index = {}
    for i, row in enumerate(ordered):
        index[id(row)] = i
    key_index = {key: id(group) for key, group in groups.items()}
    place_area = []
    for key in assigned:
        if key == -1:
            place_area.append(-1)
        else:
            place_area.append(index[key_index[key]])
    areas = []
    for row in ordered:
        brands = sorted(row["brandCounts"].items(), key=lambda item: (-item[1], item[0]))
        areas.append({
            "name": row["name"],
            "city": row["city"],
            "state": row["state"],
            "n": row["n"],
            "lon": round(row["lon"] / row["n"], 4),
            "lat": round(row["lat"] / row["n"], 4),
            "brands": brands,
        })
    payload = {
        "source": "Neighborhood, suburb, and quarter names are OpenStreetMap place nodes. A restaurant is counted with the nearest of those names within 2 kilometers. The city is the nearest OpenStreetMap city or town in the same state. A restaurant with no named neighborhood that close is not given one.",
        "unassigned": unassigned,
        "areas": areas,
        "placeArea": place_area,
    }
    with open(OUT, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(payload, handle, separators=(",", ":"))
        handle.write("\n")
    print("areas", len(areas), "unassigned", unassigned, "wrote", OUT, os.path.getsize(OUT), flush=True)


if __name__ == "__main__":
    main()
