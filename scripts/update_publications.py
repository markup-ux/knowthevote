"""Add stories the news desks did not already list.

The Better India, Magnolia, and Nyle publish a list. A new card keeps
their title, date, picture, and the line they print. It does not keep
the article. The link goes to their site.

The Edge asks LinkedIn for Dr. Martha Boeckenfeld's public notes. LinkedIn
returns those notes on a company page, and answers her profile with an
auth wall. When the list is missing, the notes already on the page stay.
"""
import html
import json
import os
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NEWS = os.path.join(ROOT, "news.html")
NEWS_DIR = os.path.join(ROOT, "news")
COLORS = ["red", "orange", "yellow", "green", "blue", "purple", "pink", "brown"]
UA = {"User-Agent": "LeadersVoteNews/1.0 (markup.ux@gmail.com)", "Accept": "*/*"}
BROWSER = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
}


def fetch(url, headers=None, timeout=45):
    request = urllib.request.Request(url, headers=headers or UA)
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read().decode("utf-8", "replace"), response.status


def plain(value):
    text = re.sub(r"<[^>]+>", " ", value or "")
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def canon(url):
    text = html.unescape(url or "").split("?")[0].split("#")[0]
    return text.rstrip("/").lower()


def page_html():
    return open(NEWS, encoding="utf-8").read()


def section(text, start_id, end_id):
    start = text.find('id="%s"' % start_id)
    if start < 0:
        return ""
    end = text.find('id="%s"' % end_id, start + 1)
    if end < 0:
        end = len(text)
    return text[start:end]


def load_posts(name):
    path = os.path.join(NEWS_DIR, name)
    if not os.path.isfile(path):
        return []
    data = json.loads(open(path, encoding="utf-8").read())
    return [post for post in (data.get("posts") or []) if post.get("url")]


def write_posts(name, posts):
    path = os.path.join(NEWS_DIR, name)
    payload = {
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "posts": posts,
    }
    with open(path, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=False)
        handle.write("\n")


def date_label(iso):
    when = datetime.strptime(iso[:10], "%Y-%m-%d")
    return "%s %d, %d" % (when.strftime("%B"), when.day, when.year)


def finish(title):
    title = plain(title)
    if title and title[-1] not in ".!?":
        title += "."
    return title


def story_id(prefix, url, used):
    slug = canon(url).rsplit("/", 1)[-1]
    slug = re.sub(r"[^a-z0-9]+", "-", slug).strip("-")
    room = max(12, 80 - len(prefix))
    if len(slug) > room:
        slug = slug[:room].rsplit("-", 1)[0].strip("-")
    base = prefix + slug
    chosen = base
    while chosen in used:
        chosen = (base + "-2")[:80]
    used.add(chosen)
    return chosen


def used_ids(text):
    return set(re.findall(r'id="(n-[^"]+)"', text))


def known_hrefs(block):
    found = set()
    for href in re.findall(r'href="([^"]+)"', block):
        found.add(canon(html.unescape(href)))
    return found


def newest(block, posts):
    dates = re.findall(r'datetime="(\d{4}-\d{2}-\d{2})', block)
    dates += [post["date"] for post in posts if post.get("date")]
    return max(dates) if dates else "1970-01-01"


def activity_ids(block, posts):
    found = set(re.findall(r"activity[:-](\d+)", block))
    for post in posts:
        found.update(re.findall(r"activity[:-](\d+)", post.get("url") or ""))
    return found


def lead(text, limit=420):
    body = text.strip()
    body = re.split(r"\n\s*(?:Sources?:|#)", body)[0]
    body = re.sub(r"\s+", " ", body).strip()
    if len(body) <= limit:
        return body
    cut = body[:limit]
    stop = max(cut.rfind(". "), cut.rfind("? "), cut.rfind("! "))
    if stop > 140:
        return cut[:stop + 1].strip()
    return cut.rsplit(" ", 1)[0].rstrip(".,;:") + "…"


def absolute_image(src):
    src = html.unescape(src or "").strip()
    if src.startswith("//"):
        src = "https:" + src
    src = re.sub(r"([?&])width=\d+", r"\1width=1600", src)
    if "/fit-in/" in src:
        src = re.sub(r"/fit-in/\d+x\d+/", "/fit-in/1200x675/", src)
    return src


def meta_description(page):
    patterns = [
        r'property="og:description"\s+content\s*=\s*"([^"]*)"',
        r'name="description"\s+content\s*=\s*"([^"]*)"',
        r'content\s*=\s*"([^"]*)"\s+[^>]*property="og:description"',
    ]
    for pattern in patterns:
        found = re.search(pattern, page, re.I)
        if found:
            text = plain(found.group(1))
            if text:
                return text
    return ""


def og_image(page):
    found = re.search(r'property="og:image"\s+content\s*=\s*"([^"]*)"', page, re.I)
    if not found:
        found = re.search(r'content\s*=\s*"([^"]*)"\s+[^>]*property="og:image"', page, re.I)
    return absolute_image(found.group(1)) if found else ""


def remember(posts, fresh, known):
    posts.extend(fresh)
    posts.sort(key=lambda post: post.get("date") or "")
    for post in posts:
        known.add(canon(post.get("url")))
    return posts


def update_better(text, used):
    posts = load_posts("better.json")
    block = section(text, "better", "look")
    known = known_hrefs(block)
    for post in posts:
        known.add(canon(post.get("url")))
    floor = newest(block, posts)
    rss, _status = fetch("https://thebetterindia.com/rss", dict(UA, Accept="application/rss+xml"))
    fresh = []
    seen = 0
    rank = 0
    for item in re.findall(r"<item>(.*?)</item>", rss, re.S):
        link = re.search(r"<link>(.*?)</link>", item)
        title = re.search(r"<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>", item, re.S)
        when = re.search(r"<pubDate>(.*?)</pubDate>", item)
        author = re.search(r"<dc:creator\b[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</dc:creator>", item, re.S)
        image = re.search(r'<media:content[^>]*url="([^"]+)"', item)
        if not link or not title or not when:
            continue
        url = html.unescape(link.group(1).strip()).split("?")[0]
        if "/videos/" in url or not url.startswith("https://thebetterindia.com/"):
            continue
        path = url.split("thebetterindia.com", 1)[-1]
        if path.count("/") < 2:
            continue
        try:
            day = parsedate_to_datetime(when.group(1)).date().isoformat()
        except (TypeError, ValueError, IndexError):
            continue
        seen += 1
        if day < floor or canon(url) in known:
            continue
        person = plain(author.group(1)) if author else ""
        summary = ""
        try:
            article, _status = fetch(url, timeout=30)
            summary = meta_description(article)
        except (urllib.error.URLError, TimeoutError, OSError):
            summary = ""
        if not summary:
            summary = "%s published this on %s. The article is on their site." % (
                person or "The Better India",
                date_label(day),
            )
        if len(summary) > 420:
            summary = lead(summary, 420)
        packed = {
            "id": story_id("n-better-", url, used),
            "url": url,
            "title": finish(title.group(1)),
            "date": day,
            "dateLabel": date_label(day),
            "author": person,
            "image": absolute_image(image.group(1) if image else ""),
            "text": summary,
            "color": COLORS[(len(posts) + len(fresh)) % len(COLORS)],
            "_rank": rank,
        }
        rank += 1
        fresh.append(packed)
        known.add(canon(url))
    if not fresh:
        print("better seen", seen, "unchanged")
        return
    fresh.sort(key=lambda post: (post["date"], -post.pop("_rank")))
    write_posts("better.json", remember(posts, fresh, known))
    print("better added", len(fresh))
    for post in fresh:
        print(" ", post["date"], post["title"])


def look_date(*parts):
    for part in parts:
        found = re.search(r"(\d{1,2})[.\-](\d{1,2})[.\-](\d{2,4})", part or "")
        if not found:
            continue
        month, day, year = (int(found.group(1)), int(found.group(2)), int(found.group(3)))
        if year < 100:
            year += 2000
        try:
            return datetime(year, month, day).date().isoformat()
        except ValueError:
            continue
    return ""


def look_captions(page):
    captions = {}
    skip = {
        "magnolia product lookbooks",
        "inspiration starts here",
        "thanks for signing up",
        "you don't have anything in your cart yet.",
        "you don’t have anything in your cart yet.",
    }
    for match in re.finditer(r"<h2[^>]*>(.*?)</h2>", page, re.S):
        title = plain(match.group(1))
        if not title or title.lower() in skip:
            continue
        rest = page[match.end():match.end() + 1800]
        rest = re.sub(r"<script[\s\S]*?</script>", " ", rest)
        rest = re.sub(r"<style[\s\S]*?</style>", " ", rest)
        text = plain(re.sub(r"<[^>]+>", " ", rest))
        text = re.split(r"SHOP THE LOOKBOOK", text, flags=re.I)[0].strip(" -")
        if text and text.lower() != title.lower():
            captions[title.lower()] = text
    return captions


def update_look(text, used):
    posts = load_posts("look.json")
    block = section(text, "look", "nyle")
    known = known_hrefs(block)
    for post in posts:
        known.add(canon(post.get("url")))
    page, _status = fetch("https://magnolia.com/pages/magnolia-lookbooks", BROWSER)
    captions = look_captions(page)
    fresh = []
    seen = 0
    pattern = re.compile(
        r'var publication = "([^"]+)";\s*var aspect = "[^"]+";\s*var title = "([^"]+)";'
    )
    for match in pattern.finditer(page):
        url = html.unescape(match.group(1).replace("\\/", "/")).split("?")[0]
        if "publitas.com" not in url:
            continue
        seen += 1
        window = page[max(0, match.start() - 12000):match.start()]
        calls = re.findall(r'data-cta="([^"]*)"', window)
        title = plain(calls[-1]) if calls else plain(match.group(2).split("_")[-1])
        if canon(url) in known:
            continue
        image = ""
        for src in re.findall(r'<img[^>]+src="([^"]+)"', window):
            if "cdn/shop" in src or "magnolia.com" in src:
                image = src
        day = look_date(match.group(2), url, title)
        if not day or not title:
            continue
        line = captions.get(title.lower()) or ""
        packed = {
            "id": story_id("n-magnolia-", url, used),
            "url": url,
            "title": finish(title),
            "date": day,
            "dateLabel": date_label(day),
            "image": absolute_image(image),
            "text": ('Magnolia\'s line: "%s"' % line) if line else "Magnolia published this lookbook.",
            "color": COLORS[(len(posts) + len(fresh)) % len(COLORS)],
        }
        fresh.append(packed)
        known.add(canon(url))
    if not fresh:
        print("look seen", seen, "unchanged")
        return
    write_posts("look.json", remember(posts, fresh, known))
    print("look added", len(fresh))
    for post in fresh:
        print(" ", post["date"], post["title"])


def linkedin_posts(page):
    posts = []
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', page, re.S):
        if "SocialMediaPosting" not in block:
            continue
        try:
            data = json.loads(block)
        except json.JSONDecodeError:
            continue
        for item in data.get("@graph") or []:
            if item.get("@type") != "SocialMediaPosting":
                continue
            url = item.get("mainEntityOfPage") or item.get("url") or ""
            text = item.get("text") or ""
            when = (item.get("datePublished") or "")[:10]
            count = (item.get("interactionStatistic") or {}).get("userInteractionCount")
            if url and text and when:
                posts.append({"url": url.split("?")[0], "text": text, "date": when, "reactions": count})
    return posts


def note_card(post, prefix, used, count):
    lines = [line.strip() for line in post["text"].splitlines() if line.strip()]
    title = finish(lines[0] if lines else "A new note")
    if len(title) > 140:
        title = finish(lead(title, 120).rstrip("…"))
    rest = lead(" ".join(lines[1:])) if len(lines) > 1 else ""
    body = rest or "The note is on LinkedIn."
    meta = ""
    reactions = post.get("reactions")
    if isinstance(reactions, int) and reactions > 0:
        meta = "1 reaction" if reactions == 1 else "%d reactions" % reactions
    activity = re.search(r"activity[:-](\d+)", post["url"] or "")
    chosen = prefix + activity.group(1) if activity else ""
    if chosen and chosen not in used:
        used.add(chosen)
        card_id = chosen
    else:
        card_id = story_id(prefix, post["url"], used)
    return {
        "id": card_id,
        "url": post["url"],
        "title": title,
        "date": post["date"],
        "dateLabel": date_label(post["date"]),
        "image": post.get("image") or "",
        "text": body,
        "meta": meta,
        "color": COLORS[count % len(COLORS)],
    }


def picture_for(url):
    try:
        page, _status = fetch(url, BROWSER, timeout=25)
    except (urllib.error.URLError, TimeoutError, OSError):
        return ""
    return og_image(page)


def update_linkedin(label, filename, page_url, block_start, block_end, prefix, text, used):
    posts = load_posts(filename)
    block = section(text, block_start, block_end)
    known = activity_ids(block, posts)
    floor = newest(block, posts)
    try:
        page, status = fetch(page_url, BROWSER, timeout=30)
    except urllib.error.HTTPError as error:
        print(label, "linkedin returned", error.code)
        return
    if status != 200 or "SocialMediaPosting" not in page:
        print(label, "linkedin did not list posts")
        return
    found = linkedin_posts(page)
    fresh_src = []
    for rank, post in enumerate(found):
        post["_rank"] = rank
        activity = re.search(r"activity[:-](\d+)", post["url"])
        if not activity or activity.group(1) in known or post["date"] < floor:
            continue
        fresh_src.append(post)
        known.add(activity.group(1))
    if not fresh_src:
        print(label, "seen", len(found), "unchanged")
        return
    fresh_src.sort(key=lambda post: (post["date"], -post["_rank"]))
    fresh = []
    for post in fresh_src:
        post["image"] = picture_for(post["url"])
        fresh.append(note_card(post, prefix, used, len(posts) + len(fresh)))
    write_posts(filename, remember(posts, fresh, set()))
    print(label, "added", len(fresh))
    for post in fresh:
        print(" ", post["date"], post["title"])


def main():
    text = page_html()
    used = used_ids(text)
    update_better(text, used)
    update_look(text, used)
    update_linkedin(
        "nyle",
        "nyle.json",
        "https://www.linkedin.com/company/nyle-africa",
        "nyle",
        "feed",
        "n-nyle-",
        text,
        used,
    )
    update_linkedin(
        "edge",
        "edge.json",
        "https://www.linkedin.com/in/drmarthaboeckenfeld/recent-activity/all/",
        "feed",
        "journal",
        "n-edge-",
        text,
        used,
    )


if __name__ == "__main__":
    main()
