"""Build census/homicide-pairs.json from Expanded Homicide Data Tables 4 and 6.

Table 6 crosses the victim's race with the offender's race for murders with
one victim and one offender. The arrest tables do not record the victim.
The script copies the printed counts and does not combine them into a rate
per person.
"""
import io
import json
import os
import tempfile
import zipfile

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "census", "homicide-pairs.json")
ZIP = os.path.join(tempfile.gettempdir(), "leaders-vote-crime", "expanded-homicide-2025.zip")


def sheet(book, needle):
    name = next(item for item in book.namelist() if needle in item)
    return openpyxl.load_workbook(io.BytesIO(book.read(name)), data_only=True).active


def main():
    with zipfile.ZipFile(ZIP) as book:
        situations = sheet(book, "Table_4")
        pairs = sheet(book, "Table_6")
    total = single = None
    for record in situations.iter_rows(min_row=5, max_row=11, values_only=True):
        label = str(record[0] or "").strip()
        if label == "Total":
            total = int(record[1])
        elif label == "Single victim/single offender":
            single = int(record[1])
    if total != 13343 or single != 7725:
        raise SystemExit("situations %s %s" % (total, single))
    race_rows = list(pairs.iter_rows(min_row=7, max_row=10, values_only=True))
    ethnic_rows = list(pairs.iter_rows(min_row=18, max_row=20, values_only=True))
    race = []
    for record in race_rows:
        counts = [int(record[index]) for index in (2, 3, 4, 5)]
        if sum(counts) != int(record[1]):
            raise SystemExit("race row %s" % (record[:6],))
        race.append(counts)
    if race[1][1] != 2917 or race[0][0] != 2757:
        raise SystemExit("anchor cells")
    ethnicity = []
    for record in ethnic_rows:
        ethnicity.append([int(record[index]) for index in (9, 10, 11)])
    if ethnicity[0][0] != 653 or ethnicity[1][1] != 3341:
        raise SystemExit("ethnicity cells")
    payload = {
        "year": 2025,
        "victims": total,
        "single": single,
        "singlePercent": 57.9,
        "raceNote": "Other includes American Indian or Alaska Native, Asian, and Native Hawaiian or Other Pacific Islander.",
        "ethnicityNote": "Ethnicity, unlike age, race, and sex, is not a mandatory field. Ethnicity totals do not match the race totals.",
        "raceLabels": ["White", "Black or African American", "Other", "Unknown"],
        "raceCounts": race,
        "ethnicityLabels": ["Hispanic or Latino", "Not Hispanic or Latino", "Unknown"],
        "ethnicityCounts": ethnicity,
    }
    with open(OUT, "w", encoding="utf-8") as out:
        json.dump(payload, out, separators=(",", ":"))
    print("victims", total, "single", single, "race", race[1])


if __name__ == "__main__":
    main()
