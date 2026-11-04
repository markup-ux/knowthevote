"""Build a local all-states preview from the US census atlas and the NBC News results feed.

Writes preview/us.svg, preview/maps/{code}.svg, preview/national.json, and preview/states/{code}.json.
Does not invent races. A state only lists offices NBC News is publishing.
"""
import json
import os
import re
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREVIEW = os.path.join(ROOT, "preview")
TEMP = os.environ.get("TEMP", "/tmp")
WINDOW_START = datetime(2026, 11, 3, 12, tzinfo=timezone.utc)
WINDOW_END = datetime(2026, 11, 6, 18, tzinfo=timezone.utc)
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
BASE = "https://www.nbcnews.com/firecracker/api/v2/state-results/2026-elections/"

POSTAL = {
    "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT",
    "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL",
    "18": "IN", "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME", "24": "MD",
    "25": "MA", "26": "MI", "27": "MN", "28": "MS", "29": "MO", "30": "MT", "31": "NE",
    "32": "NV", "33": "NH", "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
    "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
    "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA", "54": "WV",
    "55": "WI", "56": "WY",
}
RANK = {"gop": 0, "rep": 0, "dem": 1, "ind": 2, "other": 3}
OFFICE_ORDER = {
    "governor": 0,
    "lieutenant governor": 1,
    "lt. governor": 1,
    "u.s. senate": 2,
    "senate": 2,
    "attorney general": 3,
    "secretary of state": 4,
    "secretary of the state": 4,
    "state treasurer": 5,
    "treasurer": 5,
    "comptroller": 6,
    "state comptroller": 6,
}


def download(url, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 1000:
        return
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(request, timeout=90) as response:
        open(dest, "wb").write(response.read())


def decode_arcs(topo):
    scale = topo["transform"]["scale"]
    translate = topo["transform"]["translate"]
    arcs = []
    for arc in topo["arcs"]:
        x = y = 0
        points = []
        for dx, dy in arc:
            x += dx
            y += dy
            points.append((x * scale[0] + translate[0], y * scale[1] + translate[1]))
        arcs.append(points)
    return arcs


def ring_points(arcs, indexes):
    points = []
    for index in indexes:
        part = arcs[index] if index >= 0 else list(reversed(arcs[~index]))
        if points and part and points[-1] == part[0]:
            part = part[1:]
        points.extend(part)
    if len(points) > 1 and points[0] == points[-1]:
        points.pop()
    return points


def geometry_rings(arcs, geom):
    kind = geom.get("type")
    if kind == "Polygon":
        return [ring_points(arcs, ring) for ring in geom["arcs"]]
    if kind == "MultiPolygon":
        rings = []
        for polygon in geom["arcs"]:
            rings.extend(ring_points(arcs, ring) for ring in polygon)
        return rings
    return []


def dist(point, start, end):
    if start == end:
        return ((point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2) ** 0.5
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    length = (dx * dx + dy * dy) ** 0.5
    return abs(dy * point[0] - dx * point[1] + end[0] * start[1] - end[1] * start[0]) / length


def rdp(points, epsilon):
    if len(points) < 3:
        return points
    start, end = points[0], points[-1]
    index = 0
    farthest = 0
    for i in range(1, len(points) - 1):
        d = dist(points[i], start, end)
        if d > farthest:
            farthest = d
            index = i
    if farthest > epsilon:
        left = rdp(points[: index + 1], epsilon)
        right = rdp(points[index:], epsilon)
        return left[:-1] + right
    return [start, end]


def xml(text):
    return (text or "").replace("&", "&amp;").replace("<", "&lt;").replace('"', "&quot;")


def write_svg(path, shapes, label, width):
    points = [point for _, rings in shapes for ring in rings for point in ring]
    if not points:
        return 0
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    minx, maxx = min(xs), max(xs)
    miny, maxy = min(ys), max(ys)
    pad = 8
    span = max(maxx - minx, 0.001)
    scale = (width - pad * 2) / span
    height = (maxy - miny) * scale + pad * 2

    def project(point):
        return pad + (point[0] - minx) * scale, pad + (point[1] - miny) * scale

    parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {0:.1f} {1:.1f}" role="img" aria-label="{2}">'.format(
            width, height, xml(label)
        )
    ]
    count = 0
    for attrs, rings in shapes:
        commands = []
        for ring in rings:
            simplified = rdp([project(point) for point in ring], 0.7)
            if len(simplified) < 3:
                continue
            commands.append("M " + " L ".join("{0:.1f} {1:.1f}".format(x, y) for x, y in simplified) + " Z")
        if not commands:
            continue
        count += 1
        parts.append('<path {0} d="{1}"/>'.format(attrs, " ".join(commands)))
    parts.append("</svg>")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "w", encoding="utf-8", newline="\n").write("\n".join(parts) + "\n")
    return count


def party_rank(party):
    return RANK.get(party, 9)


def usable_photo(item):
    url = item.get("headshotUrl") or ""
    if not isinstance(url, str) or not url.startswith("https://media-cldnry.s-nbcnews.com/"):
        return ""
    lower = url.lower()
    if "candidate_fallback" in lower or "generated_" in lower or "undefined" in lower:
        return ""
    name = (item.get("name") or "").strip().lower()
    if name in ("yes", "no") or name.startswith("total write"):
        return ""
    return url


def candidates_of(items, partisan):
    rows = []
    for item in items or []:
        row = {
            "name": item.get("name") or "",
            "party": (item.get("party") or "").lower(),
            "votes": item.get("votes") or 0,
            "percent": item.get("percentVote") or 0,
            "percentLabel": item.get("formattedPercentVote") or "0%",
            "winner": bool(item.get("isWinner")),
        }
        photo = usable_photo(item)
        if photo:
            row["photo"] = photo
        rows.append(row)
    parties = {row["party"] for row in rows}
    if partisan and rows and not parties <= {"yes", "no"}:
        rows.sort(key=lambda row: party_rank(row["party"]))
    return rows


def slim_counties(map_data, ordered_names):
    if not isinstance(map_data, dict):
        return None
    out = {}
    for key, unit in map_data.items():
        text = str(key)
        if not text.isdigit():
            continue
        fips = text.zfill(5)
        by_name = {item.get("name"): item for item in unit.get("candidates") or []}
        ordered = []
        total = 0
        for name in ordered_names:
            found = by_name.get(name) or {}
            votes = found.get("votes") or 0
            total += votes
            ordered.append([votes, found.get("formattedPercentVote") or "0%", bool(found.get("isWinner"))])
        reported = unit.get("totalVote") or total
        if not reported:
            continue
        out[fips] = {
            "name": unit.get("raceName") or "",
            "percentIn": unit.get("percentIn") or 0,
            "votes": reported,
            "candidates": ordered,
        }
    return out


def race_record(item, kind):
    people = candidates_of(item.get("candidates"), kind != "measure")
    remaining = item.get("estimatedVotesRemaining") or {}
    if not isinstance(remaining, dict):
        remaining = {}
    office = item.get("raceName") or item.get("officeName") or "Race"
    return {
        "id": item.get("raceId") or office,
        "office": office,
        "kind": kind,
        "percentIn": item.get("percentIn") or 0,
        "percentLabel": item.get("percentInFormatted") or "0%",
        "votes": item.get("votes") or 0,
        "remaining": remaining.get("displayString") or "",
        "pollsClose": item.get("pollsCloseFormatted") or "",
        "called": item.get("callStatusText") or "",
        "candidates": people,
        "counties": slim_counties(item.get("mapData"), [person["name"] for person in people]) if kind == "map" else None,
    }


def office_rank(race):
    if race["kind"] == "house":
        return (80, race["office"])
    if race["kind"] == "measure":
        return (60, race["office"])
    return (OFFICE_ORDER.get(race["office"].lower(), 40), race["office"])


def unique_offices(races):
    seen = {}
    for race in races:
        label = race["office"]
        seen[label] = seen.get(label, 0) + 1
        if seen[label] > 1:
            race["office"] = label + " " + str(seen[label])
            race["id"] = str(race["id"]) + "-" + str(seen[label])


def house_race(districts):
    rows = []
    for item in districts or []:
        rows.append({
            "name": item.get("name") or ("District " + str(item.get("district") or "")),
            "number": item.get("district") or 0,
            "votes": item.get("votes") or 0,
            "percentIn": item.get("percentIn") or 0,
            "candidates": candidates_of(item.get("candidates"), True),
        })
    rows.sort(key=lambda row: row["number"] or 0)
    for row in rows:
        row.pop("number", None)
    if not rows:
        return None
    return {
        "id": "house",
        "office": "U.S. House",
        "kind": "house",
        "percentIn": 0,
        "percentLabel": "",
        "votes": sum(row["votes"] for row in rows),
        "remaining": "",
        "pollsClose": "",
        "called": "",
        "candidates": [],
        "counties": None,
        "districts": rows,
    }


def fetch_state(name):
    slug = name.lower().replace(" ", "-")
    url = BASE + slug + "-results"
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    last = None
    for _ in range(2):
        try:
            with urllib.request.urlopen(request, timeout=50) as response:
                return slug, json.load(response), None
        except urllib.error.HTTPError as error:
            return slug, None, "HTTP " + str(error.code)
        except Exception as error:
            last = error
    return slug, None, str(last)


def source_url(payload, slug):
    return "https://www.nbcnews.com/politics/2026-elections/" + slug + "-results"


def detail_slug(item):
    href = item.get("href") if isinstance(item, dict) else ""
    if not isinstance(href, str) or "/2026-elections/" not in href:
        return ""
    return href.rstrip("/").split("/")[-1]


def fetch_detail(slug):
    url = BASE + slug
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=50) as response:
            return slug, json.load(response)
    except Exception as error:
        print("detail fail", slug, error)
        return slug, None


def apply_detail(item, payload):
    race = ((payload or {}).get("races") or [None])[0]
    if not race:
        return
    summary = race.get("summary") or {}
    if summary.get("candidates"):
        item["candidates"] = summary["candidates"]
    if isinstance(race.get("mapData"), dict):
        item["mapData"] = race["mapData"]
    for key in ("percentIn", "percentInFormatted", "votes", "callStatusText", "pollsCloseFormatted"):
        if summary.get(key) not in (None, ""):
            item[key] = summary[key]
    if isinstance(summary.get("estimatedVotesRemaining"), dict):
        item["estimatedVotesRemaining"] = summary["estimatedVotesRemaining"]


def feed_items(payload):
    block = (payload or {}).get("stateRaceResults") or {}
    items = []
    for key in ("discreteOffices", "otherRaces", "ballotProps", "supremeCourtRetention"):
        items.extend(block.get(key) or [])
    return items


def slim_state(code, name, slug, payload, error):
    races = []
    if payload:
        block = payload.get("stateRaceResults") or {}
        for item in block.get("discreteOffices") or []:
            kind = "map" if isinstance(item.get("mapData"), dict) else "state"
            races.append(race_record(item, kind))
        for item in block.get("otherRaces") or []:
            kind = "map" if isinstance(item.get("mapData"), dict) else "state"
            races.append(race_record(item, kind))
        for item in block.get("ballotProps") or []:
            races.append(race_record(item, "measure"))
        for item in block.get("supremeCourtRetention") or []:
            races.append(race_record(item, "measure"))
        house = house_race(block.get("house"))
        if house:
            races.append(house)
        races.sort(key=office_rank)
        unique_offices(races)
    return {
        "code": code,
        "name": name,
        "guide": code == "IL",
        "source": "Associated Press totals published by NBC News",
        "sourceUrl": source_url(payload, slug),
        "error": error or "",
        "races": [
            {key: value for key, value in race.items() if value is not None and value != ""}
            for race in races
        ],
    }


def in_window():
    now = datetime.now(timezone.utc)
    return WINDOW_START <= now <= WINDOW_END


def published_links():
    """NBC's state summary sometimes lists no races. The election pages still link to them."""
    url = "https://www.nbcnews.com/politics/2026-elections/nebraska-results"
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
    with urllib.request.urlopen(request, timeout=40) as response:
        html = response.read().decode("utf-8", "replace")
    return set(re.findall(r"/politics/2026-elections/([a-z0-9-]+-results)", html))


def links_for_state(name, catalog):
    slug = name.lower().replace(" ", "-")
    prefix = slug + "-"
    found = []
    for link in catalog:
        if link.startswith(prefix) and link != slug + "-results" and not link.endswith("-house-results"):
            found.append(link)
    return found


def detail_item(payload):
    race = ((payload or {}).get("races") or [None])[0]
    if not isinstance(race, dict):
        return None
    summary = dict(race.get("summary") or {})
    if not summary.get("candidates") and not summary.get("votes"):
        return None
    if isinstance(race.get("mapData"), dict):
        summary["mapData"] = race["mapData"]
    summary["raceName"] = summary.get("raceName") or summary.get("officeName") or "Race"
    return summary


def race_kind(item):
    name = (item.get("raceName") or "").lower()
    parties = {(candidate.get("party") or "").lower() for candidate in item.get("candidates") or []}
    if parties and parties <= {"yes", "no"}:
        return "measure"
    if any(word in name for word in ("measure", "proposition", "amendment", "question", "issue")):
        return "measure"
    if isinstance(item.get("mapData"), dict):
        return "map"
    return "state"


def state_from_details(code, name, slug, payload, detail_slugs, details):
    races = []
    districts = []
    for detail_slug_name in detail_slugs:
        item = detail_item(details.get(detail_slug_name))
        if not item:
            continue
        if "us-house-district-" in detail_slug_name:
            number = item.get("district") or 0
            if not number:
                match = re.search(r"district-(\d+)", detail_slug_name)
                number = int(match.group(1)) if match else 0
            item["district"] = number
            item["name"] = "District " + str(number) if number else (item.get("raceName") or "District")
            districts.append(item)
            continue
        races.append(race_record(item, race_kind(item)))
    house = house_race(districts)
    if house:
        races.append(house)
    races.sort(key=office_rank)
    unique_offices(races)
    state = slim_state(code, name, slug, None, None)
    state["races"] = [
        {key: value for key, value in race.items() if value is not None and value != ""}
        for race in races
    ]
    stamp = (payload or {}).get("currentTime") or (payload or {}).get("lastModified") or ""
    state["updated"] = stamp if isinstance(stamp, str) and stamp else datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return state


def refresh_results():
    """Rewrite preview/states from NBC. Leave the maps alone."""
    forced = os.environ.get("RESULTS_FORCE") == "1"
    folder = os.path.join(PREVIEW, "states")
    if not forced and not in_window() and os.path.isdir(folder):
        print("outside the election window")
        return
    national = json.load(open(os.path.join(PREVIEW, "national.json"), encoding="utf-8"))
    catalog = national.get("states") or []
    loaded = {}
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(fetch_state, item["name"]): item for item in catalog}
        for future in as_completed(futures):
            item = futures[future]
            loaded[item["code"]] = future.result()
            print("feed", item["code"], loaded[item["code"]][2] or "ok")
    details = {}
    slugs = []
    rescue = {}
    rescue_links = None
    for item in catalog:
        slug, payload, error = loaded[item["code"]]
        block = (payload or {}).get("stateRaceResults") or {}
        listed = feed_items(payload) or block.get("house") or []
        if payload and not listed:
            if rescue_links is None:
                try:
                    rescue_links = published_links()
                except Exception as error:
                    print("link list failed", error)
                    rescue_links = set()
            rescue[item["code"]] = links_for_state(item["name"], rescue_links)
            for detail in rescue[item["code"]]:
                if detail not in slugs:
                    slugs.append(detail)
            continue
        for race in feed_items(payload):
            detail = detail_slug(race)
            if detail and detail not in slugs:
                slugs.append(detail)
    print("details", len(slugs), "rescue", len(rescue))
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(fetch_detail, slug) for slug in slugs]
        for future in as_completed(futures):
            slug, payload = future.result()
            details[slug] = payload
    written = 0
    for item in catalog:
        slug, payload, error = loaded[item["code"]]
        if not payload:
            print("keep", item["code"], error)
            continue
        path = os.path.join(folder, item["code"].lower() + ".json")
        if item["code"] in rescue:
            state = state_from_details(item["code"], item["name"], slug, payload, rescue[item["code"]], details)
        else:
            for race in feed_items(payload):
                detail = detail_slug(race)
                if detail and details.get(detail):
                    apply_detail(race, details[detail])
            state = slim_state(item["code"], item["name"], slug, payload, error)
            stamp = payload.get("currentTime") or payload.get("lastModified") or ""
            state["updated"] = stamp if isinstance(stamp, str) and stamp else datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        if not state.get("races") and os.path.exists(path):
            previous = json.load(open(path, encoding="utf-8"))
            if previous.get("races"):
                print("keep", item["code"], "empty rewrite")
                continue
        json.dump(state, open(path, "w", encoding="utf-8", newline="\n"), separators=(",", ":"))
        senate = next((race for race in state["races"] if race.get("office") == "Senate"), None)
        votes = senate.get("votes") if senate else 0
        print("races", item["code"], len(state["races"]), "senate", votes)
        written += 1
    print("wrote", written, "states")


def main():
    os.makedirs(os.path.join(PREVIEW, "maps"), exist_ok=True)
    os.makedirs(os.path.join(PREVIEW, "states"), exist_ok=True)
    download("https://cdn.jsdelivr.net/npm/us-atlas@3/states-albers-10m.json", os.path.join(TEMP, "states-albers-10m.json"))
    download("https://cdn.jsdelivr.net/npm/us-atlas@3/counties-albers-10m.json", os.path.join(TEMP, "counties-albers-10m.json"))
    states_topo = json.load(open(os.path.join(TEMP, "states-albers-10m.json"), encoding="utf-8"))
    counties_topo = json.load(open(os.path.join(TEMP, "counties-albers-10m.json"), encoding="utf-8"))
    state_arcs = decode_arcs(states_topo)
    county_arcs = decode_arcs(counties_topo)

    catalog = []
    state_shapes = []
    for geom in states_topo["objects"]["states"]["geometries"]:
        fips = str(geom.get("id")).zfill(2)
        code = POSTAL.get(fips)
        if not code:
            continue
        name = (geom.get("properties") or {}).get("name") or code
        catalog.append({"code": code, "name": name, "fips": fips})
        attrs = 'id="s{0}" data-code="{0}" data-fips="{1}" data-name="{2}"'.format(code, fips, xml(name))
        state_shapes.append((attrs, geometry_rings(state_arcs, geom)))
    catalog.sort(key=lambda item: item["name"])
    nation = write_svg(os.path.join(PREVIEW, "us.svg"), state_shapes, "Map of the states", 960)
    print("nation", nation)

    by_state = {item["fips"]: [] for item in catalog}
    names = {item["fips"]: item["name"] for item in catalog}
    for geom in counties_topo["objects"]["counties"]["geometries"]:
        fips = str(geom.get("id")).zfill(5)
        state_fips = fips[:2]
        if state_fips not in by_state:
            continue
        county_name = (geom.get("properties") or {}).get("name") or fips
        attrs = 'data-fips="{0}" data-name="{1}"'.format(fips, xml(county_name))
        by_state[state_fips].append((attrs, geometry_rings(county_arcs, geom)))
    for item in catalog:
        count = write_svg(
            os.path.join(PREVIEW, "maps", item["code"].lower() + ".svg"),
            by_state[item["fips"]],
            "Map of " + item["name"],
            640,
        )
        print("map", item["code"], count)

    updated = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    loaded = {}
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(fetch_state, item["name"]): item for item in catalog}
        for future in as_completed(futures):
            item = futures[future]
            loaded[item["code"]] = future.result()
            print("feed", item["code"], loaded[item["code"]][2] or "ok")

    details = {}
    slugs = []
    for code, (slug, payload, error) in loaded.items():
        for item in feed_items(payload):
            detail = detail_slug(item)
            if detail and detail not in slugs:
                slugs.append(detail)
    print("details", len(slugs))
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(fetch_detail, slug) for slug in slugs]
        for future in as_completed(futures):
            slug, payload = future.result()
            details[slug] = payload
    for code, (slug, payload, error) in loaded.items():
        for item in feed_items(payload):
            detail = detail_slug(item)
            if detail and details.get(detail):
                apply_detail(item, details[detail])

    results = {}
    for item in catalog:
        slug, payload, error = loaded[item["code"]]
        state = slim_state(item["code"], item["name"], slug, payload, error)
        state["updated"] = updated
        results[item["code"]] = state
        print("races", item["code"], len(state["races"]))

    national = {
        "updated": updated,
        "source": "Associated Press totals published by NBC News",
        "states": [
            {
                "code": item["code"],
                "name": item["name"],
                "fips": item["fips"],
                "guide": item["code"] == "IL",
                "races": [race["office"] for race in results[item["code"]]["races"]],
            }
            for item in catalog
        ],
    }
    for item in catalog:
        path = os.path.join(PREVIEW, "states", item["code"].lower() + ".json")
        json.dump(results[item["code"]], open(path, "w", encoding="utf-8", newline="\n"), separators=(",", ":"))
    json.dump(national, open(os.path.join(PREVIEW, "national.json"), "w", encoding="utf-8", newline="\n"), separators=(",", ":"))
    print("wrote", len(catalog), "states")


if __name__ == "__main__":
    if "--results" in sys.argv:
        refresh_results()
    else:
        main()
