"""Write a simplified Illinois county map as illinois.svg."""
import json
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GEO = os.environ.get("IL_GEO", os.path.join(os.environ.get("TEMP", "/tmp"), "il-counties.geojson"))
OUT = os.path.join(ROOT, "illinois.svg")

NAMES = {
    "Dekalb": "DeKalb",
    "Dewitt": "De Witt",
    "Dupage": "DuPage",
    "Lasalle": "LaSalle",
    "Mcdonough": "McDonough",
    "Mchenry": "McHenry",
    "Mclean": "McLean",
}


def project(lon, lat):
    phi = math.radians(lat)
    lam = math.radians(lon)
    phi1 = math.radians(37.5)
    phi2 = math.radians(41.8)
    phi0 = math.radians(39.8)
    lam0 = math.radians(-89.25)
    n = (math.sin(phi1) + math.sin(phi2)) / 2
    c = math.cos(phi1) ** 2 + 2 * n * math.sin(phi1)
    rho0 = math.sqrt(c - 2 * n * math.sin(phi0)) / n
    rho = math.sqrt(c - 2 * n * math.sin(phi)) / n
    theta = n * (lam - lam0)
    return rho * math.sin(theta), rho0 - rho * math.cos(theta)


def dist(point, start, end):
    if start == end:
        dx = point[0] - start[0]
        dy = point[1] - start[1]
        return math.hypot(dx, dy)
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    length = math.hypot(dx, dy)
    return abs(dy * point[0] - dx * point[1] + end[0] * start[1] - end[1] * start[0]) / length


def rdp(points, epsilon):
    if len(points) < 3:
        return points
    start = points[0]
    end = points[-1]
    index = 0
    farthest = 0
    for i in range(1, len(points) - 1):
        d = dist(points[i], start, end)
        if d > farthest:
            farthest = d
            index = i
    if farthest > epsilon:
        left = rdp(points[: index + 1], epsilon)
        right = rdp(points[index:], epsilon)
        return left[:-1] + right
    return [start, end]


def rings(geometry):
    if geometry["type"] == "Polygon":
        return geometry["coordinates"]
    if geometry["type"] == "MultiPolygon":
        out = []
        for polygon in geometry["coordinates"]:
            out.extend(polygon)
        return out
    return []


def main():
    geo = json.load(open(GEO, encoding="utf-8"))
    raw = []
    for feature in geo["features"]:
        props = feature["properties"]
        fips = "17" + str(int(props["co_fips"])).zfill(3)
        name = NAMES.get(props["name"], props["name"])
        projected = []
        for ring in rings(feature["geometry"]):
            projected.append([project(lon, lat) for lon, lat in ring])
        raw.append((fips, name, projected))

    xs = [point[0] for _, _, rings_ in raw for ring in rings_ for point in ring]
    ys = [point[1] for _, _, rings_ in raw for ring in rings_ for point in ring]
    minx, maxx = min(xs), max(xs)
    miny, maxy = min(ys), max(ys)
    pad = 10
    width = 640
    scale = (width - pad * 2) / (maxx - minx)
    height = (maxy - miny) * scale + pad * 2

    def pixel(point):
        return (pad + (point[0] - minx) * scale, pad + (maxy - point[1]) * scale)

    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<svg id="il-map" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {0:.1f} {1:.1f}" role="img" aria-label="Map of Illinois counties">'.format(width, height),
    ]
    for fips, name, rings_ in raw:
        commands = []
        for ring in rings_:
            points = rdp([pixel(point) for point in ring], 0.85)
            if len(points) < 3:
                continue
            commands.append(
                "M "
                + " L ".join("{0:.1f} {1:.1f}".format(x, y) for x, y in points)
                + " Z"
            )
        if not commands:
            continue
        parts.append(
            '<path id="c{0}" data-fips="{0}" data-name="{1}" d="{2}"/>'.format(
                fips, name.replace('"', ""), " ".join(commands)
            )
        )
    parts.append("</svg>")
    text = "\n".join(parts) + "\n"
    open(OUT, "w", encoding="utf-8", newline="\n").write(text)
    print("wrote", OUT, "counties", text.count("<path"), "bytes", len(text))


if __name__ == "__main__":
    main()
