"""Official Group Chat records from November 3, 2026 on.

Social posts are handled separately. This file is the public record: White
House releases, the House floor list, and House and Senate roll calls. A
campaign site is not a source.
"""
import html
import json
import os
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

from email.utils import parsedate_to_datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHAT = os.path.join(ROOT, "chat")
OUT = os.path.join(CHAT, "official.json")
# November 3, 2026, midnight Eastern. That date is after the return to standard time.
START = datetime(2026, 11, 3, 5, tzinfo=timezone.utc)
CAST = {
    "Y": "Yes",
    "N": "No",
    "P": "Present",
    "X": "Did not vote",
    "A": "Paired yes",
    "B": "Paired no",
    "C": "Announced yes",
    "D": "Announced no",
}
SUFFIX = {"jr", "sr", "ii", "iii", "iv"}
FEEDS = [
    ("White House", "https://www.whitehouse.gov/news/feed/"),
    ("White House", "https://www.whitehouse.gov/presidential-actions/feed/"),
    ("White House", "https://www.whitehouse.gov/briefings-statements/feed/"),
]


def key(name):
    chars = []
    for char in (name or "").lower():
        if char.isalnum():
            chars.append(char)
        elif char.isspace() or char in "-'’":
            chars.append(" ")
    return " ".join("".join(chars).split())


def parts(name):
    words = [word for word in key(name).split() if word not in SUFFIX]
    if not words:
        return "", ""
    return words[0], words[-1]


def load(path):
    try:
        data = json.load(open(path, encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def now():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def on_or_after(moment):
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    return moment.astimezone(timezone.utc) >= START


def plain(value):
    text = re.sub(r"<[^>]+>", " ", value or "")
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def fetch(url):
    import urllib.request
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 Leaders.vote"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def white_house():
    found = []
    seen = set()
    for source, url in FEEDS:
        try:
            root = ET.fromstring(fetch(url))
        except Exception as exc:
            print("feed", url, type(exc).__name__, flush=True)
            continue
        for item in root.findall("./channel/item"):
            link = (item.findtext("link") or "").strip()
            title = plain(item.findtext("title") or "")
            if not link.startswith("https://") or not title or link in seen:
                continue
            try:
                moment = parsedate_to_datetime(item.findtext("pubDate") or "")
            except (TypeError, ValueError, IndexError):
                continue
            if not on_or_after(moment):
                continue
            seen.add(link)
            detail = plain(item.findtext("description") or "")
            text = title
            if detail and detail.lower() != title.lower() and 40 <= len(detail) <= 360:
                text = title + " " + detail
            found.append({
                "at": moment.astimezone(timezone.utc).replace(microsecond=0).isoformat(),
                "text": text[:700],
                "url": link,
                "source": source,
            })
    found.sort(key=lambda row: row["at"])
    return found


def floor_items(votes):
    floor = votes.get("floor") or {}
    rows = []
    for item in floor.get("items") or []:
        added = (item.get("added") or "")[:10]
        if added < "2026-11-03":
            continue
        title = plain(item.get("title") or "")
        legis = plain(item.get("legis") or "")
        category = plain(item.get("category") or "")
        text = ". ".join(part for part in (legis, title, category) if part)
        if not text:
            continue
        url = item.get("bill") or "https://docs.house.gov/floor/"
        if not str(url).startswith("https://"):
            url = "https://docs.house.gov/floor/"
        rows.append({
            "at": added,
            "text": text[:700],
            "url": url,
            "source": "House floor",
        })
    rows.sort(key=lambda row: row["at"])
    return rows


def roster(messages):
    by_state = {}
    for state in messages.get("states") or []:
        code = state.get("code") or ""
        people = []
        for person in state.get("people") or []:
            name = person.get("name") or ""
            first, last = parts(name)
            people.append({"id": code + "|" + key(name), "first": first, "last": last, "exact": key(name)})
        by_state[code] = people
    return by_state


def person_id(by_state, state, name):
    exact = key(name)
    people = by_state.get(state) or []
    for person in people:
        if person["exact"] == exact:
            return person["id"]
    first, last = parts(name)
    hits = [person for person in people if person["last"] == last and person["first"] == first]
    if len(hits) == 1:
        return hits[0]["id"]
    return ""


def roll_calls(votes, senate, by_state):
    names = {}
    for member in votes.get("members") or []:
        if member and member[0]:
            names[member[0]] = (member[1], (member[3] or "").upper())
    for member in senate.get("members") or []:
        if member and member[0]:
            names.setdefault(member[0], (member[1], (member[3] or "").upper()))
    people = {}
    used = 0
    missed = 0

    def add(vote, chamber, page):
        nonlocal used, missed
        cast = vote.get("cast")
        if isinstance(cast, str):
            pairs = []
            members = votes.get("members") or []
            for index, code in enumerate(cast):
                if index < len(members):
                    pairs.append((members[index][0], code))
        elif isinstance(cast, dict):
            pairs = list(cast.items())
        else:
            return
        question = plain(vote.get("question") or "")
        desc = plain(vote.get("desc") or "")
        for bioguide, code in pairs:
            word = CAST.get(code)
            if not word:
                continue
            name, state = names.get(bioguide) or ("", "")
            if not name or not state:
                continue
            ident = person_id(by_state, state, name)
            if not ident:
                missed += 1
                continue
            bits = [word]
            if question:
                bits.append(question.rstrip("."))
            if desc and desc.lower() not in question.lower():
                bits.append(desc.rstrip("."))
            when = vote.get("date") or ""
            clock = (vote.get("time") or "").strip()
            people.setdefault(ident, []).append({
                "at": when,
                "time": clock,
                "text": ". ".join(bits)[:700],
                "url": page + "#" + vote.get("id", ""),
                "source": chamber + " roll call",
            })
            used += 1

    for vote in votes.get("votes") or []:
        if (vote.get("date") or "") < "2026-11-03":
            continue
        add(vote, "House", "house.html")
    for vote in senate.get("votes") or []:
        if (vote.get("date") or "") < "2026-11-03":
            continue
        add(vote, "Senate", "house.html")
    for rows in people.values():
        rows.sort(key=lambda row: (row["at"], row.get("time") or ""))
    return people, used, missed


def main():
    messages = load(os.path.join(CHAT, "messages.json"))
    votes = load(os.path.join(ROOT, "congress", "votes.json"))
    senate = load(os.path.join(ROOT, "congress", "senate.json"))
    releases = white_house()
    floor = floor_items(votes)
    people, used, missed = roll_calls(votes, senate, roster(messages))
    payload = {
        "updated": now(),
        "since": "2026-11-03",
        "whitehouse": releases,
        "floor": floor,
        "people": people,
    }
    os.makedirs(CHAT, exist_ok=True)
    temporary = OUT + ".tmp"
    with open(temporary, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, separators=(",", ":"))
    os.replace(temporary, OUT)
    print("white house", len(releases), "floor", len(floor), "roll calls", used, "unmatched", missed, flush=True)


if __name__ == "__main__":
    main()
