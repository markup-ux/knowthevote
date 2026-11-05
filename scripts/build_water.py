"""Build census/water.json from EPA's Drinking Water System Search.

The zip is downloaded separately and is not part of the site.
Active community systems are the ones that serve homes.
A city token is the served-city name with a parenthetical
and a trailing numeric code removed, so "NEW YORK (C)" matches
a neighborhood city of "New York".
"""
import csv
import json
import os
import re
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIP_PATH = os.path.join(os.environ["TEMP"], "leaders-vote-water", "sdwa.zip")
VIOL_PATH = os.path.join(os.environ["TEMP"], "leaders-vote-water", "sdwa_latest.zip")
OUT = os.path.join(ROOT, "census", "water.json")
QUARTER = "2026Q3"
OPEN_STATUS = {"Unaddressed", "Addressed"}
# 8000 is the Revised Total Coliform Rule code. In this snapshot the open
# maximum-contaminant-level row uses violation code 1A, E. coli, and EPA's
# health goal for total coliforms including E. coli is zero.
ZERO_GOAL = {"4000", "4006", "4010", "8000"}

SOURCE = (
    "U.S. EPA Enforcement and Compliance History Online, Drinking Water System Search, "
    "https://echo.epa.gov/files/echodownloads/SDWA_system_search_download.zip, "
    "file dated October 23, 2026. The row is an active community water system, the kind that serves homes. "
    "Quarters with a violation are EPA's count for the past three years. "
    "That count includes monitoring and reporting violations, not only an exceedance of a contaminant limit. "
    "A health-based flag means EPA currently marks a violation of a maximum contaminant level, "
    "a maximum residual disinfectant level, or a treatment technique. "
    "A neighborhood row uses the community system that serves the most people among systems whose served city "
    "matches the neighborhood's city and state. EPA does not publish a tap measurement for the neighborhood. "
    "A system with no served city in the file is left out of this list. "
    "Chemicals are contaminant codes on a health-based violation in the SDWA violations file "
    "from https://echo.epa.gov/files/echodownloads/SDWA_latest_downloads.zip, "
    "the download listed October 13, 2026, snapshot quarter 2026Q3. "
    "A row is kept when the violation status is Unaddressed or Addressed. "
    "Resolved and archived violations are left out. "
    "Maximum contaminant level means EPA recorded the contaminant above the allowed amount. "
    "A treatment technique is a required process, not a measurement of a chemical in the water. "
    "People served is the population on the community system, counted once per contaminant. "
    "It is not a harm score."
)


def norm_city(token):
    token = token.strip().upper()
    token = re.sub(r"\s*\([^)]*\)", "", token)
    token = re.sub(r"-\d+$", "", token)
    token = token.replace(".", "").replace("'", "")
    token = re.sub(r"\s+", " ", token).strip()
    return token


def plain_what(raw):
    parts = []
    for part in (raw or "").split(";"):
        part = part.strip()
        if "=" in part:
            part = part.split("=", 1)[1].strip()
        if part and part not in parts:
            parts.append(part)
    text = "; ".join(parts)
    if len(text) > 180:
        text = text[:177].rstrip() + "..."
    return text


def cities_of(raw):
    found = []
    seen = set()
    for part in (raw or "").split(","):
        city = norm_city(part)
        if city and city not in seen:
            seen.add(city)
            found.append(city)
    return found


def attach_violations(systems):
    by_pws = {system["pws"]: system for system in systems}
    seen = set()
    buckets = {}
    with zipfile.ZipFile(VIOL_PATH) as zipped:
        raw = zipped.open("SDWA_VIOLATIONS_ENFORCEMENT.csv")
        text = (line.decode("utf-8", "replace") for line in raw)
        for row in csv.DictReader(text):
            if row["SUBMISSIONYEARQUARTER"] != QUARTER:
                continue
            if row["IS_HEALTH_BASED_IND"] != "Y":
                continue
            if row["VIOLATION_STATUS"] not in OPEN_STATUS:
                continue
            system = by_pws.get(row["PWSID"].strip())
            if system is None:
                continue
            violation_id = row["VIOLATION_ID"]
            if violation_id in seen:
                continue
            seen.add(violation_id)
            code = row["CONTAMINANT_CODE"].strip()
            category = row["VIOLATION_CATEGORY_CODE"].strip()
            if category == "MCL":
                kind = "mcl"
            elif category == "MRDL":
                kind = "mrdl"
            elif category == "TT":
                kind = "tt"
            else:
                continue
            slot = "tt" if kind == "tt" else "mcl"
            found = system.setdefault(slot, [])
            if code not in found:
                found.append(code)
            buckets.setdefault((code, kind), set()).add(system["pws"])
            if kind == "mcl":
                print(
                    "mcl",
                    code,
                    row["VIOLATION_CODE"],
                    row.get("VIOL_MEASURE"),
                    row.get("UNIT_OF_MEASURE"),
                    row.get("FEDERAL_MCL"),
                    system["name"],
                    system["st"],
                    flush=True,
                )
    chemicals = []
    for (code, kind), pwss in buckets.items():
        chemicals.append({
            "code": code,
            "kind": kind,
            "zero": 1 if kind == "mcl" and code in ZERO_GOAL else 0,
            "n": len(pwss),
            "pop": sum(by_pws[pws]["pop"] for pws in pwss),
        })
    chemicals.sort(key=lambda item: (-item["pop"], item["code"], item["kind"]))
    for system in systems:
        del system["pws"]
        for key in ("mcl", "tt"):
            if key in system:
                system[key].sort()
    return chemicals


def main():
    systems = []
    with zipfile.ZipFile(ZIP_PATH) as zipped:
        raw = zipped.open("SDWA_SYSTEM_SEARCH.csv")
        text = (line.decode("utf-8", "replace") for line in raw)
        for row in csv.DictReader(text):
            if row["PWS_ACTIVITY_CODE"] != "A" or row["PWS_TYPE_CODE"] != "CWS":
                continue
            cities = cities_of(row["CITIES_SERVED"])
            if not cities:
                continue
            what = plain_what(row["SDWA_CONTAMINANTS_IN_VIOL_3YR"])
            systems.append({
                "pws": row["PWSID"].strip(),
                "name": row["PWS_NAME"].strip(),
                "st": row["STATE_CODE"].strip(),
                "cities": cities,
                "q": int(row["QTRS_WITH_VIO"] or 0),
                "h": 1 if row["HEALTH_FLAG"] == "Yes" else 0,
                "pop": int(row["POPULATION_SERVED_COUNT"] or 0),
                "what": what
            })
    chemicals = attach_violations(systems)
    systems.sort(key=lambda item: (-item["q"], -item["h"], -item["pop"], item["name"]))
    payload = {"source": SOURCE, "chemicals": chemicals, "systems": systems}
    with open(OUT, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(payload, handle, ensure_ascii=False, separators=(",", ":"))
    print("systems", len(systems), "chemicals", len(chemicals), "bytes", os.path.getsize(OUT), flush=True)


if __name__ == "__main__":
    main()
