"""Save real U.S. and state flag drawings for the sticky header."""
import os
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "flags")
BASE_STATE = "https://cdn.jsdelivr.net/gh/ciscoriordan/svg-flags@main/full-size-simplified/states/"
BASE_US = "https://cdn.jsdelivr.net/gh/ciscoriordan/svg-flags@main/full-size-simplified/countries/us.svg"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
CODES = [
    "al", "ak", "az", "ar", "ca", "co", "ct", "de", "dc", "fl", "ga", "hi", "id", "il",
    "in", "ia", "ks", "ky", "la", "me", "md", "ma", "mi", "mn", "ms", "mo", "mt", "ne",
    "nv", "nh", "nj", "nm", "ny", "nc", "nd", "oh", "ok", "or", "pa", "ri", "sc", "sd",
    "tn", "tx", "ut", "vt", "va", "wa", "wv", "wi", "wy",
]


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(request, timeout=40) as response:
        return response.read()


def main():
    os.makedirs(OUT, exist_ok=True)
    jobs = [("us", BASE_US)] + [(code, BASE_STATE + "us-" + code + ".svg") for code in CODES]
    for code, url in jobs:
        body = fetch(url)
        if b"<svg" not in body[:800]:
            raise SystemExit("not an svg: " + code)
        path = os.path.join(OUT, code + ".svg")
        open(path, "wb").write(body)
        print(code, len(body))


if __name__ == "__main__":
    main()
