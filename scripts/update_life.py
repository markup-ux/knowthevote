"""Copy the latest published gasoline, spending, and unemployment figures into life.json.

Gasoline is the Energy Information Administration's weekly U.S. retail price.
Spending and unemployment are read from the Bureau of Labor Statistics API when
that feed answers. A figure is written only when a file publishes it.
"""
import json
import os
import urllib.request
from datetime import datetime, timedelta, timezone

import xlrd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "life.json")
UA = {"User-Agent": "Mozilla/5.0 (compatible; Leaders.vote/1.0; +https://leaders.vote)"}
GAS_XLS = "https://www.eia.gov/dnav/pet/hist_xls/EMM_EPMR_PTE_NUS_DPGw.xls"
GAS_PAGE = "https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=EMM_EPMR_PTE_NUS_DPG&f=W"
MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def fetch(url):
    request = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def bls_rows(series_id, start):
    end = datetime.now(timezone.utc).year + 1
    url = "https://api.bls.gov/publicAPI/v2/timeseries/data/%s?startyear=%s&endyear=%s" % (
        series_id, start, end
    )
    payload = json.loads(fetch(url).decode("utf-8"))
    if payload.get("status") != "REQUEST_SUCCEEDED":
        raise RuntimeError(payload.get("message") or payload.get("status") or series_id)
    series = (payload.get("Results") or {}).get("series") or []
    if not series:
        raise RuntimeError(series_id + " empty")
    kept = []
    for row in series[0].get("data") or []:
        if row.get("value") in (None, "", "-"):
            continue
        kept.append(row)
    return kept


def money(value):
    return "$" + format(round(value, 2), ",.2f")


def week_label(day):
    return MONTHS[day.month - 1] + " " + str(day.day) + ", " + str(day.year)


def gasoline():
    book = xlrd.open_workbook(file_contents=fetch(GAS_XLS))
    sheet = book.sheet_by_name("Data 1")
    points = []
    for row in range(3, sheet.nrows):
        raw = sheet.cell_value(row, 0)
        price = sheet.cell_value(row, 1)
        if raw == "" or price == "":
            continue
        day = xlrd.xldate_as_datetime(raw, book.datemode).date()
        points.append((day, round(float(price), 3)))
    if not points:
        raise RuntimeError("no gasoline weeks")
    latest_day, latest = points[-1]
    ago_day = latest_day - timedelta(days=365)
    ago = None
    for day, price in points:
        if abs((day - ago_day).days) <= 4:
            ago = price
    by_year = {}
    for day, price in points:
        by_year.setdefault(day.year, []).append(price)
    annual = {}
    now = datetime.now(timezone.utc).date()
    for year, prices in by_year.items():
        if year < now.year and len(prices) >= 50:
            annual[str(year)] = round(sum(prices) / len(prices), 3)
    label = week_label(latest_day)
    what = (
        "Energy Information Administration weekly U.S. retail price for regular gasoline, "
        + money(latest)
        + " for the week of "
        + label
        + ". This is the latest week in the file. It is not a full-year average. The bar runs from $0 to $5."
    )
    if ago is not None:
        what += " The tick is " + money(ago) + ", about a year earlier."
    return {
        "gasLive": {
            "year": latest_day.year,
            "month": MONTHS[latest_day.month - 1] + " " + str(latest_day.day),
            "value": latest,
            "ago": ago,
            "unit": "per gallon, week of " + MONTHS[latest_day.month - 1] + " " + str(latest_day.day),
            "label": label,
            "what": what,
            "href": GAS_PAGE,
            "name": "EIA weekly U.S. regular gasoline",
        },
        "gasAnnual": annual,
    }


def spending_and_jobs():
    extra = {"spend": {}, "spendFromBls": {}, "jobs": {}}
    spend_rows = bls_rows("CXUTOTALEXPLB0101M", 2016)
    for row in spend_rows:
        if row.get("period") != "A01":
            continue
        year = int(row["year"])
        extra["spend"][str(year)] = round(float(row["value"]))
        if year != 2025:
            extra["spendFromBls"][str(year)] = True
    job_rows = [row for row in bls_rows("LNS14000000", 2012) if str(row.get("period", "")).startswith("M") and row["period"] != "M13"]
    job_rows.sort(key=lambda row: row["year"] + row["period"])
    if not job_rows:
        return extra
    latest = job_rows[-1]
    prior = job_rows[-2] if len(job_rows) > 1 else None
    grouped = {}
    for row in job_rows:
        grouped.setdefault(int(row["year"]), []).append(float(row["value"]))
    for year, values in grouped.items():
        if len(values) == 12:
            extra["jobs"][str(year)] = round(sum(values) / 12, 1)
    extra["jobMonth"] = {
        "year": int(latest["year"]),
        "month": latest.get("periodName") or "",
        "n": round(float(latest["value"]), 1),
        "priorMonth": prior.get("periodName") if prior else "",
        "prior": round(float(prior["value"]), 1) if prior else None,
    }
    return extra


def main():
    payload = {
        "updated": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "source": GAS_PAGE,
    }
    payload.update(gasoline())
    try:
        payload.update(spending_and_jobs())
    except Exception as error:
        print("bls skipped", error)
    text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    previous = ""
    if os.path.exists(OUT):
        previous = open(OUT, encoding="utf-8").read()
    fresh = json.loads(text)
    old = json.loads(previous) if previous else {}
    old.pop("updated", None)
    fresh.pop("updated", None)
    if old == fresh and previous:
        print("unchanged")
        return
    with open(OUT, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)
    live = payload["gasLive"]
    print("gas", live["label"], live["value"], "ago", live["ago"])


if __name__ == "__main__":
    main()
