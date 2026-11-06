"""Largest amounts written in a bill, for the short description.

Reads the bill text on GovInfo. Uses a figure, a source, or a recipient only when
that bill text states it. The source is "money in the Treasury" only when the bill
says the sums come out of money in the Treasury.
"""

import json
import re
import ssl
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / "_billtext"
SUMMARIES = ROOT / "summaries.json"
OUT = ROOT / "money.json"

VERSIONS = ("enr", "eas", "es", "eh", "rds", "rfs", "rh", "pcs", "ih")
KIND = (
    ("HCONRES", "hconres"),
    ("HJRES", "hjres"),
    ("HRES", "hres"),
    ("HR", "hr"),
    ("SCONRES", "sconres"),
    ("SJRES", "sjres"),
    ("SRES", "sres"),
    ("S", "s"),
)
MONEY_WORD = re.compile(r"\b(?:appropriations?|appropriated|appropriating)\b", re.I)
BIG = re.compile(r"\$\d{1,3}(?:,\d{3}){2,}")
AMOUNT = re.compile(r"\$(\d{1,3}(?:,\d{3})+)")
SKIP = re.compile(r"(of which|not to exceed|shall not exceed|not more than|of the|up to)\s*$", re.I)
DEBT = re.compile(r"limitation under section 3101\(b\).{0,260}increased by\s*$", re.I | re.S)
APPROPRIATED = re.compile(r"there is appropriated to (?:the )?(.{8,160}?) for fiscal year", re.I)
AFTER_ACCOUNT = re.compile(r",?\s*for\s*[`\"']{1,2}([^`\"']{12,160})[`\"']{1,2}")
QUOTED = re.compile(r"[`\"]{1,2}([^`\"]{12,160})[`'\"]{1,2}")
BAD_WHO = re.compile(
    r"budget authority|functional category|are as follows|shall be|provided further|this section|this act",
    re.I,
)


def package(key):
    for prefix, kind in KIND:
        if key.startswith(prefix) and key[len(prefix):].isdigit():
            return kind + key[len(prefix):]
    return ""


def fetch(key):
    CACHE.mkdir(exist_ok=True)
    cached = CACHE / (key + ".txt")
    if cached.exists() and cached.stat().st_size > 200:
        return cached.read_text(encoding="utf-8")
    name = package(key)
    if not name:
        return ""
    context = ssl.create_default_context()
    for version in VERSIONS:
        stem = "BILLS-119" + name + version
        url = "https://www.govinfo.gov/content/pkg/" + stem + "/html/" + stem + ".htm"
        request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        try:
            with urllib.request.urlopen(request, timeout=60, context=context) as response:
                raw = response.read().decode("utf-8", "replace")
        except Exception:
            continue
        text = re.sub(r"<[^>]+>", " ", raw)
        text = text.replace("\xa0", " ")
        text = re.sub(r"[ \t]+", " ", text)
        cached.write_text(text, encoding="utf-8")
        return text
    return ""


def clean(value):
    value = re.sub(r"\s+", " ", value).strip(" ,;:-'\"`")
    value = value.replace("--", ", ")
    value = re.sub(r"\s+,", ",", value)
    return value


def readable(value):
    value = clean(value)
    letters = [char for char in value if char.isalpha()]
    if letters and sum(char.isupper() for char in letters) / len(letters) > 0.6:
        shorts = re.findall(r"\b[A-Z]{2,4}\b", value)
        value = value.title()
        for token in shorts:
            value = re.sub(r"\b" + token.title() + r"\b", token, value)
    if value and value[0].islower():
        value = value[0].upper() + value[1:]
    return value


def shorten(value, limit):
    value = clean(value)
    if len(value) <= limit:
        return value
    return value[:limit].rsplit(" ", 1)[0].rstrip(" ,;:") + "…"


def heading_before_for(before):
    matches = list(re.finditer(r"\bFor\b", before))
    if not matches:
        return ""
    last = matches[-1]
    if len(before) - last.end() > 950:
        return ""
    chunk = before[max(0, last.start() - 180):last.start()]
    chunk = re.sub(r"\([^)]*\)", " ", chunk)
    chunk = re.split(r"[.]", chunk)[-1]
    chunk = re.sub(r"(?i)^(?:title [ivxlc]+|sec\.\s*\d+[a-z]?)\s*", "", clean(chunk))
    words = chunk.split()
    if len(words) > 14:
        chunk = " ".join(words[-14:])
    if len(chunk) < 12 or re.match(r"(?i)(provided|and|which|that|in addition)\b", chunk):
        return ""
    return chunk[:1].upper() + chunk[1:]


def usable(who):
    if not who or BAD_WHO.search(who):
        return False
    if re.search(r"\$|inserting|\bthe term\b|\bmeans\b|['\"`]|\bfor$", who, re.I):
        return False
    if re.match(r"\(?[A-Za-z0-9]{1,3}\)", who) or re.search(r"amount equal to|recipient of assistance", who, re.I):
        return False
    words = re.findall(r"[A-Za-z]{2,}", who)
    return len(words) >= 2


def recipient(before, after):
    if SKIP.search(before[-80:]):
        return None
    if re.search(r"(or more|or less|at least|at most|greater than|less than|balance of|exceeds?|minimum of|maximum of)\s*$", before[-60:], re.I):
        return None
    if re.search(r"\b(means|the term|is defined|shall not be treated)\b", before[-160:], re.I):
        return None
    if DEBT.search(before[-500:]):
        return ("debt", "an increase in the public debt limit")
    following = AFTER_ACCOUNT.match(after)
    if following:
        who = readable(shorten(following.group(1), 120))
        if usable(who):
            return ("spend", who)
    offices = list(APPROPRIATED.finditer(before))
    if offices and len(before) - offices[-1].end() < 320:
        who = readable(shorten(offices[-1].group(1), 120))
        if usable(who):
            return ("spend", who)
    quotes = list(QUOTED.finditer(before))
    if quotes and len(before) - quotes[-1].end() < 220:
        who = readable(shorten(quotes[-1].group(1), 120))
        if usable(who):
            return ("spend", who)
    heading = heading_before_for(before)
    if heading:
        who = readable(shorten(heading, 120))
        if usable(who):
            return ("spend", who)
    return None


def collect(text):
    flat = re.sub(r"\s+", " ", text)
    found = []
    seen = set()
    for match in AMOUNT.finditer(flat):
        value = int(match.group(1).replace(",", ""))
        if value < 1_000_000:
            continue
        before = flat[max(0, match.start() - 1100):match.start()]
        after = flat[match.end():match.end() + 220]
        picked = recipient(before, after)
        if not picked:
            continue
        kind, who = picked
        if BAD_WHO.search(who):
            continue
        key = (kind, who.lower()[:48])
        if key in seen:
            continue
        seen.add(key)
        found.append((value, kind, who))
    found.sort(reverse=True)
    # Keep the largest amount for each recipient. The first pass already skips
    # a repeated recipient; a shorter prefix can still collide, so fold again.
    folded = []
    used = set()
    for value, kind, who in found:
        marker = (kind, who.lower()[:48])
        if marker in used:
            continue
        used.add(marker)
        folded.append((value, kind, who))
    return folded


def join_amounts(items):
    parts = ["$" + f"{value:,}" + " for " + who for value, who in items]
    if len(parts) == 1:
        return parts[0], "is"
    if len(parts) == 2:
        return parts[0] + " and " + parts[1], "are"
    return ", ".join(parts[:-1]) + ", and " + parts[-1], "are"


def money_sentence(text):
    flat = re.sub(r"\s+", " ", text)
    amounts = collect(flat)
    spending = [(value, who) for value, kind, who in amounts if kind == "spend"]
    debt = [value for value, kind, who in amounts if kind == "debt"]
    if not spending and not debt:
        return ""
    treasury = "out of any money in the Treasury" in flat
    rate = "such amounts as may be necessary" in flat.lower() and "rate for operations" in flat.lower()
    sentences = []
    if rate:
        lead = "The bill appropriates such amounts as may be necessary"
        if treasury:
            lead += ", from money in the Treasury,"
        lead += " to continue agencies at their current rate."
        sentences.append(lead)
    if debt:
        sentences.append("The bill increases the public debt limit by $" + f"{max(debt):,}" + ".")
    if spending:
        listed, verb = join_amounts(spending[:3])
        source = "From money in the Treasury, the " if treasury and not rate else "The "
        noun = "largest amount" if len(spending[:3]) == 1 else "largest amounts"
        sentences.append(source + noun + " it writes " + verb + " " + listed + ".")
        if len(spending) > 3:
            sentences.append("The bill states other amounts as well.")
    return " ".join(sentences)


def crs_lead(item):
    paragraphs = item.get("paragraphs") or []
    if not paragraphs:
        return ""
    text = paragraphs[0].strip()
    if not re.search(r"\$\s?\d|\d+(?:\.\d+)?\s*(?:million|billion|trillion)", text, re.I):
        return ""
    if not re.search(r"\b(provides?|appropriat\w*|funding)\b", text, re.I):
        return ""
    if len(text) > 420:
        text = text[:420].rsplit(" ", 1)[0].rstrip(" ,;:") + "…"
    return text


def main():
    summaries = json.loads(SUMMARIES.read_text(encoding="utf-8"))
    money = {}
    fetched = 0
    for key, item in summaries.items():
        if key.startswith(("HCONRES", "SCONRES")):
            continue
        lead = crs_lead(item)
        if lead:
            money[key] = lead
            print(key, "[summary]")
            print(lead)
            print()
            continue
        blob = " ".join(item.get("paragraphs") or []) + " " + (item.get("title") or "")
        if not (MONEY_WORD.search(blob) or BIG.search(blob)):
            continue
        text = fetch(key)
        if not text:
            continue
        fetched += 1
        sentence = money_sentence(text)
        if not sentence:
            continue
        money[key] = sentence
        print(key)
        print(sentence)
        print()
    OUT.write_text(json.dumps(money, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("lines", len(money), "texts", fetched)


if __name__ == "__main__":
    main()
