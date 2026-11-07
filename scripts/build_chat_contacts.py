"""Office phone, room, and website for Group Chat contact cards.

The member rows already live in the House file. This writes only the contact
fields, keyed the same way as a Group Chat person.
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "chat", "contacts.json")
SUFFIX = {"jr", "sr", "ii", "iii", "iv"}


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


def contact(member):
    phone, room, url, form = member[6], member[7], member[8], member[9]
    district = member[4]
    leadership = member[10] or ""
    if not (phone or room or url or form or member[0]):
        return None
    row = {
        "id": member[0] or "",
        "chamber": member[5] or "",
        "phone": phone or "",
        "room": room or "",
        "url": url or "",
        "form": form or "",
    }
    if isinstance(district, int):
        row["district"] = district
    if leadership:
        row["leadership"] = leadership
    return row


def main():
    votes = json.load(open(os.path.join(ROOT, "congress", "votes.json"), encoding="utf-8"))
    messages = json.load(open(os.path.join(ROOT, "chat", "messages.json"), encoding="utf-8"))
    exact = {}
    fuzzy = {}
    ambiguous = set()
    for member in votes.get("members") or []:
        if not member or not member[1] or not member[3]:
            continue
        row = contact(member)
        if not row:
            continue
        state = str(member[3]).upper()
        exact[state + "|" + key(member[1])] = row
        first, last = parts(member[1])
        token = state + "|" + first + "|" + last
        if token in fuzzy and fuzzy[token] != row:
            ambiguous.add(token)
        else:
            fuzzy[token] = row
    for token in ambiguous:
        fuzzy.pop(token, None)

    people = {}
    for state in messages.get("states") or []:
        code = state.get("code") or ""
        for person in state.get("people") or []:
            ident = code + "|" + key(person.get("name"))
            row = exact.get(ident)
            if not row:
                first, last = parts(person.get("name"))
                row = fuzzy.get(code + "|" + first + "|" + last)
            if row:
                people[ident] = row
    json.dump({"people": people}, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("contacts", len(people))


if __name__ == "__main__":
    main()
