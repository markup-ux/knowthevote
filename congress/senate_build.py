"""Copy Senate roll calls from Voteview into congress/senate.json.

The Senate site does not offer its roll-call files to this script. Voteview
publishes the Senate roll call, the question, and each senator's cast code.
Cast codes follow Voteview: 1 yes, 2 paired yes, 3 announced yes, 4 announced
no, 5 paired no, 6 no, 7 or 8 present, 9 did not vote.
"""

import csv
import io
import json
import re
import urllib.request
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "senate.json"
VOTES = ROOT / "votes.json"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"

CAST = {"1": "Y", "2": "A", "3": "C", "4": "D", "5": "B", "6": "N", "7": "P", "8": "P", "9": "X"}
PARTY = {"100": "D", "200": "R", "328": "I", "329": "I"}
LABELS = [
    ("SJRES", "S.J.Res.", "senate-joint-resolution"),
    ("SCONRES", "S.Con.Res.", "senate-concurrent-resolution"),
    ("SRES", "S.Res.", "senate-resolution"),
    ("HJRES", "H.J.Res.", "house-joint-resolution"),
    ("HCONRES", "H.Con.Res.", "house-concurrent-resolution"),
    ("HRES", "H.Res.", "house-resolution"),
    ("HR", "H.R.", "house-bill"),
    ("S", "S.", "senate-bill"),
]


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=90) as response:
        return response.read()


def rows(url):
    raw = fetch(url).decode("utf-8")
    return list(csv.DictReader(io.StringIO(raw)))


def person_name(bioname):
    text = re.sub(r"\s+", " ", bioname or "").strip()
    if "," not in text:
        return text
    last, rest = text.split(",", 1)
    last = last.strip().title()
    rest = rest.strip()
    return (rest + " " + last).strip()


def legis_of(raw):
    token = re.sub(r"[^A-Z0-9]", "", (raw or "").upper())
    if not token:
        return "", ""
    nomination = re.match(r"PN(\d+)$", token)
    if nomination:
        number = nomination.group(1)
        return "PN " + number, "https://www.congress.gov/nomination/119th-congress/" + number
    for kind, label, slug in LABELS:
        match = re.match(kind + r"(\d+)$", token)
        if match:
            number = match.group(1)
            return label + " " + number, "https://www.congress.gov/bill/119th-congress/%s/%s" % (slug, number)
    return token, ""


def main():
    print("download", flush=True)
    roll_rows = rows("https://voteview.com/static/data/out/rollcalls/S119_rollcalls.csv")
    member_rows = rows("https://voteview.com/static/data/out/members/S119_members.csv")
    vote_rows = rows("https://voteview.com/static/data/out/votes/S119_votes.csv")
    known = {}
    house = json.loads(VOTES.read_text(encoding="utf-8"))
    for member in house["members"]:
        known[member[0]] = member

    by_icpsr = {}
    extras = []
    parties = {}
    for row in member_rows:
        if row.get("chamber") != "Senate":
            continue
        icpsr = row.get("icpsr") or ""
        bioguide = (row.get("bioguide_id") or "").strip()
        party_code = row.get("party_code") or ""
        parties[party_code] = parties.get(party_code, 0) + 1
        if not bioguide:
            continue
        by_icpsr[icpsr] = bioguide
        if bioguide in known:
            continue
        extras.append([
            bioguide,
            person_name(row.get("bioname") or ""),
            PARTY.get(party_code, ""),
            row.get("state_abbrev") or "",
            None,
            "senate",
            "",
            "",
            "",
            "",
            "",
            "Former senator",
            None,
        ])

    cast_by_roll = {}
    codes = {}
    for row in vote_rows:
        number = row.get("rollnumber") or ""
        code = str(row.get("cast_code") or "").split(".", 1)[0]
        codes[code] = codes.get(code, 0) + 1
        bioguide = by_icpsr.get(row.get("icpsr") or "")
        if not bioguide or code not in CAST:
            continue
        cast_by_roll.setdefault(number, {})[bioguide] = CAST[code]

    votes = []
    mismatches = 0
    for row in roll_rows:
        number = int(row.get("rollnumber") or 0)
        date = (row.get("date") or "")[:10]
        year = int(date[:4]) if len(date) >= 4 else 0
        cast = cast_by_roll.get(str(number), {})
        yea = sum(1 for code in cast.values() if code in ("Y", "A", "C"))
        nay = sum(1 for code in cast.values() if code in ("N", "B", "D"))
        present = sum(1 for code in cast.values() if code == "P")
        absent = sum(1 for code in cast.values() if code == "X")
        try:
            published_yea = int(float(row.get("yea_count") or 0))
            published_nay = int(float(row.get("nay_count") or 0))
        except ValueError:
            published_yea = yea
            published_nay = nay
        if published_yea != yea or published_nay != nay:
            mismatches += 1
        legis, bill = legis_of(row.get("bill_number") or "")
        question = re.sub(r"\s+", " ", row.get("vote_question") or "").strip()
        desc = re.sub(r"\s+", " ", row.get("vote_desc") or "").strip()
        detail = re.sub(r"\s+", " ", row.get("dtl_desc") or "").strip()
        if detail and detail != desc:
            desc = detail if not desc else desc
        votes.append({
            "id": "s-%s-%s" % (year, number),
            "chamber": "senate",
            "n": number,
            "year": year,
            "date": date,
            "question": question,
            "desc": desc,
            "legis": legis,
            "bill": bill,
            "result": re.sub(r"\s+", " ", row.get("vote_result") or "").strip(),
            "yea": yea,
            "nay": nay,
            "present": present,
            "notVoting": absent,
            "source": "https://voteview.com/rollcall/RS119%04d" % number,
            "cast": cast,
        })
    votes.sort(key=lambda vote: (vote["date"], vote["n"]), reverse=True)
    payload = {
        "updated": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
        "source": "https://voteview.com/data",
        "members": extras,
        "votes": votes,
    }
    OUT.write_text(json.dumps(payload, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    dates = [vote["date"] for vote in votes if vote["date"]]
    print("rolls", len(votes), "extras", len(extras), "bytes", OUT.stat().st_size)
    print("dates", min(dates) if dates else None, max(dates) if dates else None)
    print("parties", parties)
    print("codes", codes)
    print("tally mismatches", mismatches)
    if votes:
        sample = [vote for vote in votes if vote["legis"] == "S. 5" and "Passed" in vote["result"]]
        print("s5 passed", [(vote["date"], vote["n"], vote["yea"], vote["nay"], vote["question"]) for vote in sample[:3]])


if __name__ == "__main__":
    main()
