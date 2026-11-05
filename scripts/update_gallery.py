"""Add Unsplash photographs to the gallery as they are published.

The catalog is the civic set: voting, courts, government buildings,
gatherings, political art, and monuments. Each run keeps every photograph
already recorded and appends new ones, so a later upload on Unsplash shows
up here on the next run. UNSPLASH_ACCESS_KEY is the application's access key.
"""
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOG = os.path.join(ROOT, "gallery-photos.json")
STATE = os.path.join(ROOT, "gallery-sync.json")
API = "https://api.unsplash.com/search/photos"
PER_PAGE = 30
PAGE_CAP = 200

# Specific searches run before the broad ones, so a photograph keeps the
# first subject it matches. "politics" fills in anything those missed.
SEARCHES = [
    ("voting", "voting"),
    ("ballot", "voting"),
    ("election", "voting"),
    ("polling station", "voting"),
    ("courthouse", "courts"),
    ("courtroom", "courts"),
    ("supreme court", "courts"),
    ("capitol building", "buildings"),
    ("parliament building", "buildings"),
    ("city hall", "buildings"),
    ("white house", "buildings"),
    ("congress building", "buildings"),
    ("lincoln memorial", "monuments"),
    ("statue of liberty", "monuments"),
    ("washington monument", "monuments"),
    ("political protest", "gatherings"),
    ("political rally", "gatherings"),
    ("protest sign", "art"),
    ("political poster", "art"),
    ("democracy", "gatherings"),
    ("politics", "gatherings"),
]

NATURE = re.compile(
    r"\b(canyon|desert|hiker|hikers|sandstone|capitol reef|mountain|mountains|"
    r"cliff|cliffs|rock formation|rock formations|waterfall|wildlife|flock of birds)\b",
    re.I,
)
PLACE = re.compile(
    r"\b(building|buildings|dome|domed|column|columns|courthouse|parliament|"
    r"protest|vote|voting|ballot|election|memorial|monument|statue|liberty|"
    r"white house|city hall|government)\b",
    re.I,
)
JUNK = re.compile(
    r"\b(flower|flowers|dog|dogs|cat|cats|kitten|puppy|coffee|cake|toothbrush|"
    r"hello kitty|oscars|no parking|no smoking|zebra print|denim jeans|hammock|"
    r"beach|umbrella)\b",
    re.I,
)
CIVIC = re.compile(
    r"\b("
    r"vote|votes|voted|voter|voters|voting|ballot|ballots|"
    r"election|elections|electoral|polling|polls|"
    r"democracy|democratic|republican|"
    r"capitol|congress|parliament|white house|city hall|"
    r"courthouse|courtroom|supreme court|"
    r"protest|protests|protester|protesters|rally|rallies|"
    r"demonstration|demonstrators|suffrage|referendum|"
    r"campaign|inaugurat\w*|senate|senator|legislature|legislative|"
    r"politic\w*|president|presidential|candidate|candidates|"
    r"government|constitution|constitutional|"
    r"memorial|monument|statue of liberty|"
    r"ballot box|polling place|polling station|i voted|voting booth"
    r")\b",
    re.I,
)
PHOTO_ID = re.compile(r"(photo-\d+-[A-Za-z0-9]+)")


def load_json(path, fallback):
    if not os.path.exists(path):
        return fallback
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def civic(text):
    return bool(CIVIC.search(text or ""))


def image_id(photo):
    urls = photo.get("urls") or {}
    for key in ("raw", "full", "regular", "small"):
        url = urls.get(key) or ""
        if "premium" in url or "plus.unsplash.com" in url:
            return None
        match = PHOTO_ID.search(url)
        if match:
            return match.group(1)
    return None


def slug_of(photo):
    html = ((photo.get("links") or {}).get("html") or "").split("?")[0].rstrip("/")
    if "/photos/" in html:
        return html.rsplit("/", 1)[-1]
    return photo.get("id") or ""


def alt_of(photo):
    alt = (photo.get("alt_description") or "").strip()
    if alt:
        return re.sub(r"\s+", " ", alt)
    description = (photo.get("description") or "").strip()
    return re.sub(r"\s+", " ", description)


def keep(record):
    if not record["id"] or not record["slug"] or not record["user"] or not record["by"]:
        return False
    if not record["alt"]:
        return False
    text = record["alt"] + " " + record["slug"].replace("-", " ")
    if re.search(r"capitol reef", text, re.I):
        return False
    if JUNK.search(record["alt"]) and not civic(text):
        return False
    if NATURE.search(record["alt"]) and not PLACE.search(text):
        return False
    return True


class Search:
    def __init__(self, key):
        self.key = key
        self.remaining = None

    def page(self, query, page, order):
        params = urllib.parse.urlencode({
            "query": query,
            "page": page,
            "per_page": PER_PAGE,
            "order_by": order,
        })
        request = urllib.request.Request(
            API + "?" + params,
            headers={
                "Authorization": "Client-ID " + self.key,
                "Accept-Version": "v1",
                "Accept": "application/json",
                "User-Agent": "Leaders.vote gallery",
            },
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            self.remaining = int(response.headers.get("X-Ratelimit-Remaining") or "0")
            return json.loads(response.read().decode("utf-8"))


def record_from(photo, subject):
    user = photo.get("user") or {}
    return {
        "id": image_id(photo) or "",
        "slug": slug_of(photo),
        "user": (user.get("username") or "").strip(),
        "by": re.sub(r"\s+", " ", (user.get("name") or "").strip()),
        "alt": alt_of(photo),
        "subject": subject,
    }


def main():
    key = (os.environ.get("UNSPLASH_ACCESS_KEY") or "").strip()
    if not key:
        print("UNSPLASH_ACCESS_KEY is not set, so the catalog was left as it is.")
        return 0

    photos = load_json(CATALOG, [])
    if not isinstance(photos, list):
        print("gallery-photos.json is not a list.")
        return 1
    state = load_json(STATE, {})
    if not isinstance(state, dict):
        state = {}
    by_id = {}
    for photo in photos:
        if isinstance(photo, dict) and photo.get("id"):
            by_id[photo["id"]] = photo

    client = Search(key)
    added = 0
    try:
        for query, subject in SEARCHES:
            for order in ("latest", "relevant"):
                cursor = state.get(query + "|" + order) or {}
                if cursor.get("done") and order == "relevant":
                    continue
                page = 1 if order == "latest" else int(cursor.get("page") or 1)
                while page <= PAGE_CAP:
                    if client.remaining is not None and client.remaining < 2:
                        raise StopIteration
                    payload = client.page(query, page, order)
                    results = payload.get("results") or []
                    total_pages = int(payload.get("total_pages") or 0)
                    if not results:
                        if order == "relevant":
                            state[query + "|" + order] = {"done": True, "page": page}
                        break
                    fresh = 0
                    for item in results:
                        record = record_from(item, subject)
                        if not record["id"] or record["id"] in by_id or not keep(record):
                            continue
                        by_id[record["id"]] = record
                        fresh += 1
                        added += 1
                    print("%s %s page %s: %s new (%s left)" % (
                        query, order, page, fresh, client.remaining
                    ))
                    page += 1
                    if order == "latest" and fresh == 0:
                        break
                    if total_pages and page > total_pages:
                        if order == "relevant":
                            state[query + "|" + order] = {"done": True, "page": page}
                        break
                    if order == "relevant":
                        state[query + "|" + order] = {"done": False, "page": page}
                    if client.remaining < 2:
                        raise StopIteration
    except StopIteration:
        print("Stopping so the rate limit is left intact. The next run continues.")
    except urllib.error.HTTPError as error:
        print("Unsplash returned %s." % error.code)
        if error.code in (401, 403):
            return 1

    ordered = sorted(by_id.values(), key=lambda item: (
        item.get("subject") or "",
        (item.get("by") or "").lower(),
        item.get("id") or "",
    ))
    with open(CATALOG, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(ordered, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    state["updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with open(STATE, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(state, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print("Catalog has %s photographs (%s added)." % (len(ordered), added))
    return 0


if __name__ == "__main__":
    sys.exit(main())
