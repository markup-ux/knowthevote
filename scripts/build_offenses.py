"""Build census/offenses.json from FBI arrest Tables 29 and 43.

Table 29 is the national arrest estimate for every offense category the FBI
publishes. Table 43 is arrests by race for agencies that submitted race.
Fraud, embezzlement, and forgery and counterfeiting are kept as separate
rows. The script does not add them into a white-collar total.
"""
import io
import json
import os
import re
import tempfile
import zipfile

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "census", "offenses.json")
CACHE = os.path.join(tempfile.gettempdir(), "leaders-vote-crime")
ZIP = os.path.join(CACHE, "persons-arrested-2025.zip")
WHITE = ("Forgery and counterfeiting", "Fraud", "Embezzlement")
RACE = (("white", 2), ("black", 3), ("aian", 4), ("asian", 5), ("nhpi", 6))
ALIASES = {
    "All other offenses (except traffic)": "All other offenses",
}


def clean(name):
    name = re.sub(r"\d+$", "", str(name or "")).strip()
    return ALIASES.get(name, name)


def near(printed, count, total):
    if not total:
        return printed == 0
    return abs(printed - round(count / total * 1000) / 10) <= 0.15


def sheet(book, needle):
    for name in book.namelist():
        if needle in name:
            return openpyxl.load_workbook(io.BytesIO(book.read(name)), data_only=True).active
    raise SystemExit("missing " + needle)


def estimated(ws):
    rows = []
    notes = []
    for record in ws.iter_rows(min_row=4, max_row=40, values_only=True):
        name, value = record[0], record[1]
        if not name:
            continue
        if not isinstance(value, (int, float)):
            notes.append(re.sub(r"^\d+", "", str(name)).strip())
            continue
        rows.append({"offense": clean(name), "estimated": int(value)})
    return rows, notes


def race_table(ws):
    header = " ".join(str(cell or "") for cell in next(ws.iter_rows(min_row=4, max_row=4, values_only=True)))
    found = re.search(r"\[([0-9,]+) agencies; 2025 estimated population ([0-9,]+)\]", header)
    if not found:
        raise SystemExit("race header")
    rows = {}
    for record in ws.iter_rows(min_row=8, max_row=40, values_only=True):
        if not record[0] or not isinstance(record[1], (int, float)):
            continue
        name = clean(record[0])
        if name == "TOTAL":
            continue
        total = int(record[1])
        item = {
            "raceTotal": total,
            "hispanicPct": record[17] if isinstance(record[17], (int, float)) else None,
            "ethnicityTotal": int(record[13]) if isinstance(record[13], (int, float)) else None,
        }
        for key, index in RACE:
            item[key] = int(record[index])
            printed = record[index + 6]
            if printed == "*":
                item[key + "Pct"] = None
            elif isinstance(printed, (int, float)) and near(printed, record[index], total):
                item[key + "Pct"] = printed
            else:
                raise SystemExit("percent %s %s %s" % (name, key, record[:19]))
        rows[name] = item
    return {
        "agencies": int(found.group(1).replace(",", "")),
        "population": int(found.group(2).replace(",", "")),
    }, rows


def main():
    with zipfile.ZipFile(ZIP) as book:
        estimates, notes = estimated(sheet(book, "Table_29"))
        race_meta, races = race_table(sheet(book, "Table_43A"))
    by_name = {}
    for row in estimates:
        if row["offense"] == "Total":
            continue
        by_name[row["offense"]] = row
    missing = [name for name in races if name not in by_name]
    if missing:
        raise SystemExit("race without estimate %s" % missing)
    for name, row in by_name.items():
        if name not in races:
            raise SystemExit("estimate without race %s" % name)
        row.update(races[name])
        if name in WHITE:
            row["group"] = "white-collar"
        elif name in ("Violent crime", "Property crime"):
            row["group"] = "total"
        else:
            row["group"] = "offense"
    fraud = by_name["Fraud"]["estimated"]
    if fraud <= 0 or by_name["Embezzlement"]["estimated"] <= 0 or by_name["Forgery and counterfeiting"]["estimated"] <= 0:
        raise SystemExit("white-collar counts missing")
    payload = {
        "year": 2025,
        "estimatedTotal": by_name and next(row["estimated"] for row in estimates if row["offense"] == "Total"),
        "notes": notes,
        "race": race_meta,
        "rows": [by_name[name] for name in by_name],
    }
    with open(OUT, "w", encoding="utf-8") as out:
        json.dump(payload, out, separators=(",", ":"))
    print("rows", len(payload["rows"]), "total", payload["estimatedTotal"], "notes", len(notes))


if __name__ == "__main__":
    main()
