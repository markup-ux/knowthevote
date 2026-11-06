"""Bills and resolutions introduced in the 119th Congress.

Reads each GovInfo bill status file only far enough to copy the introducer,
the date, the title, and the latest action. Does not invent a sponsor.
"""

import json
import re
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / "_introcache"
OUT = ROOT / "introduced.json"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"

KINDS = (
    ("hr", "HR"),
    ("s", "S"),
    ("hres", "HRES"),
    ("sres", "SRES"),
    ("hjres", "HJRES"),
    ("sjres", "SJRES"),
    ("hconres", "HCONRES"),
    ("sconres", "SCONRES"),
)


def fetch(url, limit):
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(request, timeout=60) as response:
        chunks = []
        total = 0
        while total < limit:
            block = response.read(65536)
            if not block:
                break
            chunks.append(block)
            total += len(block)
            if b"</bill>" in block or b"</bill>" in b"".join(chunks[-3:]):
                break
        return b"".join(chunks)


def directory(folder):
    url = "https://www.govinfo.gov/bulkdata/BILLSTATUS/119/" + folder
    text = fetch(url, 8000000).decode("utf-8", "replace")
    numbers = sorted({int(number) for number in re.findall(r"BILLSTATUS-119" + folder + r"(\d+)\.xml", text)})
    return numbers


def clean(value):
    return re.sub(r"\s+", " ", value or "").strip()


def first_tag(text, name):
    match = re.search(r"<%s>(.*?)</%s>" % (name, name), text, re.S)
    return clean(match.group(1)) if match else ""


def role_of(full):
    if full.startswith("Sen"):
        return "senator"
    if "Resident Commissioner" in full:
        return "resident commissioner"
    if full.startswith("Del"):
        return "delegate"
    return "representative"


def sponsors_of(text):
    match = re.search(r"<sponsors>(.*?)</sponsors>", text, re.S)
    if not match or not match.group(1).strip():
        return []
    people = []
    for item in re.findall(r"<item>(.*?)</item>", match.group(1), re.S):
        bioguide = first_tag(item, "bioguideId")
        if not bioguide:
            continue
        full = first_tag(item, "fullName")
        name = (first_tag(item, "firstName") + " " + first_tag(item, "lastName")).strip() or full
        district = first_tag(item, "district")
        role = role_of(full)
        people.append([
            bioguide,
            name,
            first_tag(item, "party")[:1].upper(),
            first_tag(item, "state"),
            int(district) if role != "senator" and district.isdigit() else None,
            role,
            1 if first_tag(item, "isByRequest").lower() in ("y", "true", "yes") else 0,
        ])
    return people


def title_of(text):
    match = re.search(r"<titles>(.*?)</titles>", text, re.S)
    if not match:
        return "", ""
    block = match.group(1)
    found = {}
    for item in re.findall(r"<item>(.*?)</item>", block, re.S):
        kind = first_tag(item, "titleType").lower()
        title = first_tag(item, "title")
        if title and kind not in found:
            found[kind] = title
    short = ""
    official = ""
    for kind, title in found.items():
        if "short title" in kind and "introduced" in kind and not short:
            short = title
        if kind.startswith("official title as introduced") and not official:
            official = title
    display = found.get("display title", "")
    heading = short or display or official
    if official == heading:
        official = ""
    return heading, official


def latest_of(text):
    if "</bill>" not in text:
        return "", ""
    at = text.rfind("<latestAction>")
    if at < 0:
        return "", ""
    chunk = text[at:text.find("</latestAction>", at) + len("</latestAction>")]
    return first_tag(chunk, "actionDate")[:10], first_tag(chunk, "text")


def one(folder, kind, number):
    key = kind + str(number)
    cached = CACHE / (key + ".json")
    if cached.exists():
        return key, json.loads(cached.read_text(encoding="utf-8"))
    url = "https://www.govinfo.gov/bulkdata/BILLSTATUS/119/%s/BILLSTATUS-119%s%s.xml" % (folder, folder, number)
    try:
        raw = fetch(url, 2500000)
    except urllib.error.HTTPError as error:
        if error.code == 404:
            return key, None
        raise
    text = raw.decode("utf-8", "replace")
    title, official = title_of(text)
    record = {
        "d": first_tag(text, "introducedDate")[:10],
        "t": title,
        "c": "senate" if first_tag(text, "originChamber").lower() == "senate" else "house",
        "p": sponsors_of(text),
    }
    if official:
        record["o"] = official
    status_date, status = latest_of(text)
    if status:
        record["s"] = status
        if status_date:
            record["sd"] = status_date
    cached.write_text(json.dumps(record, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return key, record


def main():
    CACHE.mkdir(exist_ok=True)
    jobs = []
    for folder, kind in KINDS:
        numbers = directory(folder)
        print(folder, len(numbers), flush=True)
        jobs.extend((folder, kind, number) for number in numbers)
    found = {}
    failed = 0
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(one, folder, kind, number): (kind, number) for folder, kind, number in jobs}
        done = 0
        for future in as_completed(futures):
            kind, number = futures[future]
            done += 1
            try:
                key, record = future.result()
            except Exception as error:
                failed += 1
                print("failed", kind, number, error, flush=True)
                continue
            if record:
                found[key] = record
            if done % 200 == 0 or done == len(jobs):
                print("read", done, "of", len(jobs), "kept", len(found), "failed", failed, flush=True)
    OUT.write_text(json.dumps(found, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    roles = {}
    chambers = {}
    for record in found.values():
        chambers[record.get("c")] = chambers.get(record.get("c"), 0) + 1
        for person in record.get("p") or []:
            roles[person[5]] = roles.get(person[5], 0) + 1
    print("bytes", OUT.stat().st_size, "chambers", chambers, "roles", roles, flush=True)


if __name__ == "__main__":
    main()
