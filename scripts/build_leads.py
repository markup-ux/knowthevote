"""Write the small file the home map uses to color each state.

The color is whoever is ahead in that state's top statewide race, the same
rule as a county on a state map. A tie or zero votes leaves the state blank.
"""
import json
import os
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREVIEW = os.path.join(ROOT, "preview")
OUT = os.path.join(PREVIEW, "leads.json")
BASE = "https://www.nbcnews.com/firecracker/api/v2/state-results/2026-elections/"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
WINDOW_START = datetime(2026, 11, 3, 12, tzinfo=timezone.utc)
WINDOW_END = datetime(2026, 11, 6, 18, tzinfo=timezone.utc)
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


def in_window():
    now = datetime.now(timezone.utc)
    return WINDOW_START <= now <= WINDOW_END


def lead_of(office, candidates):
    rows = []
    for person in candidates or []:
        votes = person.get("votes") or 0
        party = (person.get("party") or "").lower()
        if votes > 0 and party not in ("yes", "no"):
            rows.append((votes, party or "other"))
    body = {"office": office, "party": "", "gap": 0, "votes": 0}
    if not rows:
        return body
    rows.sort(key=lambda row: -row[0])
    if len(rows) > 1 and rows[0][0] == rows[1][0]:
        body["votes"] = sum(item[0] for item in rows)
        return body
    total = sum(item[0] for item in rows)
    second = rows[1][0] if len(rows) > 1 else 0
    body["party"] = rows[0][1]
    body["votes"] = total
    body["gap"] = round((rows[0][0] - second) / total * 100, 2)
    return body


def top_race(races):
    ranked = []
    for race in races or []:
        if race.get("kind") in ("house", "measure"):
            continue
        office = race.get("office") or ""
        people = race.get("candidates") or []
        parties = {(person.get("party") or "").lower() for person in people}
        if not people or parties <= {"yes", "no"}:
            continue
        ranked.append((OFFICE_ORDER.get(office.lower(), 40), office, people))
    if not ranked:
        return None
    ranked.sort(key=lambda row: (row[0], row[1]))
    return lead_of(ranked[0][1], ranked[0][2])


def from_disk():
    states = {}
    folder = os.path.join(PREVIEW, "states")
    for name in os.listdir(folder):
        if not name.endswith(".json"):
            continue
        data = json.load(open(os.path.join(folder, name), encoding="utf-8"))
        code = (data.get("code") or name[:-5]).upper()
        lead = top_race(data.get("races"))
        if lead:
            states[code] = lead
    illinois = os.path.join(ROOT, "results.json")
    if os.path.exists(illinois):
        data = json.load(open(illinois, encoding="utf-8"))
        lead = top_race(data.get("races"))
        if lead:
            states["IL"] = lead
    updated = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return updated, states


def fetch_state(name):
    slug = name.lower().replace(" ", "-")
    request = urllib.request.Request(BASE + slug + "-results", headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=50) as response:
            return json.load(response)
    except Exception as error:
        print("skip", name, error)
        return None


def from_feed():
    national = json.load(open(os.path.join(PREVIEW, "national.json"), encoding="utf-8"))
    states = {}
    updated = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(fetch_state, item["name"]): item for item in national["states"]}
        for future in as_completed(futures):
            item = futures[future]
            payload = future.result()
            if not payload:
                continue
            updated = payload.get("currentTime") or payload.get("lastModified") or updated
            block = payload.get("stateRaceResults") or {}
            races = []
            for office in (block.get("discreteOffices") or []) + (block.get("otherRaces") or []):
                races.append({
                    "office": office.get("raceName") or office.get("officeName") or "",
                    "kind": "state",
                    "candidates": office.get("candidates") or [],
                })
            lead = top_race(races)
            if lead:
                states[item["code"]] = lead
                print(item["code"], lead["office"], lead["party"] or "blank", lead["votes"])
    if not states:
        raise SystemExit("no state leads loaded")
    illinois = os.path.join(ROOT, "results.json")
    if os.path.exists(illinois):
        data = json.load(open(illinois, encoding="utf-8"))
        lead = top_race(data.get("races"))
        if lead:
            states["IL"] = lead
    return updated, states


def main():
    fetch = "--fetch" in sys.argv
    forced = os.environ.get("RESULTS_FORCE") == "1"
    if fetch and not forced and not in_window() and os.path.exists(OUT):
        print("outside the election window")
        return
    updated, states = from_feed() if fetch else from_disk()
    body = {
        "updated": updated,
        "source": "Associated Press totals published by NBC News",
        "states": states,
    }
    text = json.dumps(body, separators=(",", ":"), ensure_ascii=False)
    open(OUT, "w", encoding="utf-8", newline="\n").write(text + "\n")
    colored = sum(1 for row in states.values() if row.get("party"))
    print("wrote", OUT, "states", len(states), "colored", colored)


if __name__ == "__main__":
    main()
