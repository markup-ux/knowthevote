"""Build search.json, the list behind the site search box.

Each row is a name, a short description, and a page that already exists.
Candidate links use the same anchors as the state pages. County links use
the census page hash. Passage rows carry the words printed on a page, and
water and fast-food rows carry the sentences those scripts write onto the
census page. Run this after a guide, country, or census rebuild.
"""
import html
import json
import os
import re
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "search.json")

COUNTRY = {
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
PLACE = {
    "au": "State or territory",
    "br": "State",
    "ca": "Province or territory",
    "ch": "Canton",
    "cy": "District",
    "cz": "Region",
    "de": "State",
    "es": "Autonomous community",
    "fr": "Region",
    "it": "Area",
    "jp": "Prefecture",
    "pl": "Voivodeship",
    "se": "County",
    "sk": "Region",
    "za": "Municipality",
}
PAGES = [
    ("United States", "All states", "index.html", "voter guide election november"),
    ("Countries", "Elections outside the United States", "countries.html", "international country"),
    ("Census", "Population, counties, and House seats", "census.html", "population census bureau median age apportionment"),
    ("Crime", "FBI estimated offenses by state", "census.html#crime", "violent property murder robbery assault burglary fbi"),
    ("Neighborhood crime", "City offense rates for neighborhoods", "census.html#crime-neighborhoods", "neighborhood crime rate city fbi"),
    ("Arrests by race", "Every FBI arrest category, including fraud and embezzlement", "census.html#arrests-by-race", "fraud embezzlement forgery white collar drug dui arrest race"),
    ("Victim and offender", "Murder victim race by offender race", "census.html#murder-pairs", "murder victim offender race ethnicity homicide"),
    ("Sexual assault by neighborhood", "City rape rates on a street map", "census.html#sex-neighborhoods", "rape neighborhood sexual assault map reports"),
    ("Sexual assault", "Reported rape and rape arrests", "census.html#sexual-assault", "rape sexual assault arrest race fbi"),
    ("Water", "Drinking water systems", "census.html#water", "epa drinking water violation"),
    ("Health", "Fast-food restaurants", "census.html#health", "restaurant brand neighborhood"),
    ("Neighborhoods", "Fast-food restaurants by neighborhood", "census.html#neighborhoods", "neighborhood restaurant"),
    ("Group Chat", "Messages since November 3, 2026", "chat.html", "social post white house senate house"),
    ("Gallery", "Photographs", "gallery.html", "photo photograph picture unsplash"),
    ("Trivia", "Questions from facts on this site", "play.html", "quiz questions trivia"),
    ("News", "American Scientist, POCIT Weekly, and The Edge", "news.html", "american scientist pocit martha boeckenfeld sigma xi"),
    ("Search", "Find a name or a place", "search.html", ""),
]
TITLE_RE = re.compile(r"<title>([^<]*)</title>")
HEADING_OR_ARTICLE = re.compile(
    r"<h2>([\s\S]*?)</h2>|<h3>([\s\S]*?)</h3>|<article id=\"([^\"]+)\" class=\"candidate\b[\s\S]*?</article>"
)
H3_RE = re.compile(r"<h3[^>]*>([^<]+)</h3>")
PILL_RE = re.compile(r'<span class="pill[^"]*">([^<]*)</span>')
COPY_RE = re.compile(r'<p class="(?:role|bio)">([\s\S]*?)</p>|<li>([\s\S]*?)</li>')
TAG_RE = re.compile(r"<[^>]+>")
AVATAR_RE = re.compile(r'<img class="avatar" src="([^"]+)"')
LETTER_RE = re.compile(r'data-letter="([^"])"|<div class="avatar mono"[^>]*>\s*([^<])')


def state_href(code):
    if code == "IL":
        return "illinois.html"
    return code.lower() + ".html"


def clean(text):
    text = html.unescape(TAG_RE.sub(" ", text or ""))
    return " ".join(text.split())


def skip_name(name):
    folded = clean(name).lower()
    return (not folded) or folded.startswith("total write") or folded in {"yes", "no", "for", "against"}


class Index:
    def __init__(self):
        self.rows = []
        self.seen = set()
        self.files = {}
        self.dropped = []

    def text(self, rel):
        rel = rel.split("#", 1)[0]
        if rel not in self.files:
            path = os.path.join(ROOT, rel.replace("/", os.sep))
            if os.path.isfile(path):
                self.files[rel] = open(path, encoding="utf-8").read()
            else:
                self.files[rel] = None
        return self.files[rel]

    def anchor_ok(self, page, anchor, body):
        # Census states and counties are chosen from the hash, not from an id.
        # Chemical hashes are opened by water.js and health.js after the files load.
        if page == "chat.html" and re.fullmatch(r"c[0-9a-f]+", anchor):
            return True
        # A president hash opens that person's contact card after the page loads.
        if page == "house.html" and re.fullmatch(r"president-[A-Za-z0-9]+", anchor):
            return True
        if page == "census.html" and (
            re.fullmatch(r"[A-Z]{2}(?:\.\d+)?", anchor)
            or re.fullmatch(r"chem-\d+-(?:mcl|tt|mrdl)", anchor)
            or re.fullmatch(r"food-[A-Za-z0-9]+", anchor)
            or re.fullmatch(r"hood-\d+", anchor)
        ):
            return True
        return ('id="%s"' % anchor) in body

    def extend(self, name, href, extra):
        extra = clean(extra)
        if not extra:
            return
        folded = name.lower()
        for row in self.rows:
            if row[2] != href or row[0].lower() != folded:
                continue
            current = row[4] if len(row) > 4 else ""
            merged = clean((current + " " + extra).strip())[:8000]
            if not merged or merged.lower() == folded:
                return
            if len(row) == 4:
                row.append(merged)
            else:
                row[4] = merged
            return

    def extend_page(self, href, extra):
        targets = [row for row in self.rows if row[2] == href]
        if len(targets) != 1:
            return False
        self.extend(targets[0][0], href, extra)
        return True

    def add(self, name, detail, href, rank, extra="", portrait=""):
        name = clean(name)
        detail = clean(detail)
        href = (href or "").replace("\\", "/")
        extra = clean(extra)[:8000]
        portrait = portrait_src(portrait)
        if not name or not href or skip_name(name):
            return
        key = (name.lower(), href)
        if key in self.seen:
            self.extend(name, href, extra)
            return
        page = href.split("#", 1)[0]
        anchor = href.split("#", 1)[1] if "#" in href else ""
        body = self.text(page)
        if body is None:
            self.dropped.append(href)
            return
        if anchor and not self.anchor_ok(page, anchor, body):
            self.dropped.append(href)
            return
        self.seen.add(key)
        row = [name, detail, href, rank]
        if extra and extra.lower() != name.lower():
            row.append(extra)
        elif portrait:
            row.append("")
        if portrait:
            row.append(portrait)
        self.rows.append(row)


def load_json(path):
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def guide_text(guide, name, district=None):
    people = guide.get("people") or {}
    folded = " ".join(name.lower().split())
    keys = []
    if district:
        keys.append(" ".join(district.lower().split()) + "|" + folded)
    keys.append(folded)
    for key in keys:
        hit = people.get(key)
        if isinstance(hit, dict):
            parts = [hit.get("role") or "", hit.get("bio") or ""]
            parts.extend(item for item in (hit.get("issues") or []) if isinstance(item, str))
            return clean(" ".join(parts))
    return ""


def portrait_src(url):
    url = html.unescape(url or "").strip()
    local = url.startswith("photos/") and ".." not in url
    nbc = (
        url.startswith("https://media-cldnry.s-nbcnews.com/")
        and "candidate_fallback" not in url
        and "undefined" not in url
        and "generated_" not in url.lower()
    )
    if local or nbc:
        return url
    if len(url) == 1:
        return url.upper()
    return ""


def portrait_from(block, name):
    image = AVATAR_RE.search(block)
    if image:
        url = portrait_src(image.group(1))
        if url:
            return url
    letter = LETTER_RE.search(block)
    if letter:
        return (letter.group(1) or letter.group(2) or "").upper()
    return (clean(name)[:1] or "?").upper()


def add_person(index, name, office, state_name, party, href, extra, portrait=""):
    detail = " · ".join(part for part in (office, state_name, party) if part)
    index.add(name, detail, href, 1, extra, portrait)


def add_state_pages(index):
    national = load_json(os.path.join(ROOT, "preview", "national.json"))
    guides = os.path.join(ROOT, "guides")
    for item in national.get("states") or []:
        code = item.get("code") or ""
        state_name = item.get("name") or code
        href = state_href(code)
        path = os.path.join(ROOT, href)
        if not code or not os.path.isfile(path):
            continue
        index.add(state_name, "Voter guide", href, 2)
        guide_path = os.path.join(guides, code.lower() + ".json")
        guide = load_json(guide_path) if os.path.isfile(guide_path) else {}
        page = open(path, encoding="utf-8").read()
        office = ""
        district = ""
        for match in HEADING_OR_ARTICLE.finditer(page):
            if match.group(1):
                office = clean(match.group(1)).rstrip(".")
                district = ""
                continue
            if match.group(2):
                heading = clean(match.group(2))
                if heading.lower().startswith("district"):
                    district = heading
                continue
            block = match.group(0)
            name_match = H3_RE.search(block)
            if not name_match:
                continue
            pill = PILL_RE.search(block)
            party = clean(pill.group(1)) if pill else ""
            snippets = []
            for role, line in COPY_RE.findall(block):
                snippets.append(role or line)
            person = clean(name_match.group(1))
            label = (district + " · " + office) if district else office
            extra = (clean(" ".join(snippets)) or guide_text(guide, person, district))[:2000]
            add_person(
                index,
                person,
                label,
                state_name,
                party,
                href + "#" + match.group(3),
                extra,
                portrait_from(block, person),
            )


def add_pages(index):
    for name, detail, href, extra in PAGES:
        index.add(name, detail, href, 0, extra)


def add_countries(index):
    for code, country in sorted(COUNTRY.items()):
        index.add(country, "Election", code + "/index.html", 2)
        result_path = os.path.join(ROOT, code, "results.json")
        if not os.path.isfile(result_path):
            continue
        data = load_json(result_path)
        kind = PLACE.get(code, "Place")
        catalog = {}
        catalog_path = os.path.join(ROOT, code, "catalog.json")
        if os.path.isfile(catalog_path):
            for item in load_json(catalog_path):
                if item.get("slug"):
                    catalog[item["slug"]] = item.get("province") or ""
        for place in data.get("places") or []:
            slug = place.get("slug") or ""
            fallback = place.get("name") or place.get("label") or ""
            href = "%s/m/%s.html" % (code, slug)
            page_path = os.path.join(ROOT, href.replace("/", os.sep))
            if not slug or not os.path.isfile(page_path):
                continue
            name = fallback
            head = open(page_path, encoding="utf-8").read(600)
            title = TITLE_RE.search(head)
            if title and " · " in title.group(1):
                name = html.unescape(title.group(1)).split(" · ", 1)[1].split(",")[0].strip() or fallback
            province = catalog.get(slug) or place.get("province") or ""
            detail = " · ".join(part for part in (kind, province, country) if part)
            index.add(name, detail, href, 3)
        for table in data.get("tables") or []:
            title = table.get("title") or "Reported total"
            for row in table.get("rows") or []:
                person = row.get("name") or ""
                if person.strip().lower() == country.lower():
                    continue
                index.add(person, title + " · " + country, code + "/index.html", 1, title)


def add_census(index):
    path = os.path.join(ROOT, "census", "us.json")
    if not os.path.isfile(path):
        return
    data = load_json(path)
    for state in data.get("states") or []:
        code = state.get("code") or ""
        name = state.get("name") or code
        if not code:
            continue
        index.add(name, "Census", "census.html#" + code, 3)
        for row in (data.get("counties") or {}).get(state.get("fips"), []):
            if len(row) < 2 or not row[0] or not row[1]:
                continue
            index.add(row[1], "Census · " + name, "census.html#%s.%s" % (code, row[0]), 4)


def add_neighborhoods(index):
    """Each neighborhood the census page lists, with the sentence that page shows."""
    path = os.path.join(ROOT, "census", "neighborhoods.json")
    if not os.path.isfile(path):
        return
    for number, area in enumerate(load_json(path).get("areas") or []):
        name = area.get("name") or ""
        city = area.get("city") or ""
        state = area.get("state") or ""
        count = area.get("n") or 0
        if not name or not count:
            continue
        place = name + ", " + city if city and city != name else name
        if state:
            place = place + ", " + state
        where = ", ".join(part for part in (city if city != name else "", state) if part)
        detail = "Neighborhood" + (" · " + where if where else "")
        sentence = "%s has %s tagged restaurants within 2 kilometers of that name." % (place, f"{int(count):,}")
        index.add(name, detail, "census.html#hood-%d" % number, 5, sentence)


class PassageParser(HTMLParser):
    """Visible sentences in <main>, outside candidate articles and controls."""

    skip_tags = {"script", "style", "svg", "noscript", "button", "form", "select", "option", "label"}
    text_tags = {"p", "li", "h1", "h2", "h3"}
    void_tags = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.main = 0
        self.article = 0
        self.section = ""
        self.capture_tag = ""
        self.buf = []
        self.blocks = []
        self.cells = None
        self.cell = None
        self.table_rows = []

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        attr = {key: value or "" for key, value in attrs}
        if self.skip:
            if tag not in self.void_tags:
                self.skip += 1
            return
        if tag in self.skip_tags:
            self.skip = 1
            return
        if tag == "main":
            self.main += 1
            return
        if not self.main or self.article:
            if tag == "article" and "candidate" in attr.get("class", "") and self.main:
                self.article += 1
            return
        if tag == "article" and "candidate" in attr.get("class", ""):
            self.article += 1
            return
        if tag == "section" and attr.get("id"):
            self.section = attr["id"]
        if tag == "tr":
            self.cells = []
        elif tag in {"td", "th"}:
            self.cell = []
            self.cell_tag = tag
        elif tag in self.text_tags:
            self.capture_tag = tag
            self.buf = []

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in self.void_tags:
            return
        if self.skip:
            self.skip -= 1
            return
        if tag == "main" and self.main:
            self.main -= 1
            return
        if not self.main:
            return
        if tag == "article" and self.article:
            self.article -= 1
            return
        if self.article:
            return
        if tag == self.capture_tag:
            text = clean("".join(self.buf))
            if text:
                self.blocks.append((self.section, tag, text))
            self.capture_tag = ""
            self.buf = []
        if tag in {"td", "th"} and self.cell is not None and self.cells is not None:
            self.cells.append((self.cell_tag, clean("".join(self.cell))))
            self.cell = None
        if tag == "tr" and self.cells is not None:
            if len(self.cells) >= 2 and self.cells[0][0] == "td" and self.cells[0][1]:
                rest = clean(" ".join(text for _, text in self.cells[1:]))
                if rest:
                    self.table_rows.append((self.section, self.cells[0][1], rest))
            self.cells = None

    def handle_data(self, data):
        if self.skip or not self.main or self.article:
            return
        if self.capture_tag:
            self.buf.append(data)
        if self.cell is not None:
            self.cell.append(data)


def state_names():
    path = os.path.join(ROOT, "preview", "national.json")
    names = {}
    if not os.path.isfile(path):
        return names
    for item in load_json(path).get("states") or []:
        code = item.get("code") or ""
        if code:
            names[state_href(code)] = item.get("name") or code
    return names


def content_pages():
    pages = [name for name in sorted(os.listdir(ROOT)) if name.endswith(".html")]
    for code in sorted(COUNTRY):
        rel = code + "/index.html"
        if os.path.isfile(os.path.join(ROOT, rel.replace("/", os.sep))):
            pages.append(rel)
    return pages


def passage_detail(rel, states):
    if rel == "census.html":
        return "Census"
    if rel == "news.html":
        return "News"
    if rel in states:
        return states[rel]
    if "/" in rel:
        return COUNTRY.get(rel.split("/", 1)[0], "On this page")
    return "On this page"


def add_passages(index):
    states = state_names()
    for rel in content_pages():
        body = index.text(rel)
        if not body:
            continue
        parser = PassageParser()
        parser.feed(body)
        groups = {}
        order = []
        for section, tag, text in parser.blocks:
            if section not in groups:
                groups[section] = []
                order.append(section)
            groups[section].append((tag, text))
        detail = passage_detail(rel, states)
        rank = 2 if rel in states else 0
        for section in order:
            items = groups[section]
            prose = clean(" ".join(text for _, text in items))
            headings = [text for tag, text in items if tag in {"h1", "h2"} and len(text) <= 80]
            href = rel + ("#" + section if section else "")
            if not section:
                if not index.extend_page(rel, prose) and headings and len(prose) >= 40:
                    index.add(headings[0], detail, rel, rank, prose)
                continue
            if headings and len(prose) >= 40:
                index.add(headings[0], detail, href, rank, prose)
        for section, name, rest in parser.table_rows:
            if section and 3 <= len(name) <= 80 and len(rest) >= 40:
                index.add(name, detail, rel + "#" + section, rank, rest)


def js_unescape(value):
    return value.replace("\\n", " ").replace("\\'", "'").replace('\\"', '"')


def js_fields(body, keys):
    parts = []
    for key in keys:
        for found in re.findall(r"\b%s:\s*\"((?:\\.|[^\"\\])*)\"" % key, body):
            parts.append(js_unescape(found))
    return clean(" ".join(parts))


def js_object(text, marker):
    start = text.find(marker)
    if start < 0:
        return ""
    end = text.find("\n  };", start)
    if end < 0:
        return ""
    return text[start:end]


def add_water_text(index):
    path = os.path.join(ROOT, "water.js")
    if not os.path.isfile(path):
        return
    block = js_object(open(path, encoding="utf-8").read(), "var CHEM = {")
    for match in re.finditer(r"\"(\d+)\|(mcl|tt|mrdl)\"\s*:\s*\{(.*?)\n    \}", block, re.S):
        code, kind, body = match.group(1), match.group(2), match.group(3)
        name = js_fields(body, ("name",))
        extra = js_fields(body, ("effect", "goal"))
        if name and extra:
            index.add(name, "Drinking water · Census", "census.html#chem-%s-%s" % (code, kind), 0, extra)


def chat_key(name):
    chars = []
    for char in (name or "").lower():
        if char.isalnum():
            chars.append(char)
        elif char.isspace() or char in "-'’":
            chars.append(" ")
    return " ".join("".join(chars).split())


def chat_id(value):
    n = 0
    encoded = (value or "").encode("utf-16-le")
    for index in range(0, len(encoded), 2):
        unit = encoded[index] + (encoded[index + 1] << 8)
        n = (n * 33 + unit) & 0xFFFFFFFF
    return "c%x" % n


def chat_since(value):
    return isinstance(value, str) and len(value) >= 10 and value[:10] >= "2026-11-03"


def add_presidents(index):
    path = os.path.join(ROOT, "congress", "presidents.json")
    if not os.path.isfile(path):
        return
    payload = load_json(path)
    for person in payload.get("people") or []:
        name = person.get("name") or ""
        line = person.get("line") or ""
        photo = person.get("photo") or (name[:1] or "?")
        ident = person.get("id") or ""
        href = "house.html#president-" + ident if ident else "house.html#presidents"
        index.add(name, "President · The House", href, 1, line, photo)


def add_chat(index):
    messages_path = os.path.join(ROOT, "chat", "messages.json")
    posts_path = os.path.join(ROOT, "chat", "posts.json")
    official_path = os.path.join(ROOT, "chat", "official.json")
    if not (os.path.isfile(messages_path) and os.path.isfile(posts_path) and os.path.isfile(official_path)):
        return
    messages = load_json(messages_path)
    posts = load_json(posts_path).get("people") or {}
    official = load_json(official_path)
    roster = {}
    for state in messages.get("states") or []:
        code = state.get("code") or ""
        for person in state.get("people") or []:
            roster[code + "|" + chat_key(person.get("name"))] = (person, state)

    def emit(name, detail, url, text, portrait):
        text = clean(text)
        if not name or not text:
            return
        token = url if isinstance(url, str) and url.startswith("https://") else text
        index.add(name, detail, "chat.html#" + chat_id(token), 6, text, portrait)

    for ident, bucket in posts.items():
        person, state = roster.get(ident) or (None, None)
        if not person:
            continue
        name = person.get("name") or ""
        bits = ["Group Chat", state.get("name") or ""]
        if person.get("office"):
            bits.append(person.get("office"))
        detail = " · ".join(part for part in bits if part)
        photo = person.get("photo") or ""
        for post in bucket.get("posts") or []:
            if not chat_since(post.get("at")):
                continue
            context = (post.get("context") or {}).get("text") or ""
            emit(name, detail, post.get("url") or "", " ".join(part for part in (post.get("text") or "", context) if part), photo)

    records = official.get("people") or {}
    for ident, rows in records.items():
        person, state = roster.get(ident) or (None, None)
        if not person:
            continue
        name = person.get("name") or ""
        bits = ["Group Chat", state.get("name") or ""]
        if person.get("office"):
            bits.append(person.get("office"))
        detail = " · ".join(part for part in bits if part)
        for row in rows or []:
            if not chat_since(row.get("at")):
                continue
            emit(name, detail, row.get("url") or "", row.get("text") or "", person.get("photo") or "")

    for row in official.get("whitehouse") or []:
        if not chat_since(row.get("at")):
            continue
        emit("White House", "Group Chat · White House", row.get("url") or "", row.get("text") or "", "photos/white-house.jpg")
    for row in official.get("floor") or []:
        if not chat_since(row.get("at")):
            continue
        emit("House floor", "Group Chat · House floor", row.get("url") or "", row.get("text") or "", "H")


def add_news(index):
    body = index.text("news.html")
    if not body:
        return
    stories = {}
    for ident, block in re.findall(r'<article class="story[^"]*"[^>]*\bid="([^"]+)"[^>]*>(.*?)</article>', body, re.S):
        heading = re.search(r"<h3>(.*?)</h3>", block, re.S)
        if not heading:
            continue
        name = clean(heading.group(1)).rstrip(".")
        label = name.split(".")[0].strip()
        tag = re.search(r'<p class="tag">([^<]*)</p>', block)
        detail = ((clean(tag.group(1)) + " · News") if tag else "News")
        bits = []
        for paragraph in re.findall(r"<p(?![^>]*class=\"(?:tag|when|src)\")[^>]*>(.*?)</p>", block, re.S):
            text = clean(paragraph)
            if text and text != name:
                bits.append(text)
        stories.setdefault(label, ident)
        index.add(name, detail, "news.html#" + ident, 2, " ".join(bits))
    path = os.path.join(ROOT, "news", "researchers.js")
    if not os.path.isfile(path):
        return
    raw = open(path, encoding="utf-8").read()
    start = raw.find("{")
    end = raw.rfind("}")
    if start < 0 or end < start:
        return
    data = json.loads(raw[start:end + 1])
    for label, issue in data.items():
        ident = stories.get(label)
        if not ident:
            continue
        href = "news.html#" + ident
        for piece in issue.get("pieces") or []:
            title = piece.get("title") or ""
            page = piece.get("page")
            for author in piece.get("authors") or []:
                person = author.get("name") or ""
                note = author.get("bio") or ""
                where = title
                if page:
                    where = "%s, page %s" % (title, page)
                extra = clean(" ".join(part for part in (where, note) if part))
                letter = (clean(person)[:1] or "?").upper()
                index.add(person, "American Scientist · News", href, 1, extra, letter)


def add_health_text(index):
    path = os.path.join(ROOT, "health.js")
    if not os.path.isfile(path):
        return
    text = open(path, encoding="utf-8").read()
    harms = {}
    harm_block = js_object(text, "var HARM_LINE = {")
    for key, sentence in re.findall(r"\n    ([A-Za-z0-9]+):\s*\"((?:\\.|[^\"\\])*)\"", harm_block):
        harms[key] = js_unescape(sentence)
    block = js_object(text, "var CHEM = {")
    for match in re.finditer(r"\n    ([A-Za-z0-9]+):\s*\{(.*?)\n    \}", block, re.S):
        key, body = match.group(1), match.group(2)
        extra = clean(" ".join(part for part in (harms.get(key, ""), js_fields(body, ("finding", "body", "chains"))) if part))
        if extra:
            index.add(key, "Fast food · Census", "census.html#food-" + key, 0, extra)


def main():
    index = Index()
    add_pages(index)
    add_state_pages(index)
    add_countries(index)
    add_census(index)
    add_neighborhoods(index)
    add_passages(index)
    add_water_text(index)
    add_health_text(index)
    add_presidents(index)
    add_chat(index)
    add_news(index)
    index.rows.sort(key=lambda row: (row[3], row[0].lower(), row[2]))
    payload = json.dumps({"items": index.rows}, ensure_ascii=False, separators=(",", ":"))
    with open(OUT, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(payload)
        handle.write("\n")
    ranks = {}
    photos = 0
    letters = 0
    for row in index.rows:
        ranks[row[3]] = ranks.get(row[3], 0) + 1
        if len(row) > 5 and row[5]:
            if len(row[5]) == 1:
                letters += 1
            else:
                photos += 1
    print(
        "search",
        len(index.rows),
        "bytes",
        os.path.getsize(OUT),
        "photos",
        photos,
        "letters",
        letters,
        "ranks",
        ranks,
        "dropped",
        len(index.dropped),
    )
    for href in index.dropped[:20]:
        print(" dropped", href)
    return index


if __name__ == "__main__":
    main()
