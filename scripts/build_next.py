"""Add countries whose official file already totals votes by a drawable place.

A place is colored only from those reported votes. This module does not keep
a polling place, an address, a phone number, an email, or an identity number.
"""
import csv
import html
import io
import re
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from html.parser import HTMLParser

import openpyxl

import build_more as b

AHEAD = b.AHEAD

PL_URL = "https://danewyborcze.kbw.gov.pl/dane/2023/sejmsenat/wyniki_gl_na_listy_po_wojewodztwach_sejm_csv.zip"
PL_PAGE = "https://danewyborcze.kbw.gov.pl/indexc6e4.html?title=Parlament_2023"
CZ_URL = "https://www.volby.cz/pls/ps2021/vysledky"
CZ_PAGE = "https://www.volby.cz/pls/ps2021/ps?xjazyk=EN"
ES_URL = "https://descargas.interior.gob.es/datasets/resultados_electorales/Elecciones-Congreso.xlsx"
ES_PAGE = "https://infoelectoral.interior.gob.es/es/elecciones-celebradas/resultados-electorales/"
FR_URL = (
    "https://static.data.gouv.fr/resources/elections-legislatives-des-30-juin-et-7-juillet-2024-"
    "resultats-definitifs-du-1er-tour/20240710-171318/resultats-definitifs-par-regions.csv"
)
FR_PAGE = (
    "https://www.data.gouv.fr/fr/datasets/elections-legislatives-des-30-juin-et-7-juillet-2024-"
    "resultats-definitifs-du-1er-tour/"
)
IT_URL = "https://documenti.camera.it/leg19/risultatiElettorali2022/UGE/VotiListe/ItaliaVotiListeCIRC.csv"
IT_PAGE = "https://documenti.camera.it/leg19/risultatiElettorali2022/UGE/VotiListe/"
CA_URL = "https://www.elections.ca/res/rep/off/ovrGE45/62/table8E.html"
CA_PAGE = "https://www.elections.ca/res/rep/off/ovrGE45/home.html"
CA_DATE = "https://www.elections.ca/content.aspx?section=ele&dir=pas/45ge&document=index&lang=e"

PL_NAMES = {
    "dolnośląskie": "Lower Silesian Voivodeship",
    "kujawsko-pomorskie": "Kuyavian-Pomeranian Voivodeship",
    "lubelskie": "Lublin Voivodeship",
    "lubuskie": "Lubusz Voivodeship",
    "łódzkie": "Łódź Voivodeship",
    "małopolskie": "Lesser Poland Voivodeship",
    "mazowieckie": "Masovian Voivodeship",
    "opolskie": "Opole Voivodeship",
    "podkarpackie": "Subcarpathian Voivodeship",
    "podlaskie": "Podlaskie Voivodeship",
    "pomorskie": "Pomeranian Voivodeship",
    "śląskie": "Silesian Voivodeship",
    "świętokrzyskie": "Świętokrzyskie Voivodeship",
    "warmińsko-mazurskie": "Warmian-Masurian Voivodeship",
    "wielkopolskie": "Greater Poland Voivodeship",
    "zachodniopomorskie": "West Pomeranian Voivodeship",
}
CZ_NAMES = {
    "Hl. m. Praha": "Hlavní město Praha",
    "Středočeský": "Středočeský kraj",
    "Jihočeský": "Jihočeský kraj",
    "Plzeňský": "Plzeňský kraj",
    "Karlovarský": "Karlovarský kraj",
    "Ústecký": "Ústecký kraj",
    "Liberecký": "Liberecký kraj",
    "Královéhradecký": "Královéhradecký kraj",
    "Pardubický": "Pardubický kraj",
    "Vysočina": "Kraj Vysočina",
    "Jihomoravský": "Jihomoravský kraj",
    "Olomoucký": "Olomoucký kraj",
    "Zlínský": "Zlínský kraj",
    "Moravskoslezský": "Moravskoslezský kraj",
}
ES_AREAS = {
    1: "País Vasco/Euskadi",
    2: "Castilla-La Mancha",
    3: "Comunitat Valenciana",
    4: "Andalucía",
    5: "Castilla y León",
    6: "Extremadura",
    7: "Illes Balears",
    8: "Cataluña/Catalunya",
    9: "Castilla y León",
    10: "Extremadura",
    11: "Andalucía",
    12: "Comunitat Valenciana",
    13: "Castilla-La Mancha",
    14: "Andalucía",
    15: "Galicia",
    16: "Castilla-La Mancha",
    17: "Cataluña/Catalunya",
    18: "Andalucía",
    19: "Castilla-La Mancha",
    20: "País Vasco/Euskadi",
    21: "Andalucía",
    22: "Aragón",
    23: "Andalucía",
    24: "Castilla y León",
    25: "Cataluña/Catalunya",
    26: "La Rioja",
    27: "Galicia",
    28: "Comunidad de Madrid",
    29: "Andalucía",
    30: "Región de Murcia",
    31: "Comunidad Foral de Navarra",
    32: "Galicia",
    33: "Principado de Asturias",
    34: "Castilla y León",
    35: "Canarias",
    36: "Galicia",
    37: "Castilla y León",
    38: "Canarias",
    39: "Cantabria",
    40: "Castilla y León",
    41: "Andalucía",
    42: "Castilla y León",
    43: "Cataluña/Catalunya",
    44: "Aragón",
    45: "Castilla-La Mancha",
    46: "Comunitat Valenciana",
    47: "Castilla y León",
    48: "País Vasco/Euskadi",
    49: "Castilla y León",
    50: "Aragón",
    51: "Ciudad Autónoma de Ceuta",
    52: "Ciudad Autónoma de Melilla",
}
FR_OVERSEAS = {"guadeloupe", "martinique", "guyane", "la reunion", "mayotte"}
FR_COLORS = {
    "UG": "#c4121a",
    "ENS": "#e87722",
    "RN": "#0b3a82",
    "LR": "#0047ab",
    "HOR": "#e87722",
    "UDI": "#7ba3d0",
    "ECO": "#46962b",
    "VEC": "#46962b",
    "REG": "#2f6b34",
    "REC": "#6b4423",
    "DVD": "#1d4e89",
    "DVG": "#8a3d00",
    "EXD": "#1d4e89",
    "EXG": "#6b4c9a",
    "DIV": "#5c564c",
    "DVC": "#c9a400",
    "COM": "#a32020",
    "FI": "#c4121a",
    "SOC": "#e3000f",
}
IT_COLORS = {
    "FDI": "#1d4e89",
    "LEGA": "#2f6b34",
    "FI": "#7ba3d0",
    "NOI MODERATI": "#5c7ea3",
    "PD-IDP": "#e3000f",
    "ALL-VER-SIN": "#46962b",
    "+EUROPA": "#c9a400",
    "IMP CIV-CD": "#e87722",
    "M5S": "#e6a817",
    "AZ-IV": "#6b8cae",
}
CA_PLACES = [
    ("N.L.", "Newfoundland and Labrador"),
    ("P.E.I.", "Prince Edward Island"),
    ("N.S.", "Nova Scotia"),
    ("N.B.", "New Brunswick"),
    ("Que.", "Quebec"),
    ("Ont.", "Ontario"),
    ("Man.", "Manitoba"),
    ("Sask.", "Saskatchewan"),
    ("Alta.", "Alberta"),
    ("B.C.", "British Columbia"),
    ("Y.T.", "Yukon"),
    ("N.W.T.", "Northwest Territories"),
    ("Nun.", "Nunavut"),
]
CA_COLORS = {
    "Liberal Party of Canada": "#d71920",
    "Conservative Party of Canada": "#1d4e89",
    "New Democratic Party": "#e87722",
    "Bloc Québécois": "#3d8eb9",
    "Green Party of Canada": "#2f6b34",
    "People's Party of Canada": "#6b4c9a",
}
CA_HEADER = ["Political affiliation"] + [abbr for abbr, _name in CA_PLACES] + ["Total"]
IT_AREAS = [
    ("PIEMONTE", "nord ovest"),
    ("VALLE", "nord ovest"),
    ("LIGURIA", "nord ovest"),
    ("LOMBARDIA", "nord ovest"),
    ("VENETO", "nord est"),
    ("FRIULI", "nord est"),
    ("TRENTINO", "nord est"),
    ("EMILIA", "nord est"),
    ("TOSCANA", "centro"),
    ("UMBRIA", "centro"),
    ("MARCHE", "centro"),
    ("LAZIO", "centro"),
    ("ABRUZZO", "sud"),
    ("MOLISE", "sud"),
    ("CAMPANIA", "sud"),
    ("PUGLIA", "sud"),
    ("BASILICATA", "sud"),
    ("CALABRIA", "sud"),
    ("SICILIA", "isole"),
    ("SARDEGNA", "isole"),
]


def whole(value):
    if value is None or value == "":
        return 0
    if isinstance(value, bool):
        raise RuntimeError("a vote cell is not a whole number: %r" % (value,))
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        if not value.is_integer():
            raise RuntimeError("a vote cell is not a whole number: %r" % (value,))
        return int(value)
    text = str(value).strip().replace("\xa0", "").replace(" ", "").replace(".", "")
    if not text:
        return 0
    if not text.isdigit():
        raise RuntimeError("a vote cell is not a whole number: %r" % (value,))
    return int(text)


def local(tag):
    return tag.rsplit("}", 1)[-1]


def party_rows(parties, color_of):
    rows = []
    for name, votes in parties.items():
        if not votes:
            continue
        rows.append(
            {
                "name": name,
                "votes": int(votes),
                "color": color_of(name),
                "legend": name + " ahead",
                "short": name,
            }
        )
    return rows


def place_bucket(summary, tie):
    return {"rows": [], "summary": summary, "tie": tie}


def add_parties(bucket, parties, color_of):
    current = {row["name"]: row for row in bucket["rows"]}
    for row in party_rows(parties, color_of):
        found = current.get(row["name"])
        if found:
            found["votes"] += row["votes"]
        else:
            bucket["rows"].append(row)
            current[row["name"]] = row


def national_from(rows_by_key):
    totals = {}
    for bucket in rows_by_key.values():
        for row in bucket["rows"]:
            totals[row["name"]] = totals.get(row["name"], 0) + row["votes"]
    return [{"name": name, "votes": votes} for name, votes in totals.items()]


def require_labels(shapes, expected):
    found = {shape["key"]: shape["label"] for shape in shapes}
    missing = sorted(set(expected) - set(found))
    extra = sorted(set(found) - set(expected))
    if missing or extra:
        raise RuntimeError("outline names do not match: missing %s extra %s" % (missing, extra))


def publish(spec, shapes, rows_by_key, status, table_title, table_note, allow_missed=()):
    places, missed = b.match_shapes(shapes, rows_by_key)
    unexpected = [key for key in missed if key not in allow_missed]
    if unexpected:
        print(spec["code"], "missed", missed)
        raise RuntimeError("%s has vote rows that do not match an outline" % spec["code"])
    matched = {place["name"] for place in places}
    blank = [shape["label"] for shape in shapes if shape["label"] not in matched]
    if blank and spec["code"] != "fr":
        raise RuntimeError("%s left these outlines unmatched: %s" % (spec["code"], blank))
    shown = [row for row in b.percent_rows(national_from(rows_by_key)) if row["votes"] and (row["percent"] or 0) >= 1]
    data = {
        "source": spec["source"],
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "strings": {"blank": "No votes reported"},
        "tables": [
            {
                "title": table_title,
                "note": table_note,
                "column": "Party",
                "rows": [
                    {"name": row["name"], "votes": row["votes"], "percent": row["percent"]}
                    for row in shown
                ],
            }
        ],
        "places": places,
        "card": spec["card"],
    }
    b.write_pages(spec, shapes, data)
    print(spec["code"], "leaders")
    for place in places:
        if place.get("leader"):
            print(" ", place["name"], place["leader"], place["votes"])
    return places


def pl_color(name):
    if "PRAWO I SPRAWIEDLIWOŚĆ" in name:
        return "#1d4e89"
    if "KOALICJA OBYWATELSKA" in name:
        return "#e87722"
    if "TRZECIA DROGA" in name:
        return "#2f6b34"
    if "NOWA LEWICA" in name:
        return "#c4121a"
    if "KONFEDERACJA" in name:
        return "#6b4423"
    return AHEAD


def build_poland():
    shapes = b.shapes_of("POL")
    require_labels(shapes, {b.norm(label) for label in PL_NAMES.values()})
    raw = b.fetch(PL_URL)
    text = zipfile.ZipFile(io.BytesIO(raw)).read("wyniki_gl_na_listy_po_wojewodztwach_sejm_utf8.csv").decode("utf-8-sig")
    rows = list(csv.reader(io.StringIO(text), delimiter=";"))
    header = rows[0]
    party_at = [index for index, name in enumerate(header) if name.startswith("KOMITET") or name.startswith("KOALICYJNY")]
    valid_at = header.index("Liczba głosów ważnych oddanych łącznie na wszystkie listy kandydatów")
    commissions_at = header.index("Liczba komisji")
    counted_at = header.index("Liczba uwzględnionych komisji")
    if len(party_at) < 5:
        raise RuntimeError("Poland file has no committee columns")
    summary = "%(short)s has more list votes than the other committees. A list vote is a vote for that committee's candidates in this voivodeship. The Commission's file has no color code, so the mark is only there to tell committees apart. This site does not declare a result."
    tie = "List votes are reported, and the top committees are tied. The map stays the land color."
    rows_by_key = {}
    included = True
    for row in rows[1:]:
        if not row or not row[0].strip():
            continue
        label = {b.norm(polish): english for polish, english in PL_NAMES.items()}.get(b.norm(row[0]))
        if not label:
            raise RuntimeError("unmapped voivodeship %s" % row[0])
        parties = {header[index]: whole(row[index] if index < len(row) else "") for index in party_at}
        valid = whole(row[valid_at])
        if sum(parties.values()) != valid:
            raise RuntimeError("%s list votes do not add up to the valid-vote column" % row[0])
        if whole(row[commissions_at]) != whole(row[counted_at]):
            included = False
        bucket = place_bucket(summary, tie)
        add_parties(bucket, parties, pl_color)
        rows_by_key[b.norm(label)] = bucket
    counted = "The Commission's file includes every commission it lists." if included else "The Commission's file is the published count."
    publish(
        {
            "code": "pl",
            "country": "Poland",
            "flag": "pl.svg",
            "title": "Leaders.vote · Poland, 15 October 2023",
            "description": "Poland's Sejm list votes by voivodeship, copied from the National Electoral Commission.",
            "map_label": "Map of Polish voivodeships",
            "kicker": "Poland · Sejm · 15 October 2023",
            "source": PL_URL,
            "footer": 'Vote totals are copied from the <a href="%s">National Electoral Commission sheet</a> for the Sejm election of 15 October 2023. A voivodeship is colored only from reported list votes. This site does not declare a result. It does not ask for a home address, a phone number, or an email address.' % PL_PAGE,
            "list_title": "The 16 voivodeships",
            "list_note": "A voivodeship is one of Poland's 16 provinces. Open a name for the list votes reported there. A list is a committee's slate of candidates. This is not the Senate vote, and it is not a count of seats.",
            "place_note": "You are looking at one Polish voivodeship. The numbers are votes for each committee's list of Sejm candidates. They are not Senate votes, and they are not a count of seats.",
            "card": "Sejm on 15 October 2023. The Commission's file is the published count. The map is list votes, by voivodeship.",
            "intro": """    <p class="kicker">Poland · Sejm · 15 October 2023</p>
    <h1>Poland's published count for the Sejm.</h1>
    <p class="deck">The Sejm is the lower house of parliament. Voters choose a list of candidates. This map adds those list votes inside each voivodeship, which is one of the 16 provinces.</p>
    <p class="deck">%s A mark means one committee has more list votes than the others. The file has no color code, so the color is only there to tell the committees apart. The Senate vote is a different ballot and is not drawn here.</p>""" % counted,
        },
        shapes,
        rows_by_key,
        "National Electoral Commission file for the Sejm election of 15 October 2023. %s A voivodeship is colored only from list votes. This page does not declare a result." % counted,
        "List votes, added across the voivodeships",
        "Each committee's voivodeship totals added together. Committees under one percent are left off this table. This is the Sejm list vote, not the Senate vote, and it is not a count of seats.",
    )


def cz_color(name):
    folded = b.norm(name)
    if folded.startswith("ano"):
        return "#1d4e89"
    if "spolu" in folded:
        return "#0047ab"
    if "pirat" in folded:
        return "#111111"
    if "svoboda a prima demokracie" in folded:
        return "#c4121a"
    return AHEAD


def build_czechia():
    shapes = b.shapes_of("CZE")
    require_labels(shapes, {b.norm(label) for label in CZ_NAMES.values()})
    root = ET.fromstring(b.fetch(CZ_URL))
    summary = "%(short)s has more list votes than the other parties. A list vote is a vote for that party's candidates in this region. The Statistical Office file has no color code, so the mark is only there to tell parties apart. This site does not declare a result."
    tie = "List votes are reported, and the top parties are tied. The map stays the land color."
    rows_by_key = {}
    finished = True
    for kraj in root.iter():
        if local(kraj.tag) != "KRAJ":
            continue
        file_name = kraj.attrib.get("NAZ_KRAJ") or ""
        label = CZ_NAMES.get(file_name)
        if not label:
            raise RuntimeError("unmapped Czech region %s" % file_name)
        processed = kraj.attrib.get("OKRSKY_ZPRAC")
        complete = kraj.attrib.get("OKRSKY_CELKEM")
        if not processed or processed != complete:
            finished = False
        parties = {}
        for node in list(kraj):
            if local(node.tag) != "STRANA":
                continue
            party = node.attrib.get("NAZ_STR") or ""
            votes = None
            for child in list(node):
                if local(child.tag) == "HODNOTY_STRANA":
                    votes = whole(child.attrib.get("HLASY"))
            if not party or votes is None:
                continue
            if party in parties:
                raise RuntimeError("duplicate party %s in %s" % (party, file_name))
            parties[party] = votes
        if not parties:
            raise RuntimeError("no party votes for %s" % file_name)
        bucket = place_bucket(summary, tie)
        add_parties(bucket, parties, cz_color)
        rows_by_key[b.norm(label)] = bucket
    if len(rows_by_key) != 14:
        raise RuntimeError("expected 14 Czech regions")
    counted = "The Statistical Office file marks every precinct in these regions as counted." if finished else "The Statistical Office file is the published count."
    publish(
        {
            "code": "cz",
            "country": "Czechia",
            "flag": "cz.svg",
            "title": "Leaders.vote · Czechia, 8 and 9 October 2021",
            "description": "Czechia's Chamber of Deputies list votes by region, copied from the Czech Statistical Office.",
            "map_label": "Map of Czech regions",
            "kicker": "Czechia · Chamber of Deputies · 8 and 9 October 2021",
            "source": CZ_URL,
            "footer": 'Vote totals are copied from the <a href="%s">Czech Statistical Office results file</a> for the Chamber of Deputies election of 8 and 9 October 2021. A region is colored only from reported list votes. This site does not declare a result. It does not ask for a home address, a phone number, or an email address.' % CZ_PAGE,
            "list_title": "The 14 regions",
            "list_note": "Open a name for the list votes reported there. A list is a party's slate of candidates for the Chamber of Deputies. Prague is counted as its own region. This is not a count of seats.",
            "place_note": "You are looking at one Czech region. The numbers are votes for each party's list of candidates for the Chamber of Deputies. They are not a count of seats.",
            "card": "Chamber of Deputies on 8 and 9 October 2021. %s The map is list votes, by region." % ("The Statistical Office file is a finished count." if finished else "The Statistical Office file is the published count."),
            "intro": """    <p class="kicker">Czechia · Chamber of Deputies · 8 and 9 October 2021</p>
    <h1>Czechia's published count for the Chamber of Deputies.</h1>
    <p class="deck">The Chamber of Deputies is the lower house of parliament. Voters choose a party list. This map shows those list votes in each of the 14 regions, including Prague.</p>
    <p class="deck">%s A mark means one party has more list votes than the others. The file has no color code, so the color is only there to tell the parties apart. Seats are a later calculation and are not the color of this map.</p>""" % counted,
        },
        shapes,
        rows_by_key,
        "Czech Statistical Office file for the Chamber of Deputies election of 8 and 9 October 2021. %s A region is colored only from list votes. Seats are not used. This page does not declare a result." % counted,
        "List votes, added across the regions",
        "Each party's regional totals added together. Parties under one percent are left off this table. This is the Chamber list vote, not a count of seats.",
    )


def es_color(name):
    code = name.rsplit(" - ", 1)[-1].strip()
    return {
        "PP": "#1d4e89",
        "PSOE": "#e3000f",
        "VOX": "#2f6b34",
        "SUMAR": "#e94b8a",
    }.get(code, AHEAD)


def es_day(value):
    if hasattr(value, "strftime"):
        return value.strftime("%Y-%m-%d")
    return str(value or "")[:10]


def build_spain():
    shapes = b.shapes_of("ESP")
    require_labels(shapes, {b.norm(label) for label in set(ES_AREAS.values())})
    book = openpyxl.load_workbook(io.BytesIO(b.fetch(ES_URL)), read_only=True, data_only=True)
    sheet = book[book.sheetnames[0]]
    header = None
    records = []
    for row in sheet.iter_rows(values_only=True):
        cells = list(row)
        if header is None:
            if any(isinstance(cell, str) and cell.startswith("1 - ") for cell in cells):
                header = cells
            continue
        if cells and cells[0] is not None:
            records.append(cells)
    book.close()
    if not header:
        raise RuntimeError("Spain workbook has no province header")
    date_at = header.index("Fecha")
    text_at = header.index("Descripción")
    provinces = []
    for index, name in enumerate(header):
        match = re.match(r"^(\d+) - ", str(name or ""))
        if not match:
            continue
        code = int(match.group(1))
        if code not in ES_AREAS:
            raise RuntimeError("unmapped Spanish province %s" % name)
        provinces.append((index, code))
    if sorted(code for _, code in provinces) != list(range(1, 53)):
        raise RuntimeError("Spain file is missing a province column")
    vote_rows = []
    candidaturas = {}
    for cells in records:
        description = str(cells[text_at] or "")
        day = es_day(cells[date_at])
        if description == "Votos a candidaturas":
            candidaturas[day] = cells
        elif description.startswith("Votos (") and description.endswith(")"):
            vote_rows.append((day, description[len("Votos (") : -1], cells))
    if not vote_rows:
        raise RuntimeError("Spain workbook has no vote rows")
    day = max(item[0] for item in vote_rows)
    pretty = datetime.strptime(day, "%Y-%m-%d").strftime("%d %B %Y").lstrip("0")
    summary = "%(short)s has more Congress votes than the other lists. This community's number adds the ministry's province columns. The ministry file has no color code, so the mark is only there to tell lists apart. This site does not declare a result."
    tie = "Congress votes are reported, and the top lists are tied. The map stays the land color."
    rows_by_key = {}
    summed = {code: 0 for _, code in provinces}
    for _, party, cells in vote_rows:
        if _ != day:
            continue
        for index, code in provinces:
            votes = whole(cells[index] if index < len(cells) else 0)
            summed[code] += votes
            if not votes:
                continue
            key = b.norm(ES_AREAS[code])
            bucket = rows_by_key.get(key)
            if not bucket:
                bucket = place_bucket(summary, tie)
                rows_by_key[key] = bucket
            add_parties(bucket, {party: votes}, es_color)
    check = candidaturas.get(day)
    if not check:
        raise RuntimeError("Spain file has no candidacy total for %s" % day)
    for index, code in provinces:
        if summed[code] != whole(check[index]):
            raise RuntimeError("province %s votes do not add up to the candidacy total" % code)
    publish(
        {
            "code": "es",
            "country": "Spain",
            "flag": "es.svg",
            "title": "Leaders.vote · Spain, %s" % pretty,
            "description": "Spain's Congress vote by autonomous community, added from the Interior Ministry's province columns.",
            "map_label": "Map of Spanish autonomous communities",
            "kicker": "Spain · Congress · %s" % pretty,
            "source": ES_URL,
            "footer": 'Vote totals are copied from the <a href="%s">Interior Ministry Congress file</a>. The file lists provinces. This map adds each province into its autonomous community for the Congress election of %s. A community is colored only from those reported votes. This site does not declare a result. It does not ask for a home address, a phone number, or an email address.' % (ES_PAGE, pretty),
            "list_title": "The autonomous communities",
            "list_note": "An autonomous community is one of Spain's main regions. Ceuta and Melilla are the two autonomous cities and each has its own outline. The number adds the ministry's province columns. It is the Congress vote, not a count of seats.",
            "place_note": "You are looking at one Spanish autonomous community or autonomous city. The numbers add the ministry's province columns for the Congress vote. They are not a count of seats.",
            "card": "Congress on %s. The ministry file is the published count. The map adds each province's votes into its autonomous community." % pretty,
            "intro": """    <p class="kicker">Spain · Congress · %s</p>
    <h1>Spain's published count for Congress.</h1>
    <p class="deck">Congress is the lower house of parliament. The ministry's file lists each province. This map adds those province columns into the autonomous community they belong to. Ceuta and Melilla stay as their own outlines.</p>
    <p class="deck">A mark means one list has more votes than the others. The file has no color code, so the color is only there to tell the lists apart. The seat columns in the same file are not used.</p>""" % pretty,
        },
        shapes,
        rows_by_key,
        "Interior Ministry file for the Congress election of %s. A community adds the province columns in that file. Seat columns are not used. This page does not declare a result." % pretty,
        "Congress votes, added across the communities",
        "Each list's community totals added together. The community total is the sum of the ministry's province columns. Lists under one percent are left off this table. Seat columns are not included.",
    )


def fr_color(name):
    return FR_COLORS.get(name, AHEAD)


def build_france():
    shapes = b.shapes_of("FRA")
    text = b.fetch(FR_URL).decode("utf-8-sig")
    rows = list(csv.reader(io.StringIO(text), delimiter=";"))
    header = [name.strip() for name in rows[0]]
    label_at = header.index("Libellé région")
    expressed_at = header.index("Exprimés")
    groups = []
    index = 0
    while index < len(header):
        if header[index].startswith("Nuance candidat"):
            groups.append(index)
        index += 1
    if not groups:
        raise RuntimeError("France file has no nuance columns")
    summary = "%(short)s has more first-round votes than the other groups. A nuance is the ministry's code for a group of candidates. The ministry file has no color code, so the mark is only there to tell groups apart. This site does not declare a result."
    tie = "First-round votes are reported, and the top groups are tied. The map stays the land color."
    rows_by_key = {}
    for row in rows[1:]:
        if not row or not row[label_at].strip():
            continue
        label = row[label_at].strip()
        parties = {}
        for start in groups:
            nuance = row[start].strip() if start < len(row) else ""
            votes = whole(row[start + 1] if start + 1 < len(row) else "")
            if not nuance or not votes:
                continue
            parties[nuance] = parties.get(nuance, 0) + votes
        expressed = whole(row[expressed_at])
        got = sum(parties.values())
        if abs(expressed - got) > 20:
            raise RuntimeError("%s nuance votes %s differ from the expressed-vote column %s" % (label, got, expressed))
        if expressed != got:
            print("FR", label, "expressed column is", expressed - got, "votes away from the nuance sum")
        bucket = place_bucket(summary, tie)
        add_parties(bucket, parties, fr_color)
        rows_by_key[b.norm(label)] = bucket
    metro = {shape["key"] for shape in shapes}
    if not metro <= set(rows_by_key):
        raise RuntimeError("a metropolitan region is missing from the France file")
    publish(
        {
            "code": "fr",
            "country": "France",
            "flag": "fr.svg",
            "title": "Leaders.vote · France, 30 June 2024",
            "description": "France's first-round National Assembly vote by metropolitan region, copied from the Ministry of the Interior.",
            "map_label": "Map of metropolitan French regions",
            "kicker": "France · National Assembly · first round · 30 June 2024",
            "source": FR_URL,
            "footer": 'Vote totals are copied from the <a href="%s">Ministry of the Interior first-round file</a> for 30 June 2024. A metropolitan region is colored only from reported votes. Overseas regions are in the file and are left off this map because the outline file does not include them. This site does not declare a result. It does not ask for a home address, a phone number, or an email address.' % FR_PAGE,
            "list_title": "The metropolitan regions",
            "list_note": "Open a name for the first-round votes reported there. The ministry groups candidates with a nuance code. Overseas regions are in the same file and are listed in the national table, but this outline file does not draw them. The runoff on 7 July 2024 is a separate vote.",
            "place_note": "You are looking at one metropolitan French region. The numbers are first-round votes, added by the ministry's nuance code. They are not the runoff, and they are not a count of seats.",
            "card": "National Assembly, first round, on 30 June 2024. The ministry file is the final first-round count. The map is metropolitan regions.",
            "intro": """    <p class="kicker">France · National Assembly · first round · 30 June 2024</p>
    <h1>France's first-round count for the National Assembly.</h1>
    <p class="deck">The National Assembly is the lower house of parliament. This vote was held on 30 June 2024. A later runoff was held on 7 July 2024. This map is the first round.</p>
    <p class="deck">The ministry groups candidates with a short code called a nuance, then adds the votes inside each region. A mark means one nuance has more votes than the others. The file has no color code, so the color is only there to tell the groups apart. In four regions the nuance columns and the expressed-vote column differ by one or two votes, and this page uses the nuance columns. Guadeloupe, Martinique, Guyane, La Réunion, and Mayotte are in the file. The outline file used here draws metropolitan France, so those five regions stay off the map and remain in the national table.</p>""",
        },
        shapes,
        rows_by_key,
        "Ministry of the Interior file for the first round of the National Assembly election on 30 June 2024. The file is marked final for that round. A metropolitan region is colored only from those votes. In four regions the nuance columns differ from the expressed-vote column by one or two votes, and this page uses the nuance columns. Overseas regions stay off the map. The runoff is a separate vote. This page does not declare a result.",
        "First-round votes, added across every region in the file",
        "Each nuance's regional totals added together, including the overseas regions that are not drawn on the map. A nuance is the ministry's code for a group of candidates. Groups under one percent are left off this table. This is the first round, not the runoff, and it is not a count of seats.",
        allow_missed=FR_OVERSEAS,
    )


def italy_area(name):
    upper = name.strip().upper()
    for prefix, area in IT_AREAS:
        if upper.startswith(prefix):
            return area
    raise RuntimeError("unmapped circoscrizione %s" % name)


def it_color(name):
    return IT_COLORS.get(name, AHEAD)


def build_italy():
    shapes = b.shapes_of("ITA")
    require_labels(shapes, {"nord ovest", "nord est", "centro", "sud", "isole"})
    text = b.fetch(IT_URL).decode("utf-8-sig")
    parsed = list(csv.reader(io.StringIO(text), delimiter=";"))
    header = [" ".join(name.split()) for name in parsed[0]]
    circ_at = header.index("CIRCOSCRIZIONE")
    valid_at = header.index("VOTI VALIDI")
    party_at = [
        index
        for index, name in enumerate(header)
        if name.endswith("(CIFRA ELETTORALE CIRCOSCRIZIONALE)") and not name.startswith("COALIZIONE")
    ]
    if len(party_at) < 5:
        raise RuntimeError("Italy file has no list columns")
    included = []
    grouped = {}
    for row in parsed[1:]:
        if not row or circ_at >= len(row) or not row[circ_at].strip():
            continue
        label = " ".join(row[circ_at].split())
        area = italy_area(label)
        parties = {}
        for index in party_at:
            votes = whole(row[index] if index < len(row) else "")
            if votes:
                name = header[index][: -len(" (CIFRA ELETTORALE CIRCOSCRIZIONALE)")]
                parties[name] = votes
        if sum(parties.values()) != whole(row[valid_at] if valid_at < len(row) else ""):
            raise RuntimeError("%s list figures do not add up to the valid-vote column" % label)
        included.append(label)
        current = grouped.setdefault(area, {})
        for name, votes in parties.items():
            current[name] = current.get(name, 0) + votes
    if "VALLE" in " ".join(included).upper() and "AOSTA" in " ".join(included).upper():
        nord_note = "Nord-Ovest adds Piemonte, Valle d'Aosta, Liguria, and Lombardia."
    else:
        nord_note = "Nord-Ovest adds Piemonte, Liguria, and Lombardia. Valle d'Aosta is not a row in this list-vote file, so it is not included."
    notes = {
        "nord ovest": nord_note,
        "nord est": "Nord-Est adds Trentino-Alto Adige, Veneto, Friuli-Venezia Giulia, and Emilia-Romagna.",
        "centro": "Centro adds Toscana, Umbria, Marche, and Lazio.",
        "sud": "Sud adds Abruzzo, Molise, Campania, Puglia, Basilicata, and Calabria.",
        "isole": "Isole adds Sicilia and Sardegna.",
    }
    rows_by_key = {}
    for area, parties in grouped.items():
        summary = "%(short)s has the largest circoscrizione figure. That figure is the list's valid votes plus the votes the Chamber assigns to the list in each circoscrizione. " + notes[area] + " The names are the abbreviations printed in the Chamber file. The file has no color code, so the mark is only there to tell lists apart. This site does not declare a result."
        bucket = place_bucket(summary, "List votes are reported, and the top lists are tied. The map stays the land color.")
        add_parties(bucket, parties, it_color)
        rows_by_key[area] = bucket
    publish(
        {
            "code": "it",
            "country": "Italy",
            "flag": "it.svg",
            "title": "Leaders.vote · Italy, 25 September 2022",
            "description": "Italy's Chamber of Deputies vote by five areas, added from the Chamber's circoscrizione figures.",
            "map_label": "Map of Italy's five statistical areas",
            "kicker": "Italy · Chamber of Deputies · 25 September 2022",
            "source": IT_URL,
            "footer": 'Vote totals are copied from the <a href="%s">Chamber of Deputies list-vote file</a> for 25 September 2022. The outline file draws five areas, and each area adds the circoscrizioni in that file. Valle d\'Aosta is not in the file. An area is colored only from the reported list votes. This site does not declare a result. It does not ask for a home address, a phone number, or an email address.' % IT_PAGE,
            "list_title": "The five areas",
            "list_note": "The outline file draws Nord-Ovest, Nord-Est, Centro, Sud, and Isole. It does not draw the 20 regions separately. Each area adds the circoscrizioni in the Chamber's one national file. The number for a list is the Chamber's circoscrizione figure: the list's valid votes plus the votes assigned to that list there. A coalition total in the file is the sum of its lists and is not added again. Valle d'Aosta is not a row in that file.",
            "place_note": "You are looking at one of the five areas in the outline file. The numbers add the Chamber's circoscrizione figures for the lists inside it. A figure is the list's valid votes plus the votes the Chamber assigns to that list. These are not votes for a named candidate, and they are not a count of seats.",
            "card": "Chamber of Deputies on 25 September 2022. The Chamber file is the published count. The map is five areas, from each list's circoscrizione figure. Valle d'Aosta is not in the file.",
            "intro": """    <p class="kicker">Italy · Chamber of Deputies · 25 September 2022</p>
    <h1>Italy's published count for the Chamber of Deputies.</h1>
    <p class="deck">The Chamber of Deputies is the lower house of parliament. Its file reports each list by circoscrizione, which is a group of seats. The outline file used here draws five areas, not the 20 regions, so each area on this map adds the circoscrizioni inside it.</p>
    <p class="deck">The number shown for a list is the figure the Chamber prints for that circoscrizione. It is the list's valid votes plus the votes the Chamber assigns to the list there, and those figures add up to the valid ballots. A coalition column in the same file repeats its lists, so it is not counted again. %s A mark means one list's figure is larger than the others. Abbreviations such as FDI, LEGA, FI, PD-IDP, and M5S are printed that way in the file. Candidate-name files are not used.</p>""" % nord_note,
        },
        shapes,
        rows_by_key,
        "Chamber of Deputies file for the 25 September 2022 election. The map adds each list's circoscrizione figure into the five areas drawn by the outline file. That figure is the list's valid votes plus the votes the Chamber assigns to the list. %s Candidate-name files are not used. This page does not declare a result." % nord_note,
        "Circoscrizione figures, added across the file",
        "Each list's circoscrizione figures added together. A figure is the list's valid votes plus the votes the Chamber assigns to that list, and the lists add up to the valid ballots. Valle d'Aosta is not a row in this file, so it is not in this table. Lists under one percent are left off this table. The names are the Chamber's abbreviations. This is not a count of seats.",
    )


class CanadaCells(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows = []
        self.row = None
        self.cell = None
        self.capture = False
        self.in_table = False

    def handle_starttag(self, tag, attrs):
        if tag == "table":
            self.in_table = True
        if not self.in_table:
            return
        if tag == "tr":
            self.row = []
        elif tag in ("td", "th") and self.row is not None:
            self.capture = True
            self.cell = []

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self.capture:
            self.row.append(" ".join("".join(self.cell).split()))
            self.capture = False
        elif tag == "tr" and self.row is not None:
            if any(self.row):
                self.rows.append(self.row)
            self.row = None
        elif tag == "table":
            self.in_table = False

    def handle_data(self, data):
        if self.capture:
            self.cell.append(data)


def ca_votes(value):
    text = str(value).strip().replace(",", "").replace("\u00a0", "")
    if not text:
        raise RuntimeError("Canada table has an empty vote cell")
    return whole(text)


def canada_date():
    text = html.unescape(b.fetch(CA_DATE).decode("iso-8859-1"))
    if "45th General Election" not in text or "April 28, 2025" not in text:
        raise RuntimeError("Elections Canada does not state that the 45th general election was 28 April 2025")
    return "28 April 2025"


def canada_parties():
    page = b.fetch(CA_URL).decode("utf-8-sig")
    folded = re.sub(r"\s+", " ", page)
    if "forty-fifth general election 2025" not in folded.lower():
        raise RuntimeError("Canada table is not the forty-fifth general election of 2025")
    if "Number of valid votes by political affiliation" not in folded:
        raise RuntimeError("Canada table is not valid votes by political affiliation")
    parser = CanadaCells()
    parser.feed(page)
    parser.close()
    rows = [row for row in parser.rows if row and row[0]]
    if not rows or rows[0] != CA_HEADER:
        raise RuntimeError("Canada table columns changed")
    if len(rows[-1]) != len(CA_HEADER) or rows[-1][0] != "Totals":
        raise RuntimeError("Canada table has no totals row")
    totals = [ca_votes(cell) for cell in rows[-1][1:]]
    parties = {}
    for row in rows[1:-1]:
        if len(row) != len(CA_HEADER):
            raise RuntimeError("Canada row has the wrong number of cells: %s" % row[0])
        name = row[0]
        if name in parties or name == "Totals":
            raise RuntimeError("duplicate affiliation %s" % name)
        numbers = [ca_votes(cell) for cell in row[1:]]
        if sum(numbers[:-1]) != numbers[-1]:
            raise RuntimeError("%s province votes do not add up to its total" % name)
        parties[name] = numbers
    for index, (abbr, _name) in enumerate(CA_PLACES):
        got = sum(numbers[index] for numbers in parties.values())
        if got != totals[index]:
            raise RuntimeError("province column %s does not add up" % abbr)
    if sum(totals[:-1]) != totals[-1]:
        raise RuntimeError("Canada totals row does not add up")
    return parties


def ca_color(name):
    return CA_COLORS.get(name, AHEAD)


def build_canada():
    shapes = b.shapes_of("CAN")
    require_labels(shapes, {b.norm(name) for _abbr, name in CA_PLACES})
    pretty = canada_date()
    parties = canada_parties()
    summary = "%(short)s has more valid votes than the other affiliations. A valid vote is a ballot counted for that affiliation. Independent is every independent candidate added together, not one person. No Affiliation is its own row. The table has no color code, so the mark is only there to tell affiliations apart. This site does not declare a result."
    tie = "Valid votes are reported, and the top affiliations are tied. The map stays the land color."
    rows_by_key = {}
    for index, (_abbr, name) in enumerate(CA_PLACES):
        bucket = place_bucket(summary, tie)
        add_parties(bucket, {party: numbers[index] for party, numbers in parties.items()}, ca_color)
        rows_by_key[b.norm(name)] = bucket
    publish(
        {
            "code": "ca",
            "country": "Canada",
            "flag": "can.svg",
            "title": "Leaders.vote · Canada, %s" % pretty,
            "description": "Canada's House of Commons vote by province and territory, copied from Elections Canada's official results.",
            "map_label": "Map of Canadian provinces and territories",
            "kicker": "Canada · House of Commons · %s" % pretty,
            "source": CA_URL,
            "footer": 'Vote totals are copied from Elections Canada\'s <a href="%s">table of valid votes by political affiliation</a> for the %s general election. The table is listed with the <a href="%s">official voting results</a>. A province or territory is colored only from those reported votes. This site does not declare a result. It does not ask for a home address, a phone number, or an email address.' % (CA_URL, pretty, CA_PAGE),
            "list_title": "Provinces and territories",
            "list_note": "Open a name for the valid votes reported there. The table already adds each candidate of one affiliation into a single number. Independent is every independent candidate added together. No Affiliation is a separate row. These numbers are not a count of seats.",
            "place_note": "You are looking at one Canadian province or territory. The numbers are valid votes for the House of Commons, added by political affiliation. Independent is every independent candidate added together. These are not a count of seats.",
            "card": "House of Commons on %s. Elections Canada's table is the official count. The map is valid votes, by province and territory." % pretty,
            "intro": """    <p class="kicker">Canada · House of Commons · %s</p>
    <h1>Canada's official count for the House of Commons.</h1>
    <p class="deck">The House of Commons is the elected house of Parliament. This vote was held on %s. Elections Canada's table lists valid votes by political affiliation for each province and territory.</p>
    <p class="deck">A mark means one affiliation has more valid votes than the others. Independent means every independent candidate added together, not one person. No Affiliation is its own row in the table. The table has no color code, so the color is only there to tell affiliations apart. The seat table in the same report is not used.</p>""" % (pretty, pretty),
        },
        shapes,
        rows_by_key,
        "Elections Canada table of valid votes by political affiliation for the House of Commons election on %s. The table is the official count. A province or territory is colored only from those votes. Independent is every independent candidate added together. This page does not declare a result." % pretty,
        "Valid votes, added across the provinces and territories",
        "Each affiliation's provincial totals added together. Affiliations under one percent are left off this table. Independent is every independent candidate added together. This is not a count of seats.",
    )


def build_all():
    build_poland()
    build_czechia()
    build_spain()
    build_france()
    build_italy()
    build_canada()


if __name__ == "__main__":
    build_all()
