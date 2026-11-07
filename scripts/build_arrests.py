"""Build census/arrests.json from FBI arrest tables and Census race counts.

Table 69 is arrests by state, from agencies that sent 12 months of arrest data.
The crime map uses the rape, fraud, forgery, and embezzlement columns.
The population is the 2025 estimated population printed on each state's first row.
Table 29 is the FBI's national arrest estimate.
Table 43 is arrests by race for agencies that sent race. The sheet titles the
column "Offense charged." In the UCR program that is the offense on an arrest,
citation, or summons. It is not a prosecutor's charge and not a conviction.
The Census race-alone counts are a different classification. The script does
not divide arrests by those population counts.
"""
import csv
import io
import json
import os
import re
import tempfile
import urllib.request
import zipfile

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "census", "arrests.json")
CACHE = os.path.join(tempfile.gettempdir(), "leaders-vote-crime")
CENSUS_CACHE = os.path.join(tempfile.gettempdir(), "leaders-vote-census")
UA = {"User-Agent": "Leaders.vote census build"}
SIGNED = "https://cde.ucr.cjis.gov/LATEST/s3/signedurl?key="
AGE_URL = "https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/state/asrh/sc-est2025-alldata6.csv"
# File layout SC-EST2025-ALLDATA6. Race alone, 1997 OMB standards.
RACE_CODE = {
    "1": "white",
    "2": "black",
    "3": "aian",
    "4": "asian",
    "5": "nhpi",
    "6": "multi",
}
RACE_NAME = {
    "white": "White alone",
    "black": "Black or African American alone",
    "aian": "American Indian or Alaska Native alone",
    "asian": "Asian alone",
    "nhpi": "Native Hawaiian or Other Pacific Islander alone",
    "multi": "Two or more races",
}
FBI_RACE = (
    ("white", "White", 2),
    ("black", "Black or African American", 3),
    ("aian", "American Indian or Alaska Native", 4),
    ("asian", "Asian", 5),
    ("nhpi", "Native Hawaiian or Other Pacific Islander", 6),
)
OFFENSES = (
    "Rape",
    "Sex offenses (except rape and prostitution)",
    "Murder and nonnegligent manslaughter",
    "Robbery",
    "Aggravated assault",
    "Violent crime3",
)
CODE = {
    "ALABAMA": "AL", "ALASKA": "AK", "ARIZONA": "AZ", "ARKANSAS": "AR",
    "CALIFORNIA": "CA", "COLORADO": "CO", "CONNECTICUT": "CT", "DELAWARE": "DE",
    "DISTRICT OF COLUMBIA": "DC", "FLORIDA": "FL", "GEORGIA": "GA", "HAWAII": "HI",
    "IDAHO": "ID", "ILLINOIS": "IL", "INDIANA": "IN", "IOWA": "IA",
    "KANSAS": "KS", "KENTUCKY": "KY", "LOUISIANA": "LA", "MAINE": "ME",
    "MARYLAND": "MD", "MASSACHUSETTS": "MA", "MICHIGAN": "MI", "MINNESOTA": "MN",
    "MISSISSIPPI": "MS", "MISSOURI": "MO", "MONTANA": "MT", "NEBRASKA": "NE",
    "NEVADA": "NV", "NEW HAMPSHIRE": "NH", "NEW JERSEY": "NJ", "NEW MEXICO": "NM",
    "NEW YORK": "NY", "NORTH CAROLINA": "NC", "NORTH DAKOTA": "ND", "OHIO": "OH",
    "OKLAHOMA": "OK", "OREGON": "OR", "PENNSYLVANIA": "PA", "RHODE ISLAND": "RI",
    "SOUTH CAROLINA": "SC", "SOUTH DAKOTA": "SD", "TENNESSEE": "TN", "TEXAS": "TX",
    "UTAH": "UT", "VERMONT": "VT", "VIRGINIA": "VA", "WASHINGTON": "WA",
    "WEST VIRGINIA": "WV", "WISCONSIN": "WI", "WYOMING": "WY",
}


def signed(key):
    req = urllib.request.Request(SIGNED + key, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as res:
        payload = json.loads(res.read().decode("utf-8"))
    return payload[key]


def download_zip():
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, "persons-arrested-2025.zip")
    if os.path.exists(path) and os.path.getsize(path) > 100000:
        return path
    url = signed("cius/2025/persons-arrested-2025.zip")
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=180) as res, open(path, "wb") as out:
        while True:
            chunk = res.read(1024 * 256)
            if not chunk:
                break
            out.write(chunk)
    return path


def sheet(path, name):
    with zipfile.ZipFile(path) as book:
        raw = book.read(name)
    return openpyxl.load_workbook(io.BytesIO(raw), data_only=True).active


def census_race():
    os.makedirs(CENSUS_CACHE, exist_ok=True)
    path = os.path.join(CENSUS_CACHE, "sc-est2025-alldata6.csv")
    if not (os.path.exists(path) and os.path.getsize(path) > 1000000):
        req = urllib.request.Request(AGE_URL, headers=UA)
        with urllib.request.urlopen(req, timeout=180) as res, open(path, "wb") as out:
            while True:
                chunk = res.read(1024 * 256)
                if not chunk:
                    break
                out.write(chunk)
    counts = {key: 0 for key in RACE_CODE.values()}
    hispanic = 0
    with open(path, newline="", encoding="latin1") as handle:
        for row in csv.DictReader(handle):
            if row["SUMLEV"] != "040" or row["SEX"] != "0":
                continue
            if int(row["AGE"]) > 85 or row["RACE"] not in RACE_CODE:
                continue
            people = int(row["POPESTIMATE2025"])
            if row["ORIGIN"] == "2":
                hispanic += people
            if row["ORIGIN"] != "0":
                continue
            counts[RACE_CODE[row["RACE"]]] += people
    total = sum(counts.values())
    if total != 341784857:
        raise SystemExit("census race total %s" % total)
    if hispanic != 70145126:
        raise SystemExit("census hispanic %s" % hispanic)
    groups = []
    for key, count in counts.items():
        groups.append({
            "id": key,
            "name": RACE_NAME[key],
            "pop": count,
            "share": round(count / total * 1000) / 10,
        })
    return {
        "total": total,
        "groups": groups,
        "hispanic": {
            "name": "Hispanic or Latino",
            "pop": hispanic,
            "share": round(hispanic / total * 1000) / 10,
        },
    }


def percent_text(value):
    if value == int(value):
        return str(int(value))
    return ("%.1f" % value).rstrip("0").rstrip(".")


def near(printed, count, total):
    if not total:
        return False
    return abs(printed - round(count / total * 1000) / 10) <= 0.15


def race_rows(ws):
    header = " ".join(str(cell or "") for cell in next(ws.iter_rows(min_row=4, max_row=4, values_only=True)))
    found = re.search(r"\[([0-9,]+) agencies; 2025 estimated population ([0-9,]+)\]", header)
    if not found:
        raise SystemExit("race header")
    rows = []
    for record in ws.iter_rows(min_row=8, max_row=36, values_only=True):
        name = record[0]
        if name not in OFFENSES:
            continue
        total = record[1]
        item = {"offense": name.replace("3", "").strip(), "total": total}
        for key, _label, index in FBI_RACE:
            item[key] = record[index]
            item[key + "Pct"] = record[index + 6]
            if not near(record[index + 6], record[index], total):
                raise SystemExit("percent %s %s" % (name, key))
        item["hispanicPct"] = record[17]
        item["ethnicityTotal"] = record[13]
        rows.append(item)
    if len(rows) != len(OFFENSES):
        raise SystemExit("race rows %s" % len(rows))
    return {
        "agencies": int(found.group(1).replace(",", "")),
        "population": int(found.group(2).replace(",", "")),
        "rows": rows,
    }


def estimated_arrests(ws):
    found = {}
    for record in ws.iter_rows(min_row=4, max_row=40, values_only=True):
        label = str(record[0] or "").strip()
        if label:
            found[label] = record[1]
    rape = found["Rape"]
    violent = found["Violent crime2"]
    fraud = found.get("Fraud")
    forgery = found.get("Forgery and counterfeiting")
    embezzlement = found.get("Embezzlement")
    if rape != 18729 or violent != 413991 or fraud != 90184 or forgery != 33034 or embezzlement != 7629:
        raise SystemExit("estimated arrests changed %s %s %s %s %s" % (rape, violent, fraud, forgery, embezzlement))
    return {"rape": rape, "violent": violent, "fraud": fraud, "forgery": forgery, "embezzlement": embezzlement}


def state_arrests(ws):
    limited = ""
    for record in ws.iter_rows(min_row=107, max_row=114, values_only=True):
        text = str(record[0] or "")
        if text.lower().startswith("6limited") or "Limited data for 2025" in text:
            limited = re.sub(r"^\d+", "", text).strip()
    states = []
    name = None
    pop = None
    for record in ws.iter_rows(min_row=5, max_row=106, values_only=True):
        if record[0]:
            name = re.sub(r"[\d,]+$", "", str(record[0]).strip()).strip()
            numbers = [value for value in record if isinstance(value, (int, float))]
            pop = int(numbers[-1])
        if record[1] != "Total all ages":
            continue
        code = CODE.get(name)
        if not code:
            raise SystemExit("state name %s" % name)
        row = {
            "code": code,
            "rape": int(record[6]),
            "forgery": int(record[14]),
            "fraud": int(record[15]),
            "embezzlement": int(record[16]),
            "pop": pop,
        }
        if limited and (name.title() in limited or code in ("FL", "ND")):
            row["note"] = limited
        if code == "DC":
            row["note"] = "Includes arrests reported by the Metro Transit Police."
        states.append(row)
    if len(states) != 51:
        raise SystemExit("states %s" % len(states))
    return states


def main():
    path = download_zip()
    payload = {
        "year": 2025,
        "estimatedArrests": estimated_arrests(sheet(path, "CIUS_Table_29_Estimated_Number_of_Arrests_United_States_2025.xlsx")),
        "race": race_rows(sheet(path, "CIUS_Table_43A_Arrests_by_Race_and_Ethnicity_2025.xlsx")),
        "population": census_race(),
        "states": state_arrests(sheet(path, "CIUS_Table_69_Arrest_by_State_2025.xlsx")),
    }
    with open(OUT, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(payload, handle, separators=(",", ":"))
        handle.write("\n")
    rape = [row for row in payload["race"]["rows"] if row["offense"] == "Rape"][0]
    print("rape arrests", rape["total"], "black", rape["blackPct"], "states", len(payload["states"]))


if __name__ == "__main__":
    main()
