"""Build census/us.json from Census Bureau population estimates and 2020 apportionment.

The page copies these published counts. It does not estimate a missing county.
"""
import csv
import json
import os
import tempfile
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "census", "us.json")
CACHE = os.path.join(tempfile.gettempdir(), "leaders-vote-census")
UA = {"User-Agent": "Leaders.vote census build"}

FILES = {
    "state": "https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/state/totals/NST-EST2025-POPCHG2020-2025.csv",
    "age": "https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/state/asrh/sc-est2025-alldata6.csv",
    "county": "https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/counties/totals/co-est2025-alldata.csv",
    "seats": "https://www2.census.gov/programs-surveys/decennial/2020/data/apportionment/apportionment.csv",
}

CODE = {
    "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT",
    "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL",
    "18": "IN", "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME", "24": "MD",
    "25": "MA", "26": "MI", "27": "MN", "28": "MS", "29": "MO", "30": "MT", "31": "NE",
    "32": "NV", "33": "NH", "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
    "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
    "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA", "54": "WV",
    "55": "WI", "56": "WY",
}


def download(url, name):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, name)
    if os.path.exists(path) and os.path.getsize(path) > 1000:
        return path
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=180) as res, open(path, "wb") as out:
        while True:
            chunk = res.read(1024 * 256)
            if not chunk:
                break
            out.write(chunk)
    return path


def integer(value):
    text = (value or "").strip().replace(",", "").replace('"', "")
    if text in ("", "NA", "N/A", "(X)"):
        return None
    return int(text)


def median_age(counts, total):
    half = total / 2.0
    running = 0
    for age in range(0, 86):
        count = counts.get(age, 0)
        if running + count >= half and count:
            if age >= 85:
                return 85.0
            return round(age + (half - running) / count, 1)
        running += count
    return None


def main():
    state_path = download(FILES["state"], "NST-EST2025-POPCHG2020-2025.csv")
    age_path = download(FILES["age"], "sc-est2025-alldata6.csv")
    county_path = download(FILES["county"], "co-est2025-alldata.csv")
    seats_path = download(FILES["seats"], "apportionment.csv")

    states = {}
    with open(state_path, newline="", encoding="latin1") as handle:
        for row in csv.DictReader(handle):
            if row["SUMLEV"] != "040":
                continue
            fips = row["STATE"].zfill(2)
            if fips not in CODE:
                continue
            states[fips] = {
                "fips": fips,
                "code": CODE[fips],
                "name": row["NAME"],
                "pop": int(row["POPESTIMATE2025"]),
                "base": int(row["ESTIMATESBASE2020"]),
                "href": "illinois.html" if CODE[fips] == "IL" else CODE[fips].lower() + ".html",
            }

    ages = {fips: {} for fips in states}
    age_totals = {fips: 0 for fips in states}
    with open(age_path, newline="", encoding="latin1") as handle:
        for row in csv.DictReader(handle):
            if row["SUMLEV"] != "040" or row["SEX"] != "0" or row["ORIGIN"] != "0":
                continue
            if row["RACE"] not in ("1", "2", "3", "4", "5", "6"):
                continue
            fips = row["STATE"].zfill(2)
            if fips not in ages:
                continue
            age = int(row["AGE"])
            if age > 85:
                continue
            count = int(row["POPESTIMATE2025"])
            ages[fips][age] = ages[fips].get(age, 0) + count
            age_totals[fips] += count

    nation_ages = {}
    for fips, state in states.items():
        counts = ages[fips]
        state["age18"] = sum(count for age, count in counts.items() if age >= 18)
        state["medAge"] = median_age(counts, age_totals[fips])
        gap = state["pop"] - age_totals[fips]
        if gap:
            print("age gap", state["code"], gap, "pop", state["pop"], "ages", age_totals[fips])
        for age, count in counts.items():
            nation_ages[age] = nation_ages.get(age, 0) + count

    seats_by_name = {}
    with open(seats_path, newline="", encoding="latin1") as handle:
        for row in csv.DictReader(handle):
            if row["Year"] != "2020" or row["Geography Type"] != "State":
                continue
            seats_by_name[row["Name"]] = (
                integer(row["Number of Representatives"]),
                integer(row["Change in Number of Representatives"]),
            )
    for state in states.values():
        seats, change = seats_by_name.get(state["name"], (None, None))
        state["seats"] = seats
        state["seatChange"] = change

    counties = {fips: [] for fips in states}
    with open(county_path, newline="", encoding="latin1") as handle:
        for row in csv.DictReader(handle):
            if row["SUMLEV"] != "050":
                continue
            fips = row["STATE"].zfill(2)
            if fips not in counties:
                continue
            counties[fips].append([
                fips + row["COUNTY"].zfill(3),
                row["CTYNAME"],
                int(row["POPESTIMATE2025"]),
                int(row["ESTIMATESBASE2020"]),
            ])

    nation_pop = sum(state["pop"] for state in states.values())
    nation_base = sum(state["base"] for state in states.values())
    nation_age = sum(state["age18"] for state in states.values())
    nation_total_age = sum(nation_ages.values())
    payload = {
        "vintage": "July 1, 2025",
        "base": "April 1, 2020",
        "nation": {
            "pop": nation_pop,
            "base": nation_base,
            "age18": nation_age,
            "medAge": median_age(nation_ages, nation_total_age),
            "seats": 435,
        },
        "states": sorted(states.values(), key=lambda state: state["name"]),
        "counties": counties,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(payload, handle, separators=(",", ":"))
        handle.write("\n")

    seat_sum = sum(state["seats"] or 0 for state in states.values())
    print("states", len(states), "counties", sum(len(rows) for rows in counties.values()))
    print("nation", payload["nation"], "seat sum", seat_sum)
    print("CT", [row[1] for row in counties["09"]])
    for sample in ("06", "17", "49", "23", "56", "48", "11"):
        state = states[sample]
        print(state["code"], state["pop"], state["pop"] - state["base"], state["age18"], state["medAge"], state["seats"], state["seatChange"])


if __name__ == "__main__":
    main()
