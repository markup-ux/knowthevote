"""Give each newsroom story its own URL.

The story text stays the text already in news.html. A story whose id is
n-price-of-competition is published at news/price-of-competition/index.html,
which the host serves as /news/price-of-competition/. The older
news/n-price-of-competition.html address redirects there and is left out
of the sitemap. news.html#id still opens the story.

Desk files under news/*.json are the publishing queue. A post that is not
already in news.html is written into the matching desk, then this builds
its page, metadata, and sitemap entry. Run this after a desk update, or
let the article workflow run it when news.html or a desk file changes.
"""
import html
import json
import os
import re
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGIN = "https://leaders.vote"
NEWS = os.path.join(ROOT, "news.html")
NEWS_DIR = os.path.join(ROOT, "news")
DEFAULT_IMAGE = (
    ORIGIN + "/social/leaders-vote-social.jpg",
    "image/jpeg",
    "3072",
    "3840",
    "Leaders.vote. Know who you're voting for.",
)
ROBOTS = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
URL_RE = re.compile(r"^(?:[a-z][a-z0-9+.-]*:|#|//)", re.I)


class StoryExtractor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.stories = []
        self.depth = 0
        self.buf = []
        self.attrs = None

    def handle_starttag(self, tag, attrs):
        attr = dict(attrs)
        if tag == "article" and self.depth == 0:
            classes = (attr.get("class") or "").split()
            if "story" in classes and attr.get("id"):
                self.depth = 1
                self.attrs = attr
                self.buf = [self.get_starttag_text()]
                return
        if self.depth:
            if tag == "article":
                self.depth += 1
            self.buf.append(self.get_starttag_text())

    def handle_endtag(self, tag):
        if not self.depth:
            return
        self.buf.append("</%s>" % tag)
        if tag == "article":
            self.depth -= 1
            if self.depth == 0:
                self.stories.append(("".join(self.buf), dict(self.attrs)))
                self.buf = []
                self.attrs = None

    def handle_startendtag(self, tag, attrs):
        if self.depth:
            self.buf.append(self.get_starttag_text())

    def handle_data(self, data):
        if self.depth:
            self.buf.append(data)

    def handle_entityref(self, name):
        if self.depth:
            self.buf.append("&%s;" % name)

    def handle_charref(self, name):
        if self.depth:
            self.buf.append("&#%s;" % name)

    def handle_comment(self, data):
        if self.depth:
            self.buf.append("<!--%s-->" % data)


def extract_stories(text):
    start = text.find("<main")
    end = text.rfind("</main>")
    chunk = text[start:end + len("</main>")] if start >= 0 and end > start else text
    parser = StoryExtractor()
    parser.feed(chunk)
    parser.close()
    stories = []
    for markup, attrs in parser.stories:
        if markup not in text:
            raise SystemExit("could not round-trip story " + (attrs.get("id") or ""))
        stories.append((markup, attrs))
    return stories


def visible_text(fragment):
    text = re.sub(r"<[^>]+>", " ", fragment)
    text = html.unescape(text)
    return " ".join(text.split())


READ_SKIP = {"tag", "when", "src", "actions", "letter-by", "letterhead", "fine", "read", "crumb"}
READ_VOID = {"img", "br", "hr", "input", "source", "meta", "link", "wbr"}


class ReadCounter(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.parts = []

    def handle_starttag(self, tag, attrs):
        classes = set((dict(attrs).get("class") or "").split())
        skip = tag in ("script", "style", "figcaption") or bool(classes & READ_SKIP)
        if self.stack and self.stack[-1]:
            skip = True
        if tag not in READ_VOID:
            self.stack.append(skip)

    def handle_endtag(self, tag):
        if tag in READ_VOID:
            return
        if self.stack:
            self.stack.pop()

    def handle_data(self, data):
        if not self.stack or not self.stack[-1]:
            self.parts.append(data)


def reading_minutes(markup):
    counter = ReadCounter()
    try:
        counter.feed(markup)
        counter.close()
    except Exception:
        return 0
    words = [part for part in " ".join(counter.parts).split() if part]
    if not words:
        return 0
    return max(1, int(round(len(words) / 200.0)))


def _with_read(inner, placed):
    if "</time>" in inner:
        return inner.replace("</time>", "</time>" + placed, 1)
    if visible_text(inner):
        return inner + placed
    return None


def stamp_read_time(markup):
    """Put a reading time on the date line. A later pass refreshes the number."""
    markup = re.sub(
        r'\n?[ \t]*<p class="when">\s*<span class="read">.*?</span>\s*</p>',
        "",
        markup,
        count=1,
        flags=re.S,
    )
    markup = re.sub(r"\s*·\s*<span class=\"read\">.*?</span>", "", markup, count=1, flags=re.S)
    minutes = reading_minutes(markup)
    if not minutes:
        return markup
    placed = ' · <span class="read">%d min read</span>' % minutes
    dated = []
    volume = None
    for match in re.finditer(r'(<p class="(?:when|tag)"[^>]*>)(.*?)(</p>)', markup, re.S):
        inner = match.group(2)
        if "</time>" in inner:
            dated.append(match)
            continue
        if match.group(1).startswith('<p class="when"') and visible_text(inner).lower().startswith("volume"):
            volume = match
    found = dated[0] if dated else volume
    if found:
        updated = _with_read(found.group(2), placed)
        if updated is not None:
            return markup[:found.start(2)] + updated + markup[found.end(2):]
    heading = re.search(r"</h[13]>", markup)
    if not heading:
        return markup
    line = '\n          <p class="when"><span class="read">%d min read</span></p>' % minutes
    return markup[:heading.end()] + line + markup[heading.end():]


def stamp_stories(text):
    changed = text
    count = 0
    for markup, attrs in extract_stories(text):
        stamped = stamp_read_time(markup)
        if stamped == markup:
            continue
        if markup not in changed:
            raise SystemExit("could not stamp " + (attrs.get("id") or ""))
        changed = changed.replace(markup, stamped, 1)
        count += 1
    return changed, count


def _load(path):
    raw = open(path, "rb").read()
    newline = "\r\n" if b"\r\n" in raw else "\n"
    return raw.decode("utf-8").replace("\r\n", "\n"), newline


def _save(path, text, newline):
    data = text.replace("\n", newline).encode("utf-8")
    open(path, "wb").write(data)


def stamp_existing():
    news, newline = _load(NEWS)
    updated, count = stamp_stories(news)
    if updated != news:
        _save(NEWS, updated, newline)
    pages = 0
    for name in os.listdir(NEWS_DIR):
        path = os.path.join(NEWS_DIR, name, "index.html")
        if not os.path.isfile(path):
            continue
        text, page_nl = _load(path)
        revised, n = stamp_stories(text)
        if revised != text:
            _save(path, revised, page_nl)
            pages += n
    print("news stories", count, "article pages", pages)


def clip(text, limit=155):
    text = " ".join((text or "").split())
    if len(text) <= limit:
        return text
    cut = text[:limit]
    space = cut.rfind(" ")
    if space > 80:
        cut = cut[:space]
    return cut.rstrip(".,;:") + "…"


def first_paragraph(markup):
    stand = re.search(r'<p class="standfirst"[^>]*>(.*?)</p>', markup, re.S)
    if stand:
        text = visible_text(stand.group(1))
        if text:
            return text
    for match in re.finditer(r"<p\b([^>]*)>(.*?)</p>", markup, re.S):
        classes = re.search(r'class="([^"]*)"', match.group(1))
        names = set((classes.group(1) if classes else "").split())
        if names & {"tag", "when", "src", "actions", "letter-by", "fine"}:
            continue
        text = visible_text(match.group(2))
        if text:
            return text
    return ""


def headline(markup):
    match = re.search(r"<h3\b[^>]*>(.*?)</h3>", markup, re.S)
    if not match:
        return ""
    return visible_text(match.group(1))


def published(markup, attrs):
    match = re.search(r'<time\b[^>]*datetime="([^"]+)"', markup)
    if match:
        return match.group(1)
    return attrs.get("data-posted") or ""


def author_name(markup):
    byline = re.search(r'class="byline-face"[^>]*>(.*?)</button>', markup, re.S)
    if byline:
        name = visible_text(byline.group(1))
        if name:
            return name
    match = re.search(r'<p class="when"[^>]*>(.*?)</p>', markup, re.S)
    if not match:
        return ""
    block = re.sub(r"<time\b[^>]*>.*?</time>", " ", match.group(1), flags=re.S)
    text = visible_text(block)
    parts = [part.strip(" .") for part in text.split("·") if part.strip(" .")]
    parts = [part for part in parts if not re.fullmatch(r"\d+\s+min\s+read", part, re.I)]
    if not parts:
        return ""
    name = parts[-1]
    if name.lower().startswith("volume"):
        return ""
    if re.fullmatch(r"(?:\d[\d,]*\s+(?:reactions?|comments?)(?:\s*,\s*)?)+", name, re.I):
        return ""
    return name


def source_url(markup):
    for href in re.findall(r'<p class="src"[^>]*>.*?href="([^"]+)"', markup, re.S):
        if href.startswith("http://") or href.startswith("https://"):
            return href
    return ""


def image_url(markup):
    for pattern in (
        r'<figure class="essay-fig"[^>]*>.*?<img\b[^>]*src="([^"]+)"',
        r'<figure class="shot"[^>]*>.*?<img\b[^>]*src="([^"]+)"',
    ):
        match = re.search(pattern, markup, re.S)
        if match:
            return match.group(1)
    match = re.search(r'<img\b[^>]*src="([^"]+)"', markup)
    return match.group(1) if match else ""


def article_slug(ident):
    if ident.startswith("n-") and len(ident) > 2:
        return ident[2:]
    return ident


def article_href(ident):
    return "news/%s/" % article_slug(ident)


def article_url(ident):
    return ORIGIN + "/" + article_href(ident)


def from_article_dir(url):
    """Rewrite a news.html-relative URL for a page in news/<slug>/."""
    if not url or URL_RE.match(url) or url.startswith("../") or url.startswith("/"):
        return url
    if url.startswith("news/"):
        return "../" + url[len("news/"):]
    return "../../" + url


def rewrite_urls(markup):
    def repl(match):
        return "%s=%s%s%s" % (match.group(1), match.group(2), from_article_dir(match.group(3)), match.group(2))
    return re.sub(r'\b(href|src)=(["\'])([^"\']*)\2', repl, markup)


def absolute_from_news(url):
    if not url:
        return ""
    if url.startswith("//"):
        return "https:" + url
    if url.startswith("http://") or url.startswith("https://"):
        return url
    moved = from_article_dir(url)
    if moved.startswith("../../"):
        return ORIGIN + "/" + moved[6:]
    if moved.startswith("../"):
        return ORIGIN + "/news/" + moved[3:]
    if moved.startswith("/"):
        return ORIGIN + moved
    return ORIGIN + "/news/" + moved


def flatten_who(markup):
    def repl(match):
        attrs = match.group(1)
        inner = match.group(2)
        classes = re.search(r'\bclass="([^"]*)"', attrs)
        class_attr = (' class="%s"' % classes.group(1)) if classes else ""
        text = visible_text(inner)
        if text:
            return "<span%s>%s</span>" % (class_attr, inner)
        label = re.search(r'aria-label="([^"]*)"', attrs)
        if not label:
            return "<span%s>%s</span>" % (class_attr, inner)
        return "<span%s>%s</span>" % (class_attr, html.escape(html.unescape(label.group(1))))
    return re.sub(r"<button\b([^>]*(?:\bwho\b|byline-face)[^>]*)>(.*?)</button>", repl, markup, flags=re.S)


def fill_empty_alt(markup, title):
    safe = html.escape(title, quote=True)

    def repl(match):
        figure = match.group(0)
        return re.sub(r'\balt=""', 'alt="%s"' % safe, figure, count=1)
    return re.sub(r"<figure\b[^>]*>.*?</figure>", repl, markup, flags=re.S)


def add_lead(markup):
    def repl(match):
        classes = match.group(2).split()
        if "lead" not in classes:
            classes.append("lead")
        return match.group(1) + " ".join(classes) + '"'
    return re.sub(r'(<article\b[^>]*class=")([^"]*)"', repl, markup, count=1)


def article_body(markup, title):
    body = add_lead(markup)
    body = rewrite_urls(body)
    body = flatten_who(body)
    body = fill_empty_alt(body, title)
    body = re.sub(r"<h3\b([^>]*)>(.*?)</h3>", r"<h1\1>\2</h1>", body, count=1, flags=re.S)
    body = re.sub(r"(<h1\b[^>]*>)\s*<a\b[^>]*>(.*?)</a>\s*(</h1>)", r"\1\2\3", body, count=1, flags=re.S)
    body = re.sub(r"^(<article\b[^>]*?)\s+hidden\b", r"\1", body, count=1)
    body = re.sub(r"<details\b(?![^>]*\bopen\b)", "<details open", body)
    return stamp_read_time(body)


def json_script(graph):
    payload = json.dumps(graph, ensure_ascii=False, separators=(",", ":"))
    payload = payload.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    return payload


def structured(meta):
    url = meta["url"]
    website = {
        "@type": "WebSite",
        "@id": ORIGIN + "/#website",
        "name": "Leaders.vote",
        "url": ORIGIN + "/",
        "publisher": {"@id": ORIGIN + "/#publisher"},
        "inLanguage": "en",
    }
    organization = {
        "@type": "Organization",
        "@id": ORIGIN + "/#publisher",
        "name": "Leaders.vote",
        "url": ORIGIN + "/",
        "description": "Independent, nonpartisan voter guide. Not a campaign and not a government site.",
        "logo": {"@type": "ImageObject", "url": ORIGIN + "/favicon.svg"},
    }
    article = {
        "@type": "NewsArticle" if meta.get("news") else "Article",
        "@id": url + "#article",
        "headline": meta["title"],
        "description": meta["description"],
        "url": url,
        "mainEntityOfPage": url,
        "isAccessibleForFree": True,
        "inLanguage": "en",
        "publisher": {"@id": ORIGIN + "/#publisher"},
    }
    if meta["published"]:
        article["datePublished"] = meta["published"]
    if meta.get("modified"):
        article["dateModified"] = meta["modified"]
    if meta["author"]:
        article["author"] = {"@type": "Person", "name": meta["author"]}
    if meta["image"]:
        article["image"] = [meta["image"]]
    if meta["source"]:
        article["isBasedOn"] = meta["source"]
    if meta["section"]:
        article["articleSection"] = meta["section"]
    webpage = {
        "@type": "WebPage",
        "@id": url + "#webpage",
        "url": url,
        "name": meta["title"] + " · Leaders.vote",
        "description": meta["description"],
        "isPartOf": {"@id": ORIGIN + "/#website"},
        "breadcrumb": {"@id": url + "#breadcrumb"},
        "inLanguage": "en",
        "isAccessibleForFree": True,
        "primaryImageOfPage": {"@type": "ImageObject", "url": meta["image"] or DEFAULT_IMAGE[0]},
    }
    crumbs = {
        "@type": "BreadcrumbList",
        "@id": url + "#breadcrumb",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Leaders.vote", "item": ORIGIN + "/"},
            {"@type": "ListItem", "position": 2, "name": "News", "item": ORIGIN + "/news.html"},
            {"@type": "ListItem", "position": 3, "name": meta["title"], "item": url},
        ],
    }
    return {"@context": "https://schema.org", "@graph": [website, organization, article, webpage, crumbs]}


def seo_block(meta):
    url = meta["url"]
    image = meta["image"] or DEFAULT_IMAGE[0]
    lines = [
        "<!-- seo -->",
        '<link rel="canonical" href="%s">' % html.escape(url, quote=True),
        '<meta name="robots" content="%s">' % ROBOTS,
        '<meta name="application-name" content="Leaders.vote">',
        '<meta property="og:site_name" content="Leaders.vote">',
        '<meta property="og:type" content="article">',
        '<meta property="og:locale" content="en_US">',
        '<meta property="og:url" content="%s">' % html.escape(url, quote=True),
        '<meta property="og:title" content="%s">' % html.escape(meta["title"], quote=True),
        '<meta property="og:description" content="%s">' % html.escape(meta["description"], quote=True),
        '<meta property="og:image" content="%s">' % html.escape(image, quote=True),
    ]
    if not meta["image"]:
        lines.extend([
            '<meta property="og:image:type" content="%s">' % DEFAULT_IMAGE[1],
            '<meta property="og:image:width" content="%s">' % DEFAULT_IMAGE[2],
            '<meta property="og:image:height" content="%s">' % DEFAULT_IMAGE[3],
            '<meta property="og:image:alt" content="%s">' % html.escape(DEFAULT_IMAGE[4], quote=True),
        ])
    elif meta["title"]:
        lines.append('<meta property="og:image:alt" content="%s">' % html.escape(meta["title"], quote=True))
    lines.extend([
        '<meta name="twitter:card" content="summary_large_image">',
        '<meta name="twitter:title" content="%s">' % html.escape(meta["title"], quote=True),
        '<meta name="twitter:description" content="%s">' % html.escape(meta["description"], quote=True),
        '<meta name="twitter:image" content="%s">' % html.escape(image, quote=True),
    ])
    if meta.get("published"):
        lines.append('<meta property="article:published_time" content="%s">' % html.escape(meta["published"], quote=True))
    if meta.get("modified"):
        lines.append('<meta property="article:modified_time" content="%s">' % html.escape(meta["modified"], quote=True))
    lines.extend([
        '<link rel="icon" href="%s" type="image/svg+xml">' % (ORIGIN + "/favicon.svg"),
        '<script type="application/ld+json">%s</script>' % json_script(structured(meta)),
        "<!-- /seo -->",
    ])
    return "\n".join(lines)


def story_meta(markup, attrs):
    title = headline(markup)
    description = clip(first_paragraph(markup) or title)
    ident = attrs.get("id") or ""
    tag = ""
    tag_match = re.search(r'<p class="tag"[^>]*>(.*?)</p>', markup, re.S)
    if tag_match:
        tag_html = re.sub(r"<time\b[^>]*>.*?</time>", " ", tag_match.group(1), flags=re.S)
        tag = visible_text(tag_html).strip(" ·")
    return {
        "id": ident,
        "title": title,
        "description": description,
        "published": published(markup, attrs),
        "author": author_name(markup),
        "source": source_url(markup),
        "image": absolute_from_news(image_url(markup)),
        "section": tag,
        "url": article_url(ident),
        "news": "essay" in (attrs.get("class") or "").split(),
        "modified": modified_date(attrs),
    }


def modified_date(attrs):
    for key in ("data-modified", "data-updated"):
        value = attrs.get(key) or ""
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            return value
    return ""


def item_list(text):
    elements = []
    for position, (markup, attrs) in enumerate(extract_stories(text), 1):
        ident = attrs.get("id") or ""
        name = headline(markup) or ident
        elements.append({
            "@type": "ListItem",
            "position": position,
            "name": name,
            "url": article_url(ident),
        })
    if not elements:
        return None
    return {
        "@type": "ItemList",
        "@id": ORIGIN + "/news.html#articles",
        "name": "Leaders.vote newsroom",
        "itemListElement": elements,
    }


def link_headline(markup, ident):
    href = article_href(ident)

    def repl(match):
        inner = match.group(2)
        if re.search(r"<a\b", inner):
            inner = re.sub(r'(<a\b[^>]*\bhref=)(["\'])[^"\']*\2', r"\1\2%s\2" % href, inner, count=1)
            return "<h3%s>%s</h3>" % (match.group(1), inner)
        return "<h3%s><a href=\"%s\">%s</a></h3>" % (match.group(1), href, inner)
    return re.sub(r"<h3\b([^>]*)>(.*?)</h3>", repl, markup, count=1, flags=re.S)


def redirect_script(ids):
    known = {ident: 1 for ident in ids}
    body = json.dumps(known, ensure_ascii=False, separators=(",", ":"))
    return "\n".join([
        "<!-- news-article-urls -->",
        "<script>",
        "/* news-article-urls */",
        "(function () {",
        "  var id = \"\";",
        "  try { id = decodeURIComponent((location.hash || \"\").slice(1)); } catch (e) { return; }",
        "  var known = %s;" % body,
        "  if (known[id]) location.replace(\"news/\" + id.replace(/^n-/, \"\") + \"/\");",
        "})();",
        "</script>",
        "<!-- /news-article-urls -->",
    ])


def replace_marked(text, start, end, body):
    pattern = re.compile(re.escape(start) + r".*?" + re.escape(end), re.S)
    block = start + "\n" + body + "\n" + end if not body.startswith(start) else body
    if body.startswith(start):
        block = body
    if pattern.search(text):
        return pattern.sub(block, text, count=1), True
    return text, False


def chrome(text):
    start = text.find('<svg id="site-marks"')
    end = text.find("</header>")
    if start < 0 or end < 0:
        raise SystemExit("news.html is missing its header")
    block = text[start:end + len("</header>")]
    block = block.replace(' aria-current="page"', "")
    return rewrite_urls(block)


def footer(text):
    start = text.find("<footer>")
    end = text.find("</footer>")
    if start < 0 or end < 0:
        return ""
    return rewrite_urls(text[start:end + len("</footer>")])


def head_open(text):
    theme = re.search(r"<script>try\{var t=localStorage.*?</script>", text, re.S)
    theme_src = re.search(r'<script src="theme\.js[^"]*" defer></script>', text)
    styles = re.findall(r'<link rel="stylesheet" href="(?:guide|news)\.css[^"]*">', text)
    parts = ["<!DOCTYPE html>", '<html lang="en">', "<head>"]
    if theme:
        parts.append(theme.group(0))
    if theme_src:
        parts.append(rewrite_urls(theme_src.group(0)))
    parts.append('<meta charset="utf-8">')
    parts.append('<meta name="viewport" content="width=device-width, initial-scale=1">')
    for link in styles:
        parts.append(rewrite_urls(link))
    return "\n".join(parts)


def render_page(text, markup, attrs):
    meta = story_meta(markup, attrs)
    if not meta["title"] or not meta["id"]:
        raise SystemExit("story missing a title or id")
    body = article_body(markup, meta["title"])
    if "essay" in (attrs.get("class") or ""):
        body = "<section id=\"note\">\n" + body + "\n</section>"
    page = "\n".join([
        head_open(text),
        "<title>%s · Leaders.vote</title>" % html.escape(meta["title"]),
        '<meta name="description" content="%s">' % html.escape(meta["description"], quote=True),
        seo_block(meta),
        "</head>",
        '<body class="article-page">',
        "<!-- news-article -->",
        chrome(text),
        '<main class="nr">',
        '<div class="wrap nr-wrap">',
        '<nav class="crumb" aria-label="Breadcrumb"><a href="/">Leaders.vote</a> · <a href="../../news.html">News</a></nav>',
        body,
        "</div>",
        "</main>",
        footer(text),
        '<div id="google_translate_element" aria-hidden="true"></div>',
        '<script src="../../news/marks.js?v=1"></script>',
        '<script src="../../lang.js?v=10"></script>',
        "</body>",
        "</html>",
        "",
    ])
    return meta, page


def write_if_changed(path, text):
    previous = open(path, encoding="utf-8").read() if os.path.exists(path) else None
    if previous == text:
        return False
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "w", encoding="utf-8", newline="\n").write(text)
    return True


def retarget_hashes(text, ids):
    def repl(match):
        ident = match.group(2)
        if ident not in ids:
            return match.group(0)
        return "href=%s%s%s" % (match.group(1), article_href(ident), match.group(1))
    text = re.sub(r'href=(["\'])(?:news\.html)?#(n-[a-z0-9-]+)\1', repl, text)

    def file_repl(match):
        ident = match.group(2)
        if ident not in ids:
            return match.group(0)
        return "href=%s%s%s" % (match.group(1), article_href(ident), match.group(1))
    return re.sub(r'href=(["\'])news/(n-[a-z0-9-]+)\.html\1', file_repl, text)


def update_news(text, stories):
    ids = []
    for markup, attrs in stories:
        ident = attrs["id"]
        ids.append(ident)
        linked = link_headline(markup, ident)
        if linked != markup:
            text = text.replace(markup, linked, 1)
    text = retarget_hashes(text, set(ids))
    script = redirect_script(ids)
    text, replaced = replace_marked(text, "<!-- news-article-urls -->", "<!-- /news-article-urls -->", script)
    if not replaced:
        text = text.replace("</head>", script + "\n</head>", 1)
    import seo
    text = seo.prepare("news.html", text)
    return text, ids


def update_mentions(ids):
    changed = []
    targets = [
        os.path.join(ROOT, "index.html"),
        os.path.join(ROOT, "search.json"),
    ]
    for path in targets:
        if not os.path.exists(path):
            continue
        text = open(path, encoding="utf-8").read()
        updated = retarget_hashes(text, ids)
        if path.endswith("search.json"):
            updated = retarget_plain(updated, ids)
        if updated != text and write_if_changed(path, updated):
            changed.append(os.path.relpath(path, ROOT))
    return changed


def retarget_plain(text, ids):
    def repl(match):
        ident = match.group(1)
        if ident not in ids:
            return match.group(0)
        return article_href(ident)
    text = re.sub(r"news/(n-[a-z0-9-]+)\.html", repl, text)
    return re.sub(
        r"news\.html#(n-[a-z0-9-]+)",
        lambda match: article_href(match.group(1)) if match.group(1) in ids else match.group(0),
        text,
    )


DESKS = (
    ("better.json", "better", "posts", "better", "The Better India", "Read it at The Better India"),
    ("look.json", "look", "posts", "look", "Magnolia Lookbooks", "Open this lookbook"),
    ("nyle.json", "nyle", "posts", "nyle", "Nyle", "Read the post on LinkedIn"),
    ("edge.json", "feed", "posts", "feed", "The Edge", "Read her post on LinkedIn"),
    ("pocit.json", "weekly", "posts", "weekly", "POCIT Weekly", "Read it at POCIT"),
)
KEEP_NEWS_DIRS = {"preview"}


def canon_url(url):
    text = html.unescape(url or "").split("?")[0].split("#")[0]
    return text.rstrip("/").lower()


def known_story(text, post):
    ident = post.get("id") or ""
    if ident and ('id="%s"' % ident) in text:
        return True
    url = canon_url(post.get("url") or "")
    if not url:
        return False
    for href in re.findall(r'href="([^"]+)"', text):
        if canon_url(html.unescape(href)) == url:
            return True
    return False


def load_desk(name):
    path = os.path.join(NEWS_DIR, name)
    if not os.path.isfile(path):
        return {}
    return json.loads(open(path, encoding="utf-8").read())


def story_markup(post, source, tag, link_label, lead=False):
    classes = "story lead" if lead else "story"
    bits = [
        'class="%s"' % classes,
        'data-source="%s"' % html.escape(source, quote=True),
        'data-color="%s"' % html.escape(post.get("color") or "brown", quote=True),
    ]
    if post.get("date"):
        bits.append('data-posted="%s"' % html.escape(post["date"], quote=True))
    if post.get("caption"):
        bits.append('data-caption="%s"' % html.escape(post["caption"], quote=True))
    if post.get("earlier"):
        bits.append('data-earlier="true"')
        bits.append("hidden")
    if post.get("id"):
        bits.append('id="%s"' % html.escape(post["id"], quote=True))
    lines = ["        <article %s>" % " ".join(bits)]
    lines.append('          <p class="tag">%s</p>' % html.escape(tag, quote=False))
    if post.get("image"):
        alt = post.get("image_alt") or ""
        lines.append(
            '          <figure class="shot"><img src="%s" alt="%s"></figure>'
            % (html.escape(post["image"], quote=True), html.escape(alt, quote=True))
        )
    title = post.get("title") or ""
    lines.append("          <h3>%s</h3>" % html.escape(title, quote=False))
    when = []
    if post.get("date"):
        label = post.get("dateLabel") or post["date"]
        when.append('<time datetime="%s">%s</time>' % (html.escape(post["date"], quote=True), html.escape(label)))
    if post.get("author"):
        when.append(html.escape(post["author"], quote=False))
    if post.get("meta"):
        when.append(html.escape(post["meta"], quote=False))
    if post.get("when"):
        when.append(html.escape(post["when"], quote=False))
    if when:
        lines.append('          <p class="when">%s</p>' % " · ".join(when))
    lines.append("          <p>%s</p>" % html.escape(post.get("text") or "", quote=False))
    lines.append(
        '          <p class="src"><a href="%s" target="_blank" rel="noopener noreferrer">%s</a></p>'
        % (html.escape(post.get("url") or "", quote=True), html.escape(link_label, quote=False))
    )
    lines.append("        </article>")
    return stamp_read_time("\n".join(lines))


def prepend_desk(text, section_id, block, move_lead):
    marker = 'id="%s"' % section_id
    start = text.find(marker)
    if start < 0 or not block:
        return text
    nxt = text.find("<section", start + len(marker))
    region_end = nxt if nxt > 0 else len(text)
    list_at = text.find('<div class="desk-list">', start, region_end)
    if list_at < 0:
        return text
    insert_at = list_at + len('<div class="desk-list">')
    chunk = text[insert_at:region_end]
    if move_lead:
        chunk = re.sub(r'(class="story) lead\b', r"\1", chunk, count=1)
    return text[:insert_at] + "\n" + block + chunk + text[region_end:]


def materialize_desks(text):
    added = 0
    for filename, section_id, key, source, tag, label in DESKS:
        posts = []
        for post in load_desk(filename).get(key) or []:
            if post.get("id") and post.get("url") and post.get("title") and not known_story(text, post):
                posts.append(post)
        if not posts:
            continue
        posts.sort(key=lambda post: post.get("date") or "")
        visible = [post for post in posts if not post.get("earlier")]
        newest = visible[-1].get("id") if visible else ""
        blocks = [
            story_markup(post, source, tag, label, lead=post.get("id") == newest)
            for post in reversed(posts)
        ]
        text = prepend_desk(text, section_id, "\n".join(blocks), move_lead=bool(newest))
        added += len(posts)
    issues = []
    for issue in load_desk("scientist.json").get("issues") or []:
        if issue.get("id") and issue.get("url") and issue.get("label") and not known_story(text, issue):
            issues.append(issue)
    if issues:
        issues.sort(key=lambda issue: ((issue.get("year") or 0), (issue.get("number") or 0)))
        newest = issues[-1].get("id")
        blocks = []
        for issue in reversed(issues):
            when = ""
            if issue.get("volume") and issue.get("number"):
                when = "Volume %s, number %s" % (issue["volume"], issue["number"])
            blocks.append(story_markup({
                "id": issue.get("id") or "",
                "url": issue.get("url") or "",
                "title": (issue.get("label") or "American Scientist").rstrip(".") + ".",
                "color": issue.get("color") or "brown",
                "image": issue.get("image") or "",
                "image_alt": "American Scientist, " + (issue.get("label") or ""),
                "text": issue.get("pieces") or "Sigma Xi lists this issue on their site.",
                "when": when,
            }, "journal", "American Scientist", "Open this issue", lead=issue.get("id") == newest))
        text = prepend_desk(text, "journal", "\n".join(blocks), move_lead=True)
        added += len(issues)
    return text, added


def redirect_page(ident):
    url = article_url(ident)
    safe = html.escape(url, quote=True)
    return "\n".join([
        "<!DOCTYPE html>",
        '<html lang="en">',
        "<head>",
        '<meta charset="utf-8">',
        '<link rel="canonical" href="%s">' % safe,
        '<meta http-equiv="refresh" content="0; url=%s">' % safe,
        '<meta name="robots" content="noindex, follow">',
        "<title>Leaders.vote</title>",
        "</head>",
        "<body>",
        '<p><a href="%s">Continue</a></p>' % safe,
        "</body>",
        "</html>",
        "",
    ])


def remove_stale(kept_ids, kept_slugs):
    removed = 0
    for name in os.listdir(NEWS_DIR):
        path = os.path.join(NEWS_DIR, name)
        if name.startswith("n-") and name.endswith(".html") and name[:-5] not in kept_ids:
            os.remove(path)
            removed += 1
            continue
        if not os.path.isdir(path) or name in KEEP_NEWS_DIRS or name.startswith("."):
            continue
        index = os.path.join(path, "index.html")
        if name in kept_slugs or not os.path.isfile(index):
            continue
        marker = open(index, encoding="utf-8").read(500)
        if "<!-- news-article -->" not in marker:
            continue
        os.remove(index)
        try:
            os.rmdir(path)
        except OSError:
            pass
        removed += 1
    return removed


def write_articles(refresh=True):
    text = open(NEWS, encoding="utf-8").read()
    text, added = materialize_desks(text)
    stories = extract_stories(text)
    if not stories:
        raise SystemExit("no stories in news.html")
    written = 0
    redirected = 0
    kept_ids = set()
    kept_slugs = set()
    for markup, attrs in stories:
        meta, page = render_page(text, markup, attrs)
        ident = meta["id"]
        slug = article_slug(ident)
        kept_ids.add(ident)
        kept_slugs.add(slug)
        if write_if_changed(os.path.join(NEWS_DIR, slug, "index.html"), page):
            written += 1
        if write_if_changed(os.path.join(NEWS_DIR, ident + ".html"), redirect_page(ident)):
            redirected += 1
    removed = remove_stale(kept_ids, kept_slugs)
    updated, ids = update_news(text, stories)
    news_changed = write_if_changed(NEWS, updated)
    mentions = update_mentions(set(ids))
    listed = None
    if refresh:
        import seo
        listed = seo.refresh_sitemap()
    print(
        "stories", len(stories),
        "desks added", added,
        "pages written", written,
        "redirects written", redirected,
        "removed", removed,
        "news", news_changed,
        "mentions", mentions,
    )
    if listed is not None:
        print("sitemap", len(listed))
    return stories


def main():
    write_articles(refresh=True)


if __name__ == "__main__":
    main()
