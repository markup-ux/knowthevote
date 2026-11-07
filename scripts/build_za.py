"""Build the South Africa local-election pages.

Vote numbers come from the Electoral Commission's public results file.
A municipality is colored only when that file reports a total above zero
and one party is strictly ahead. Party names and colors come from the
Commission's party list, matched by id. Outlines are geoBoundaries ADM3
(Municipal Demarcation Board). This script never calls a voter, address,
or voting-station endpoint, and it does not write phone numbers or emails.
"""
import html
import json
import math
import os
import re
import sys
import urllib.request
from collections import Counter
from datetime import datetime, timezone

import seo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZA = os.path.join(ROOT, "za")
MUNICIPALITIES = os.path.join(ZA, "m")
CATALOG = os.path.join(ZA, "catalog.json")
RESULTS = os.path.join(ZA, "results.json")
MAP = os.path.join(ZA, "map.svg")

NATIONAL_URL = (
    "https://results.elections.org.za/dashboards/lge/MapsJason/2026/EEID1887LiteMapsNational.js"
)
PARTY_URL = "https://results.elections.org.za/dashboards/lge/MapsJason/2016/PartyList.js"
ADM3_URL = (
    "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/ZAF/ADM3/"
    "geoBoundaries-ZAF-ADM3_simplified.geojson"
)
ADM1_URL = (
    "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/ZAF/ADM1/"
    "geoBoundaries-ZAF-ADM1_simplified.geojson"
)
RESULTS_PAGE = "https://results.elections.org.za/dashboards/lge/"
COMMISSION = "https://www.elections.org.za/"
WINDOW_START = datetime(2026, 11, 4, 14, tzinfo=timezone.utc)
WINDOW_END = datetime(2026, 11, 12, tzinfo=timezone.utc)

# Same council, different spelling or a later official name on an older outline.
ALIASES = {
    "winnie madikizela mandela": "mbizana",
    "msunduzi": "the msunduzi",
    "umsinga": "msinga",
    "umfolozi": "mfolozi",
    "thembisile hani": "thembisile",
    "city of mbombela": "mbombela",
    "sol plaatje": "sol plaatjie",
    "fetakgomo tubatse": "greater tubatse fetakgomo",
    "madibeng": "local municipality of madibeng",
    "matlosana": "city of matlosana",
    "ganyesa pomfret": "kagisano molopo",
    "jb marks": "ventersdorp tlokwe",
}
PREFIX = {
    "EC": "Eastern Cape",
    "FS": "Free State",
    "GT": "Gauteng",
    "KZN": "KwaZulu-Natal",
    "LIM": "Limpopo",
    "LP": "Limpopo",
    "MP": "Mpumalanga",
    "NC": "Northern Cape",
    "NW": "North West",
    "WC": "Western Cape",
}
BLOCKED = ("voters", "votingstation", "idnumber", "specialvotes", "geocode", "address")


def esc(text):
    return html.escape(text or "", quote=True)


def norm(text):
    text = (text or "").lower().replace("'", "")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())


def slug(text):
    chars = []
    for char in (text or "").lower():
        if char.isalnum():
            chars.append(char)
        elif chars and chars[-1] != "-":
            chars.append("-")
    return "".join(chars).strip("-") or "place"


def css_color(value):
    value = (value or "").strip()
    if re.fullmatch(r"#[0-9A-Fa-f]{6}", value) or re.fullmatch(r"#[0-9A-Fa-f]{3}", value):
        return value.lower()
    return ""


def fetch(url):
    lowered = url.lower()
    if any(piece in lowered for piece in BLOCKED):
        raise RuntimeError("refusing a non-results endpoint")
    request = urllib.request.Request(url, headers={"User-Agent": "Leaders.vote results"})
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.load(response)


def in_window(now=None):
    now = now or datetime.now(timezone.utc)
    return WINDOW_START <= now < WINDOW_END


def dist(point, start, end):
    if start == end:
        return math.hypot(point[0] - start[0], point[1] - start[1])
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    length = math.hypot(dx, dy)
    return abs(dy * point[0] - dx * point[1] + end[0] * start[1] - end[1] * start[0]) / length


def rdp(points, epsilon):
    if len(points) < 3:
        return points
    start, end = points[0], points[-1]
    index, farthest = 0, 0
    for i in range(1, len(points) - 1):
        gap = dist(points[i], start, end)
        if gap > farthest:
            farthest = gap
            index = i
    if farthest > epsilon:
        return rdp(points[: index + 1], epsilon)[:-1] + rdp(points[index:], epsilon)
    return [start, end]


def polygon_list(geometry):
    kind = geometry.get("type")
    coords = geometry.get("coordinates") or []
    if kind == "Polygon":
        return [coords] if coords else []
    if kind == "MultiPolygon":
        return [polygon for polygon in coords if polygon]
    return []


def point_in_ring(x, y, ring):
    inside = False
    count = len(ring)
    if count < 3:
        return False
    j = count - 1
    for i in range(count):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if (yi > y) != (yj > y):
            cross = (xj - xi) * (y - yi) / ((yj - yi) or 1e-12) + xi
            if x < cross:
                inside = not inside
        j = i
    return inside


def contains(geometry, lon, lat):
    for polygon in polygon_list(geometry):
        if point_in_ring(lon, lat, polygon[0]) and not any(
            point_in_ring(lon, lat, hole) for hole in polygon[1:]
        ):
            return True
    return False


def centroid(geometry):
    best = None
    for polygon in polygon_list(geometry):
        ring = polygon[0]
        if len(ring) > (len(best) if best else 0):
            best = ring
    if not best:
        return None
    lon = sum(point[0] for point in best) / len(best)
    lat = sum(point[1] for point in best) / len(best)
    return lon, lat


def province_of(geometry, provinces):
    rings = []
    for polygon in polygon_list(geometry):
        if polygon and polygon[0]:
            rings.append(polygon[0])
    if not rings:
        return ""
    ring = max(rings, key=len)
    step = max(1, len(ring) // 30)
    samples = [ring[index] for index in range(0, len(ring), step)]
    average = centroid(geometry)
    if average:
        samples.append(average)
    for lon, lat in samples:
        for name, shape in provinces:
            if contains(shape, lon, lat):
                return name
    return ""


def project(lon, lat):
    return lon * math.cos(math.radians(-29)), -lat


def write_catalog():
    countries = fetch(ADM1_URL)
    provinces = [
        (feature["properties"].get("shapeName") or "", feature["geometry"])
        for feature in countries["features"]
    ]
    geo = fetch(ADM3_URL)
    shapes = []
    for feature in geo["features"]:
        name = feature["properties"].get("shapeName") or ""
        shapes.append(
            {
                "name": name,
                "key": norm(name),
                "province": province_of(feature["geometry"], provinces),
                "geometry": feature["geometry"],
            }
        )
    counts = Counter(shape["key"] for shape in shapes)
    used = Counter()
    catalog = []
    for shape in shapes:
        label = shape["name"]
        if counts[shape["key"]] > 1 and shape["province"]:
            label = "%s, %s" % (shape["name"], shape["province"])
        base = slug(label)
        used[base] += 1
        if used[base] > 1:
            base = "%s-%d" % (base, used[base])
        shape["slug"] = base
        shape["label"] = label
        catalog.append(
            {
                "slug": base,
                "name": shape["name"],
                "label": label,
                "key": shape["key"],
                "province": shape["province"],
            }
        )
    os.makedirs(ZA, exist_ok=True)
    json.dump(catalog, open(CATALOG, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    open(CATALOG, "a", encoding="utf-8").write("\n")
    write_svg(shapes)
    write_html(catalog)
    twins = [shape for shape in shapes if counts[shape["key"]] > 1]
    for shape in twins:
        print("shared name", shape["name"], "->", shape["province"], shape["slug"])
    missing = [item["name"] for item in catalog if not item["province"]]
    print("catalog", len(catalog), "without province", len(missing))
    return shapes


def write_svg(shapes):
    projected = []
    for shape in shapes:
        rings = []
        for polygon in polygon_list(shape["geometry"]):
            for ring in polygon:
                rings.append([project(lon, lat) for lon, lat in ring])
        projected.append((shape, rings))
    xs = [point[0] for _, rings in projected for ring in rings for point in ring]
    ys = [point[1] for _, rings in projected for ring in rings for point in ring]
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    pad, width = 12, 960
    scale = (width - pad * 2) / (maxx - minx)
    height = (maxy - miny) * scale + pad * 2

    def pixel(point):
        return pad + (point[0] - minx) * scale, pad + (maxy - point[1]) * scale

    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {0:.1f} {1:.1f}" role="img" aria-label="Map of South African municipalities">'.format(
            width, height
        ),
    ]
    for shape, rings in projected:
        commands = []
        for ring in rings:
            points = rdp([pixel(point) for point in ring], 0.7)
            if len(points) < 3:
                continue
            commands.append("M " + " L ".join("{0:.1f} {1:.1f}".format(x, y) for x, y in points) + " Z")
        if not commands:
            continue
        parts.append(
            '<path data-slug="{0}" data-name="{1}" d="{2}"/>'.format(
                esc(shape["slug"]), esc(shape["label"]), " ".join(commands)
            )
        )
    parts.append("</svg>")
    open(MAP, "w", encoding="utf-8", newline="\n").write("\n".join(parts) + "\n")
    print("wrote map", os.path.getsize(MAP))


def icon():
    return (
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E"
        "%3Crect width='32' height='32' fill='%231c1915'/%3E%3Ctext x='16' y='22' text-anchor='middle' "
        "font-family='Georgia' font-size='16' fill='%23f4f0e6'%3EL%3C/text%3E%3C/svg%3E"
    )


def lang_menu():
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from build_state_pages import LANG

    return LANG


def shell(title, description, root, local, here, nav, body, place=""):
    place_attr = ' data-place="%s"' % esc(place) if place else ""
    return """<!DOCTYPE html>
<html lang="en">
<head>
<script>try{var t=localStorage.getItem("leaders-theme");if(t&&t!=="light")document.documentElement.setAttribute("data-theme",t);var raw=localStorage.getItem("leaders-look");if(raw){var o=JSON.parse(raw),el=document.documentElement,css="",st=document.createElement("style");function hex(v){return typeof v==="string"&&/^#[0-9a-fA-F]{6}$/.test(v)?v:""}function lum(h){var n=parseInt(h.slice(1),16);return (((n>>16)&255)*3+((n>>8)&255)*6+(n&255))/10}function face(v){return typeof v==="string"&&v.length>0&&v.length<80?v:""}var body=face(o.body),display=face(o.display),paper=hex(o.paper),ink=hex(o.ink),bar=hex(o.bar),stripe=hex(o.stripe);if(body){el.style.setProperty("--look-body",body);el.classList.add("look-body");css+="html.look-body body{font-family:var(--look-body)}"}if(display){el.style.setProperty("--look-display",display);el.classList.add("look-display");css+="html.look-display h1,html.look-display h2,html.look-display h3,html.look-display .brand{font-family:var(--look-display)}"}if(paper){el.style.setProperty("--look-paper",paper);el.classList.add("look-paper");css+="html.look-paper{--paper:var(--look-paper)}"}if(ink){el.style.setProperty("--look-ink",ink);el.classList.add("look-ink");css+="html.look-ink{--ink:var(--look-ink)}"}if(bar){el.style.setProperty("--look-bar",bar);el.style.setProperty("--look-bar-ink",lum(bar)>150?"#1c1915":"#f4f7fb");el.classList.add("look-bar");css+="html.look-bar body{--bar:var(--look-bar);--bar-ink:var(--look-bar-ink)}"}if(stripe){el.style.setProperty("--look-stripe",stripe);el.classList.add("look-stripe");css+="html.look-stripe body{--bar-stripe:var(--look-stripe);--bar-hover:var(--look-stripe)}"}if(css){st.textContent=css;document.head.appendChild(st)}}}catch(e){}</script>
<script src="%stheme.js?v=34" defer></script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
<meta name="description" content="%s">
<link rel="icon" href="%s">
<link rel="stylesheet" href="%sguide.css?v=life14">
</head>
<body class="theme-za" data-results="%sresults.json"%s>
<header>
  <div class="wrap bar">
    <div class="bar-top">
      <a class="brand notranslate" href="%sindex.html" translate="no">Leaders.vote</a>
      <div class="lang notranslate" translate="no">%s</div>
    </div>
    <p class="here notranslate" translate="no"><img src="%sflags/za.svg" alt=""><span>%s</span></p>
    <nav>
      %s
    </nav>
  </div>
</header>
<main>
  <div class="wrap hero">
    <p id="lang-note" class="lang-note" hidden>Automatic translation. Printed names stay as printed. A translation can change a sentence, so the English page is the record.</p>
%s
  </div>
</main>
<footer>
  <div class="wrap">
    <p>Leaders.vote is an independent voter guide. It is not a campaign, not an endorsement, and not a site of any election authority. This page is South Africa.</p>
    <p>Vote totals are copied from the <a href="%s">Electoral Commission results file</a> for the 4 November 2026 local government elections. A place is colored only when that file reports votes and one party is ahead. This site does not call a race. It does not ask for a home address, a phone number, or an email address.</p>
    <p>Municipality outlines are the 2020 local-municipality boundaries published by geoBoundaries from the Municipal Demarcation Board, under CC BY 3.0 IGO. A reported total that does not match one outline is listed and left off the map.</p>
  </div>
</footer>
<div id="google_translate_element" aria-hidden="true"></div>
<script src="%slang.js?v=2"></script>
<script src="%smap.js?v=blend4"></script>
</body>
</html>
""" % (
        root,
        esc(title),
        esc(description),
        icon(),
        root,
        local,
        place_attr,
        root,
        lang_menu(),
        root,
        esc(here),
        nav,
        body,
        RESULTS_PAGE,
        root,
        local,
    )


def write_html(catalog):
    links = []
    for item in sorted(catalog, key=lambda row: row["label"].lower()):
        links.append(
            '<a href="m/%s.html" data-slug="%s">%s</a>'
            % (esc(item["slug"]), esc(item["slug"]), esc(item["label"]))
        )
    body = """    <p class="kicker">South Africa · Local government elections · Wednesday, 4 November 2026</p>
    <h1>South Africa is electing local councils.</h1>
    <p class="deck">This is not an election for president, and it is not the national parliament. Voters are choosing the councils that run cities, towns, and rural areas.</p>
    <p class="deck">The country is divided into %d municipalities. A municipality is the area one local council governs. Johannesburg and Cape Town are municipalities. So is a rural council whose name you may not know. A province is one of South Africa's nine larger regions, the level above a municipality.</p>
    <p class="deck">The map is those municipalities. Beige means the Electoral Commission has not reported votes there. A color appears only when reported votes have one party ahead. That color is the one the Commission records for the party. It does not stand for a party from another country. This map does not declare a winner.</p>
    <p class="deck">A ward is a smaller piece inside a municipality, closer to a neighborhood or a city district. Ward lines are not drawn. A ward would be colored only from that ward's own reported votes, and those outlines are not matched to this election's file.</p>
    <p class="deck">The Commission publishes voting stations on its own site. This page does not ask for a home address.</p>
    <div id="place-slot"></div>
    <div class="result-legend" id="place-legend"><span><i class="swatch blank"></i> No votes reported</span></div>
    <p id="place-status" class="note">Reported totals load from the Electoral Commission file.</p>
    <div id="national-rows"></div>
    <div id="unmatched"></div>
    <h2 id="municipalities">The %d municipalities</h2>
    <p class="deck">These names are the same places as the map, listed from A to Z. Each name is a council, not a candidate. It may be a city, such as Cape Town, a rural area, or a person the council is named for. Open a name to see that council. When two councils share a name, the province is added so they stay separate. Emalahleni in the Eastern Cape is not Emalahleni in Mpumalanga.</p>
    <div class="state-list">%s</div>""" % (len(catalog), len(catalog), "\n".join(links))
    nav = '<a href="../countries.html">Countries</a>\n      <a href="../index.html">United States</a>'
    page = shell(
        "Leaders.vote · South Africa, 4 November 2026",
        "Leaders.vote guide to South Africa's 4 November 2026 local government elections. Municipality colors come only from reported Electoral Commission totals.",
        "../",
        "",
        "South Africa",
        nav,
        body,
    )
    open(os.path.join(ZA, "index.html"), "w", encoding="utf-8", newline="\n").write(page)
    os.makedirs(MUNICIPALITIES, exist_ok=True)
    nav = (
        '<a href="../../countries.html">Countries</a>\n'
        '      <a href="../index.html">South Africa</a>\n'
        '      <a href="../../index.html">United States</a>'
    )
    for item in catalog:
        province = item["province"] or "South Africa"
        body = """    <p class="kicker">%s · Local government elections · 4 November 2026</p>
    <h1 class="notranslate" translate="no">%s</h1>
    <p class="deck">You are looking at one local council in South Africa. The large name is that council. The smaller line above it is the province, one of the country's nine regions. A council's name can be a city, a rural area, or a person. It is not a candidate, and this is not an election for the national government.</p>
    <p class="sub">When the Electoral Commission publishes votes for this council, they appear below. Leaders.vote does not add a candidate's positions or a photo. Until a total is published, this place stays the land color on the country map. A lead in the count is not a declared winner.</p>
    <p id="place-status" class="note">The Electoral Commission has not published a vote total for this council yet.</p>
    <div id="place-rows"></div>
    <p class="deck"><a href="%s">Electoral Commission results</a> · <a href="%s">Electoral Commission of South Africa</a></p>""" % (
            esc(province),
            esc(item["label"]),
            RESULTS_PAGE,
            COMMISSION,
        )
        page = shell(
            "Leaders.vote · %s, South Africa" % item["label"],
            "Reported council totals for %s in South Africa's 4 November 2026 local elections. No total is invented."
            % item["label"],
            "../../",
            "../",
            item["label"],
            nav,
            body,
            item["slug"],
        )
        open(os.path.join(MUNICIPALITIES, item["slug"] + ".html"), "w", encoding="utf-8", newline="\n").write(page)
    write_countries()
    seo.publish()
    print("wrote pages", len(catalog))


def write_countries():
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from build_more import write_countries as write_all

    write_all()


def number(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return int(value)


def province_from_code(code):
    letters = ""
    for char in code or "":
        if char.isalpha():
            letters += char
        else:
            break
    return PREFIX.get(letters.upper(), "")


def split_municipality(text):
    code, _, name = (text or "").partition(" - ")
    code = code.strip()
    name = (name or text or "").strip()
    return code, name


def party_table(rows):
    table = {}
    for row in rows or []:
        if not isinstance(row, dict):
            continue
        party_id = row.get("ID")
        color = css_color(row.get("sWebColour"))
        abbr = (row.get("Name") or "").strip()
        full = (row.get("PartyFullName") or "").strip()
        if party_id is None or not abbr or not full:
            continue
        table[str(party_id)] = {"abbr": abbr, "name": full, "color": color}
    return table


def ballot_rows(items):
    rows = []
    for item in items or []:
        if not isinstance(item, dict) or "ID" not in item:
            continue
        votes = number(item.get("TotalValidVotes")) if "TotalValidVotes" in item else None
        if votes is None:
            continue
        percent = item.get("PercOfVotes")
        if isinstance(percent, bool) or not isinstance(percent, (int, float)):
            percent = None
        rows.append(
            {
                "id": item.get("ID"),
                "votes": votes,
                "percent": percent,
                "order": number(item.get("IOrder")) or 0,
            }
        )
    rows.sort(key=lambda row: (row["order"], str(row["id"])))
    return rows


def lead(rows):
    ranked = [row for row in rows if row["votes"] > 0]
    ranked.sort(key=lambda row: row["votes"], reverse=True)
    if not ranked:
        return None
    if len(ranked) > 1 and ranked[0]["votes"] == ranked[1]["votes"]:
        return None
    second = ranked[1]["votes"] if len(ranked) > 1 else None
    total = sum(row["votes"] for row in ranked)
    gap = None if second is None or not total else (ranked[0]["votes"] - second) / total * 100
    amount = 0.7 if gap is None else max(0.45, min(1, gap / 32))
    return {"id": ranked[0]["id"], "gap": gap, "amount": round(amount, 3)}


def iter_municipalities(payload):
    for province in payload.get("ProvinceResults") or []:
        if not isinstance(province, dict):
            continue
        for municipality in province.get("MunicipalityResults") or []:
            if isinstance(municipality, dict):
                yield province, municipality


def match_place(entry, groups):
    code, name = split_municipality(entry.get("Municipality") or "")
    province = (entry.get("Province") or "").strip() or province_from_code(code)
    key = ALIASES.get(norm(name), norm(name))
    hits = groups.get(key) or []
    if province:
        narrowed = [item for item in hits if item["province"] == province]
        if len(narrowed) == 1:
            return narrowed[0]
        if len(narrowed) > 1:
            return None
    if len(hits) == 1:
        return hits[0]
    return None


def build_results(catalog):
    payload = fetch(NATIONAL_URL)
    parties = party_table(fetch(PARTY_URL))
    groups = {}
    for item in catalog:
        groups.setdefault(item["key"], []).append(item)
    used = {}
    places = []
    unmatched = []
    for province, entry in iter_municipalities(payload):
        rows = ballot_rows(entry.get("PartyBallotResults"))
        winner = lead(rows)
        reported = sum(row["votes"] for row in rows) if rows else None
        code, name = split_municipality(entry.get("Municipality") or "")
        place = match_place(entry, groups)
        leader_name = ""
        color = ""
        amount = None
        if winner and reported:
            party = parties.get(str(winner["id"])) or {}
            leader_name = party.get("abbr") or ""
            color = party.get("color") or ""
            amount = winner["amount"]
            if not leader_name or not color:
                winner = None
                leader_name = ""
                color = ""
                amount = None
        record = {
            "code": code,
            "name": name,
            "votes": reported,
            "rows": [{"id": row["id"], "votes": row["votes"], "percent": row["percent"]} for row in rows],
            "leader": leader_name if winner and reported else "",
            "leaderId": winner["id"] if winner and reported else None,
            "color": color if winner and reported else "",
            "amount": amount if winner and reported else None,
        }
        if place and place["slug"] not in used:
            record["slug"] = place["slug"]
            used[place["slug"]] = True
            places.append(record)
        else:
            record["province"] = (entry.get("Province") or province.get("Province") or "").strip()
            unmatched.append(record)
    national = ballot_rows(payload.get("PartyBallotResults"))
    referenced = {str(row["id"]) for row in national}
    for place in places + unmatched:
        for row in place["rows"]:
            referenced.add(str(row["id"]))
    kept = {key: value for key, value in parties.items() if key in referenced}
    progress = {
        "vdComplete": number(payload.get("VDsComplete")),
        "vdExpected": number(payload.get("VDExpected")),
        "wardsComplete": number(payload.get("WardsComplete")),
        "wardsExpected": number(payload.get("WardExpected")),
        "municipalitiesComplete": number(payload.get("MuncipalitiesComplete")),
        "municipalitiesExpected": number(payload.get("MunicExpected")),
    }
    return {
        "source": NATIONAL_URL,
        "partySource": PARTY_URL,
        "eventId": payload.get("ElectoralEventID"),
        "reportDate": payload.get("ReportDate") or "",
        "fetchedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "progress": progress,
        "parties": kept,
        "national": national,
        "places": places,
        "unmatched": unmatched,
    }


def signature(data):
    copy = dict(data)
    copy.pop("fetchedAt", None)
    return json.dumps(copy, sort_keys=True)


def write_results():
    catalog = json.load(open(CATALOG, encoding="utf-8"))
    data = build_results(catalog)
    previous = ""
    if os.path.exists(RESULTS):
        try:
            previous = signature(json.load(open(RESULTS, encoding="utf-8")))
        except (OSError, ValueError):
            previous = ""
    colored = [
        place
        for place in data["places"]
        if place.get("votes") and place.get("leader") and place.get("color")
    ]
    for place in data["places"] + data["unmatched"]:
        if not place.get("votes") and (place.get("leader") or place.get("color")):
            raise RuntimeError("refusing to color a municipality with no reported votes")
    if signature(data) == previous:
        print("results unchanged", "colored", len(colored), "unmatched", len(data["unmatched"]))
        return
    json.dump(data, open(RESULTS, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    open(RESULTS, "a", encoding="utf-8").write("\n")
    print(
        "wrote results",
        "places",
        len(data["places"]),
        "colored",
        len(colored),
        "unmatched",
        len(data["unmatched"]),
        "national parties",
        len(data["national"]),
    )


def main():
    results_only = "--results" in sys.argv
    force = "--force" in sys.argv
    if results_only and not force and not in_window():
        print("outside the South Africa results window")
        return
    if not results_only:
        write_catalog()
    elif not os.path.exists(CATALOG):
        write_catalog()
    write_results()


if __name__ == "__main__":
    main()
