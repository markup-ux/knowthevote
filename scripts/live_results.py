"""Copy NBC totals on NBC's own 15-second interval.

Writes the results branch, not the site branch, so a new total does not
wait for a full site rebuild. Each snapshot is also published at a new
branch named for that 15-second slot. GitHub caches one address for five
minutes, so the page reads the new address instead of the shared file.
"""
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import build_leads
import build_preview
import build_results

INTERVAL = 15
DETAIL_EVERY = 60
RUN_MINUTES = 350
PREVIEW = os.path.join(ROOT, "preview")
STATES = os.path.join(PREVIEW, "states")
LEADS = os.path.join(PREVIEW, "leads.json")
RESULTS = os.path.join(ROOT, "results.json")


def office_key(text):
    words = (text or "").lower().replace(".", " ").split()
    if words[:2] == ["u", "s"]:
        words = words[2:]
    return " ".join(word for word in words if word != "of")


def person_key(name):
    return " ".join((name or "").lower().split())


def apply_candidates(race, incoming):
    by_name = {person_key(item.get("name")): item for item in incoming or []}
    changed = False
    for person in race.get("candidates") or []:
        src = by_name.get(person_key(person.get("name")))
        if not src:
            continue
        votes = src.get("votes") or 0
        percent = src.get("percentVote") or 0
        label = src.get("formattedPercentVote") or person.get("percentLabel") or "0%"
        winner = bool(src.get("isWinner"))
        if (
            person.get("votes") != votes
            or person.get("percent") != percent
            or person.get("percentLabel") != label
            or bool(person.get("winner")) != winner
        ):
            person["votes"] = votes
            person["percent"] = percent
            person["percentLabel"] = label
            person["winner"] = winner
            changed = True
    return changed


def patch_payload(state, payload):
    block = payload.get("stateRaceResults") or {}
    offices = {}
    for item in build_preview.feed_items(payload):
        offices[office_key(item.get("raceName") or item.get("officeName") or "")] = item
    changed = False
    for race in state.get("races") or []:
        if race.get("kind") == "house":
            by_name = {person_key(item.get("name")): item for item in block.get("house") or []}
            for district in race.get("districts") or []:
                src = by_name.get(person_key(district.get("name")))
                if not src:
                    continue
                if apply_candidates(district, src.get("candidates") or []):
                    changed = True
                votes = src.get("votes") or 0
                if district.get("votes") != votes:
                    district["votes"] = votes
                    changed = True
            continue
        src = offices.get(office_key(race.get("office") or ""))
        if not src:
            continue
        if apply_candidates(race, src.get("candidates") or []):
            changed = True
        total = sum((person.get("votes") or 0) for person in race.get("candidates") or [])
        if race.get("votes") != total:
            race["votes"] = total
            changed = True
        if src.get("percentIn") not in (None, "") and race.get("percentIn") != src.get("percentIn"):
            race["percentIn"] = src.get("percentIn")
            changed = True
        label = src.get("percentInFormatted")
        if label and race.get("percentLabel") != label:
            race["percentLabel"] = label
            changed = True
    stamp = payload.get("currentTime") or payload.get("lastModified") or ""
    if isinstance(stamp, str) and stamp and state.get("updated") != stamp:
        state["updated"] = stamp
        changed = True
    return changed


def write_json(path, body):
    text = json.dumps(body, separators=(",", ":"), ensure_ascii=False)
    open(path, "w", encoding="utf-8", newline="\n").write(text + "\n")


def landing_pass():
    national = json.load(open(os.path.join(PREVIEW, "national.json"), encoding="utf-8"))
    changed = False
    leads = {}
    newest = ""
    for item in national.get("states") or []:
        slug, payload, error = build_preview.fetch_state(item["name"])
        if not payload:
            print("keep", item["code"], error)
            continue
        stamp = payload.get("currentTime") or ""
        if isinstance(stamp, str) and stamp > newest:
            newest = stamp
        path = os.path.join(STATES, item["code"].lower() + ".json")
        if os.path.exists(path):
            state = json.load(open(path, encoding="utf-8"))
        else:
            state = build_preview.slim_state(item["code"], item["name"], slug, payload, error)
        if patch_payload(state, payload):
            write_json(path, state)
            changed = True
        lead = build_leads.top_race(state.get("races"))
        if lead:
            leads[item["code"]] = lead
        if item["code"] == "IL" and os.path.exists(RESULTS):
            illinois = json.load(open(RESULTS, encoding="utf-8"))
            if patch_payload(illinois, payload):
                write_json(RESULTS, illinois)
                changed = True
            fresh = build_leads.top_race(illinois.get("races"))
            if fresh:
                leads["IL"] = fresh
    if leads:
        previous = {}
        if os.path.exists(LEADS):
            previous = json.load(open(LEADS, encoding="utf-8"))
        body = {
            "updated": newest or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "source": "Associated Press totals published by NBC News",
            "states": leads,
        }
        if json.dumps(body, sort_keys=True) != json.dumps(previous, sort_keys=True):
            write_json(LEADS, body)
            changed = True
    return changed


def detail_pass():
    print("county refresh")
    build_preview.refresh_results()
    try:
        build_results.main()
    except SystemExit as error:
        print("illinois detail", error)


def use_results_branch():
    subprocess.check_call(["git", "fetch", "origin"], cwd=ROOT)
    found = subprocess.run(
        ["git", "ls-remote", "--exit-code", "--heads", "origin", "results"],
        cwd=ROOT,
    )
    if found.returncode == 0:
        subprocess.check_call(["git", "checkout", "-B", "results", "origin/results"], cwd=ROOT)
    else:
        subprocess.check_call(["git", "checkout", "-B", "results"], cwd=ROOT)


def publish():
    subprocess.check_call(
        ["git", "add", "--", "results.json", "preview/leads.json", "preview/states"],
        cwd=ROOT,
    )
    quiet = subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=ROOT)
    if quiet.returncode != 0:
        subprocess.check_call(["git", "commit", "-m", "Update unofficial election totals."], cwd=ROOT)
        subprocess.check_call(["git", "push", "--set-upstream", "origin", "results"], cwd=ROOT)
        print("pushed results")
    else:
        print("unchanged")
    point_bucket()


def point_bucket():
    bucket = int(time.time() // INTERVAL) * INTERVAL
    name = "t%d" % bucket
    if name == point_bucket.previous:
        return
    created = subprocess.run(
        ["git", "push", "origin", "HEAD:refs/heads/%s" % name],
        cwd=ROOT,
    )
    if created.returncode != 0:
        print("bucket push failed", name)
        return
    point_bucket.previous = name
    print("bucket", name)
    listed = subprocess.run(
        ["git", "ls-remote", "--heads", "origin", "refs/heads/t*"],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    cutoff = bucket - 40 * INTERVAL
    stale = []
    for line in (listed.stdout or "").splitlines():
        ref = line.split()[-1]
        short = ref.rsplit("/", 1)[-1]
        if short.startswith("t") and short[1:].isdigit() and int(short[1:]) < cutoff:
            stale.append(":" + ref)
    if stale:
        subprocess.run(["git", "push", "origin"] + stale, cwd=ROOT)


point_bucket.previous = ""


def main():
    once = "--once" in sys.argv
    push = os.environ.get("GITHUB_ACTIONS") == "true"
    if not build_leads.in_window() and os.environ.get("RESULTS_FORCE") != "1":
        print("outside the election window")
        return
    if push:
        use_results_branch()
    deadline = datetime.now(timezone.utc).timestamp() + RUN_MINUTES * 60
    last_detail = 0
    while True:
        started = time.time()
        if not build_leads.in_window() and os.environ.get("RESULTS_FORCE") != "1":
            print("window closed")
            return
        try:
            if started - last_detail >= DETAIL_EVERY:
                detail_pass()
                last_detail = time.time()
            landing_pass()
            if push:
                publish()
        except Exception as error:
            print("cycle failed", error)
        if once or time.time() >= deadline:
            return
        leftover = INTERVAL - (time.time() - started)
        if leftover > 0:
            time.sleep(leftover)


if __name__ == "__main__":
    main()
