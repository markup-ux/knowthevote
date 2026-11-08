"""Add POCIT pieces published since the notes already on the News page.

The feed is the one POCIT publishes. A new card keeps their title, writer,
date, and picture. It does not keep their article. The link goes to their site.
"""
import html
import json
import os
import re
import urllib.request
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, "news.html")
OUT = os.path.join(ROOT, "news", "pocit.json")
API = "https://peopleofcolorintech.com/wp-json/wp/v2/posts?per_page=20&_embed=1&page=%d"
UA = {"User-Agent": "LeadersVoteNews/1.0 (markup.ux@gmail.com)"}
COLORS = ["red", "orange", "yellow", "green", "blue", "purple", "pink", "brown"]


def fetch(url):
    request = urllib.request.Request(url, headers=dict(UA, Accept="application/json"))
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def canon(url):
    text = html.unescape(url or "").split("?")[0].split("#")[0]
    return text.rstrip("/").lower()


def weekly_block():
    text = open(HTML, encoding="utf-8").read()
    start = text.find('id="weekly"')
    end = text.find('id="feed"')
    if start < 0 or end < start:
        return text
    return text[start:end]


def load_posts():
    if not os.path.isfile(OUT):
        return []
    data = json.loads(open(OUT, encoding="utf-8").read())
    posts = data.get("posts") or []
    return [post for post in posts if post.get("url")]


def slug(url):
    return canon(url).rsplit("/", 1)[-1]


def known_urls(posts):
    found = set()
    for url in re.findall(r'href="(https://peopleofcolorintech\.com/(?:articles|founders)/[^"]+)"', weekly_block()):
        found.add(canon(url))
        found.add(slug(url))
    for post in posts:
        found.add(canon(post.get("url")))
        found.add(slug(post.get("url")))
    return found


def edge_total():
    text = open(HTML, encoding="utf-8").read()
    start = text.find('id="feed"')
    if start < 0:
        return 0
    return len(re.findall(r'data-source="feed"', text[start:]))


def weekly_total(posts):
    block = weekly_block()
    html_slugs = set(slug(url) for url in re.findall(
        r'href="(https://peopleofcolorintech\.com/(?:articles|founders)/[^"]+)"', block))
    extra = [post for post in posts if slug(post.get("url")) not in html_slugs]
    return len(re.findall(r'<article class="story"', block)) + len(extra)


def newest_date(posts):
    dates = re.findall(r'datetime="(\d{4}-\d{2}-\d{2})"', weekly_block())
    dates += [post["date"] for post in posts if post.get("date")]
    return max(dates) if dates else "1970-01-01"


def plain(value):
    text = re.sub(r"<[^>]+>", "", value or "")
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def date_label(iso):
    when = datetime.strptime(iso[:10], "%Y-%m-%d")
    return "%s %d, %d" % (when.strftime("%B"), when.day, when.year)


def story_id(url):
    slug = canon(url).rsplit("/", 1)[-1]
    slug = re.sub(r"[^a-z0-9-]+", "-", slug).strip("-")
    return "n-" + slug[:80]


def media(post):
    embedded = (post.get("_embedded") or {}).get("wp:featuredmedia") or []
    if embedded and isinstance(embedded, list):
        return embedded[0]
    return {}


def picture(post):
    return media(post).get("source_url") or ""


def caption(post):
    raw = (media(post).get("caption") or {}).get("rendered") or ""
    return plain(raw)


def writer(post):
    authors = (post.get("_embedded") or {}).get("author") or []
    if authors and isinstance(authors, list):
        return authors[0]
    return {}


def blurb(author, label):
    if author:
        return "%s wrote this for People of Color in Tech on %s. The article is on their site." % (author, label)
    return "People of Color in Tech published this piece on %s. The article is on their site." % label


def pack(post, used):
    url = (post.get("link") or "").split("?")[0]
    day = (post.get("date") or "")[:10]
    title = plain((post.get("title") or {}).get("rendered"))
    if not url or not day or not title:
        return None
    if title[-1] not in ".!?":
        title += "."
    person = writer(post)
    author = plain(person.get("name") or "")
    return {
        "id": story_id(url),
        "url": url,
        "title": title,
        "date": day,
        "dateLabel": date_label(day),
        "author": author,
        "image": picture(post),
        "caption": caption(post),
        "text": blurb(author, date_label(day)),
        "color": COLORS[used % len(COLORS)],
        "avatar": ((person.get("avatar_urls") or {}).get("96") or ""),
        "authorPage": person.get("link") or "",
        "authorSite": person.get("url") or "",
    }


def main():
    posts = load_posts()
    known = known_urls(posts)
    floor = newest_date(posts)
    room = edge_total() - weekly_total(posts)
    used = len(re.findall(r'<article class="story', weekly_block())) + len(posts)
    fresh = []
    page = 1
    while page <= 5:
        batch = fetch(API % page)
        if not batch:
            break
        for post in batch:
            url = (post.get("link") or "").split("?")[0]
            day = (post.get("date") or "")[:10]
            if not url or not day or canon(url) in known or slug(url) in known:
                continue
            newer = day >= floor
            if not newer and room <= 0:
                continue
            packed = pack(post, used)
            if not packed:
                continue
            fresh.append(packed)
            used += 1
            if not newer:
                room -= 1
            known.add(canon(url))
            known.add(slug(url))
        if room <= 0 and all((post.get("date") or "")[:10] < floor for post in batch):
            break
        page += 1
    fresh.sort(key=lambda post: post["date"])
    if not fresh:
        print("unchanged")
        return
    posts.extend(fresh)
    posts.sort(key=lambda post: post.get("date") or "")
    payload = {
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "posts": posts,
    }
    with open(OUT, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=False)
        handle.write("\n")
    print("added", len(fresh))


if __name__ == "__main__":
    main()
