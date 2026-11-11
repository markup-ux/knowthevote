"""Stamp Leaders.vote so search engines can read and list it.

Each public page gets a canonical URL, a crawl rule, social tags, and
structured data. robots.txt and sitemap.xml list the same pages. The home
title and the countries description live here so a later rebuild keeps them.

Files under data/ and scripts/ are left alone. preview.html, health.html,
visits.html, and search.html are marked noindex and left out of the sitemap.
News article pages under news/ keep the head written by build_news_pages.py.
"""
import html
import json
import os
import re
from datetime import datetime, timezone
from urllib.parse import quote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGIN = "https://leaders.vote"
IMAGE = ORIGIN + "/social/leaders-vote-social.jpg"
IMAGE_WIDTH = "3072"
IMAGE_HEIGHT = "3840"
IMAGE_ALT = "Leaders.vote. Know who you're voting for."
CENSUS_IMAGE = (
    ORIGIN + "/social/census-map.png",
    "image/png",
    "2400",
    "1260",
    "Leaders.vote Census. National figures. A map of Census Bureau population estimates for July 1, 2025. A darker state has more people.",
)
ICON = ORIGIN + "/favicon.svg"
HOME_TITLE = "Leaders.vote — Know who you're voting for."
HOME_DESCRIPTION = (
    "Leaders.vote is an independent, nonpartisan guide to the leaders we vote for."
)
HOME_IMAGE = (
    ORIGIN + "/social/site-ad.png",
    "image/png",
    "2160",
    "2700",
    "Leaders.vote. Know who you're voting for. All states, Census, The House, News, Group Chat, Trivia, Countries, and Gallery. Independent and nonpartisan. No endorsements.",
)
COUNTRIES_DESCRIPTION = (
    "Election guides on Leaders.vote for the United States and other countries. "
    "A place is colored only from reported vote totals. Not an endorsement."
)
INDEX_ROBOTS = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
NOINDEX = {"preview.html", "health.html", "visits.html", "search.html"}
SKIP_DIRS = {"data", "scripts", "preview", ".git", ".github"}
COUNTRIES = {
    "au": "Australia",
    "br": "Brazil",
    "ca": "Canada",
    "ch": "Switzerland",
    "cy": "Cyprus",
    "cz": "Czechia",
    "de": "Germany",
    "es": "Spain",
    "fr": "France",
    "it": "Italy",
    "jp": "Japan",
    "pl": "Poland",
    "se": "Sweden",
    "sk": "Slovakia",
    "za": "South Africa",
}
BLOCK_RE = re.compile(r"\n?<!-- seo -->.*?<!-- /seo -->\n?", re.S)
TITLE_RE = re.compile(r"<title>([^<]*)</title>")
DESC_RE = re.compile(r'<meta name="description" content="([^"]*)"')


def canonical(rel):
    rel = rel.replace("\\", "/").lstrip("/")
    if rel in ("", "index.html"):
        return ORIGIN + "/"
    return ORIGIN + "/" + rel


def attr(value):
    return html.escape(value, quote=True)


def leaf_name(title):
    short = title.split(" · ", 1)[1] if title.startswith("Leaders.vote · ") else title
    return short.split(",", 1)[0].strip() or short


def breadcrumb(rel, title, url):
    items = [{"@type": "ListItem", "position": 1, "name": "Leaders.vote", "item": ORIGIN + "/"}]
    parts = rel.split("/")
    if len(parts) == 1:
        if rel != "index.html":
            items.append({"@type": "ListItem", "position": 2, "name": leaf_name(title), "item": url})
    else:
        items.append({"@type": "ListItem", "position": 2, "name": "Countries", "item": canonical("countries.html")})
        code = parts[0]
        name = COUNTRIES.get(code, code.upper())
        country = canonical(code + "/index.html")
        if parts[-1] == "index.html":
            items.append({"@type": "ListItem", "position": 3, "name": name, "item": url})
        else:
            items.append({"@type": "ListItem", "position": 3, "name": name, "item": country})
            items.append({"@type": "ListItem", "position": 4, "name": leaf_name(title), "item": url})
    for position, item in enumerate(items, 1):
        item["position"] = position
    return {"@type": "BreadcrumbList", "@id": url + "#breadcrumb", "itemListElement": items}


def page_image(rel):
    if rel == "census.html":
        return CENSUS_IMAGE
    if rel == "index.html":
        return HOME_IMAGE
    return (IMAGE, "image/jpeg", IMAGE_WIDTH, IMAGE_HEIGHT, IMAGE_ALT)


def is_news_article(rel):
    return rel.startswith("news/") and rel.endswith(".html")


def structured_data(rel, title, description, url, source=""):
    website = {
        "@type": "WebSite",
        "@id": ORIGIN + "/#website",
        "name": "Leaders.vote",
        "alternateName": "leaders.vote",
        "url": ORIGIN + "/",
        "description": HOME_DESCRIPTION,
        "inLanguage": "en",
        "publisher": {"@id": ORIGIN + "/#publisher"},
    }
    if rel == "index.html":
        website["potentialAction"] = {
            "@type": "SearchAction",
            "target": ORIGIN + "/search.html?q={search_term_string}",
            "query-input": "required name=search_term_string",
        }
    graph = [
        website,
        {
            "@type": "Organization",
            "@id": ORIGIN + "/#publisher",
            "name": "Leaders.vote",
            "alternateName": "leaders.vote",
            "url": ORIGIN + "/",
            "description": "Independent, nonpartisan voter guide. Not a campaign and not a government site.",
            "logo": {"@type": "ImageObject", "url": ICON},
        },
        {
            "@type": "WebPage",
            "@id": url + "#webpage",
            "url": url,
            "name": title,
            "description": description,
            "isPartOf": {"@id": ORIGIN + "/#website"},
            "breadcrumb": {"@id": url + "#breadcrumb"},
            "inLanguage": "en",
            "isAccessibleForFree": True,
            "primaryImageOfPage": {"@type": "ImageObject", "url": page_image(rel)[0]},
        },
        breadcrumb(rel, title, url),
    ]
    if rel == "news.html" and source:
        import build_news_pages
        listing = build_news_pages.item_list(source)
        if listing:
            graph.append(listing)
    payload = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, separators=(",", ":"))
    return payload.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")


def block(rel, title, description, robots, source=""):
    url = canonical(rel)
    image, image_type, image_width, image_height, image_alt = page_image(rel)
    lines = [
        "<!-- seo -->",
        '<link rel="canonical" href="%s">' % attr(url),
        '<meta name="robots" content="%s">' % attr(robots),
        '<meta name="application-name" content="Leaders.vote">',
        '<meta property="og:site_name" content="Leaders.vote">',
        '<meta property="og:type" content="website">',
        '<meta property="og:locale" content="en_US">',
        '<meta property="og:url" content="%s">' % attr(url),
        '<meta property="og:title" content="%s">' % attr(title),
        '<meta property="og:description" content="%s">' % attr(description),
        '<meta property="og:image" content="%s">' % image,
        '<meta property="og:image:type" content="%s">' % image_type,
        '<meta property="og:image:width" content="%s">' % image_width,
        '<meta property="og:image:height" content="%s">' % image_height,
        '<meta property="og:image:alt" content="%s">' % attr(image_alt),
        '<meta name="twitter:card" content="summary_large_image">',
        '<meta name="twitter:title" content="%s">' % attr(title),
        '<meta name="twitter:description" content="%s">' % attr(description),
        '<meta name="twitter:image" content="%s">' % image,
        '<link rel="icon" href="%s" type="image/svg+xml">' % ICON,
        '<script type="application/ld+json">%s</script>' % structured_data(rel, title, description, url, source),
        "<!-- /seo -->",
    ]
    return "\n".join(lines)


def health_block():
    return "\n".join([
        "<!-- seo -->",
        '<link rel="canonical" href="%s">' % attr(canonical("census.html") + "#health"),
        '<meta name="robots" content="noindex, follow">',
        "<!-- /seo -->",
    ])


def apply_copy(rel, text):
    if rel == "index.html":
        text = TITLE_RE.sub("<title>%s</title>" % attr(HOME_TITLE), text, count=1)
        text = DESC_RE.sub('<meta name="description" content="%s"' % attr(HOME_DESCRIPTION), text, count=1)
    elif rel == "countries.html":
        text = DESC_RE.sub(
            '<meta name="description" content="%s"' % attr(COUNTRIES_DESCRIPTION),
            text,
            count=1,
        )
    return text


def strip_managed(text):
    end = text.lower().find("</head>")
    if end < 0:
        return text
    head, rest = text[:end], text[end:]
    head = BLOCK_RE.sub("", head)
    head = re.sub(r'\n?<link rel="canonical"[^>]*>', "", head)
    head = re.sub(r'\n?<meta name="robots"[^>]*>', "", head)
    return head + rest


def insert_block(text, markup):
    end = text.lower().find("</head>")
    if end < 0:
        return text
    return text[:end] + "\n" + markup + "\n" + text[end:]


def prepare(rel, text):
    """Return HTML with the search block in place."""
    rel = rel.replace("\\", "/")
    if "</head>" not in text.lower():
        return text
    text = apply_copy(rel, text)
    text = strip_managed(text)
    if rel == "health.html":
        return insert_block(text, health_block())
    title = TITLE_RE.search(text)
    if not title:
        return text
    title = html.unescape(title.group(1)).strip()
    description = DESC_RE.search(text)
    description = html.unescape(description.group(1)).strip() if description else title
    robots = "noindex, follow" if rel in NOINDEX else INDEX_ROBOTS
    return insert_block(text, block(rel, title, description, robots, text))


def iter_pages():
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = sorted(name for name in dirnames if name not in SKIP_DIRS and not name.startswith("."))
        for name in sorted(filenames):
            if name.lower().endswith(".html"):
                yield os.path.join(dirpath, name)


def write_robots():
    body = "\n".join([
        "# Public voter-guide pages are crawlable.",
        "# User-agent: * allows major search engines. It also allows AI search",
        "# and AI training crawlers. Training-crawler blocks are not set.",
        "# Change that only with an explicit policy decision.",
        "# /data/ and /scripts/ stay out of the crawl.",
        "User-agent: *",
        "Allow: /",
        "Disallow: /data/",
        "Disallow: /scripts/",
        "",
        "Sitemap: %s/sitemap.xml" % ORIGIN,
        "",
    ])
    path = os.path.join(ROOT, "robots.txt")
    previous = open(path, encoding="utf-8").read() if os.path.exists(path) else ""
    if previous != body:
        open(path, "w", encoding="utf-8", newline="\n").write(body)
        return True
    return False


def lastmod(rel):
    path = os.path.join(ROOT, rel.replace("/", os.sep))
    stamp = os.path.getmtime(path)
    return datetime.fromtimestamp(stamp, timezone.utc).strftime("%Y-%m-%d")


def indexable(rel, text):
    if rel in NOINDEX:
        return False
    if "<title>" not in text.lower():
        return False
    if 'content="noindex' in text:
        return False
    return True


def write_sitemap(rels):
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for rel in rels:
        loc = quote(canonical(rel), safe=":/").replace("&", "&amp;")
        lines.append("<url><loc>%s</loc><lastmod>%s</lastmod></url>" % (loc, lastmod(rel)))
    lines.append("</urlset>")
    lines.append("")
    body = "\n".join(lines)
    path = os.path.join(ROOT, "sitemap.xml")
    previous = open(path, encoding="utf-8").read() if os.path.exists(path) else ""
    if previous != body:
        open(path, "w", encoding="utf-8", newline="\n").write(body)
        return True
    return False


def list_indexable():
    listed = []
    for path in iter_pages():
        rel = os.path.relpath(path, ROOT).replace("\\", "/")
        text = open(path, encoding="utf-8").read()
        if indexable(rel, text):
            listed.append(rel)
    listed.sort(key=lambda rel: (rel != "index.html", rel))
    return listed


def refresh_sitemap():
    listed = list_indexable()
    write_sitemap(listed)
    write_robots()
    return listed


def publish():
    import build_search
    import build_news_pages
    build_search.main()
    build_news_pages.write_articles(refresh=False)
    changed = 0
    listed = []
    for path in iter_pages():
        rel = os.path.relpath(path, ROOT).replace("\\", "/")
        original = open(path, encoding="utf-8").read()
        if is_news_article(rel):
            updated = original
        else:
            updated = prepare(rel, original)
            if updated != original:
                open(path, "w", encoding="utf-8", newline="\n").write(updated)
                changed += 1
        if indexable(rel, updated):
            listed.append(rel)
    listed.sort(key=lambda rel: (rel != "index.html", rel))
    robots_changed = write_robots()
    sitemap_changed = write_sitemap(listed)
    print("seo pages", len(listed), "html updated", changed, "robots", robots_changed, "sitemap", sitemap_changed)
    return listed


if __name__ == "__main__":
    publish()
