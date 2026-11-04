"""Build country pages whose official files report votes by place.

A place is colored only when the file reports a total above zero and one
option is strictly ahead. This script does not invent a result, a photo,
or a polling place, and it does not keep an address, a phone number, or
an email address.
"""
import csv
import html
import io
import json
import math
import os
import re
import sys
import unicodedata
import urllib.request
import zipfile
from datetime import datetime, timezone
from string import Template

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GB = (
    "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/%s/ADM1/"
    "geoBoundaries-%s-ADM1_simplified.geojson"
)
UA = {"User-Agent": "Leaders.vote results"}

BRAZIL = [
    ("ac", "Acre"),
    ("al", "Alagoas"),
    ("ap", "Amapa"),
    ("am", "Amazonas"),
    ("ba", "Bahia"),
    ("ce", "Ceara"),
    ("df", "Distrito Federal"),
    ("es", "Espirito Santo"),
    ("go", "Goias"),
    ("ma", "Maranhao"),
    ("mt", "Mato Grosso"),
    ("ms", "Mato Grosso do Sul"),
    ("mg", "Minas Gerais"),
    ("pa", "Para"),
    ("pb", "Paraiba"),
    ("pr", "Parana"),
    ("pe", "Pernambuco"),
    ("pi", "Piaui"),
    ("rj", "Rio de Janeiro"),
    ("rn", "Rio Grande do Norte"),
    ("rs", "Rio Grande do Sul"),
    ("ro", "Rondonia"),
    ("rr", "Roraima"),
    ("sc", "Santa Catarina"),
    ("sp", "Sao Paulo"),
    ("se", "Sergipe"),
    ("to", "Tocantins"),
]
BRAZIL_ALIASES = {
    "federal district": "distrito federal",
    "distrito federal": "distrito federal",
}
SWEDEN_GROUPS = {
    "Stockholms län": ["Stockholms kommun", "Stockholms län"],
    "Uppsala län": ["Uppsala län"],
    "Södermanlands län": ["Södermanlands län"],
    "Östergötlands län": ["Östergötlands län"],
    "Jönköpings län": ["Jönköpings län"],
    "Kronobergs län": ["Kronobergs län"],
    "Kalmar län": ["Kalmar län"],
    "Gotlands län": ["Gotlands län"],
    "Blekinge län": ["Blekinge län"],
    "Skåne län": ["Malmö kommun", "Skåne läns västra", "Skåne läns södra", "Skåne läns norra och östra"],
    "Hallands län": ["Hallands län"],
    "Västra Götalands län": [
        "Göteborgs kommun",
        "Västra Götalands läns västra",
        "Västra Götalands läns norra",
        "Västra Götalands läns södra",
        "Västra Götalands läns östra",
    ],
    "Värmlands län": ["Värmlands län"],
    "Örebro län": ["Örebro län"],
    "Västmanlands län": ["Västmanlands län"],
    "Dalarnas län": ["Dalarnas län"],
    "Gävleborgs län": ["Gävleborgs län"],
    "Västernorrlands län": ["Västernorrlands län"],
    "Jämtlands län": ["Jämtlands län"],
    "Västerbottens län": ["Västerbottens län"],
    "Norrbottens län": ["Norrbottens län"],
}
SLOVAKIA = {
    "bratislavsky kraj": "Region of Bratislava",
    "trnavsky kraj": "Region of Trnava",
    "trenciansky kraj": "Region of Trencin",
    "nitriansky kraj": "Region of Nitra",
    "zilinsky kraj": "Region of Zilina",
    "banskobystricky kraj": "Region of Banska Bystrica",
    "presovsky kraj": "Region of Presov",
    "kosicky kraj": "Region of Kosice",
}
CYPRUS = {
    "αμμοχωστος": "Famagusta",
    "λευκωσια": "Nicosia",
    "λεμεσος": "Limassol",
    "λαρνακα": "Larnaca",
    "παφος": "Paphos",
    "κερυνεια": "Kyrenia",
}
YES = "#1f6b4a"
NO = "#6b4423"
AHEAD = "#3f4f3a"
LULA = "#b42318"
BOLSONARO = "#1d4e89"


def esc(text):
    return html.escape(text or "", quote=True)


def norm(text):
    text = unicodedata.normalize("NFKD", text or "")
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = text.lower().replace("'", "")
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
    if any(piece in lowered for piece in ("voters", "idnumber", "address", "geocode")):
        raise RuntimeError("refusing a non-results endpoint")
    request = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(request, timeout=180) as response:
        return response.read()


def fetch_json(url):
    return json.loads(fetch(url))


def dist(point, start, end):
    if start == end:
        return math.hypot(point[0] - start[0], point[1] - start[1])
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    length = math.hypot(dx, dy) or 1
    return abs(dy * point[0] - dx * point[1] + end[0] * start[1] - end[1] * start[0]) / length


def rdp(points, epsilon):
    if len(points) < 3:
        return points
    start, end = points[0], points[-1]
    index, farthest = 0, 0.0
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


def shapes_of(iso):
    geo = fetch_json(GB % (iso, iso))
    shapes = []
    for feature in geo["features"]:
        name = feature["properties"].get("shapeName") or ""
        shapes.append({"name": name, "label": name, "key": norm(name), "geometry": feature["geometry"]})
    used = {}
    for shape in shapes:
        base = slug(shape["label"])
        used[base] = used.get(base, 0) + 1
        shape["slug"] = base if used[base] == 1 else "%s-%d" % (base, used[base])
    return shapes


def project(lon, lat, lat0):
    return lon * math.cos(math.radians(lat0)), -lat


def write_svg(folder, shapes, label):
    lats = []
    for shape in shapes:
        for polygon in polygon_list(shape["geometry"]):
            for ring in polygon:
                lats.extend(point[1] for point in ring)
    lat0 = sum(lats) / len(lats) if lats else 0
    projected = []
    for shape in shapes:
        rings = []
        for polygon in polygon_list(shape["geometry"]):
            for ring in polygon:
                rings.append([project(lon, lat, lat0) for lon, lat in ring])
        projected.append((shape, rings))
    xs = [point[0] for _, rings in projected for ring in rings for point in ring]
    ys = [point[1] for _, rings in projected for ring in rings for point in ring]
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    pad, width = 12, 960
    scale = (width - pad * 2) / (maxx - minx or 1)
    height = (maxy - miny) * scale + pad * 2

    def pixel(point):
        return pad + (point[0] - minx) * scale, pad + (maxy - point[1]) * scale

    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %.1f %.1f" role="img" aria-label="%s">'
        % (width, height, esc(label)),
    ]
    for shape, rings in projected:
        commands = []
        for ring in rings:
            points = rdp([pixel(point) for point in ring], 0.65)
            if len(points) < 3:
                continue
            commands.append("M " + " L ".join("%.1f %.1f" % (x, y) for x, y in points) + " Z")
        if commands:
            parts.append(
                '<path data-slug="%s" data-name="%s" d="%s"/>'
                % (esc(shape["slug"]), esc(shape["label"]), " ".join(commands))
            )
    parts.append("</svg>")
    path = os.path.join(folder, "map.svg")
    open(path, "w", encoding="utf-8", newline="\n").write("\n".join(parts) + "\n")
    return path


def percent_rows(rows):
    total = sum(row["votes"] for row in rows)
    out = []
    for row in sorted(rows, key=lambda item: (-item["votes"], item["name"])):
        copy = dict(row)
        copy["percent"] = (100.0 * row["votes"] / total) if total else None
        out.append(copy)
    return out


def lead_of(rows):
    ranked = percent_rows(rows)
    if not ranked or not ranked[0]["votes"]:
        return None, ranked
    if len(ranked) > 1 and ranked[0]["votes"] == ranked[1]["votes"]:
        return None, ranked
    top = ranked[0]
    second = ranked[1]["votes"] if len(ranked) > 1 else 0
    gap = (top["votes"] - second) / top["votes"]
    top["amount"] = max(0.45, min(1, 0.45 + gap))
    return top, ranked


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


def shell(spec, here, nav, body, place=""):
    place_attr = ' data-place="%s"' % esc(place) if place else ""
    root = spec["root"]
    local = spec["local"]
    markup = Template("""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>$title</title>
<meta name="description" content="$description">
<link rel="icon" href="$icon">
<link rel="stylesheet" href="${root}guide.css?v=za2">
</head>
<body class="theme-$code" data-results="${local}results.json"$place>
<header>
  <div class="wrap bar">
    <div class="bar-top">
      <a class="brand notranslate" href="${root}index.html" translate="no">Leaders.vote</a>
      <div class="lang notranslate" translate="no">$lang</div>
    </div>
    <p class="here notranslate" translate="no"><img src="${root}flags/$flag" alt=""><span>$here</span></p>
    <nav>
      $nav
    </nav>
  </div>
</header>
<main>
  <div class="wrap hero">
    <p id="lang-note" class="lang-note" hidden>Automatic translation. Printed names stay as printed. A translation can change a sentence, so the English page is the record.</p>
$body
  </div>
</main>
<footer>
  <div class="wrap">
    <p>Leaders.vote is an independent voter guide. It is not a campaign, not an endorsement, and not a site of any election authority. This page is $country.</p>
    <p>$footer</p>
    <p>Outlines are simplified first-level boundaries from geoBoundaries, under CC BY 4.0. A reported total that does not match one outline is listed and left off the map.</p>
  </div>
</footer>
<div id="google_translate_element" aria-hidden="true"></div>
<script src="${root}lang.js"></script>
<script src="${root}place.js?v=1"></script>
</body>
</html>
""").substitute(
        title=esc(spec["title"] if not place else "Leaders.vote · %s, %s" % (here, spec["country"])),
        description=esc(spec["description"]),
        icon=icon(),
        root=root,
        local=local,
        code=spec["code"],
        place=place_attr,
        lang=lang_menu(),
        flag=spec["flag"],
        here=esc(here),
        nav=nav,
        body=body,
        country=esc(spec["country"]),
        footer=spec["footer"],
    )
    return markup


def write_pages(spec, shapes, data):
    folder = os.path.join(ROOT, spec["code"])
    places = os.path.join(folder, "m")
    os.makedirs(places, exist_ok=True)
    write_svg(folder, shapes, spec["map_label"])
    json.dump(data, open(os.path.join(folder, "results.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    open(os.path.join(folder, "results.json"), "a", encoding="utf-8").write("\n")
    by_slug = {place["slug"]: place for place in data["places"]}
    links = []
    for shape in sorted(shapes, key=lambda item: item["label"].lower()):
        links.append(
            '<a href="m/%s.html" data-slug="%s">%s</a>'
            % (esc(shape["slug"]), esc(shape["slug"]), esc(shape["label"]))
        )
    spec = dict(spec, root="../", local="")
    body = spec["intro"] + """
    <div id="place-slot"></div>
    <div class="result-legend" id="place-legend"><span><i class="swatch blank"></i> No votes reported</span></div>
    <p id="place-status" class="note">Reported totals load from the official file.</p>
    <div id="national-rows"></div>
    <div id="extra"></div>
    <h2>%s</h2>
    <p class="deck">%s</p>
    <div class="state-list">%s</div>""" % (
        esc(spec["list_title"]),
        esc(spec["list_note"]),
        "\n".join(links),
    )
    nav = '<a href="../countries.html">Countries</a>\n      <a href="../index.html">United States</a>'
    open(os.path.join(folder, "index.html"), "w", encoding="utf-8", newline="\n").write(
        shell(spec, spec["country"], nav, body)
    )
    nav = (
        '<a href="../../countries.html">Countries</a>\n'
        '      <a href="../index.html">%s</a>\n'
        '      <a href="../../index.html">United States</a>' % esc(spec["country"])
    )
    child = dict(spec, root="../../", local="../")
    for shape in shapes:
        place = by_slug.get(shape["slug"])
        body = """    <p class="kicker">%s</p>
    <h1 class="notranslate" translate="no">%s</h1>
    <p class="deck">%s</p>
    <p id="place-status" class="note">No vote total has been published for this place yet. It stays beige.</p>
    <div id="place-rows"></div>
    <p class="deck"><a href="%s">Official results</a></p>""" % (
            esc(spec["kicker"]),
            esc(shape["label"]),
            esc(spec["place_note"]),
            esc(spec["source"]),
        )
        if place and not place.get("votes") and (place.get("leader") or place.get("color")):
            raise RuntimeError("refusing to color a place with no reported votes")
        open(os.path.join(places, shape["slug"] + ".html"), "w", encoding="utf-8", newline="\n").write(
            shell(child, shape["label"], nav, body, shape["slug"])
        )
    colored = [place for place in data["places"] if place.get("votes") and place.get("leader") and place.get("color")]
    print(spec["code"], "places", len(shapes), "colored", len(colored), "matched", len(data["places"]))


def match_shapes(shapes, rows_by_key):
    places = []
    used = set()
    for shape in shapes:
        row = rows_by_key.get(shape["key"])
        if not row:
            continue
        used.add(shape["key"])
        top, ranked = lead_of(row["rows"])
        place = {
            "slug": shape["slug"],
            "name": shape["label"],
            "votes": sum(item["votes"] for item in row["rows"]),
            "leader": "",
            "color": "",
            "amount": 0.7,
            "summary": row.get("tie") or "Votes are reported, and no one is strictly ahead. The map stays beige.",
            "rows": [
                {"name": item["name"], "votes": item["votes"], "percent": item["percent"]}
                for item in ranked
            ],
        }
        if top and top.get("color"):
            place["leader"] = top["legend"]
            place["color"] = top["color"]
            place["amount"] = top["amount"]
            place["summary"] = row["summary"] % top
        if row.get("tables"):
            place["tables"] = row["tables"]
        if place["votes"] and not place["leader"] and place["color"]:
            raise RuntimeError("refusing a color without a lead")
        places.append(place)
    missed = [key for key in rows_by_key if key not in used]
    return places, missed


def brazil_rows(payload):
    rows = []
    for group in payload["carg"][0].get("agr") or []:
        for part in group.get("par") or []:
            for cand in part.get("cand") or []:
                name = cand.get("nmu") or cand.get("nm") or ""
                folded = norm(name)
                color = ""
                if "lula" in folded:
                    color = LULA
                elif "bolsonaro" in folded:
                    color = BOLSONARO
                rows.append(
                    {
                        "name": "%s · %s" % (name, part.get("sg") or part.get("nm") or ""),
                        "short": name,
                        "votes": int(cand.get("vap") or 0),
                        "color": color,
                        "legend": name + " ahead",
                    }
                )
    return rows


def build_brazil():
    shapes = shapes_of("BRA")
    for shape in shapes:
        fixed = {
            "rio granda do norte": "Rio Grande do Norte",
            "rio de jeneiro": "Rio de Janeiro",
        }.get(shape["key"])
        if fixed:
            shape["name"] = fixed
            shape["label"] = fixed
            shape["key"] = norm(fixed)
            shape["slug"] = slug(fixed)
    labels = {
        "amapa": "Amapá",
        "ceara": "Ceará",
        "espirito-santo": "Espírito Santo",
        "goias": "Goiás",
        "maranhao": "Maranhão",
        "para": "Pará",
        "paraiba": "Paraíba",
        "parana": "Paraná",
        "piaui": "Piauí",
        "rondonia": "Rondônia",
        "sao-paulo": "São Paulo",
    }
    for shape in shapes:
        shape["label"] = labels.get(shape["slug"], shape["label"])
    by_key = {shape["key"]: shape for shape in shapes}
    print("BRA outlines", " | ".join(shape["name"] for shape in shapes))
    national = fetch_json("https://resultados.tse.jus.br/oficial/ele2026/6258/dados/br/br-c0001-e006258-u.json")
    rows_by_key = {}
    for code, name in BRAZIL:
        payload = fetch_json(
            "https://resultados.tse.jus.br/oficial/ele2026/6258/dados/%s/%s-c0001-e006258-u.json" % (code, code)
        )
        key = BRAZIL_ALIASES.get(norm(name), norm(name))
        if key not in by_key:
            key = next((shape["key"] for shape in shapes if shape["key"] == key or key in shape["key"]), "")
        if not key:
            print("BRA unmatched code", code, name)
            continue
        rows_by_key[key] = {
            "rows": brazil_rows(payload),
            "summary": "%(short)s has more reported presidential votes here than the other candidate. That is a lead in the count, not a declaration by this site.",
            "tie": "Votes are reported, and the two candidates are tied. The map stays beige.",
        }
    places, missed = match_shapes(shapes, rows_by_key)
    if missed:
        print("BRA missed", missed)
    national_rows = percent_rows(brazil_rows(national))
    data = {
        "source": "https://resultados.tse.jus.br/oficial/ele2026/6258/dados/br/br-c0001-e006258-u.json",
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "status": "Superior Electoral Court file dated %s %s. The file marks the presidential count finished. A state is colored only from the votes reported there. The court does not publish a candidate color, so the legend colors only tell the two people apart. This page does not declare a winner."
        % (national.get("dt") or "", national.get("ht") or ""),
        "strings": {"blank": "No votes reported", "missing": "No presidential total has been published for this state yet. It stays beige."},
        "tables": [
            {
                "title": "Presidential vote, whole country",
                "note": "Second round, 25 October 2026. These are the two candidates in the court's national file. The numbers are not a vote for governor or for congress.",
                "column": "Candidate",
                "rows": [{"name": row["name"], "votes": row["votes"], "percent": row["percent"]} for row in national_rows],
            }
        ],
        "places": places,
    }
    spec = {
        "code": "br",
        "country": "Brazil",
        "flag": "br.svg",
        "title": "Leaders.vote · Brazil, 25 October 2026",
        "description": "Presidential votes by Brazilian state from the Superior Electoral Court. A state is colored only from reported votes.",
        "map_label": "Map of Brazilian states",
        "kicker": "Brazil · Presidential election, second round · 25 October 2026",
        "source": "https://resultados.tse.jus.br/oficial/app/index.html",
        "footer": 'Vote totals are copied from the <a href="https://resultados.tse.jus.br/oficial/app/index.html">Superior Electoral Court results file</a> for the 25 October 2026 presidential runoff. A state is colored only when that file reports votes and one candidate is ahead. This site does not declare a winner. It does not ask for a home address, a phone number, or an email address.',
        "list_title": "The 26 states and the federal district",
        "list_note": "These are the same places as the map. A state is a large region. The federal district is the area of the capital, Brasília. Open a name for the presidential votes reported there. A municipality, the city or town inside a state, is not drawn.",
        "place_note": "You are looking at one state in Brazil, or at the federal district. The numbers are presidential votes. They are not the vote for governor, senator, or the local council. A municipality is a smaller place inside this state and is not on this map.",
        "intro": """    <p class="kicker">Brazil · Presidential election, second round · 25 October 2026</p>
    <h1>Brazil has counted a vote for president.</h1>
    <p class="deck">Voters chose one president for the whole country. This map is not the vote for a governor, a senator, or a city council.</p>
    <p class="deck">Brazil has 26 states and one federal district. A state is a large region. The federal district is the capital's own area. The color is who is ahead in the presidential votes the Superior Electoral Court reported for that place.</p>
    <p class="deck">The court does not publish a color. Red in the legend means Lula is ahead. Blue means Flávio Bolsonaro is ahead. The colors only tell the two people apart.</p>
    <p class="deck">A municipality is a city or town inside a state. Those smaller places are not drawn.</p>""",
    }
    write_pages(spec, shapes, data)


def party_bucket():
    return {}


def add_sweden_party(bucket, party):
    key = party.get("partiforkortning") or party.get("partibeteckning") or ""
    if not key:
        return
    row = bucket.setdefault(
        key,
        {
            "name": (party.get("partiforkortning") or "") + " · " + (party.get("partibeteckning") or key),
            "votes": 0,
            "color": css_color(party.get("fargkod")),
            "legend": (party.get("partiforkortning") or key) + " ahead",
            "short": party.get("partiforkortning") or key,
        },
    )
    row["votes"] += int(party.get("antalRoster") or 0)
    if not row["color"]:
        row["color"] = css_color(party.get("fargkod"))


def build_sweden():
    shapes = shapes_of("SWE")
    payload = fetch_json("https://resultat.val.se/data/resultat/val2026/RD_S.json")
    by_name = {item["namn"]: item for item in payload["valkretsar"]}
    assigned = []
    rows_by_key = {}
    lists = []
    for shape_name, members in SWEDEN_GROUPS.items():
        bucket = party_bucket()
        for name in members:
            area = by_name.get(name)
            if not area:
                raise RuntimeError("missing Swedish constituency " + name)
            assigned.append(name)
            for party in area["rosterPaverkaMandat"]["partiroster"]:
                add_sweden_party(bucket, party)
            local_bucket = party_bucket()
            for party in area["rosterPaverkaMandat"]["partiroster"]:
                add_sweden_party(local_bucket, party)
            local_top, _ = lead_of(list(local_bucket.values()))
            detail = local_top["short"] + " ahead" if local_top else "no one is strictly ahead"
            lists.append({"name": name, "detail": detail})
        rows_by_key[norm(shape_name)] = {
            "rows": list(bucket.values()),
            "summary": "%(short)s has more reported parliamentary votes in this county than the other parties. The color is the one in the Election Authority's file. A lead is not a declaration by this site.",
            "tie": "Votes are reported, and the top parties are tied. The map stays beige.",
        }
    missing = [name for name in by_name if name not in assigned]
    if missing:
        raise RuntimeError("Swedish constituencies not placed: " + ", ".join(missing))
    places, missed = match_shapes(shapes, rows_by_key)
    if missed:
        print("SWE missed", missed)
    national_rows = []
    for party in payload["rosterPaverkaMandat"]["partiroster"]:
        votes = int(party.get("antalRoster") or 0)
        share = party.get("andelRoster")
        if not votes or not isinstance(share, (int, float)) or share < 1:
            continue
        short = party.get("partiforkortning") or party.get("partibeteckning") or ""
        national_rows.append(
            {
                "name": short + " · " + (party.get("partibeteckning") or short),
                "votes": votes,
                "percent": share,
            }
        )
    national_rows.sort(key=lambda row: (-row["votes"], row["name"]))
    data = {
        "source": "https://resultat.val.se/data/resultat/val2026/RD_S.json",
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "status": "The Election Authority marks this as the final count for 13 September 2026. A county is colored by adding the official constituency votes inside it. This page does not declare a winner.",
        "strings": {"blank": "No votes reported"},
        "tables": [
            {
                "title": "Parties, counted across the whole country",
                "note": "Parties the Election Authority records at 1 percent or more. Share is that file's own percentage. Smaller lists stay in the file and are left off this table.",
                "column": "Party",
                "rows": [{"name": row["name"], "votes": row["votes"], "percent": row["percent"]} for row in national_rows],
            }
        ],
        "lists": [
            {
                "title": "The 29 constituencies",
                "note": "A constituency is the area that elects some members of parliament. The map does not draw these lines. Where a county is split, its color adds these official totals together.",
                "items": lists,
            }
        ],
        "places": places,
    }
    spec = {
        "code": "se",
        "country": "Sweden",
        "flag": "se.svg",
        "title": "Leaders.vote · Sweden, 13 September 2026",
        "description": "Sweden's parliamentary vote by county, added from official constituency totals.",
        "map_label": "Map of Swedish counties",
        "kicker": "Sweden · Parliament · 13 September 2026",
        "source": "https://resultat.val.se/",
        "footer": 'Vote totals are copied from the <a href="https://resultat.val.se/">Election Authority results file</a> for the 13 September 2026 parliamentary election. A county is colored only from those reported votes. This site does not declare a winner. It does not ask for a home address, a phone number, or an email address.',
        "list_title": "The 21 counties",
        "list_note": "A county is one of Sweden's 21 larger areas. Open a name for the parties' votes after the constituencies inside it are added together.",
        "place_note": "You are looking at one county in Sweden. The numbers add the official constituency results inside this county. A constituency is the smaller area that elects members of parliament. Those lines are not drawn.",
        "intro": """    <p class="kicker">Sweden · Parliament · 13 September 2026</p>
    <h1>Sweden has a final count for its parliament.</h1>
    <p class="deck">The count is for the Riksdag, the national parliament. This is one election for the whole country, not a local council and not a president.</p>
    <p class="deck">The parliament's seats are counted in 29 constituencies. Some constituencies are a whole county. Stockholm, Skåne, and Västra Götaland are split into more than one.</p>
    <p class="deck">The map shows the 21 counties. A county's color adds the official votes from the constituencies inside it. The color is the one the Election Authority records for that party.</p>""",
    }
    write_pages(spec, shapes, data)


def english_title(items):
    for item in items or []:
        if item.get("langKey") == "en" and item.get("text"):
            return item["text"]
    return ""


def yes_no(result):
    yes = int(result.get("jaStimmenAbsolut") or 0)
    no = int(result.get("neinStimmenAbsolut") or 0)
    return [
        {"name": "Yes", "votes": yes, "color": YES, "legend": "Yes ahead", "short": "Yes"},
        {"name": "No", "votes": no, "color": NO, "legend": "No ahead", "short": "No"},
    ]


def swiss_key(name):
    return norm(name.split("/")[0])


def build_switzerland():
    shapes = shapes_of("CHE")
    by_key = {shape["key"]: shape for shape in shapes}
    payload = fetch_json("https://ogd-static.voteinfo-app.ch/v1/ogd/sd-t-17-02-20260927-eidgAbstimmung.json")
    questions = payload["schweiz"]["vorlagen"]
    titles = [english_title(item.get("vorlagenTitel")) for item in questions]
    rows_by_key = {}
    alias = {swiss_key(name): name for name in (row["geoLevelname"] for row in questions[0]["kantone"])}
    for shape in shapes:
        official = None
        for name in (shape["name"], shape["name"].split("/")[0]):
            official = next((row for row in questions[0]["kantone"] if swiss_key(row["geoLevelname"]) == norm(name)), None)
            if official:
                break
        if not official:
            print("CH no canton", shape["name"])
            continue
        food = next(row for row in questions[1]["kantone"] if row["geoLevelname"] == official["geoLevelname"])
        if not official["resultat"].get("gebietAusgezaehlt"):
            continue
        food_rows = percent_rows(yes_no(food["resultat"]))
        rows_by_key[shape["key"]] = {
            "rows": yes_no(official["resultat"]),
            "summary": "%(short)s has more reported votes than the other answer on the neutrality question. Green means yes. Brown means no. A lead is not a declaration by this site.",
            "tie": "Yes and no have the same reported total. The map stays beige.",
            "tables": [
                {
                    "title": titles[1],
                    "note": "The same canton, on the other question. This question is not the color on the country map.",
                    "column": "Answer",
                    "rows": [{"name": row["name"], "votes": row["votes"], "percent": row["percent"]} for row in food_rows],
                }
            ],
        }
    places, missed = match_shapes(shapes, rows_by_key)
    if missed:
        print("CH missed keys", missed)
    tables = []
    for item, title in zip(questions, titles):
        rows = percent_rows(yes_no(item.get("resultat") or {}))
        if not any(row["votes"] for row in rows):
            summed = {}
            for canton in item["kantone"]:
                for row in yes_no(canton["resultat"]):
                    summed.setdefault(row["name"], dict(row, votes=0))
                    summed[row["name"]]["votes"] += row["votes"]
            rows = percent_rows(list(summed.values()))
        tables.append(
            {
                "title": title,
                "note": "Yes and no for the whole country, from the official file.",
                "column": "Answer",
                "rows": [{"name": row["name"], "votes": row["votes"], "percent": row["percent"]} for row in rows],
            }
        )
    provisional = any(item.get("provisorisch") for item in questions)
    data = {
        "source": "https://ogd-static.voteinfo-app.ch/v1/ogd/sd-t-17-02-20260927-eidgAbstimmung.json",
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "status": "Official file dated %s. %s A canton is colored only from the yes and no votes on the neutrality question. This page does not declare a result."
        % (
            payload.get("timestamp") or "",
            "The file still marks the count as provisional." if provisional else "The file marks the count finished.",
        ),
        "strings": {"blank": "No votes reported"},
        "tables": tables,
        "places": places,
    }
    spec = {
        "code": "ch",
        "country": "Switzerland",
        "flag": "ch.svg",
        "title": "Leaders.vote · Switzerland, 27 September 2026",
        "description": "Two Swiss national votes by canton. The map colors the neutrality question only from reported yes and no votes.",
        "map_label": "Map of Swiss cantons",
        "kicker": "Switzerland · National votes · 27 September 2026",
        "source": "https://ogd-static.voteinfo-app.ch/v1/ogd/sd-t-17-02-20260927-eidgAbstimmung.json",
        "footer": 'Vote totals are copied from the <a href="https://ogd-static.voteinfo-app.ch/v1/ogd/sd-t-17-02-20260927-eidgAbstimmung.json">official open results file</a> for the 27 September 2026 votes. A canton is colored only from reported yes and no votes. This site does not declare a result. It does not ask for a home address, a phone number, or an email address.',
        "list_title": "The 26 cantons",
        "list_note": "A canton is a member state of Switzerland. Open a name for both questions. The map color is only the neutrality question.",
        "place_note": "You are looking at one canton, a member state of Switzerland. The first numbers are the neutrality question, which is the color on the country map. The second table is the other question.",
        "intro": """    <p class="kicker">Switzerland · National votes · 27 September 2026</p>
    <h1>Switzerland voted on two national questions.</h1>
    <p class="deck">People voted yes or no. This is not an election for a president or a parliament.</p>
    <p class="deck">The map is the 26 cantons. A canton is a member state of the country. The color is the neutrality question. Green means yes is ahead. Brown means no is ahead. Those are legend colors, because the choice is yes or no rather than a party.</p>
    <p class="deck">The other question, on food, is in the table. One map color is not asked to stand for two questions.</p>""",
    }
    unused = alias
    write_pages(spec, shapes, data)


def build_slovakia():
    shapes = shapes_of("SVK")
    raw = fetch("https://volby.statistics.sk/osk/osk2026/files/OSK2026_SK_csv.zip")
    archive = zipfile.ZipFile(io.BytesIO(raw))
    text = archive.read("OSK2026_SK_tab06a.csv").decode("utf-8-sig")
    grouped = {}
    elected = {}
    for row in csv.DictReader(io.StringIO(text)):
        region = row["Názov kraja"]
        votes = int((row["Počet platných hlasov"] or "0").replace(" ", ""))
        name = (row["Meno"] + " " + row["Priezvisko"]).strip()
        party = row["Politický subjekt"] or ""
        label = name + (" · " + party if party else "")
        grouped.setdefault(region, []).append(
            {"name": label, "votes": votes, "color": AHEAD, "legend": name + " ahead", "short": name}
        )
        if (row.get("Kandidát") or "").strip() == "zvolený":
            elected[region] = name
    rows_by_key = {}
    for region, rows in grouped.items():
        key = SLOVAKIA.get(norm(region))
        if not key:
            print("SK unknown", region)
            continue
        note = ""
        if elected.get(region):
            note = " The Statistical Office marks %s as elected." % elected[region]
        rows_by_key[norm(key)] = {
            "rows": rows,
            "summary": "%(short)s has more reported votes for regional chair than the others." + note + " The office did not publish a color, so a mark only means someone is ahead. This site does not declare the result.",
            "tie": "Votes are reported, and the top candidates are tied. The map stays beige.",
        }
    places, missed = match_shapes(shapes, rows_by_key)
    if missed:
        print("SK missed", missed)
    data = {
        "source": "https://volby.statistics.sk/osk/osk2026/files/OSK2026_SK_csv.zip",
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "status": "Statistical Office file for the 24 October 2026 regional elections. A region is colored only when one chair candidate has more reported votes than the others. The office did not publish a color. This page does not declare a result.",
        "strings": {"blank": "No votes reported"},
        "tables": [],
        "places": places,
    }
    spec = {
        "code": "sk",
        "country": "Slovakia",
        "flag": "sk.svg",
        "title": "Leaders.vote · Slovakia, 24 October 2026",
        "description": "Slovakia's regional chair vote from the Statistical Office. A region is colored only from reported votes.",
        "map_label": "Map of Slovak regions",
        "kicker": "Slovakia · Regional elections · 24 October 2026",
        "source": "https://volby.statistics.sk/osk/osk2026/sk/suhrnne_vysledky.html",
        "footer": 'Vote totals are copied from the <a href="https://volby.statistics.sk/osk/osk2026/sk/subory_na_stiahnutie.html">Statistical Office results file</a> for the 24 October 2026 regional elections. A region is colored only from reported votes. This site does not declare a result. It does not ask for a home address, a phone number, or an email address.',
        "list_title": "The eight regions",
        "list_note": "A region is one of Slovakia's eight large areas. Open a name for the people who ran to chair that region. The council election is a separate vote and is not drawn here.",
        "place_note": "You are looking at one region in Slovakia. The numbers are the vote for the person who chairs the region. They are not the national parliament, and they are not the separate vote for the regional council.",
        "intro": """    <p class="kicker">Slovakia · Regional elections · 24 October 2026</p>
    <h1>Slovakia has counted the vote for regional chairs.</h1>
    <p class="deck">Each region voted for a chair, and it also voted for a council. This map is the chair. It is not the national parliament.</p>
    <p class="deck">There are eight regions. A mark means one candidate has more reported votes than the others. The Statistical Office did not publish a color, so the mark does not stand for a party. The candidate's name is on the region page.</p>""",
    }
    write_pages(spec, shapes, data)


def plain(text):
    return " ".join((text or "").strip().lower().split())


def build_cyprus():
    shapes = shapes_of("CYP")
    raw = fetch(
        "https://data.gov.cy/sites/default/files/%CE%91%CF%80%CE%BF%CF%84%CE%B5%CE%BB%CE%AD%CF%83%CE%BC%CE%B1%CF%84%CE%B1%20%CE%92%CE%BF%CF%85%CE%BB%CE%B5%CF%85%CF%84%CE%B9%CE%BA%CF%8E%CE%BD%20%CE%B5%CE%BA%CE%BB.%20%CE%B1%CE%BD%CE%B1%20%CE%B5%CE%BA%CE%BB.%20%CF%80%CE%B5%CF%81%CE%B9%CF%86%CE%AD%CF%81%CE%B5%CE%B9%CE%B1_2026.csv"
    ).decode("utf-8-sig")
    grouped = {}
    for row in csv.DictReader(io.StringIO(raw)):
        party = (row.get("PARTY") or "").strip()
        district = CYPRUS.get(plain(row.get("DISTRICT") or ""))
        if not party or not district:
            if (row.get("DISTRICT") or "").strip() and not district:
                print("CY unknown district", row.get("DISTRICT"))
            continue
        votes = int((row.get("VOTES") or "0").replace(" ", "") or 0)
        grouped.setdefault(district, []).append(
            {"name": party, "votes": votes, "color": AHEAD, "legend": party + " ahead", "short": party}
        )
    rows_by_key = {}
    for district, rows in grouped.items():
        rows_by_key[norm(district)] = {
            "rows": rows,
            "summary": "%(short)s has more reported votes in this district than the other parties. The open-data file does not publish a color, so the mark only means someone is ahead. This site does not declare a result.",
            "tie": "Votes are reported, and the top parties are tied. The map stays beige.",
        }
    places, missed = match_shapes(shapes, rows_by_key)
    if missed:
        print("CY missed", missed)
    national = {}
    for rows in grouped.values():
        for row in rows:
            bucket = national.setdefault(row["name"], {"name": row["name"], "votes": 0})
            bucket["votes"] += row["votes"]
    data = {
        "source": "https://data.gov.cy/en/dataset/2356",
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "status": "Official open-data file of the 2026 parliamentary election, totaled by district. A district is colored only when one party has more reported votes than the others. The file does not publish a color. This page does not declare a result.",
        "strings": {"blank": "No votes reported", "missing": "This district has no total in the Republic's open-data file. It stays beige."},
        "tables": [
            {
                "title": "Parties, added across the districts in the file",
                "note": "Each party's district totals added together. This is the parliamentary vote, not a presidential vote.",
                "column": "Party",
                "rows": [
                    {"name": row["name"], "votes": row["votes"], "percent": row["percent"]}
                    for row in percent_rows(list(national.values()))
                    if row["votes"]
                ],
            }
        ],
        "places": places,
    }
    spec = {
        "code": "cy",
        "country": "Cyprus",
        "flag": "cy.svg",
        "title": "Leaders.vote · Cyprus, parliamentary election 2026",
        "description": "Cyprus parliamentary votes by district from the official open-data file.",
        "map_label": "Map of Cypriot districts",
        "kicker": "Cyprus · House of Representatives · 2026",
        "source": "https://data.gov.cy/en/dataset/2356",
        "footer": 'Vote totals are copied from the <a href="https://data.gov.cy/en/dataset/2356">official open-data file</a> for the 2026 parliamentary election. A district is colored only from reported votes. This site does not declare a result. It does not ask for a home address, a phone number, or an email address.',
        "list_title": "The six districts",
        "list_note": "A district is one of the six areas that elect members of the House of Representatives. Open a name for the parties reported there. A district with no total in the file stays blank.",
        "place_note": "You are looking at one electoral district in Cyprus. The numbers are votes for the House of Representatives. They are not a city council and not a presidential election.",
        "intro": """    <p class="kicker">Cyprus · House of Representatives · 2026</p>
    <h1>Cyprus has published its parliamentary count.</h1>
    <p class="deck">The published count is for the House of Representatives, the national parliament. This is not a presidential election and not a city council.</p>
    <p class="deck">The country is divided into six electoral districts. A district is the area that elects a group of members. The open-data file gives each party's votes in a district. It does not give a color, so a mark only means one party is ahead. The party's name is on the district page.</p>
    <p class="deck">The file is the Republic's published count. A district with no row in that file stays blank.</p>""",
    }
    write_pages(spec, shapes, data)


def write_flags():
    flags = {
        "br.svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 14">
<rect width="20" height="14" fill="#009b3a"/>
<polygon points="10,1.2 18.6,7 10,12.8 1.4,7" fill="#fedd00"/>
<circle cx="10" cy="7" r="2.7" fill="#002776"/>
</svg>
""",
        "se.svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 10">
<rect width="16" height="10" fill="#006aa7"/>
<rect x="5" width="2" height="10" fill="#fecc00"/>
<rect y="4" width="16" height="2" fill="#fecc00"/>
</svg>
""",
        "ch.svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<rect width="32" height="32" fill="#ff0000"/>
<rect x="13" y="6" width="6" height="20" fill="#fff"/>
<rect x="6" y="13" width="20" height="6" fill="#fff"/>
</svg>
""",
        "sk.svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60">
<rect width="90" height="20" fill="#fff"/>
<rect y="20" width="90" height="20" fill="#0b4ea2"/>
<rect y="40" width="90" height="20" fill="#ee1c25"/>
</svg>
""",
    }
    folder = os.path.join(ROOT, "flags")
    for name, markup in flags.items():
        open(os.path.join(folder, name), "w", encoding="utf-8", newline="\n").write(markup)


def write_countries():
    menu = lang_menu()
    cards = """
      <a href="index.html"><img src="flags/us.svg" alt=""><strong>United States</strong><span>Countrywide election on 3 November 2026. Open a state, then see its counties. Color means a party is ahead on reported votes.</span></a>
      <a href="za/index.html"><img src="flags/za.svg" alt=""><strong>South Africa</strong><span>Local councils on 4 November 2026, not a presidential election. A municipality is the area one council governs.</span></a>
      <a href="br/index.html"><img src="flags/br.svg" alt=""><strong>Brazil</strong><span>Presidential runoff on 25 October 2026. A state is colored from the votes the electoral court reported there.</span></a>
      <a href="ch/index.html"><img src="flags/ch.svg" alt=""><strong>Switzerland</strong><span>Two yes-or-no questions on 27 September 2026. The map is the neutrality question, by canton.</span></a>
      <a href="sk/index.html"><img src="flags/sk.svg" alt=""><strong>Slovakia</strong><span>Regional chairs on 24 October 2026. A region is one of eight large areas.</span></a>
      <a href="se/index.html"><img src="flags/se.svg" alt=""><strong>Sweden</strong><span>Parliament on 13 September 2026. A county adds the official constituency votes inside it.</span></a>
      <a href="cy/index.html"><img src="flags/cy.svg" alt=""><strong>Cyprus</strong><span>Parliamentary election, 2026. A district is an area that elects members of the House.</span></a>"""
    nav = """
      <a href="index.html">United States</a>
      <a href="za/index.html">South Africa</a>
      <a href="br/index.html">Brazil</a>
      <a href="ch/index.html">Switzerland</a>
      <a href="sk/index.html">Slovakia</a>
      <a href="se/index.html">Sweden</a>
      <a href="cy/index.html">Cyprus</a>"""
    page = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Leaders.vote · Countries</title>
<meta name="description" content="Leaders.vote election guides. A place is colored only from reported vote totals. Not an endorsement.">
<link rel="icon" href="%s">
<link rel="stylesheet" href="guide.css?v=za2">
</head>
<body>
<header>
  <div class="wrap bar">
    <div class="bar-top">
      <a class="brand notranslate" href="index.html" translate="no">Leaders.vote</a>
      <div class="lang notranslate" translate="no">%s</div>
    </div>
    <p class="here notranslate" translate="no"><span>Countries</span></p>
    <nav>%s
    </nav>
  </div>
</header>
<main>
  <div class="wrap hero">
    <p id="lang-note" class="lang-note" hidden>Automatic translation. Printed names stay as printed. A translation can change a sentence, so the English page is the record.</p>
    <p class="kicker">Leaders.vote</p>
    <h1>Pick an election.</h1>
    <p class="deck">Leaders.vote is an independent, nonpartisan voter guide. It is not a campaign, not an endorsement, and not a government site. Each country below is a different kind of election. A place on a map is colored only from reported vote totals. A place with no total stays blank.</p>
    <div class="races">%s
    </div>
  </div>
</main>
<footer>
  <div class="wrap">
    <p>Leaders.vote does not ask for a home address, a phone number, or an email address, and it does not store them. An address lookup on a United States page opens that state's own election office and is not kept here.</p>
  </div>
</footer>
<div id="google_translate_element" aria-hidden="true"></div>
<script src="lang.js"></script>
</body>
</html>
""" % (
        icon(),
        menu,
        nav,
        cards,
    )
    open(os.path.join(ROOT, "countries.html"), "w", encoding="utf-8", newline="\n").write(page)


def main():
    write_flags()
    build_brazil()
    build_sweden()
    build_switzerland()
    build_slovakia()
    build_cyprus()
    write_countries()


if __name__ == "__main__":
    main()
