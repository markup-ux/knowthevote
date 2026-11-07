"""Build the Group Chat file from saved campaign statements and candidate photos.

A line is included only when a guide already stored it. Party and portrait come
from the NBC candidate record when the name matches.
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "chat", "messages.json")

PARTY = {
    "gop": "Republican",
    "dem": "Democratic",
    "ind": "Independent",
    "lib": "Libertarian",
    "other": "Other",
}


def key(name):
    chars = []
    for char in (name or "").lower():
        if char.isalnum():
            chars.append(char)
        elif char.isspace() or char in "-'’":
            chars.append(" ")
    return " ".join("".join(chars).split())


def load(path):
    try:
        data = json.load(open(path, encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def usable_photo(url):
    if not isinstance(url, str) or ".." in url:
        return ""
    if url.startswith("photos/"):
        return url
    if (
        url.startswith("https://media-cldnry.s-nbcnews.com/")
        and "candidate_fallback" not in url
        and "undefined" not in url
        and "generated_" not in url.lower()
    ):
        return url
    return ""


def walk_candidates(node, found, office=""):
    if isinstance(node, dict):
        if node.get("name") and (node.get("party") or node.get("photo")):
            found.append((node, office))
        for value in node.values():
            walk_candidates(value, found, node.get("office") or office)
    elif isinstance(node, list):
        for value in node:
            walk_candidates(value, found, office)


def attach_presidents(states):
    path = os.path.join(ROOT, "congress", "presidents.json")
    try:
        payload = json.load(open(path, encoding="utf-8"))
    except (OSError, ValueError):
        return states
    labels = {"D": ("dem", "Democratic"), "R": ("gop", "Republican")}
    rows = []
    for person in payload.get("people") or []:
        if not isinstance(person, dict) or not person.get("name"):
            continue
        code, label = labels.get(person.get("party") or "", ("other", "Another party"))
        line = person.get("line") or ""
        rows.append({
            "name": person.get("name") or "",
            "party": code,
            "partyLabel": label,
            "photo": person.get("photo") or "",
            "office": "President",
            "lines": [line] if line else [],
            "source": person.get("url") or "",
        })
    if not rows:
        return states
    states = [state for state in states if state.get("code") != "US"]
    states.append({"code": "US", "name": "United States", "people": rows})
    states.sort(key=lambda state: state["name"])
    return states


def main():
    found = load(os.path.join(ROOT, "photos", "found.json"))
    states = []
    preview_dir = os.path.join(ROOT, "preview", "states")
    codes = sorted(name[:-5] for name in os.listdir(preview_dir) if name.endswith(".json"))
    for code in codes:
        preview = load(os.path.join(preview_dir, code + ".json"))
        guide_path = os.path.join(ROOT, "guides", code + ".json")
        if code == "il" and not os.path.exists(guide_path):
            guide_path = os.path.join(ROOT, "guides", "_incoming", "il.json")
        guide = load(guide_path)
        people = guide.get("people") or {}
        roster = {}
        candidates = []
        walk_candidates(preview.get("races") or [], candidates)
        for person, office in candidates:
            name = key(person.get("name"))
            if not name or name.startswith("total write"):
                continue
            photo = usable_photo(person.get("photo")) or usable_photo(found.get(code + "|" + name))
            current = roster.get(name)
            if not current:
                roster[name] = {
                    "party": person.get("party") or "",
                    "photo": photo,
                    "office": office or "",
                }
            elif photo and not current["photo"]:
                current["photo"] = photo
        rows = []
        for raw_name, info in people.items():
            if not isinstance(info, dict):
                continue
            name = key(raw_name.split("|")[-1])
            if not name:
                continue
            lines = [item.strip() for item in (info.get("issues") or []) if isinstance(item, str) and item.strip()]
            if not lines:
                continue
            meta = roster.get(name) or {}
            photo = meta.get("photo") or usable_photo(found.get(code + "|" + name))
            display = raw_name.split("|")[-1].title()
            if meta:
                for person, office in candidates:
                    if key(person.get("name")) == name:
                        display = person.get("name") or display
                        break
            rows.append({
                "name": display,
                "party": meta.get("party") or "",
                "partyLabel": PARTY.get(meta.get("party") or "", ""),
                "photo": photo,
                "office": meta.get("office") or (info.get("role") or ""),
                "lines": lines,
                "source": info.get("source") or info.get("site") or "",
            })
        rows.sort(key=lambda row: (row["name"]))
        if rows:
            states.append({
                "code": code.upper(),
                "name": preview.get("name") or code.upper(),
                "people": rows,
            })
    states.sort(key=lambda state: state["name"])
    states = attach_presidents(states)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump({"states": states}, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    people = sum(len(state["people"]) for state in states)
    lines = sum(len(person["lines"]) for state in states for person in state["people"])
    photos = sum(1 for state in states for person in state["people"] if person["photo"])
    print("states", len(states), "people", people, "lines", lines, "photos", photos)


if __name__ == "__main__":
    main()
