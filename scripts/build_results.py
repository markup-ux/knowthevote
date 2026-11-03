"""Write a small unofficial results file from the Associated Press feed NBC News publishes."""
import json
import os
import urllib.request
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "results.json")
BASE = "https://www.nbcnews.com/firecracker/api/v2/state-results/2026-elections/"
RACES = [
    ("governor", "Governor", "illinois-governor-results"),
    ("senate", "U.S. Senate", "illinois-senate-results"),
    ("ag", "Attorney general", "illinois-attorney-general-results"),
    ("sos", "Secretary of state", "illinois-secretary-of-state-results"),
]
WINDOW_START = datetime(2026, 11, 3, 12, tzinfo=timezone.utc)
WINDOW_END = datetime(2026, 11, 6, 18, tzinfo=timezone.utc)
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"


def in_window():
    now = datetime.now(timezone.utc)
    return WINDOW_START <= now <= WINDOW_END


def fetch(slug):
    request = urllib.request.Request(
        BASE + slug,
        headers={"User-Agent": UA, "Accept": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=40) as response:
        return json.load(response)


def candidate(item):
    return {
        "name": item.get("name") or "",
        "party": item.get("party") or "",
        "votes": item.get("votes") or 0,
        "percent": item.get("percentVote") or 0,
        "percentLabel": item.get("formattedPercentVote") or "0%",
        "winner": bool(item.get("isWinner")),
    }


def slim(race_id, office, payload):
    race = payload["races"][0]
    summary = race["summary"]
    areas = {area["name"]: area for area in race.get("areas") or []}
    counties = {}
    for fips, unit in (race.get("mapData") or {}).items():
        if len(str(fips)) != 5:
            continue
        name = unit.get("countyName") or ""
        area = areas.get(name) or {}
        by_name = {item.get("name"): item for item in unit.get("candidates") or []}
        ordered = []
        for item in summary.get("candidates") or []:
            found = by_name.get(item.get("name")) or {}
            ordered.append([
                found.get("votes") or 0,
                found.get("formattedPercentVote") or "0%",
                bool(found.get("isWinner")),
            ])
        counties[str(fips)] = {
            "name": name,
            "percentIn": area.get("percentIn") or 0,
            "votes": area.get("votes") or 0,
            "candidates": ordered,
        }
    remaining = summary.get("estimatedVotesRemaining") or {}
    return {
        "id": race_id,
        "office": office,
        "percentIn": summary.get("percentIn") or 0,
        "percentLabel": summary.get("percentInFormatted") or "0%",
        "votes": summary.get("votes") or 0,
        "remaining": remaining.get("displayString") or "",
        "called": summary.get("callStatusText") or "",
        "candidates": [candidate(item) for item in summary.get("candidates") or []],
        "counties": counties,
    }


def main():
    forced = os.environ.get("RESULTS_FORCE") == "1"
    if not forced and not in_window() and os.path.exists(OUT):
        print("outside the election window")
        return
    races = []
    updated = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    for race_id, office, slug in RACES:
        try:
            payload = fetch(slug)
        except Exception as exc:
            print("skip", slug, exc)
            continue
        updated = payload.get("currentTime") or payload.get("lastModified") or updated
        races.append(slim(race_id, office, payload))
        print(office, "counties", len(races[-1]["counties"]), "votes", races[-1]["votes"])
    if not races:
        raise SystemExit("no races loaded")
    body = {
        "updated": updated,
        "source": "Associated Press totals published by NBC News",
        "sourceUrl": "https://www.nbcnews.com/politics/2026-elections/illinois-results",
        "officialUrl": "https://www.elections.il.gov/ElectionOperations/ElectionResults.aspx",
        "races": races,
    }
    text = json.dumps(body, separators=(",", ":"), ensure_ascii=False)
    open(OUT, "w", encoding="utf-8", newline="\n").write(text + "\n")
    print("wrote", OUT, "bytes", len(text))


if __name__ == "__main__":
    main()
