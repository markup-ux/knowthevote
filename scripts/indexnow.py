"""Tell IndexNow that Leaders.vote can be listed.

Bing reads IndexNow, and DuckDuckGo reads Bing. The key file in the site
root has to be public before a notice is accepted. URLs come from sitemap.xml.
"""
import json
import os
import re
import time
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGIN = "https://leaders.vote"
HOST = "leaders.vote"
SITEMAP = os.path.join(ROOT, "sitemap.xml")
ENDPOINT = "https://api.indexnow.org/indexnow"
UA = {"User-Agent": "LeadersVoteIndexNow/1.0 (markup.ux@gmail.com)"}
LOC = re.compile(r"<loc>([^<]+)</loc>")


def key_file():
    for name in os.listdir(ROOT):
        stem, ext = os.path.splitext(name)
        if ext != ".txt" or not re.fullmatch(r"[a-f0-9]{32}", stem):
            continue
        body = open(os.path.join(ROOT, name), encoding="utf-8").read().strip()
        if body == stem:
            return stem
    raise SystemExit("No IndexNow key file is in the site root.")


def urls():
    text = open(SITEMAP, encoding="utf-8").read()
    found = [item.replace("&amp;", "&") for item in LOC.findall(text)]
    if not found:
        raise SystemExit("sitemap.xml has no addresses.")
    return found


def get(url):
    request = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.status, response.read(200)


def wait_for_key(key):
    location = ORIGIN + "/" + key + ".txt"
    for attempt in range(24):
        try:
            status, body = get(location)
        except urllib.error.HTTPError as error:
            status, body = error.code, b""
        except urllib.error.URLError:
            status, body = 0, b""
        if status == 200 and body.decode("utf-8", "replace").strip() == key:
            return location
        time.sleep(15)
    raise SystemExit("The key file is not public at " + ORIGIN + "/" + key + ".txt yet.")


def notify(key, location, batch):
    payload = json.dumps({
        "host": HOST,
        "key": key,
        "keyLocation": location,
        "urlList": batch,
    }).encode("utf-8")
    request = urllib.request.Request(
        ENDPOINT,
        data=payload,
        headers={**UA, "Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        status, _ = get_response(request)
    except urllib.error.HTTPError as error:
        detail = error.read(300).decode("utf-8", "replace")
        raise SystemExit("IndexNow returned %s. %s" % (error.code, detail))
    if status not in (200, 202):
        raise SystemExit("IndexNow returned %s." % status)
    return status


def get_response(request):
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.status, response.read(200)


def main():
    key = key_file()
    found = urls()
    location = wait_for_key(key)
    status = 0
    for start in range(0, len(found), 10000):
        status = notify(key, location, found[start:start + 10000])
    print("IndexNow", status, "urls", len(found))


if __name__ == "__main__":
    main()
