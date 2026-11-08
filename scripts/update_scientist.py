"""Add American Scientist issues Sigma Xi has listed since the News page.

A new card keeps their cover, issue date, volume, and the piece titles they
print on the issue list. It does not keep the articles. The link goes to
their site. The digital reader is not guessed.
"""
import html
import http.cookiejar
import json
import os
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, "news.html")
OUT = os.path.join(ROOT, "news", "scientist.json")
ORIGIN = "https://www.americanscientist.org"
UA = {
    "User-Agent": "LeadersVoteNews/1.0 (markup.ux@gmail.com)",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
}
COLORS = {1: "red", 2: "purple", 3: "green", 4: "blue", 5: "orange", 6: "brown"}


def journal_html():
    text = open(HTML, encoding="utf-8").read()
    start = text.find('id="journal"')
    return text[start:] if start >= 0 else text


def load_issues():
    if not os.path.isfile(OUT):
        return []
    data = json.loads(open(OUT, encoding="utf-8").read())
    issues = data.get("issues") or []
    return [issue for issue in issues if issue.get("url")]


def plain(value):
    text = re.sub(r"<[^>]+>", "", value or "")
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def label_key(text):
    text = plain(text).split(".")[0]
    text = text.replace("–", "-").replace("—", "-")
    return re.sub(r"\s+", " ", text).strip().lower()


def house_label(text):
    return re.sub(r"(\w)-(\w)", lambda match: match.group(1) + "–" + match.group(2), plain(text))


def known_keys(issues):
    found = set()
    for heading in re.findall(r"<h3[^>]*>(.*?)</h3>", journal_html(), re.S):
        found.add(label_key(heading))
    for issue in issues:
        if issue.get("label"):
            found.add(label_key(issue["label"]))
    return found


def known_urls(issues):
    found = set()
    for href in re.findall(r'href="(https://www\.americanscientist\.org/magazine/issues/[^"]+)"', journal_html()):
        found.add(href.split("?")[0].rstrip("/").lower())
    for issue in issues:
        found.add((issue.get("url") or "").split("?")[0].rstrip("/").lower())
    return found


def set_access(jar, value):
    jar.set_cookie(http.cookiejar.Cookie(
        0, "site_access", value, None, False,
        "www.americanscientist.org", True, False,
        "/", True, True, None, False, None, None, {},
    ))


def fetch(jar, opener, url):
    request = urllib.request.Request(url, headers=UA)
    try:
        with opener.open(request, timeout=45) as response:
            return response.read().decode("utf-8", "replace"), response.status
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", "replace")
        if error.code == 404:
            return "", 404
        match = re.search(r'document\.cookie = "site_access" \+ \'=\' \+ "([^"]+)"', body)
        if error.code == 503 and match:
            set_access(jar, match.group(1))
            again = urllib.request.Request(url, headers=UA)
            try:
                with opener.open(again, timeout=45) as response:
                    return response.read().decode("utf-8", "replace"), response.status
            except urllib.error.HTTPError as second:
                if second.code == 404:
                    return "", 404
                raise SystemExit("American Scientist returned %s for %s" % (second.code, url))
        raise SystemExit("American Scientist returned %s for %s" % (error.code, url))


def cover_url(src):
    original = html.unescape(src or "")
    bare = original.split("?")[0]
    direct = re.sub(r"/styles/[^/]+/public/", "/", bare)
    if direct.startswith("/"):
        direct = ORIGIN + direct
    if direct.startswith("http") and direct != bare:
        probe = urllib.request.Request(direct, method="HEAD", headers=UA)
        try:
            with urllib.request.urlopen(probe, timeout=30) as response:
                kind = response.headers.get("Content-Type") or ""
                if response.status == 200 and kind.startswith("image/"):
                    return direct
        except urllib.error.HTTPError:
            pass
        except urllib.error.URLError:
            pass
    if original.startswith("/"):
        return ORIGIN + original
    return original


def pieces(block):
    found = re.findall(r"<strong>(.*?)</strong>\s*by\s*([^<]+)", block, re.S | re.I)
    lines = []
    for title, author in found:
        title = plain(title).strip("\"“”").strip()
        author = plain(author).strip(" .")
        if title and author:
            lines.append('"%s," %s.' % (title, author))
    return " ".join(lines)


def parse_year(page, year):
    issues = []
    for block in re.split(r'<li class="media__list issues__list\b', page)[1:]:
        title = re.search(r'class="issue-date-title"[^>]*>([^<]+)', block)
        href = re.search(r'href="(/magazine/issues/%s/[^"]+)"' % year, block)
        volume = re.search(r"Volume:\s*(\d+)\s*Number:\s*(\d+)", block)
        image = re.search(r'<img[^>]*class="[^"]*issue__image[^"]*"[^>]*>', block)
        if not title or not href or not volume:
            continue
        src = ""
        if image:
            src_match = re.search(r'src="([^"]+)"', image.group(0))
            src = src_match.group(1) if src_match else ""
        slug = href.group(1).rstrip("/").rsplit("/", 1)[-1]
        slug = re.sub(r"[^a-z0-9-]+", "-", slug.lower()).strip("-")
        issues.append({
            "id": ("n-%s-%s" % (slug, year))[:80],
            "label": house_label(title.group(1)),
            "year": int(year),
            "number": int(volume.group(2)),
            "volume": int(volume.group(1)),
            "url": ORIGIN + href.group(1).split("?")[0],
            "image": src,
            "pieces": pieces(block),
            "color": COLORS.get(int(volume.group(2)), "brown"),
        })
    return issues


def main():
    saved = load_issues()
    keys = known_keys(saved)
    urls = known_urls(saved)
    used_ids = set(re.findall(r'id="(n-[^"]+)"', open(HTML, encoding="utf-8").read()))
    for issue in saved:
        if issue.get("id"):
            used_ids.add(issue["id"])
    jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    year = datetime.now(timezone.utc).year
    fresh = []
    seen = []
    for offset in (0, 1):
        page_year = year + offset
        page, status = fetch(jar, opener, ORIGIN + "/magazine/issues/%s" % page_year)
        if status == 404 or "issue-date-title" not in page:
            if offset == 0:
                raise SystemExit("the %s issue list did not load" % page_year)
            continue
        for issue in parse_year(page, page_year):
            seen.append(issue["label"])
            url = issue["url"].rstrip("/").lower()
            if label_key(issue["label"]) in keys or url in urls:
                continue
            while issue["id"] in used_ids:
                issue["id"] = issue["id"] + "-" + str(issue["year"])
            issue["image"] = cover_url(issue.get("image"))
            used_ids.add(issue["id"])
            keys.add(label_key(issue["label"]))
            urls.add(url)
            fresh.append(issue)
    if not fresh:
        print("seen", len(seen), "unchanged")
        for label in seen:
            print(" ", label)
        return
    fresh.sort(key=lambda issue: (issue["year"], issue["number"]))
    saved.extend(fresh)
    saved.sort(key=lambda issue: (issue.get("year") or 0, issue.get("number") or 0))
    payload = {
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "issues": saved,
    }
    with open(OUT, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=False)
        handle.write("\n")
    print("seen", seen, "added", len(fresh))


if __name__ == "__main__":
    main()
