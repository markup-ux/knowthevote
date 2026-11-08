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
API = "https://peopleofcolorintech.com/wp-json/wp/v2/posts?per_page=20&_embed=1"
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


def known_urls(posts):
    found = set(canon(url) for url in re.findall(
        r'href="(https://peopleofcolorintech\.com/[^"]+)"', weekly_block()))
    for post in posts:
        found.add(canon(post.get("url")))
    return found


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


def picture(post):
    media = (post.get("_embedded") or {}).get("wp:featuredmedia") or []
    if media and isinstance(media, list):
        return media[0].get("source_url") or ""
    return ""


def writer(post):
    authors = (post.get("_embedded") or {}).get("author") or []
    if authors and isinstance(authors, list):
        return plain(authors[0].get("name") or "")
    return ""


def blurb(author, label):
    if author:
        return "%s published this piece at POCIT on %s. The article is on their site." % (author, label)
    return "POCIT published this piece on %s. The article is on their site." % label


def main():
    posts = load_posts()
    known = known_urls(posts)
    floor = newest_date(posts)
    used = len(re.findall(r'<article class="story', weekly_block())) + len(posts)
    fresh = []
    for post in fetch(API):
        url = (post.get("link") or "").split("?")[0]
        day = (post.get("date") or "")[:10]
        if not url or not day or day < floor or canon(url) in known:
            continue
        title = plain((post.get("title") or {}).get("rendered"))
        if not title:
            continue
        if title[-1] not in ".!?":
            title += "."
        label = date_label(day)
        author = writer(post)
        fresh.append({
            "id": story_id(url),
            "url": url,
            "title": title,
            "date": day,
            "dateLabel": label,
            "author": author,
            "image": picture(post),
            "text": blurb(author, label),
            "color": COLORS[used % len(COLORS)],
        })
        used += 1
        known.add(canon(url))
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
