"""Connecticut reports results by town. The map is the eight counties."""

COUNTIES = {
    "09001": (
        "Fairfield",
        "Bethel", "Bridgeport", "Brookfield", "Danbury", "Darien", "Easton",
        "Fairfield", "Greenwich", "Monroe", "New Canaan", "New Fairfield",
        "Newtown", "Norwalk", "Redding", "Ridgefield", "Shelton", "Sherman",
        "Stamford", "Stratford", "Trumbull", "Weston", "Westport", "Wilton",
    ),
    "09003": (
        "Hartford",
        "Avon", "Berlin", "Bloomfield", "Bristol", "Burlington", "Canton",
        "East Granby", "East Hartford", "East Windsor", "Enfield", "Farmington",
        "Glastonbury", "Granby", "Hartford", "Hartland", "Manchester",
        "Marlborough", "New Britain", "Newington", "Plainville", "Rocky Hill",
        "Simsbury", "Southington", "South Windsor", "Suffield", "West Hartford",
        "Wethersfield", "Windsor", "Windsor Locks",
    ),
    "09005": (
        "Litchfield",
        "Barkhamsted", "Bethlehem", "Bridgewater", "Canaan", "Colebrook",
        "Cornwall", "Goshen", "Harwinton", "Kent", "Litchfield", "Morris",
        "New Hartford", "New Milford", "Norfolk", "North Canaan", "Plymouth",
        "Roxbury", "Salisbury", "Sharon", "Thomaston", "Torrington", "Warren",
        "Washington", "Watertown", "Winchester", "Woodbury",
    ),
    "09007": (
        "Middlesex",
        "Chester", "Clinton", "Cromwell", "Deep River", "Durham", "East Haddam",
        "East Hampton", "Essex", "Haddam", "Killingworth", "Middlefield",
        "Middletown", "Old Saybrook", "Portland", "Westbrook",
    ),
    "09009": (
        "New Haven",
        "Ansonia", "Beacon Falls", "Bethany", "Branford", "Cheshire", "Derby",
        "East Haven", "Guilford", "Hamden", "Madison", "Meriden", "Middlebury",
        "Milford", "Naugatuck", "New Haven", "North Branford", "North Haven",
        "Orange", "Oxford", "Prospect", "Seymour", "Southbury", "Wallingford",
        "Waterbury", "West Haven", "Wolcott", "Woodbridge",
    ),
    "09011": (
        "New London",
        "Bozrah", "Colchester", "East Lyme", "Franklin", "Griswold", "Groton",
        "Lebanon", "Ledyard", "Lisbon", "Lyme", "Montville", "New London",
        "North Stonington", "Norwich", "Old Lyme", "Preston", "Salem", "Sprague",
        "Stonington", "Voluntown", "Waterford",
    ),
    "09013": (
        "Tolland",
        "Andover", "Bolton", "Columbia", "Coventry", "Ellington", "Hebron",
        "Mansfield", "Somers", "Stafford", "Tolland", "Union", "Vernon",
        "Willington",
    ),
    "09015": (
        "Windham",
        "Ashford", "Brooklyn", "Canterbury", "Chaplin", "Eastford", "Hampton",
        "Killingly", "Plainfield", "Pomfret", "Putnam", "Scotland", "Sterling",
        "Thompson", "Windham", "Woodstock",
    ),
}


def place_key(text):
    return "".join(ch for ch in (text or "").lower() if ch.isalnum())


def tables():
    towns = {}
    names = {}
    for fips, places in COUNTIES.items():
        names[fips] = places[0]
        for town in places[1:]:
            towns[place_key(town)] = fips
    return towns, names


TOWNS, COUNTY_NAMES = tables()
