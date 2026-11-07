"""Copy official social posts into the Group Chat.

Office accounts for sitting members of Congress come from the public
congress-legislators social file. Every other account is a link on the
campaign site already stored for that person. Posts are read from the public
feeds those networks provide: X, Mastodon, and Bluesky. Facebook, Instagram,
and YouTube are linked, because they do not publish a post feed this page can
copy. A failed refresh keeps the previous posts for that account.
"""
import html
import json
import os
import re
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHAT = os.path.join(ROOT, "chat")
ACCOUNTS_PATH = os.path.join(CHAT, "accounts.json")
FEEDS_PATH = os.path.join(CHAT, "feeds.json")
POSTS_PATH = os.path.join(CHAT, "posts.json")
CURRENT_URL = "https://unitedstates.github.io/congress-legislators/legislators-current.json"
SOCIAL_URL = "https://unitedstates.github.io/congress-legislators/legislators-social-media.json"
BROWSER = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
CONGRESS_OFFICES = {"U.S. House", "Senate", "U.S. Senate"}
X_SKIP = {
    "share", "intent", "home", "search", "hashtag", "privacy", "tos", "widgets",
    "i", "jobs", "about", "login", "signup", "explore", "settings", "compose",
    "messages", "notifications", "download", "terms", "followers", "following",
    "lists", "privacy", "intent",
}
FACEBOOK_SKIP = {
    "sharer", "share", "dialog", "plugins", "watch", "stories", "help", "privacy",
    "policies", "settings", "login", "pages", "groups", "events", "photo.php",
    "story.php", "people", "l.php", "share.php", "connect", "legal", "ads",
    "business", "marketplace", "reel", "reels", "friends", "messages", "home",
    "hashtag", "watch", "videos", "photos", "live", "donate", "gaming", "media",
    "about", "policy", "terms", "support", "developers", "tr",
}
INSTAGRAM_SKIP = {
    "p", "reel", "reels", "explore", "accounts", "stories", "tv", "about",
    "legal", "developer", "direct", "directory", "privacy", "terms", "popular",
}
YOUTUBE_SKIP = {"watch", "playlist", "embed", "shorts", "feed", "results", "redirect", "premium", "account", "about"}


class RateLimit(Exception):
    def __init__(self, reset=None):
        self.reset = reset


def key(name):
    chars = []
    for char in (name or "").lower():
        if char.isalnum():
            chars.append(char)
        elif char.isspace() or char in "-'’":
            chars.append(" ")
    return " ".join("".join(chars).split())


def now():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def fresh(stamp, hours):
    if not stamp:
        return False
    try:
        then = datetime.fromisoformat(stamp)
    except ValueError:
        return False
    if then.tzinfo is None:
        then = then.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - then < timedelta(hours=hours)


def load(path):
    try:
        data = json.load(open(path, encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def save(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    temporary = path + ".tmp"
    with open(temporary, "w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, separators=(",", ":"))
    os.replace(temporary, path)


def publish_chat():
    """Push a finished batch when this copy is running on GitHub."""
    if os.environ.get("GITHUB_ACTIONS") != "true":
        return
    try:
        subprocess.run(
            ["git", "add", "--", "chat/posts.json", "chat/accounts.json", "chat/feeds.json"],
            cwd=ROOT,
            check=True,
        )
        quiet = subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=ROOT)
        if quiet.returncode == 0:
            return
        subprocess.run(
            ["git", "commit", "-m", "Update Group Chat with the latest official social posts."],
            cwd=ROOT,
            check=True,
        )
        pushed = subprocess.run(["git", "push", "origin", "HEAD"], cwd=ROOT)
        if pushed.returncode != 0:
            subprocess.run(["git", "pull", "--rebase", "origin", "main"], cwd=ROOT, check=True)
            subprocess.run(["git", "push", "origin", "HEAD"], cwd=ROOT, check=True)
        print("published", flush=True)
    except Exception as error:
        print("publish failed", error, flush=True)


def read_url(url, timeout, ua=None, limit=500000):
    if not url.startswith(("http://", "https://")):
        return 0, b"", {}
    request = urllib.request.Request(url, headers={
        "User-Agent": ua or "Mozilla/5.0 Leaders.vote",
        "Accept-Language": "en",
    })
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, response.read(limit), response.headers
    except urllib.error.HTTPError as exc:
        return exc.code, b"", exc.headers
    except Exception:
        return 0, b"", {}


def fetch_json(url):
    status, raw, _headers = read_url(url, 40, limit=8000000)
    if status != 200:
        raise RuntimeError("could not read " + url)
    return json.loads(raw.decode("utf-8"))


def clean_post(text):
    text = re.sub(r"https://t\.co/\w+", "", text or "")
    text = html.unescape(text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def usable(text):
    bare = re.sub(r"https?://\S+", "", text).strip(" #")
    return len(bare) >= 8 and bare.lower().replace(" ", "") not in {"newprofilepic", "#newprofilepic"}


def x_time(value):
    try:
        return parsedate_to_datetime(value).astimezone(timezone.utc).isoformat()
    except (TypeError, ValueError, IndexError):
        return ""


def add_account(found, seen, account):
    if not account:
        return
    token = (account["net"], account["handle"].lower())
    if token in seen:
        return
    seen.add(token)
    found.append(account)


def classify(url):
    x_match = re.search(r"https?://(?:www\.)?(?:twitter\.com|x\.com)/([A-Za-z0-9_]{1,15})(?:[/?#]|$)", url, re.I)
    if x_match and x_match.group(1).lower() not in X_SKIP:
        handle = x_match.group(1)
        return {"net": "x", "handle": handle, "url": "https://x.com/" + handle, "kind": "campaign"}
    profile = re.search(r"facebook\.com/profile\.php\?id=(\d+)", url, re.I)
    if profile:
        handle = profile.group(1)
        return {"net": "facebook", "handle": handle, "url": "https://www.facebook.com/profile.php?id=" + handle, "kind": "campaign"}
    facebook = re.search(r"https?://(?:www\.)?facebook\.com/([A-Za-z0-9.\-]{2,80})(?:[/?#]|$)", url, re.I)
    if facebook and facebook.group(1).lower() not in FACEBOOK_SKIP:
        handle = facebook.group(1)
        return {"net": "facebook", "handle": handle, "url": "https://www.facebook.com/" + handle, "kind": "campaign"}
    instagram = re.search(r"https?://(?:www\.)?instagram\.com/([A-Za-z0-9_.]{1,30})(?:[/?#]|$)", url, re.I)
    if instagram and instagram.group(1).lower() not in INSTAGRAM_SKIP:
        handle = instagram.group(1).strip(".")
        return {"net": "instagram", "handle": handle, "url": "https://www.instagram.com/" + handle + "/", "kind": "campaign"}
    youtube = re.search(r"https?://(?:www\.)?youtube\.com/(channel/|user/|c/|@)([A-Za-z0-9_\-]{2,80})(?:[/?#]|$)", url, re.I)
    if youtube and youtube.group(2).lower() not in YOUTUBE_SKIP:
        prefix, handle = youtube.group(1), youtube.group(2)
        if prefix == "@":
            profile_url = "https://www.youtube.com/@" + handle
        else:
            profile_url = "https://www.youtube.com/" + prefix + handle
        return {"net": "youtube", "handle": handle, "url": profile_url, "kind": "campaign"}
    bluesky = re.search(r"https?://(?:www\.)?bsky\.app/profile/([A-Za-z0-9.\-]{2,80})(?:[/?#]|$)", url, re.I)
    if bluesky:
        handle = bluesky.group(1)
        return {"net": "bluesky", "handle": handle, "url": "https://bsky.app/profile/" + handle, "kind": "campaign"}
    mastodon = re.search(r"https?://([a-z0-9.\-]*(?:mastodon|mstdn)[a-z0-9.\-]*|mas\.to)/@([A-Za-z0-9_\-]{1,40})(?:[/?#]|$)", url, re.I)
    if mastodon:
        host, user = mastodon.group(1).lower(), mastodon.group(2)
        return {"net": "mastodon", "handle": user + "@" + host, "url": "https://" + host + "/@" + user, "kind": "campaign"}
    truth = re.search(r"https?://(?:www\.)?truthsocial\.com/@([A-Za-z0-9_\.]{1,40})(?:[/?#]|$)", url, re.I)
    if truth:
        handle = truth.group(1)
        return {"net": "truth", "handle": handle, "url": "https://truthsocial.com/@" + handle, "kind": "campaign"}
    return None


def accounts_from_html(page):
    found, seen = [], set()
    for url in re.findall(r"https?://[^\s\"'<>]+", page, flags=re.I):
        add_account(found, seen, classify(html.unescape(url).rstrip(").,;")))
    return found


def office_accounts(social):
    found, seen = [], set()
    twitter = (social.get("twitter") or "").lstrip("@")
    if "/" in twitter:
        twitter = twitter.rstrip("/").split("/")[-1]
    if re.fullmatch(r"[A-Za-z0-9_]{1,15}", twitter or ""):
        add_account(found, seen, {"net": "x", "handle": twitter, "url": "https://x.com/" + twitter, "kind": "office"})
    facebook = social.get("facebook") or ""
    if re.fullmatch(r"[A-Za-z0-9.\-]{2,80}", facebook):
        add_account(found, seen, {"net": "facebook", "handle": facebook, "url": "https://www.facebook.com/" + facebook, "kind": "office"})
    instagram = (social.get("instagram") or "").lstrip("@")
    if re.fullmatch(r"[A-Za-z0-9_.]{1,30}", instagram):
        add_account(found, seen, {"net": "instagram", "handle": instagram, "url": "https://www.instagram.com/" + instagram + "/", "kind": "office"})
    if social.get("youtube_id"):
        channel = social["youtube_id"]
        add_account(found, seen, {"net": "youtube", "handle": channel, "url": "https://www.youtube.com/channel/" + channel, "kind": "office"})
    elif social.get("youtube"):
        name = social["youtube"]
        add_account(found, seen, {"net": "youtube", "handle": name, "url": "https://www.youtube.com/@" + name, "kind": "office"})
    mastodon = re.match(r"@?([^@\s]+)@([^@\s]+)", social.get("mastodon") or "")
    if mastodon:
        user, host = mastodon.group(1), mastodon.group(2).lower()
        add_account(found, seen, {"net": "mastodon", "handle": user + "@" + host, "url": "https://" + host + "/@" + user, "kind": "office"})
    return found


def name_keys(name):
    found = []
    official = name.get("official_full") or ""
    first = name.get("first") or ""
    last = name.get("last") or ""
    nick = name.get("nickname") or ""
    middle = name.get("middle") or ""
    if official:
        found.append(key(official))
    if first and last:
        found.append(key(first + " " + last))
        if middle:
            found.append(key(first + " " + middle + " " + last))
    if nick and last:
        found.append(key(nick + " " + last))
    return [item for item in found if item]


def x_stop():
    raw = os.environ.get("CHAT_POSTS_BUDGET_MINUTES") or ""
    try:
        minutes = float(raw)
    except ValueError:
        return False
    return minutes > 0 and time.time() >= x_stop.deadline


x_stop.deadline = None


def x_pause(reset):
    try:
        reset_at = float(reset)
    except (TypeError, ValueError):
        reset_at = time.time() + 60
    delay = reset_at - time.time() + 3
    if delay < 5:
        delay = 30
    if delay > 20 * 60:
        delay = 20 * 60
    if x_stop.deadline and time.time() + delay > x_stop.deadline:
        print("Stopping so this run can be published. The rest will be copied next time.", flush=True)
        return False
    print("X allows 30 reads at a time. Waiting", int(delay), "seconds.", flush=True)
    time.sleep(delay)
    return True


def x_posts(handle):
    status, raw, headers = read_url(
        "https://syndication.twitter.com/srv/timeline-profile/screen-name/" + urllib.parse.quote(handle),
        40,
        BROWSER,
        limit=8000000,
    )
    x_posts.remaining = headers.get("x-rate-limit-remaining") if headers else None
    x_posts.reset = headers.get("x-rate-limit-reset") if headers else None
    if status == 429:
        raise RateLimit(x_posts.reset)
    if status != 200 or not raw:
        return None
    # The timeline JSON is one script and can run past a megabyte. A short read
    # cuts the script off, and the account is then stored as a miss.
    match = re.search(
        r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>',
        raw.decode("utf-8", "replace"),
        re.DOTALL,
    )
    if not match:
        return None
    try:
        data = json.loads(match.group(1))
    except ValueError:
        return None
    entries = (((data.get("props") or {}).get("pageProps") or {}).get("timeline") or {}).get("entries") or []
    posts = []
    for entry in entries:
        tweet = ((entry.get("content") or {}).get("tweet") or {})
        screen = ((tweet.get("user") or {}).get("screen_name") or "")
        if screen.lower() != handle.lower():
            continue
        body = clean_post(tweet.get("full_text") or "")
        permalink = tweet.get("permalink") or ""
        if not usable(body) or not permalink.startswith("/"):
            continue
        posts.append({
            "net": "x",
            "handle": screen,
            "text": body[:700],
            "at": x_time(tweet.get("created_at") or ""),
            "url": "https://x.com" + permalink,
            "context": x_context(tweet),
            "counts": tweet_counts(tweet),
        })
        if len(posts) == 3:
            break
    return posts


def mastodon_posts(handle):
    user, host = handle.split("@", 1)
    status, raw, _headers = read_url("https://" + host + "/api/v1/accounts/lookup?acct=" + urllib.parse.quote(user), 20)
    if status != 200 or not raw:
        return None
    try:
        account = json.loads(raw.decode("utf-8"))
    except ValueError:
        return None
    if not account.get("id"):
        return None
    status, raw, _headers = read_url(
        "https://" + host + "/api/v1/accounts/" + account["id"] + "/statuses?limit=8&exclude_reblogs=true",
        20,
    )
    if status != 200 or not raw:
        return None
    try:
        rows = json.loads(raw.decode("utf-8"))
    except ValueError:
        return None
    posts = []
    for row in rows:
        if row.get("reblog"):
            continue
        body = clean_post(row.get("content") or "")
        url = row.get("url") or ""
        if not usable(body) or not url.startswith("https://"):
            continue
        posts.append({
            "net": "mastodon",
            "handle": handle,
            "text": body[:700],
            "at": row.get("created_at") or "",
            "url": url,
            "context": mastodon_context(host, row),
            "counts": pack_counts(row.get("replies_count"), row.get("reblogs_count"), row.get("favourites_count")),
        })
        if len(posts) == 3:
            break
    return posts


def bluesky_posts(handle):
    status, raw, _headers = read_url(
        "https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=" + urllib.parse.quote(handle) + "&limit=8",
        20,
    )
    if status != 200 or not raw:
        return None
    try:
        feed = json.loads(raw.decode("utf-8"))
    except ValueError:
        return None
    posts = []
    for item in feed.get("feed") or []:
        if item.get("reason"):
            continue
        post = item.get("post") or {}
        record = post.get("record") or {}
        body = clean_post(record.get("text") or "")
        uri = post.get("uri") or ""
        rkey = uri.rsplit("/", 1)[-1] if "/" in uri else ""
        if not usable(body) or not rkey:
            continue
        posts.append({
            "net": "bluesky",
            "handle": handle,
            "text": body[:700],
            "at": post.get("indexedAt") or record.get("createdAt") or "",
            "url": "https://bsky.app/profile/" + handle + "/post/" + rkey,
            "context": bluesky_context(item),
            "counts": pack_counts(post.get("replyCount"), post.get("repostCount"), post.get("likeCount")),
        })
        if len(posts) == 3:
            break
    return posts


def truth_posts(handle):
    status, raw, _headers = read_url("https://truthsocial.com/api/v1/accounts/lookup?acct=" + urllib.parse.quote(handle), 15, BROWSER)
    if status != 200 or not raw:
        return []
    try:
        account = json.loads(raw.decode("utf-8"))
    except ValueError:
        return []
    if not account.get("id"):
        return []
    status, raw, _headers = read_url(
        "https://truthsocial.com/api/v1/accounts/" + str(account["id"]) + "/statuses?limit=5&exclude_reblogs=true",
        15,
        BROWSER,
    )
    if status != 200 or not raw:
        return []
    try:
        rows = json.loads(raw.decode("utf-8"))
    except ValueError:
        return []
    posts = []
    for row in rows if isinstance(rows, list) else []:
        body = clean_post(row.get("content") or "")
        url = row.get("url") or ""
        if not usable(body) or not url.startswith("https://"):
            continue
        posts.append({
            "net": "truth",
            "handle": handle,
            "text": body[:700],
            "at": row.get("created_at") or "",
            "url": url,
            "context": mastodon_context("truthsocial.com", row),
            "counts": pack_counts(row.get("replies_count"), row.get("reblogs_count"), row.get("favourites_count")),
        })
        if len(posts) == 3:
            break
    return posts


def fetch_feed(account):
    try:
        if account["net"] == "x":
            return x_posts(account["handle"])
        if account["net"] == "mastodon":
            return mastodon_posts(account["handle"])
        if account["net"] == "bluesky":
            return bluesky_posts(account["handle"])
        if account["net"] == "truth":
            return truth_posts(account["handle"])
    except RateLimit:
        raise
    except Exception:
        return None
    return []


def tweet_counts(tweet):
    legacy = tweet.get("legacy") or {}
    metrics = tweet.get("public_metrics") or legacy.get("public_metrics") or {}

    def pick(*values):
        for value in values:
            if value is not None and value != "":
                return value
        return None

    views = pick(
        tweet.get("view_count"),
        legacy.get("view_count"),
        tweet.get("views_count"),
        legacy.get("views_count"),
        metrics.get("impression_count"),
    )
    if views is None:
        for source in (tweet, legacy):
            raw = source.get("views")
            if isinstance(raw, dict):
                raw = raw.get("count")
            if raw is None or raw == "":
                raw = (source.get("ext_views") or {}).get("count")
            if raw is not None and raw != "":
                views = raw
                break
    return pack_counts(
        pick(tweet.get("reply_count"), legacy.get("reply_count"), metrics.get("reply_count")),
        pick(tweet.get("retweet_count"), legacy.get("retweet_count"), metrics.get("retweet_count")),
        pick(tweet.get("favorite_count"), legacy.get("favorite_count"), metrics.get("like_count")),
        views,
    )


def pack_counts(replies, reposts, likes, views=None):
    counts = {}
    for key, value in (("replies", replies), ("reposts", reposts), ("likes", likes), ("views", views)):
        if isinstance(value, str):
            value = value.replace(",", "").strip()
        try:
            number = int(value)
        except (TypeError, ValueError):
            continue
        if number >= 0:
            counts[key] = number
    return counts or None


def pack_context(name, handle, text, url, profile, net):
    handle = (handle or "").strip().lstrip("@")
    if not handle and not text:
        return None
    return {
        "net": net,
        "name": (name or handle or "").strip(),
        "handle": handle,
        "text": (text or "")[:280],
        "url": url if isinstance(url, str) and url.startswith("https://") else "",
        "profile": profile if isinstance(profile, str) and profile.startswith("https://") else "",
    }


def x_context(tweet):
    quoted = tweet.get("quoted_status") or {}
    user = quoted.get("user") or {}
    handle = user.get("screen_name") or tweet.get("in_reply_to_screen_name") or ""
    if not handle:
        return None
    permalink = quoted.get("permalink") or ""
    return pack_context(
        user.get("name") or handle,
        handle,
        clean_post(quoted.get("full_text") or ""),
        "https://x.com" + permalink if isinstance(permalink, str) and permalink.startswith("/") else "",
        "https://x.com/" + handle,
        "x",
    )


def mastodon_context(host, row):
    parent_id = row.get("in_reply_to_id")
    if not parent_id:
        return None
    try:
        status, raw, _headers = read_url("https://" + host + "/api/v1/statuses/" + urllib.parse.quote(str(parent_id)), 15)
        if status != 200 or not raw:
            return None
        parent = json.loads(raw.decode("utf-8"))
    except Exception:
        return None
    account = parent.get("account") or {}
    handle = account.get("acct") or account.get("username") or ""
    return pack_context(
        account.get("display_name") or handle,
        handle,
        clean_post(parent.get("content") or ""),
        parent.get("url") or "",
        account.get("url") or "",
        "mastodon" if host != "truthsocial.com" else "truth",
    )


def bluesky_context(item):
    parent = ((item.get("reply") or {}).get("parent") or {})
    author = parent.get("author") or {}
    record = parent.get("record") or {}
    handle = author.get("handle") or ""
    text = clean_post(record.get("text") or "")
    uri = parent.get("uri") or ""
    if not handle:
        embed = ((item.get("post") or {}).get("embed") or {})
        quoted = embed.get("record") or {}
        if quoted.get("record"):
            quoted = quoted.get("record") or {}
        author = quoted.get("author") or {}
        value = quoted.get("value") or {}
        handle = author.get("handle") or ""
        text = clean_post(value.get("text") or "")
        uri = quoted.get("uri") or ""
    if not handle:
        return None
    rkey = uri.rsplit("/", 1)[-1] if "/" in uri else ""
    url = "https://bsky.app/profile/" + handle + "/post/" + rkey if rkey else ""
    return pack_context(author.get("displayName") or handle, handle, text, url, "https://bsky.app/profile/" + handle, "bluesky")


def missing_context(account, row):
    if row.get("context"):
        return False
    if account["net"] != "x":
        return True
    for post in row.get("posts") or []:
        if str(post.get("at") or "")[:10] >= "2026-11-03":
            return True
    return False


def store_feed(feeds, account, found):
    feed_key = account["net"] + ":" + account["handle"].lower()
    previous = feeds.get(feed_key) or {}
    feeds[feed_key] = {
        "at": now(),
        "ok": found is not None,
        "posts": (previous.get("posts") or []) if found is None else found,
        "context": True if found is not None else bool(previous.get("context")),
        "counts": True if found is not None else bool(previous.get("counts")),
        "views": True if found is not None else bool(previous.get("views")),
    }


def write_posts(roster, sites, congress, pages, feeds):
    people, post_count, account_count = {}, 0, 0
    for person in roster:
        accounts = person_accounts(person, sites, congress, pages)
        if not accounts:
            continue
        posts, seen = [], set()
        for account in accounts:
            feed_key = account["net"] + ":" + account["handle"].lower()
            for post in (feeds.get(feed_key) or {}).get("posts") or []:
                if post.get("url") in seen or not str(post.get("url") or "").startswith("https://"):
                    continue
                seen.add(post["url"])
                posts.append(post)
        posts.sort(key=lambda post: post.get("at") or "")
        posts = posts[-4:]
        people[person["id"]] = {"accounts": accounts, "posts": posts}
        post_count += len(posts)
        account_count += len(accounts)
    save(POSTS_PATH, {"updated": now(), "people": people})
    return account_count, len(people), post_count


def fetch_site(url):
    try:
        status, raw, _headers = read_url(url, 12)
    except Exception:
        return None
    if status != 200 or not raw or raw[:4] in (b"%PDF", b"\x89PNG"):
        return None
    return accounts_from_html(raw.decode("utf-8", "replace"))


def guide_sites():
    sites = {}
    messages = load(os.path.join(CHAT, "messages.json"))
    codes = sorted({state.get("code", "").lower() for state in messages.get("states") or [] if state.get("code")})
    for code in codes:
        path = os.path.join(ROOT, "guides", code + ".json")
        if code == "il" and not os.path.exists(path):
            path = os.path.join(ROOT, "guides", "_incoming", "il.json")
        guide = load(path)
        for raw_name, info in (guide.get("people") or {}).items():
            if not isinstance(info, dict):
                continue
            token = (code.upper(), key(raw_name.split("|")[-1]))
            site = info.get("site") or ""
            if site:
                sites[token] = site
            elif token not in sites and info.get("source"):
                sites[token] = info.get("source") or ""
    return sites


def congress_index():
    current = fetch_json(CURRENT_URL)
    social_rows = fetch_json(SOCIAL_URL)
    by_id = {}
    for row in social_rows:
        bioguide = ((row.get("id") or {}).get("bioguide") or "")
        if bioguide and row.get("social"):
            by_id[bioguide] = row["social"]
    index, ambiguous = {}, set()
    for person in current:
        bioguide = ((person.get("id") or {}).get("bioguide") or "")
        social = by_id.get(bioguide) or {}
        terms = person.get("terms") or []
        if not social or not terms:
            continue
        state = (terms[-1].get("state") or "").upper()
        for name in name_keys(person.get("name") or {}):
            token = (state, name)
            if token in index and index[token] is not social:
                ambiguous.add(token)
            else:
                index[token] = social
    for token in ambiguous:
        index.pop(token, None)
    return index


def person_accounts(person, sites, congress, pages):
    found, seen = [], set()
    if person["office"] in CONGRESS_OFFICES:
        for account in office_accounts(congress.get((person["state"], key(person["name"]))) or {}):
            add_account(found, seen, account)
    page = pages.get(person["site"]) or {}
    for account in page.get("accounts") or []:
        add_account(found, seen, account)
    return found


def main():
    messages = load(os.path.join(CHAT, "messages.json"))
    sites = guide_sites()
    print("reading the official member list", flush=True)
    congress = congress_index()
    roster = []
    for state in messages.get("states") or []:
        code = state.get("code") or ""
        for person in state.get("people") or []:
            name = person.get("name") or ""
            token = (code, key(name))
            roster.append({
                "id": code + "|" + token[1],
                "state": code,
                "name": name,
                "office": person.get("office") or "",
                "site": sites.get(token) or person.get("source") or "",
            })
    matched = sum(1 for person in roster if person["office"] in CONGRESS_OFFICES and (person["state"], key(person["name"])) in congress)
    print("people", len(roster), "congress matches", matched, flush=True)

    stored_pages = load(ACCOUNTS_PATH).get("pages") or {}
    pages = {}
    jobs = []
    for person in roster:
        site = person["site"]
        if not site.startswith("http"):
            continue
        cached = stored_pages.get(site) or {}
        hours = 12 if cached.get("error") else 168
        if fresh(cached.get("at"), hours):
            pages[site] = cached
        elif site not in pages:
            pages[site] = None
            jobs.append(site)
    print("campaign sites to read", len(jobs), flush=True)
    done = 0
    with ThreadPoolExecutor(max_workers=12) as pool:
        futures = {pool.submit(fetch_site, url): url for url in jobs}
        for future in as_completed(futures):
            url = futures[future]
            found = future.result()
            pages[url] = {
                "at": now(),
                "accounts": found or [],
                "error": found is None,
            }
            done += 1
            if done % 100 == 0 or done == len(jobs):
                print("sites", done, "/", len(jobs), flush=True)
    for url, cached in stored_pages.items():
        pages.setdefault(url, cached)
    save(ACCOUNTS_PATH, {"updated": now(), "pages": pages})

    feeds = load(FEEDS_PATH)
    needed = {}
    for person in roster:
        for account in person_accounts(person, sites, congress, pages):
            if account["net"] in ("x", "mastodon", "bluesky", "truth"):
                feed_key = account["net"] + ":" + account["handle"].lower()
                needed[feed_key] = account
    refresh = []
    for feed_key, account in needed.items():
        row = feeds.get(feed_key) or {}
        hours = 6 if account["net"] == "x" else 10
        if row.get("ok") and fresh(row.get("at"), hours) and not missing_context(account, row) and row.get("counts") and row.get("views"):
            continue
        refresh.append(account)
    fast = [account for account in refresh if account["net"] != "x"]
    slow = [account for account in refresh if account["net"] == "x"]
    slow.sort(key=lambda account: ((feeds.get("x:" + account["handle"].lower()) or {}).get("at") or ""))
    print("feeds to read", len(fast) + len(slow), "of", len(needed), "x", len(slow), flush=True)
    done = 0
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(fetch_feed, account): account for account in fast}
        for future in as_completed(futures):
            store_feed(feeds, futures[future], future.result())
            done += 1
            if done % 100 == 0 or done == len(fast):
                print("feeds", done, "/", len(fast), flush=True)
    if fast:
        save(FEEDS_PATH, feeds)
        write_posts(roster, sites, congress, pages, feeds)
        publish_chat()
    index = 0
    missed = 0
    raw_budget = os.environ.get("CHAT_POSTS_BUDGET_MINUTES") or ""
    try:
        x_stop.deadline = time.time() + float(raw_budget) * 60 if float(raw_budget) > 0 else None
    except ValueError:
        x_stop.deadline = None
    while index < len(slow):
        if x_stop():
            print("Stopping so this run can be published. The rest will be copied next time.", flush=True)
            break
        account = slow[index]
        try:
            found = fetch_feed(account)
        except RateLimit as limited:
            save(FEEDS_PATH, feeds)
            write_posts(roster, sites, congress, pages, feeds)
            publish_chat()
            if not x_pause(limited.reset):
                break
            continue
        if found is None:
            missed += 1
        store_feed(feeds, account, found)
        index += 1
        if index % 20 == 0 or index == len(slow):
            save(FEEDS_PATH, feeds)
            counts = write_posts(roster, sites, congress, pages, feeds)
            print("x", index, "/", len(slow), "posts", counts[2], "missed", missed, flush=True)
        try:
            remaining = int(x_posts.remaining)
        except (TypeError, ValueError):
            remaining = None
        if remaining is not None and remaining <= 1:
            save(FEEDS_PATH, feeds)
            write_posts(roster, sites, congress, pages, feeds)
            publish_chat()
            if not x_pause(x_posts.reset):
                break
        else:
            time.sleep(1)
    save(FEEDS_PATH, feeds)
    account_count, people_count, post_count = write_posts(roster, sites, congress, pages, feeds)
    publish_chat()
    ok = sum(1 for row in feeds.values() if isinstance(row, dict) and row.get("ok"))
    print("accounts", account_count, "people with accounts", people_count, "posts", post_count, "feeds ok", ok, flush=True)


if __name__ == "__main__":
    main()
