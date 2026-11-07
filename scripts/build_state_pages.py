"""Write a page for every state from the NBC results feed.

Illinois keeps illinois.html, the researched guide. Other pages list the offices,
names, parties, and photos that feed is publishing, plus a sample ballot and the
county results map. Issue text is not invented.
"""
import html
import json
import os
import re
from datetime import datetime, timedelta, timezone

import seo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREVIEW = os.path.join(ROOT, "preview")

PARTY = {
    "gop": ("Republican", "r"),
    "dem": ("Democratic", "d"),
    "ind": ("Independent", "i"),
    "lib": ("Libertarian", "o"),
    "other": ("Other", "o"),
}


def esc(text):
    return html.escape(text or "", quote=True)


def office_id(text):
    chars = []
    for char in (text or "").lower():
        if char.isalnum():
            chars.append(char)
        elif char in " -":
            chars.append("-")
    slug = "".join(chars).strip("-")
    return slug or "race"


def candidate_id(prefix, name):
    return office_id(prefix) + "-" + office_id(name)


def polls_closed(races, now=None):
    """True after the latest close time NBC published for this state.

    'Begin closing' means the first polls close then, so those states get one
    more hour before this page treats the polls as closed.
    """
    now = now or datetime.now(timezone.utc)
    et = timezone(timedelta(hours=-5))
    closes = []
    for race in races or []:
        text = race.get("pollsClose") or ""
        match = re.search(r"(\d{1,2})(?::(\d{2}))?\s*(AM|PM)", text, re.I)
        if not match:
            continue
        hour = int(match.group(1))
        minute = int(match.group(2) or 0)
        if match.group(3).upper() == "PM" and hour != 12:
            hour += 12
        if match.group(3).upper() == "AM" and hour == 12:
            hour = 0
        close = datetime(2026, 11, 3, hour, minute, tzinfo=et)
        if "begin closing" in text.lower():
            close += timedelta(hours=1)
        closes.append(close.astimezone(timezone.utc))
    if not closes:
        return now >= datetime(2026, 11, 4, 12, tzinfo=timezone.utc)
    return now >= max(closes)


def party_of(code):
    return PARTY.get(code or "", ((code or "").upper(), "o"))


def norm(name):
    return " ".join((name or "").lower().split())


def valid_url(url):
    return (
        isinstance(url, str)
        and (url.startswith("https://") or url.startswith("http://"))
        and "generated_" not in url.lower()
    )


def load_guide(code):
    path = os.path.join(ROOT, "guides", code.lower() + ".json")
    if not os.path.exists(path):
        return {}
    try:
        data = json.load(open(path, encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def person_info(guide, person, district=None):
    people = guide.get("people") or {}
    name = norm(person.get("name"))
    if district:
        hit = people.get(norm(district) + "|" + name)
        if isinstance(hit, dict):
            return hit
    hit = people.get(name)
    return hit if isinstance(hit, dict) else {}


def is_writein(person):
    return (person.get("name") or "").lower().startswith("total write")


def load_found():
    path = os.path.join(ROOT, "photos", "found.json")
    try:
        data = json.load(open(path, encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


FOUND = load_found()


def with_found(code, person):
    if not FOUND:
        return person
    url = FOUND.get((code or "").lower() + "|" + norm(person.get("name")))
    if not url or not url.startswith("photos/") or ".." in url:
        return person
    if person.get("photo") == url:
        return person
    copy = dict(person)
    copy["photo"] = url
    return copy


def photo(person, compact):
    url = person.get("photo") or ""
    letter = ((person.get("name") or "?").strip()[:1] or "?").upper()
    local = url.startswith("photos/") and ".." not in url
    nbc = (
        url.startswith("https://media-cldnry.s-nbcnews.com/")
        and "candidate_fallback" not in url
        and "undefined" not in url
        and "generated_" not in url.lower()
    )
    if local or nbc:
        return (
            '<img class="avatar" src="%s" alt="" data-letter="%s" '
            'onerror="this.outerHTML=\'<div class=&quot;avatar mono&quot; aria-hidden=&quot;true&quot;>\'+this.dataset.letter+\'</div>\'">'
        ) % (esc(url), esc(letter))
    return '<div class="avatar mono" aria-hidden="true">%s</div>' % esc(letter)


def person_row(person, compact, guide, district=None, anchor=""):
    info = person_info(guide, person, district)
    issues = [item.strip() for item in (info.get("issues") or []) if isinstance(item, str) and item.strip()][:4]
    bio = (info.get("bio") or "").strip()
    role = (info.get("role") or "").strip()
    site = info.get("site") if valid_url(info.get("site")) else ""
    donate = info.get("donate") if valid_url(info.get("donate")) else ""
    rich = bool(issues or bio or role or site or donate)
    use_compact = compact and not rich
    label, kind = party_of(person.get("party"))
    chip = ""
    if person.get("party") not in ("yes", "no"):
        chip = '<span class="pill %s">%s</span>' % (kind, esc(label))
    bits = ['<div class="who"><h3 class="notranslate" translate="no">%s</h3>%s</div>' % (esc(person.get("name")), chip)]
    if role:
        bits.append('<p class="role">%s</p>' % esc(role))
    if bio:
        bits.append('<p class="bio">%s</p>' % esc(bio))
    if issues:
        bits.append("<ul>%s</ul>" % "".join("<li>%s</li>" % esc(item) for item in issues))
    elif not use_compact:
        bits.append('<p class="role">No 2026 issue list was found for this candidate.</p>')
    links = []
    if site:
        host = site.split("/")[2].replace("www.", "")
        links.append('<a href="%s" target="_blank" rel="noopener noreferrer">%s</a>' % (esc(site), esc((info.get("siteLabel") or host))))
    if donate:
        links.append('<a href="%s" target="_blank" rel="noopener noreferrer">Donate</a>' % esc(donate))
    if links:
        bits.append('<p class="links">%s</p>' % " · ".join(links))
    ident = (' id="%s"' % esc(anchor)) if anchor else ""
    return (
        '<article class="candidate%s"%s>' % (" compact" if use_compact else "", ident)
        + photo(person, use_compact)
        + "<div>%s</div></article>" % "".join(bits)
    )


def choice(person):
    if is_writein(person):
        return '<button type="button" class="choice" aria-pressed="false"><span class="oval" aria-hidden="true"></span><span class="notranslate" translate="no" data-phrase="writein">Write-in</span></button>'
    label, kind = party_of(person.get("party"))
    chip = ""
    if person.get("party") not in ("yes", "no"):
        chip = '<span class="pill %s">%s</span>' % (kind, esc(label))
    return (
        '<button type="button" class="choice" aria-pressed="false"><span class="oval" aria-hidden="true"></span><span class="notranslate" translate="no">%s</span>%s</button>'
        % (esc(person.get("name")), chip)
    )


def contest(race):
    people = race.get("candidates") or []
    if race.get("kind") == "house":
        return ""
    kind = "measure" if race.get("kind") == "measure" else "race"
    rows = "\n".join(choice(person) for person in people)
    title = esc((race.get("office") or "").replace(" Of ", " of "))
    return '<div class="contest" data-kind="%s"><h3>%s</h3>\n%s</div>' % (kind, title, rows)


LANG = """
        <span class="visually-hidden">Language</span>
        <select id="lang" class="visually-hidden" aria-hidden="true" tabindex="-1">
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="zh-CN">中文</option>
          <option value="pl">Polski</option>
          <option value="hi">हिन्दी</option>
          <option value="ko">한국어</option>
          <option value="tl">Tagalog</option>
          <option value="ar">العربية</option>
          <option value="ur">اردو</option>
          <option value="uk">Українська</option>
          <option value="vi">Tiếng Việt</option>
          <option value="fr">Français</option>
        </select>
        <button type="button" class="lang-button" aria-haspopup="listbox" aria-expanded="false" aria-controls="lang-list">English</button>
        <ul id="lang-list" class="lang-menu" role="listbox" aria-label="Translate this page" hidden>
          <li role="none"><button type="button" role="option" data-lang="en" aria-selected="true">English</button></li>
          <li role="none"><button type="button" role="option" data-lang="es">Español</button></li>
          <li role="none"><button type="button" role="option" data-lang="zh-CN">中文</button></li>
          <li role="none"><button type="button" role="option" data-lang="pl">Polski</button></li>
          <li role="none"><button type="button" role="option" data-lang="hi">हिन्दी</button></li>
          <li role="none"><button type="button" role="option" data-lang="ko">한국어</button></li>
          <li role="none"><button type="button" role="option" data-lang="tl">Tagalog</button></li>
          <li role="none"><button type="button" role="option" data-lang="ar">العربية</button></li>
          <li role="none"><button type="button" role="option" data-lang="ur">اردو</button></li>
          <li role="none"><button type="button" role="option" data-lang="uk">Українська</button></li>
          <li role="none"><button type="button" role="option" data-lang="vi">Tiếng Việt</button></li>
          <li role="none"><button type="button" role="option" data-lang="fr">Français</button></li>
        </ul>
"""


def here(code, label):
    src = "flags/%s.svg" % esc(code)
    if code == "al":
        src += "?v=2"
    return '<p class="here notranslate" translate="no"><img src="%s" alt=""><span>%s</span></p>' % (src, esc(label))


def header(title_nav, code, label):
    extra = ("\n      " + title_nav) if title_nav else ""
    return """<header>
  <div class="wrap bar">
    <div class="bar-top">
      <a class="brand notranslate" href="index.html" translate="no">Leaders.vote</a>
      <div class="lang notranslate" translate="no">%s</div>
    </div>
    %s
    <nav>
      <a href="index.html">All states</a>
      <a href="countries.html">Countries</a>%s
    </nav>
  </div>
</header>""" % (LANG, here(code, label), extra)


def footer(state_name, guide):
    source = guide.get("ballotSource") if valid_url(guide.get("ballotSource")) else ""
    if source:
        names = (
            'Statewide names were compared with <a href="%s" target="_blank" rel="noopener noreferrer">this state candidate list</a>. '
            "Photos are the ones NBC News is publishing. An issue line is added only from a candidate's own site."
        ) % esc(source)
    else:
        names = (
            "Names, parties, and photos on this page are the ones NBC News is publishing from Associated Press totals. "
            "They have not been checked against this state's printed ballot. An issue list is added only from a candidate's own words."
        )
    return """<footer>
  <div class="wrap">
    <p>Leaders.vote is an independent voter guide for the November 3, 2026 general election. It is not a campaign, not an endorsement, and not a site of any state or election authority. This page is %s.</p>
    <p>%s</p>
  </div>
</footer>
<div id="google_translate_element" aria-hidden="true"></div>
<script src="lang.js"></script>
<script src="live.js?v=16"></script>
<script src="state.js?v=blend2"></script>
</body>
</html>
""" % (esc(state_name), names)


PLACEHOLDER_ZIP = {
    "AL": "36104", "AK": "99801", "AZ": "85007", "AR": "72201", "CA": "95814",
    "CO": "80203", "CT": "06106", "DE": "19901", "DC": "20001", "FL": "32301",
    "GA": "30334", "HI": "96813", "ID": "83702", "IN": "46204", "IA": "50319",
    "KS": "66612", "KY": "40601", "LA": "70802", "ME": "04330", "MD": "21401",
    "MA": "02133", "MI": "48933", "MN": "55102", "MS": "39201", "MO": "65101",
    "MT": "59601", "NE": "68508", "NV": "89701", "NH": "03301", "NJ": "08608",
    "NM": "87501", "NY": "12207", "NC": "27601", "ND": "58501", "OH": "43215",
    "OK": "73102", "OR": "97301", "PA": "17101", "RI": "02903", "SC": "29201",
    "SD": "57501", "TN": "37243", "TX": "78701", "UT": "84114", "VT": "05602",
    "VA": "23219", "WA": "98501", "WV": "25301", "WI": "53703", "WY": "82001",
}


def address_form(data, guide):
    where = guide.get("where") if isinstance(guide.get("where"), dict) else {}
    url = where.get("url") if valid_url(where.get("url")) else ""
    label = (where.get("label") or "Election office lookup").strip()
    placeholder = PLACEHOLDER_ZIP.get(data.get("code") or "", "")
    lookup = (' data-lookup="%s" data-lookup-label="%s"' % (esc(url), esc(label))) if url else ""
    hint = (' placeholder="%s"' % esc(placeholder)) if placeholder else ""
    return """<div class="finder where" id="where">
      <p class="kicker">Where to vote</p>
      <h2>Find your polling place.</h2>
      <p class="zip-note">Election Day is Tuesday, November 3. A polling place comes from the home address. Type the street number, street name, and ZIP here. This page does not keep them. The election office lookup is the list for that address.</p>
      <form id="where-form"%s>
        <div>
          <label for="where-number">Street number</label>
          <input id="where-number" class="num" name="number" autocomplete="off" required>
        </div>
        <div>
          <label for="where-street">Street name</label>
          <input id="where-street" class="street" name="street" autocomplete="off" required>
        </div>
        <div>
          <label for="where-zip">ZIP code</label>
          <input id="where-zip" name="zip" inputmode="numeric" autocomplete="postal-code" maxlength="5"%s required>
        </div>
        <button type="submit">Find this address</button>
      </form>
      <div id="where-result" aria-live="polite"></div>
    </div>""" % (lookup, hint)


def office_head(race, guide):
    title = (race.get("office") or "").replace(" Of ", " of ")
    meta = (guide.get("offices") or {}).get(race.get("office")) or (guide.get("offices") or {}).get(title) or {}
    if not isinstance(meta, dict):
        meta = {}
    parts = []
    kicker = (meta.get("kicker") or "").strip()
    job = (meta.get("job") or "").strip()
    if kicker:
        parts.append('<p class="kicker">%s</p>' % esc(kicker))
    parts.append("<h2>%s</h2>" % esc(title))
    if job:
        parts.append('<p class="sub">%s</p>' % esc(job))
    return "".join(parts)


def how_you_vote(data, statewide, measures, house, sheet, house_below=True):
    steps = [
        '<li><button type="button" data-step="mark">Mark one choice on a contest. Next and Back move one contest at a time. This sample puts the mark to the left of a name.</button></li>',
        '<li><button type="button" data-step="order">Party order here is Republican, then Democratic, then any other candidate. Your county may print a different order.</button></li>',
    ]
    if measures:
        steps.append('<li><button type="button" data-step="measure">A measure is a yes or no question. It is not a race between candidates.</button></li>')
    if house:
        where = "farther down this page" if house_below else "with the candidates above"
        steps.append('<li><button type="button" data-step="house">U.S. House depends on your district and is listed %s. This sample does not include it.</button></li>' % where)
    return """<section class="block" id="sample">
    <div class="wrap">
      <p class="kicker">How you vote</p>
      <h2>What the ballot looks like.</h2>
      <p class="sub">This sample lists the statewide contests NBC News is publishing for %s. It is not a precinct ballot.</p>
      <div class="sample-layout">
        <div>
          <ol class="steps" id="sample-steps">
            %s
          </ol>
          <p class="zip-note">The address lookup above opens the election office. A ZIP code alone does not pick a district.</p>
        </div>
        <div>
          <div class="sheet" id="sample-candidates">
            <p class="kicker">Sample ballot · %s · November 3, 2026</p>
            %s
          </div>
          <div class="sheet-move">
            <button type="button" id="contest-back" class="notranslate" translate="no" data-phrase="back">Back</button>
            <p id="sample-status"></p>
            <button type="button" id="contest-next" class="notranslate" translate="no" data-phrase="next">Next</button>
          </div>
        </div>
      </div>
    </div>
  </section>""" % (esc(data["name"]), "\n            ".join(steps), esc(data["name"]), sheet)


def before_you_go(data, guide, statewide, house, house_below=True):
    source = guide.get("ballotSource") if valid_url(guide.get("ballotSource")) else ""
    if source:
        names = (
            "Statewide names were compared with the candidate list linked at the bottom of this page. "
            "Photos are the ones NBC News is publishing. On this site the order is Republican, then Democratic, then any other party. "
            "A printed ballot may use a different order."
        )
    else:
        names = (
            "Names, parties, and photos are the ones NBC News is publishing. They have not been checked against this state's printed ballot. "
            "On this site the order is Republican, then Democratic, then any other party."
        )
    offices = [(race.get("office") or "") for race in statewide]
    choosing = "The sample lists the statewide contests on this page."
    if any(office == "Senate" for office in offices):
        choosing += " U.S. Senate is one seat. The term is six years."
    if house:
        choosing += " U.S. House is one seat in your district and is listed " + ("farther down." if house_below else "with the candidates above.")
    heading = "Statewide contests, then your district." if house else "Statewide contests on this page."
    return """<section class="block" id="read">
    <div class="wrap">
      <p class="kicker">Before you go</p>
      <h2>%s</h2>
      <div class="facts">
        <div class="fact">
          <h3>What to bring</h3>
          <p>Bring what this state's election office requires. The address lookup on this page opens that office. This page does not keep the address.</p>
        </div>
        <div class="fact">
          <h3>How names got here</h3>
          <p>%s</p>
        </div>
        <div class="fact">
          <h3 class="notranslate" translate="no" data-phrase="writeins">Write-ins</h3>
          <p>A write-in counts only if that person filed. This page lists the names being published.</p>
        </div>
        <div class="fact">
          <h3>What you are choosing</h3>
          <p>%s</p>
        </div>
      </div>
    </div>
  </section>""" % (esc(heading), names, esc(choosing))


def page(data):
    guide = load_guide(data.get("code") or "")
    races = data.get("races") or []
    statewide = [race for race in races if race.get("kind") != "house" and race.get("kind") != "measure"]
    measures = [race for race in races if race.get("kind") == "measure"]
    house = next((race for race in races if race.get("kind") == "house"), None)
    close = next((race.get("pollsClose") for race in races if race.get("pollsClose")), "")
    when = (close + ".") if close else "Poll times come from your state election office."
    closed = polls_closed(races)
    office_links = []
    for race in statewide:
        office_links.append('<a href="#%s">%s</a>' % (office_id(race.get("office")), esc(race.get("office", "").replace(" Of ", " of "))))
    if house:
        office_links.append('<a href="#house">U.S. House</a>')
    if measures and not closed:
        office_links.insert(-1 if house else len(office_links), '<a href="#measures">Measures</a>')
    if closed:
        nav = ['<a href="#results">Results</a>'] + office_links + [
            '<a href="#where">Where to vote</a>',
            '<a href="#sample">The ballot</a>',
        ]
        if measures:
            nav.append('<a href="#measures">Measures</a>')
        nav.append('<a href="#read">Before you go</a>')
    else:
        nav = [
            '<a href="#results">Results</a>',
            '<a href="#sample">The ballot</a>',
            '<a href="#read">Before you go</a>',
        ] + office_links + ['<a href="#where">Where to vote</a>']
    cards = []
    for race in statewide:
        people = [with_found(data.get("code"), person) for person in race.get("candidates") or [] if not is_writein(person)]
        body = "\n".join(
            person_row(person, False, guide, anchor=candidate_id(race.get("office"), person.get("name")))
            for person in people
        )
        cards.append(
            '<section class="block" id="%s"><div class="wrap">%s%s</div></section>'
            % (office_id(race.get("office")), office_head(race, guide), body)
        )
    measure_notes = guide.get("measures") if isinstance(guide.get("measures"), dict) else {}
    measure_html = ""
    if measures:
        blocks = []
        for race in measures:
            note = (measure_notes.get(race.get("office")) or "").strip()
            extra = ('<p class="office-note">%s</p>' % esc(note)) if note else ""
            blocks.append("<h3>%s</h3>\n%s%s" % (esc(race.get("office")), extra, "\n".join(choice(person) for person in race.get("candidates") or [])))
        measure_html = (
            '<section class="block" id="measures"><div class="wrap"><h2>Ballot measures.</h2>'
            '<p class="office-note">The title is the one being published for this ballot. This guide adds an explanation only when it comes from the official text.</p>'
            '<div class="sheet">%s</div></div></section>' % "\n".join(blocks)
        )
    house_html = ""
    if house:
        districts = []
        for district in house.get("districts") or []:
            people = [with_found(data.get("code"), person) for person in district.get("candidates") or [] if not is_writein(person)]
            districts.append("<h3>%s</h3>\n%s" % (
                esc(district.get("name")),
                "\n".join(
                    person_row(
                        person, True, guide, district.get("name"),
                        anchor=candidate_id(district.get("name"), person.get("name")),
                    )
                    for person in people
                ),
            ))
        house_html = (
            '<section class="block" id="house"><div class="wrap"><h2>U.S. House.</h2>'
            '<p class="office-note">Every district NBC News is publishing for this state. This list is not filtered to one address. A written note is added only from that candidate\'s own site.</p>%s</div></section>'
            % "\n".join(districts)
        )
    sheet = "\n".join(contest(race) for race in statewide + measures)
    where = address_form(data, guide)
    sample = how_you_vote(data, statewide, measures, house, sheet, house_below=not closed)
    before = before_you_go(data, guide, statewide, house, house_below=not closed)
    if closed:
        lists = "\n".join(part for part in ("\n".join(cards), house_html) if part.strip())
        hero_where = ""
        after_results = "\n".join(part for part in (lists, where, sample, measure_html, before) if part.strip())
    else:
        lists = "\n".join(part for part in ("\n".join(cards), measure_html, house_html) if part.strip())
        hero_where = where
        after_results = "\n".join(part for part in (sample, before, lists) if part.strip())
    links = []
    for race in statewide:
        links.append('<a href="#%s"><strong>%s</strong><span>%s</span></a>' % (
            office_id(race.get("office")),
            esc(race.get("office", "").replace(" Of ", " of ")),
            esc(", ".join(person.get("name") for person in race.get("candidates") or [] if not is_writein(person))),
        ))
    offices = guide.get("offices") if isinstance(guide.get("offices"), dict) else {}
    has_job = any(isinstance(item, dict) and (item.get("job") or "").strip() for item in offices.values())
    deck = (
        "What each office does is on this page. A candidate's priorities are included only when they come from that candidate's own site. This is not an endorsement and not a government site."
        if has_job else
        "Leaders.vote lists the candidates NBC News is publishing for this state. An issue list is added only from a candidate's own site. This is not an endorsement and not a government site."
    )
    return """<!DOCTYPE html>
<html lang="en">
<head>
<script>try{if(localStorage.getItem("leaders-theme")==="dark")document.documentElement.setAttribute("data-theme","dark")}catch(e){}</script>
<script src="theme.js?v=2" defer></script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Leaders.vote · %s, November 3, 2026</title>
<meta name="description" content="Leaders.vote guide to the %s general election on November 3, 2026. Candidates, sample ballot, and unofficial results. Not an endorsement.">
<link rel="icon" href="data:image/svg+xml,%%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%%3E%%3Crect width='32' height='32' fill='%%231c1915'/%%3E%%3Ctext x='16' y='22' text-anchor='middle' font-family='Georgia' font-size='16' fill='%%23f4f0e6'%%3EL%%3C/text%%3E%%3C/svg%%3E">
<link rel="stylesheet" href="guide.css?v=dark2">
</head>
<body data-state="%s">
%s
<main>
  <div class="wrap hero">
    <p id="lang-note" class="lang-note" hidden>Automatic translation. Printed names stay as printed. A translation can change a sentence, so the English page is the record. A street address you type is not sent for translation.</p>
    <p class="kicker">%s · General election · Tuesday, November 3, 2026</p>
    <h1>Know who you're voting for.</h1>
    <p class="deck">%s</p>
    <p class="note deck">Leaders.vote is still collecting candidate information, so some entries currently show only a name.</p>
    <p class="when">%s This page does not call a race.</p>
    %s
    <div class="races">%s</div>
  </div>
  <section class="block" id="results">
    <div class="wrap">
      <p class="kicker">Unofficial · November 3, 2026</p>
      <h2>Results across %s.</h2>
      <p class="sub">Each county is colored by who is ahead there. A blank county has not reported votes. This page does not call a race.</p>
      <div class="result-legend">
        <span><i class="swatch blank"></i> No votes reported</span>
        <span><i class="swatch d"></i> Democratic lead</span>
        <span><i class="swatch r"></i> Republican lead</span>
        <span><i class="swatch o"></i> Another lead</span>
      </div>
      <div class="result-layout">
        <div><div id="state-slot"></div></div>
        <div>
          <div id="result-races" class="sheet-switch" role="group" aria-label="Races"></div>
          <div id="result-summary"></div>
          <label for="result-place">County, parish, or city</label>
          <select id="result-place"><option value="">Statewide totals</option></select>
          <div id="result-detail"></div>
          <p id="result-status" class="note"></p>
        </div>
      </div>
    </div>
  </section>
  %s
</main>
%s""" % (
        esc(data["name"]),
        esc(data["name"]),
        esc(data["code"].lower()),
        header("\n      ".join(nav), data["code"].lower(), data["name"]),
        esc(data["name"]),
        deck,
        esc(when),
        hero_where,
        "\n".join(links),
        esc(data["name"]),
        after_results,
        footer(data["name"], guide),
    )


def index_page(states):
    links = []
    for state in states:
        href = "illinois.html" if state["code"] == "IL" else state["code"].lower() + ".html"
        attrs = ' data-code="%s"' % esc(state["code"])
        links.append('<a href="%s"%s>%s</a>' % (href, attrs, esc(state["name"])))
    return """<!DOCTYPE html>
<html lang="en">
<head>
<script>try{if(localStorage.getItem("leaders-theme")==="dark")document.documentElement.setAttribute("data-theme","dark")}catch(e){}</script>
<script src="theme.js?v=2" defer></script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Know who you're voting for.</title>
<meta name="description" content="Leaders.vote is an independent, nonpartisan voter guide for the November 3, 2026 election. No endorsements.">
<link rel="icon" href="data:image/svg+xml,%%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%%3E%%3Crect width='32' height='32' fill='%%231c1915'/%%3E%%3Ctext x='16' y='22' text-anchor='middle' font-family='Georgia' font-size='16' fill='%%23f4f0e6'%%3EL%%3C/text%%3E%%3C/svg%%3E">
<link rel="stylesheet" href="guide.css?v=dark2">
</head>
<body>
%s
<main>
  <div class="wrap hero">
    <p id="lang-note" class="lang-note" hidden>Automatic translation. Printed names stay as printed. A translation can change a sentence, so the English page is the record.</p>
    <p class="kicker">United States · General election · Tuesday, November 3, 2026</p>
    <h1>Know who you're voting for.</h1>
    <p class="deck">Leaders.vote is an independent, nonpartisan voter guide for the November 3, 2026 election.</p>
    <p class="deck">Select your state to explore candidates, understand the responsibilities of each elected office, and learn about candidates' priorities when published on their official websites.</p>
    <p class="deck">You can also enter your street address to access your state's official election-office lookup. Your address is never stored on Leaders.vote.</p>
    <p class="deck">Independent. Informational. No endorsements. Leaders.vote is not affiliated with any government agency.</p>
    <p class="note deck">Leaders.vote is still collecting candidate information, so some entries currently show only a name.</p>
    <p class="deck">Leaders.vote also follows elections <a href="countries.html">outside the United States</a>. A place on those maps is colored only from reported vote totals.</p>
    <div id="us-slot"></div>
    <p class="sub">Each state is colored by the party ahead in that state's top statewide race. The colors are the same ones used for a county on a state map. A blank state has not reported votes. This map does not call a race.</p>
    <div class="result-legend">
      <span><i class="swatch blank"></i> No votes reported</span>
      <span><i class="swatch d"></i> Democratic lead</span>
      <span><i class="swatch r"></i> Republican lead</span>
      <span><i class="swatch o"></i> Another lead</span>
    </div>
    <p id="us-status" class="note"></p>
    <div class="state-list">%s</div>
  </div>
</main>
<footer>
  <div class="wrap">
    <p>Leaders.vote is an independent voter guide. It is not a campaign, not an endorsement, and not a site of any state or election authority. Campaign links, where a candidate publishes them, go to that candidate. This site does not take contributions.</p>
    <p>A written line is added only from a candidate's own site. Illinois printed names were checked against the State Board of Elections. Names on another state page are compared with that state's candidate list before they are described as checked. Photos outside Illinois come from NBC News and the Associated Press.</p>
  </div>
</footer>
<div id="google_translate_element" aria-hidden="true"></div>
<script src="lang.js"></script>
<script src="live.js?v=16"></script>
<script>
fetch("preview/us.svg").then(function (response) { return response.text(); }).then(function (markup) {
  var start = markup.indexOf("<svg");
  var slot = document.getElementById("us-slot");
  slot.innerHTML = start >= 0 ? markup.slice(start) : "";
  var svg = slot.querySelector("svg");
  if (!svg) return;
  svg.id = "us-map";
  function labelAt(path) {
    var code = path.getAttribute("data-code");
    var best = null;
    (path.getAttribute("d") || "").split(/[Mm]/).forEach(function (part) {
      var nums = part.match(/-?\\d+(?:\\.\\d+)?/g);
      if (!nums || nums.length < 4) return;
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (var i = 0; i + 1 < nums.length; i += 2) {
        var px = +nums[i], py = +nums[i + 1];
        if (px < minX) minX = px;
        if (py < minY) minY = py;
        if (px > maxX) maxX = px;
        if (py > maxY) maxY = py;
      }
      var w = maxX - minX, h = maxY - minY;
      if (w < 1 || h < 1) return;
      var step = Math.max(1.5, Math.min(w, h) / 14);
      var n = 0, sx = 0, sy = 0;
      for (var gy = minY; gy <= maxY; gy += step) {
        for (var gx = minX; gx <= maxX; gx += step) {
          if (path.isPointInFill(new DOMPoint(gx, gy))) { n++; sx += gx; sy += gy; }
        }
      }
      if (!best || n > best.n) best = { n: n, x: n ? sx / n : (minX + maxX) / 2, y: n ? sy / n : (minY + maxY) / 2, w: w, h: h };
    });
    if (!best) return null;
    var size = Math.max(8, Math.min(13, Math.min(best.w, best.h) / 3.2));
    var x = best.x, y = best.y;
    if (code === "MD") { x = 826; y = 231; size = 10; }
    if (code === "DC") { x = 832; y = 245; size = 8; }
    if (code === "RI") { x = 916; y = 174; size = 8; }
    if (code === "FL") { x = 800; y = 500; }
    return { x: x, y: y, size: size };
  }
  svg.querySelectorAll("path").forEach(function (path) {
    var code = path.getAttribute("data-code");
    var spot = labelAt(path);
    if (spot && code) {
      var text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("class", "map-code notranslate");
      text.setAttribute("translate", "no");
      text.setAttribute("data-code", code);
      text.setAttribute("x", spot.x);
      text.setAttribute("y", spot.y);
      text.setAttribute("font-size", spot.size);
      text.textContent = code;
      svg.appendChild(text);
    }
    path.addEventListener("click", function () {
      location.href = code === "IL" ? "illinois.html" : code.toLowerCase() + ".html";
    });
    path.addEventListener("mouseenter", function () {
      clearMark();
      path.classList.add("is-on");
      var link = document.querySelector('.state-list a[data-code="' + code + '"]');
      if (link) link.classList.add("is-on");
    });
    path.addEventListener("mouseleave", clearMark);
  });
  function clearMark() {
    svg.querySelectorAll("path.is-on").forEach(function (node) { node.classList.remove("is-on"); });
    document.querySelectorAll(".state-list a.is-on").forEach(function (node) { node.classList.remove("is-on"); });
  }
  document.querySelectorAll(".state-list a").forEach(function (link) {
    var code = link.getAttribute("data-code");
    function mark() {
      clearMark();
      var path = svg.querySelector('path[data-code="' + code + '"]');
      if (path) path.classList.add("is-on");
      link.classList.add("is-on");
    }
    link.addEventListener("mouseenter", mark);
    link.addEventListener("focus", mark);
    link.addEventListener("mouseleave", clearMark);
    link.addEventListener("blur", clearMark);
  });
  var PARTY = { dem: "#1e4d7b", gop: "#8d3232", ind: "#3e5c45", other: "#5c4a2a" };
  var PARTY_LABEL = { dem: "Democratic", gop: "Republican", ind: "Independent", lib: "Libertarian", other: "Other" };
  var BLEND_LINE = "The color mixes the votes in that state. The swatches are the colors in that mix. Where a state file reports only the lead and the margin, the rest of the vote is blended as the other of Democratic blue and Republican red. A state with no votes stays beige. This does not call a race.";
  var lastLeads = null;
  function blendOn() {
    try { return localStorage.getItem("leaders-blend") !== "0"; }
    catch (error) { return false; }
  }
  function rememberBlend(on) {
    try { localStorage.setItem("leaders-blend", on ? "1" : "0"); }
    catch (error) {}
  }
  function hexChannels(hex) {
    if (!hex || hex.charAt(0) !== "#") return null;
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  }
  function mixColor(parts) {
    var total = 0;
    var acc = [0, 0, 0];
    var i;
    for (i = 0; i < parts.length; i++) {
      var votes = parts[i].votes || 0;
      if (!(votes > 0)) continue;
      var rgb = hexChannels(parts[i].color);
      if (!rgb) return "";
      total += votes;
      acc[0] += rgb[0] * votes;
      acc[1] += rgb[1] * votes;
      acc[2] += rgb[2] * votes;
    }
    if (!(total > 0)) return "";
    return "rgb(" + acc.map(function (channel) { return Math.round(channel / total); }).join(",") + ")";
  }
  function inkDark(color) {
    var nums = String(color).match(/\\d+/g);
    if (!nums || nums.length < 3) return false;
    var y = (0.2126 * +nums[0] + 0.7152 * +nums[1] + 0.0722 * +nums[2]) / 255;
    return y < 0.62;
  }
  function shareParts(row) {
    var totals = {};
    (row.shares || []).forEach(function (share) {
      var votes = share.votes || 0;
      var party = share.party || "other";
      if (!(votes > 0) || party === "yes" || party === "no") return;
      totals[party] = (totals[party] || 0) + votes;
    });
    return Object.keys(totals).map(function (party) {
      return { party: party, color: PARTY[party] || PARTY.other, votes: totals[party] };
    });
  }
  function marginParts(row) {
    var party = row.party || "";
    var other = party === "dem" ? "gop" : party === "gop" ? "dem" : "";
    if (!other || !(row.votes > 0)) return [];
    var gap = Math.max(0, Math.min(100, row.gap || 0));
    var lead = (100 + gap) / 200;
    return [
      { party: party, color: PARTY[party], votes: lead, assumed: true },
      { party: other, color: PARTY[other], votes: 1 - lead, assumed: true }
    ];
  }
  function blendTitle(name, office, parts) {
    var total = parts.reduce(function (sum, part) { return sum + part.votes; }, 0);
    var ranked = parts.slice().sort(function (a, b) { return b.votes - a.votes; });
    var bits = ranked.slice(0, 3).map(function (part) {
      return (PARTY_LABEL[part.party] || "Other") + " " + Math.round(part.votes / total * 100) + "%%";
    });
    return name + ": " + (office || "Statewide") + ", " + bits.join(", ") + ", blended";
  }
  function tint(hex, amount) {
    var chip = [235, 228, 214];
    var rgb = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    return "rgb(" + chip.map(function (channel, index) {
      return Math.round(channel + (rgb[index] - channel) * amount);
    }).join(",") + ")";
  }
  function paintLeads(data) {
    lastLeads = data;
    var rows = (data && data.states) || {};
    svg.querySelectorAll("path").forEach(function (path) {
      var code = path.getAttribute("data-code");
      var row = rows[code] || {};
      var label = svg.querySelector('text[data-code="' + code + '"]');
      var party = row.party || "";
      var votes = row.votes || 0;
      var parts = [];
      if (blendOn()) {
        parts = shareParts(row);
        if (!parts.length) parts = marginParts(row);
      }
      var mixed = parts.length ? mixColor(parts) : "";
      if (mixed) {
        path.style.setProperty("--lead", mixed);
        if (label) label.classList.toggle("on-dark", inkDark(mixed));
        var title = parts[0].assumed
          ? (path.getAttribute("data-name") || code) + ": " + (row.office || "Statewide") + ", " + (PARTY_LABEL[row.party] || "Other") + " lead of " + row.gap + " points, blended with " + (row.party === "gop" ? "blue" : "red")
          : blendTitle(path.getAttribute("data-name") || code, row.office, parts);
        path.setAttribute("title", title);
      } else if (party && votes) {
        var amount = Math.max(0.4, Math.min(1, (row.gap || 0) / 32));
        path.style.setProperty("--lead", tint(PARTY[party] || PARTY.other, amount));
        if (label) label.classList.toggle("on-dark", amount >= 0.72);
        path.setAttribute("title", (path.getAttribute("data-name") || code) + ": " + (row.office || "Statewide") + ", " + (PARTY_LABEL[party] || "Other") + " lead");
      } else {
        path.style.removeProperty("--lead");
        if (label) label.classList.remove("on-dark");
        path.setAttribute("title", path.getAttribute("data-name") || code);
      }
    });
    var status = document.getElementById("us-status");
    if (!status) return;
    status.textContent = "";
    var when = new Date(data && data.updated);
    var clock = isNaN(when.getTime()) ? "" : when.toLocaleString("en-US", {
      timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
    });
    if (clock) status.appendChild(document.createTextNode("Updated " + clock + " Central. "));
    status.appendChild(document.createTextNode("Unofficial totals from the Associated Press, published by NBC News. This map does not call a race."));
    paintBlendLegend(data);
  }
  function blendLegendParts(data) {
    var totals = {};
    var states = (data && data.states) || {};
    Object.keys(states).forEach(function (code) {
      var row = states[code] || {};
      var parts = shareParts(row);
      if (!parts.length) parts = marginParts(row);
      parts.forEach(function (part) {
        if (!(part.votes > 0)) return;
        var party = part.party || "other";
        if (!totals[party]) totals[party] = { party: party, color: part.color, votes: 0 };
        totals[party].votes += part.votes;
      });
    });
    return Object.keys(totals).map(function (party) { return totals[party]; }).sort(function (a, b) {
      return b.votes - a.votes;
    });
  }
  function paintBlendLegend(data) {
    var legend = document.querySelector(".result-legend");
    if (!legend) return;
    legend.querySelectorAll(".blend-key").forEach(function (node) { node.remove(); });
    if (!blendOn()) return;
    blendLegendParts(data).forEach(function (part) {
      var span = document.createElement("span");
      span.className = "blend-key";
      var swatch = document.createElement("i");
      swatch.className = "swatch";
      swatch.style.background = part.color;
      span.appendChild(swatch);
      span.appendChild(document.createTextNode(" " + (PARTY_LABEL[part.party] || "Other")));
      legend.appendChild(span);
    });
  }
  function mountBlend() {
    var legend = document.querySelector(".result-legend");
    if (!legend || document.getElementById("blend-switch")) return;
    var bar = document.createElement("div");
    bar.className = "sheet-switch blend-switch";
    bar.id = "blend-switch";
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "How the map is colored");
    var sub = legend.previousElementSibling;
    var leadCopy = sub && sub.classList.contains("sub") ? sub.textContent : "";
    function paintCaption() {
      var on = blendOn();
      if (leadCopy && sub) sub.textContent = on ? BLEND_LINE : leadCopy;
      legend.classList.toggle("is-blend", on);
      bar.querySelectorAll("button").forEach(function (button) {
        var chosen = button.getAttribute("data-blend") === (on ? "blend" : "ahead");
        button.setAttribute("aria-pressed", chosen ? "true" : "false");
      });
    }
    [["ahead", "Who is ahead"], ["blend", "Blend the votes"]].forEach(function (pair) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = pair[1];
      button.setAttribute("data-blend", pair[0]);
      button.addEventListener("click", function () {
        rememberBlend(pair[0] === "blend");
        paintCaption();
        if (lastLeads) paintLeads(lastLeads);
      });
      bar.appendChild(button);
    });
    if (leadCopy && sub) legend.parentNode.insertBefore(bar, sub);
    else legend.parentNode.insertBefore(bar, legend);
    var blank = legend.querySelector(".swatch.blank");
    if (blank && blank.parentNode) blank.parentNode.classList.add("stay");
    paintCaption();
  }
  function loadLeads() {
    leadersLive("preview/leads.json").then(paintLeads).catch(function () {});
  }
  mountBlend();
  loadLeads();
  setInterval(loadLeads, LIVE_EVERY);
});
</script>
</body>
</html>
""" % (header("", "us", "United States"), "\n".join(links))


def extract_lang():
    text = open(os.path.join(ROOT, "illinois.html"), encoding="utf-8").read()
    marker = 'var select = document.getElementById("lang");'
    start = text.find(marker)
    start = text.rfind("<script>", 0, start)
    end = text.find("</script>", start)
    body = text[start + len("<script>"):end].strip() + "\n"
    open(os.path.join(ROOT, "lang.js"), "w", encoding="utf-8", newline="\n").write(body)


def main():
    extract_lang()
    national = json.load(open(os.path.join(PREVIEW, "national.json"), encoding="utf-8"))
    for item in national["states"]:
        if item["code"] == "IL":
            continue
        data = json.load(open(os.path.join(PREVIEW, "states", item["code"].lower() + ".json"), encoding="utf-8"))
        path = os.path.join(ROOT, item["code"].lower() + ".html")
        open(path, "w", encoding="utf-8", newline="\n").write(page(data))
        print("wrote", item["code"])
    open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8", newline="\n").write(index_page(national["states"]))
    print("wrote index", len(national["states"]))
    seo.publish()


if __name__ == "__main__":
    main()
