(function () {
  var INK = ["#f7fbe8", "#d4ee8a", "#7cb342", "#33691e", "#1b3a0a"];
  var canvas = document.getElementById("health-map");
  var readout = document.getElementById("health-readout");
  var legend = document.getElementById("health-legend");
  var brandBox = document.getElementById("health-brands");
  var centerBox = document.getElementById("health-centers");
  var ctx = canvas.getContext("2d");
  var data = null;
  var brandSort = "count";
  var brandFilter = null;
  var chemId = null;
  var studyIds = null;
  var showCenters = true;
  var selectedCenter = null;
  var picked = "";
  var hoods = null;
  var hoodOf = null;
  var hoodFilter = null;
  var hoodJump = null;
  var hoodSort = "count";
  var hoodBrand = "";
  var cssW = 900;
  var cssH = 560;
  var view = { cx: 0.25, cy: 0.4, scale: 800 };
  var fitted = false;
  var drag = null;

  function commas(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function appendSource(node, text) {
    node.appendChild(document.createTextNode(text));
  }

  function mercX(lon) {
    return (lon + 180) / 360;
  }

  function mercY(lat) {
    var clamped = Math.max(-85, Math.min(85, lat));
    var s = Math.sin(clamped * Math.PI / 180);
    return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
  }

  function lonLatFromPx(x, y) {
    var mx = (x - cssW / 2) / view.scale + view.cx;
    var my = (y - cssH / 2) / view.scale + view.cy;
    var lon = mx * 360 - 180;
    var n = Math.PI - 2 * Math.PI * my;
    var lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
    return [lon, lat];
  }

  function toPx(lon, lat) {
    return [
      (mercX(lon) - view.cx) * view.scale + cssW / 2,
      (mercY(lat) - view.cy) * view.scale + cssH / 2
    ];
  }

  function clampView() {
    var minScale = cssW / (70 / 360);
    var maxScale = cssW / (0.02 / 360);
    view.scale = Math.max(minScale, Math.min(maxScale, view.scale));
    var west = mercX(-175);
    var east = mercX(-65);
    var north = mercY(72);
    var south = mercY(15);
    view.cx = Math.max(west, Math.min(east, view.cx));
    view.cy = Math.max(north, Math.min(south, view.cy));
  }

  function fit(lon, lat, lonSpan) {
    view.cx = mercX(lon);
    view.cy = mercY(lat);
    view.scale = cssW / (lonSpan / 360);
    clampView();
    fitted = true;
  }

  function zoomAt(x, y, factor) {
    var before = lonLatFromPx(x, y);
    view.scale *= factor;
    clampView();
    view.cx = mercX(before[0]) - (x - cssW / 2) / view.scale;
    view.cy = mercY(before[1]) - (y - cssH / 2) / view.scale;
    clampView();
    setViewPressed("");
    draw();
  }

  function setViewPressed(id) {
    ["view-us", "view-ak", "view-hi"].forEach(function (key) {
      document.getElementById(key).setAttribute("aria-pressed", key === id ? "true" : "false");
    });
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    cssW = Math.max(280, rect.width || cssW);
    cssH = Math.max(280, rect.height || cssH);
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!fitted) fit(-97, 38.5, 58);
    else clampView();
    if (baseMap) baseMap.resize();
    draw();
  }

  function mapStyle() {
    return document.documentElement.getAttribute("data-theme") === "dark"
      ? "https://tiles.openfreemap.org/styles/dark"
      : "https://tiles.openfreemap.org/styles/liberty";
  }

  function followTheme(map, redraw) {
    map.__style = mapStyle();
    new MutationObserver(function () {
      var next = mapStyle();
      if (next === map.__style) return;
      map.__style = next;
      map.setStyle(next);
      map.once("style.load", redraw);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  function densityInk() {
    if (document.documentElement.getAttribute("data-theme") === "dark") {
      return ["#f4fbe4", "#c6e86a", "#8fbf3a", "#4f8f28", "#2d6a18"];
    }
    return INK;
  }

  function paperVeil(alpha) {
    if (document.documentElement.getAttribute("data-theme") === "dark") return;
    ctx.fillStyle = "rgba(244, 240, 230, " + alpha + ")";
    ctx.fillRect(0, 0, cssW, cssH);
  }

  var baseMap = null;
  if (window.maplibregl && document.getElementById("health-basemap")) {
    baseMap = new maplibregl.Map({
      container: "health-basemap",
      style: mapStyle(),
      center: [-97, 38.5],
      zoom: 3,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0
    });
    baseMap.on("load", function () {
      baseMap.resize();
      syncBase();
    });
    followTheme(baseMap, function () {
      baseMap.resize();
      syncBase();
      draw();
    });
  }

  function syncBase() {
    if (!baseMap) return;
    var center = lonLatFromPx(cssW / 2, cssH / 2);
    var zoom = Math.log(view.scale / 512) / Math.LN2;
    baseMap.jumpTo({ center: center, zoom: zoom });
  }

  function placeVisible(place, index) {
    if (hoodFilter !== null && (!hoodOf || hoodOf[index] !== hoodFilter)) return false;
    if (brandFilter !== null) return place[2] === brandFilter;
    if (studyIds) return studyIds.indexOf(place[2]) !== -1;
    return true;
  }

  function dotMode() {
    return view.scale / 360 >= 48;
  }

  var sprites = [];
  var FOOD = {
    "Subway": "sub", "Jimmy John's": "sub", "Jersey Mike's Subs": "sub", "Firehouse Subs": "sub", "Quiznos": "sub", "Potbelly": "sub", "Which Wich?": "sub", "Togo's": "sub", "Blimpie": "sub", "Port of Subs": "sub", "Cousins Subs": "sub", "Capriotti's": "sub", "PrimoHoagies": "sub", "Ike's Love and Sandwiches": "sub", "Lee's Sandwiches": "sub", "Schlotzsky's": "sub", "Penn Station": "sub", "Charleys Philly Steaks": "sub", "Pret A Manger": "sandwich",
    "McDonald's": "burger", "Burger King": "burger", "Wendy's": "burger", "Five Guys": "burger", "Sonic": "burger", "Hardee's": "burger", "Jack in the Box": "burger", "Shake Shack": "burger", "Carl's Jr.": "burger", "A&W": "burger", "Smashburger": "burger", "The Habit Burger Grill": "burger", "Habit Burger & Grill": "burger", "Checkers": "burger", "Freddy's": "burger", "Whataburger": "burger", "BurgerFi": "burger", "Steak 'n Shake": "burger", "Jack's": "burger", "Wayback Burgers": "burger", "Rally's": "burger", "Fatburger": "burger", "Mooyah": "burger", "White Castle": "burger", "In-N-Out Burger": "burger", "Culver's": "burger", "Cook Out": "burger",
    "Chick-fil-A": "chicken-sandwich",
    "KFC": "chicken", "Popeyes": "chicken", "Church's Chicken": "chicken", "Bojangles'": "chicken", "Krispy Krunchy Chicken": "chicken", "Chester's": "chicken", "Golden Chick": "chicken", "Lee's Famous Recipe Chicken": "chicken", "Harold's Chicken Shack": "chicken", "Chicken Express": "chicken", "Slim Chickens": "chicken", "Jollibee": "chicken",
    "Raising Cane's": "tenders", "Zaxby's": "tenders", "Dave's Hot Chicken": "tenders",
    "Wingstop": "wings", "WingStreet": "wings",
    "El Pollo Loco": "roast", "Pollo Campero": "roast", "Pollo Tropical": "roast", "Boston Market": "roast",
    "Domino's": "pizza", "Little Caesars": "pizza", "Papa John's": "pizza", "Papa Murphy's": "pizza", "Marco's Pizza": "pizza", "MOD Pizza": "pizza", "Pizza Hut": "pizza", "Hunt Brothers Pizza": "pizza", "Hungry Howie's": "pizza", "Sbarro": "pizza", "Rosati's": "pizza", "&pizza": "pizza", "Pizza Boli's": "pizza", "Vocelli Pizza": "pizza", "Sarpino's Pizzeria": "pizza", "Imo's Pizza": "pizza",
    "Taco Bell": "taco", "Taco John's": "taco", "Del Taco": "taco", "Torchy's Tacos": "taco", "Laredo Taco Company": "taco", "Taco Del Mar": "taco", "Fuzzy's Taco Shop": "taco", "Taco Time": "taco", "Rubio's": "taco",
    "Chipotle": "burrito", "Qdoba": "burrito", "Moe's Southwest Grill": "burrito", "Baja Fresh": "burrito", "Freebirds": "burrito", "Costa Vida": "burrito", "Hot Head Burritos": "burrito", "Bubbakoo's Burritos": "burrito",
    "Dunkin'": "donut", "Dunkin' Donuts": "donut", "Krispy Kreme": "donut", "Duck Donuts": "donut", "Daylight Donuts": "donut", "Shipley Do-Nuts": "donut", "Yum Yum Donuts": "donut", "Winchell's Donut House": "donut",
    "Mochinut": "mochi",
    "Auntie Anne's": "pretzel", "Wetzel's Pretzels": "pretzel", "Philly Pretzel Factory": "pretzel", "Pretzelmaker": "pretzel",
    "Cinnabon": "roll",
    "Einstein Bros. Bagels": "bagel", "Bruegger's Bagels": "bagel", "Noah's Bagels": "bagel", "Manhattan Bagel": "bagel",
    "DQ Grill & Chill": "icecream", "Dairy Queen": "icecream", "Braum's": "icecream",
    "Tropical Smoothie Cafe": "smoothie", "Jamba": "smoothie", "Smoothie King": "smoothie", "Nékter Juice Bar": "smoothie", "Robeks": "smoothie", "Planet Smoothie": "smoothie", "Freshëns": "smoothie",
    "Orange Julius": "juice", "Juice It Up!": "juice", "Clean Juice": "juice", "Pressed": "juice",
    "Playa Bowls": "acai", "Everbowl": "acai", "Poke Bros.": "poke",
    "Panda Express": "rice", "China Wok": "rice", "Sarku Japan": "rice", "Teriyaki Madness": "rice", "WaBa Grill": "rice", "The Flame Broiler": "rice", "Yoshinoya": "rice", "L&L Hawaiian Barbecue": "rice", "The Halal Guys": "rice",
    "Sweetgreen": "salad", "Chopt": "salad", "Just Salad": "salad", "Saladworks": "salad", "Dig": "salad", "Café Zupas": "salad",
    "Long John Silver's": "fish", "Captain D's": "fish", "California Fish Grill": "fish",
    "Wienerschnitzel": "hotdog", "Nathan's": "hotdog", "Costco": "hotdog",
    "Panera Bread": "sandwich", "Arby's": "sandwich", "Au Bon Pain": "sandwich", "Honey Baked Ham": "ham", "Chicken Salad Chick": "sandwich", "American Deli": "sandwich", "Mendocino Farms": "sandwich",
    "Nick The Greek": "gyro", "Taziki's Mediterranean Cafe": "gyro", "Zoës Kitchen": "gyro", "Pita Pit": "gyro", "Krystal": "burger",
    "Biscuitville": "biscuit",
    "Fazoli's": "pasta",
    "Great American Cookies": "cookie",
    "Golden Krust Caribbean Bakery & Grill": "patty",
    "Kura Sushi": "sushi"
  };

  function dot(g, x, y, r, color) {
    g.fillStyle = color;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  function foodKind(name) {
    if (FOOD[name]) return FOOD[name];
    var n = name.toLowerCase();
    if (n.indexOf("pizza") >= 0) return "pizza";
    if (n.indexOf("taco") >= 0) return "taco";
    if (n.indexOf("burrito") >= 0) return "burrito";
    if (n.indexOf("donut") >= 0 || n.indexOf("doughnut") >= 0) return "donut";
    if (n.indexOf("bagel") >= 0) return "bagel";
    if (n.indexOf("pretzel") >= 0) return "pretzel";
    if (n.indexOf("sushi") >= 0) return "sushi";
    if (n.indexOf("salad") >= 0) return "salad";
    if (n.indexOf("chicken") >= 0) return "chicken";
    if (n.indexOf("burger") >= 0) return "burger";
    if (n.indexOf("sub") >= 0) return "sub";
    return "burger";
  }

  function band(g, x, y, w, h, r, color) {
    g.fillStyle = color;
    g.beginPath();
    g.roundRect(x, y, w, h, r);
    g.fill();
  }

  function drawFood(g, kind) {
    if (kind === "burger") {
      band(g, 6, 4, 52, 16, 10, "#ffd15c");
      dot(g, 20, 11, 2.4, "#fff1b8");
      dot(g, 32, 9, 2.4, "#fff1b8");
      dot(g, 44, 11, 2.4, "#fff1b8");
      band(g, 4, 20, 56, 7, 3, "#fff1b8");
      band(g, 8, 26, 48, 6, 2, "#e36b3a");
      band(g, 4, 31, 58, 6, 1, "#f5a03a");
      band(g, 8, 36, 48, 10, 2, "#9a3d5c");
      band(g, 6, 46, 52, 14, 8, "#ffd15c");
    } else if (kind === "pizza") {
      g.fillStyle = "#f5a03a";
      g.beginPath(); g.moveTo(32, 2); g.lineTo(62, 60); g.lineTo(2, 60); g.closePath(); g.fill();
      g.fillStyle = "#ffd15c";
      g.beginPath(); g.moveTo(32, 16); g.lineTo(52, 56); g.lineTo(12, 56); g.closePath(); g.fill();
      dot(g, 28, 34, 6, "#9a3d5c");
      dot(g, 40, 46, 6, "#9a3d5c");
      dot(g, 24, 48, 4, "#fff1b8");
    } else if (kind === "taco") {
      g.fillStyle = "#ffd15c";
      g.beginPath();
      g.moveTo(6, 16);
      g.quadraticCurveTo(32, 72, 58, 16);
      g.lineTo(46, 16);
      g.quadraticCurveTo(32, 52, 18, 16);
      g.closePath();
      g.fill();
      band(g, 14, 14, 36, 12, 2, "#9a3d5c");
      g.fillStyle = "#fff1b8";
      g.beginPath(); g.ellipse(32, 14, 16, 7, 0, 0, Math.PI * 2); g.fill();
      dot(g, 24, 12, 4, "#e36b3a");
      dot(g, 38, 14, 4, "#f5a03a");
    } else if (kind === "burrito") {
      g.save();
      g.translate(32, 32);
      g.rotate(-0.6);
      band(g, -26, -14, 52, 28, 14, "#ffd15c");
      g.strokeStyle = "#9a3d5c";
      g.lineWidth = 4;
      g.beginPath(); g.ellipse(0, 0, 16, 8, 0, 0.3, Math.PI * 1.4); g.stroke();
      g.restore();
    } else if (kind === "donut" || kind === "mochi" || kind === "bagel") {
      dot(g, 32, 32, 28, kind === "bagel" ? "#f5a03a" : (kind === "mochi" ? "#f3d7c4" : "#ffd15c"));
      if (kind === "donut") {
        g.fillStyle = "#e07a9a";
        g.beginPath();
        g.arc(32, 32, 28, Math.PI, 0);
        g.arc(32, 32, 12, 0, Math.PI, true);
        g.fill();
      }
      if (kind === "mochi") {
        dot(g, 18, 20, 6, "#f7e4d4");
        dot(g, 32, 12, 6, "#f7e4d4");
        dot(g, 46, 20, 6, "#f7e4d4");
      }
      dot(g, 32, 32, 11, "#f4f0e6");
    } else if (kind === "pretzel") {
      g.strokeStyle = "#c4894a";
      g.lineWidth = 10;
      g.lineCap = "round";
      g.lineJoin = "round";
      g.beginPath();
      g.moveTo(14, 46);
      g.bezierCurveTo(4, 4, 60, 4, 50, 46);
      g.moveTo(20, 28); g.lineTo(44, 52);
      g.moveTo(44, 28); g.lineTo(20, 52);
      g.stroke();
    } else if (kind === "roll") {
      dot(g, 32, 34, 26, "#e2b07a");
      g.strokeStyle = "#f7f1e4";
      g.lineWidth = 5;
      g.lineCap = "round";
      g.beginPath(); g.arc(32, 34, 16, 0.2, Math.PI * 1.7); g.stroke();
      g.beginPath(); g.arc(32, 34, 7, 0.5, Math.PI * 1.5); g.stroke();
    } else if (kind === "icecream") {
      g.fillStyle = "#c4894a";
      g.beginPath(); g.moveTo(32, 62); g.lineTo(14, 30); g.lineTo(50, 30); g.closePath(); g.fill();
      g.strokeStyle = "#a8743a";
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(22, 36); g.lineTo(28, 52); g.moveTo(32, 34); g.lineTo(32, 56); g.moveTo(42, 36); g.lineTo(36, 52); g.stroke();
      dot(g, 32, 24, 16, "#f7f1e4");
      dot(g, 22, 18, 10, "#f7f1e4");
      dot(g, 42, 18, 10, "#f3d2dc");
    } else if (kind === "smoothie" || kind === "juice") {
      g.fillStyle = "#f7f1e4";
      g.beginPath(); g.moveTo(14, 14); g.lineTo(50, 14); g.lineTo(44, 58); g.lineTo(20, 58); g.closePath(); g.fill();
      g.fillStyle = kind === "juice" ? "#e07a32" : "#c46a8a";
      g.beginPath(); g.moveTo(18, 26); g.lineTo(46, 26); g.lineTo(42, 54); g.lineTo(22, 54); g.closePath(); g.fill();
      g.strokeStyle = "#9a3d5c";
      g.lineWidth = 3;
      g.beginPath(); g.moveTo(42, 12); g.lineTo(54, 2); g.stroke();
    } else if (kind === "chicken" || kind === "roast") {
      g.save();
      g.translate(30, 34);
      g.rotate(-0.7);
      g.fillStyle = kind === "roast" ? "#e0b07a" : "#c47a3a";
      g.beginPath(); g.ellipse(-4, 0, 18, 14, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#f7f1e4";
      g.fillRect(10, -3, 18, 6);
      dot(g, 28, 0, 4, "#f7f1e4");
      g.restore();
    } else if (kind === "wings") {
      g.fillStyle = "#c47a3a";
      g.beginPath(); g.ellipse(22, 24, 16, 10, -0.9, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(42, 42, 16, 10, 0.7, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#f7f1e4";
      g.fillRect(30, 16, 10, 4);
      g.fillRect(28, 48, 10, 4);
    } else if (kind === "tenders") {
      band(g, 8, 8, 14, 48, 7, "#e2b07a");
      band(g, 25, 12, 14, 44, 7, "#c4894a");
      band(g, 42, 8, 14, 48, 7, "#e2b07a");
    } else if (kind === "fish") {
      g.fillStyle = "#e4d3a8";
      g.beginPath(); g.ellipse(28, 32, 20, 12, -0.25, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(44, 22); g.lineTo(60, 32); g.lineTo(44, 44); g.closePath(); g.fill();
      dot(g, 18, 30, 2, "#2c261f");
    } else if (kind === "hotdog") {
      g.fillStyle = "#e2b86a";
      g.beginPath(); g.ellipse(32, 34, 28, 14, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#a33b32";
      g.beginPath(); g.ellipse(32, 32, 22, 6, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#e6b23a";
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(16, 30); g.quadraticCurveTo(32, 26, 48, 30); g.stroke();
    } else if (kind === "sub" || kind === "sandwich" || kind === "chicken-sandwich") {
      g.save();
      g.translate(32, 32);
      g.rotate(-0.5);
      band(g, -28, -14, 56, 28, 12, "#ffd15c");
      g.fillStyle = "#fff1b8";
      g.fillRect(-24, -8, 48, 6);
      g.fillStyle = kind === "chicken-sandwich" ? "#f5a03a" : "#9a3d5c";
      g.fillRect(-24, -2, 48, 7);
      g.fillStyle = "#e36b3a";
      g.fillRect(-24, 5, 48, 5);
      g.restore();
    } else if (kind === "salad" || kind === "acai" || kind === "poke" || kind === "rice") {
      g.fillStyle = "#f7f1e4";
      g.beginPath(); g.ellipse(32, 40, 26, 16, 0, 0, Math.PI); g.fill();
      g.strokeStyle = "#d9c7a2";
      g.lineWidth = 4;
      g.beginPath(); g.ellipse(32, 28, 24, 10, 0, 0, Math.PI * 2); g.stroke();
      g.fillStyle = kind === "salad" ? "#f5a03a" : (kind === "acai" ? "#9a3d5c" : (kind === "poke" ? "#e36b3a" : "#ffd15c"));
      g.beginPath(); g.ellipse(32, 28, 18, 8, 0, 0, Math.PI * 2); g.fill();
      if (kind === "rice") { dot(g, 24, 26, 5, "#9a3d5c"); dot(g, 40, 28, 4, "#f5a03a"); }
      if (kind === "poke") { dot(g, 26, 26, 5, "#a33b32"); dot(g, 40, 28, 4, "#f7f1e4"); }
      if (kind === "salad") { dot(g, 24, 26, 5, "#a33b32"); dot(g, 40, 28, 4, "#e2b13c"); }
      if (kind === "acai") { dot(g, 24, 26, 4, "#e07a4a"); dot(g, 36, 24, 4, "#f7f1e4"); }
    } else if (kind === "sushi") {
      band(g, 8, 28, 48, 22, 4, "#f7f1e4");
      g.fillStyle = "#2c261f";
      g.fillRect(14, 34, 36, 8);
      g.fillStyle = "#e07a4a";
      g.beginPath(); g.ellipse(32, 26, 20, 8, 0, 0, Math.PI * 2); g.fill();
    } else if (kind === "gyro") {
      g.fillStyle = "#e2b86a";
      g.beginPath(); g.ellipse(32, 36, 22, 20, 0, 0, Math.PI * 2); g.fill();
      band(g, 16, 22, 32, 14, 2, "#6b3e2a");
      band(g, 18, 16, 28, 8, 2, "#f7f1e4");
      band(g, 20, 34, 24, 6, 2, "#a33b32");
    } else if (kind === "biscuit") {
      dot(g, 32, 36, 24, "#f0d7a0");
      dot(g, 20, 30, 12, "#e2c48a");
      dot(g, 42, 32, 11, "#e8d0a0");
      dot(g, 32, 22, 10, "#f7f1e4");
    } else if (kind === "pasta") {
      g.fillStyle = "#f7f1e4";
      g.beginPath(); g.ellipse(32, 42, 24, 14, 0, 0, Math.PI); g.fill();
      g.strokeStyle = "#e2b13c";
      g.lineWidth = 4;
      g.lineCap = "round";
      g.beginPath();
      g.arc(22, 30, 8, 0.2, Math.PI);
      g.arc(36, 30, 8, 0, Math.PI);
      g.stroke();
      dot(g, 32, 24, 5, "#a33b32");
    } else if (kind === "cookie") {
      dot(g, 32, 32, 26, "#c4894a");
      dot(g, 20, 24, 4, "#5c4033");
      dot(g, 34, 20, 4, "#5c4033");
      dot(g, 26, 38, 4, "#5c4033");
      dot(g, 42, 34, 4, "#5c4033");
      dot(g, 38, 46, 3, "#5c4033");
    } else if (kind === "ham") {
      dot(g, 32, 32, 26, "#e7a0a4");
      dot(g, 32, 32, 12, "#f3c4c6");
      g.strokeStyle = "#c47a80";
      g.lineWidth = 2;
      g.beginPath(); g.arc(32, 32, 20, 0.4, 1.2); g.stroke();
    } else if (kind === "patty") {
      g.fillStyle = "#e2b13a";
      g.beginPath();
      g.moveTo(8, 40);
      g.quadraticCurveTo(32, 4, 56, 40);
      g.quadraticCurveTo(32, 52, 8, 40);
      g.fill();
      g.strokeStyle = "#a8743a";
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(14, 36); g.quadraticCurveTo(32, 16, 50, 36); g.stroke();
    }
  }

  function sprite(index) {
    if (sprites[index]) return sprites[index];
    var canvasMark = document.createElement("canvas");
    canvasMark.width = 64;
    canvasMark.height = 64;
    drawFood(canvasMark.getContext("2d"), foodKind(data.brands[index]));
    sprites[index] = canvasMark;
    return canvasMark;
  }

  function markSize() {
    var px = view.scale / 360;
    if (px >= 120) return 28;
    if (px >= 48) return 20;
    return 0;
  }

  function drawMarkAt(index, x, y, size) {
    ctx.drawImage(sprite(index), x - size / 2, y - size / 2, size, size);
  }

  var legendKey = "";

  function draw() {
    if (!data) return;
    ctx.clearRect(0, 0, cssW, cssH);
    syncBase();
    if (brandFilter === null && studyIds && !dotMode()) drawStudyFoods();
    else if (dotMode()) drawDots();
    else {
      paperVeil(0.45);
      drawDensity();
    }
    if (showCenters) drawCenters();
  }

  function drawDots() {
    paperVeil(0.5);
    var size = markSize();
    var places = data.places;
    for (var i = 0; i < places.length; i++) {
      var place = places[i];
      if (!placeVisible(place, i)) continue;
      var p = toPx(place[0], place[1]);
      if (p[0] < -size || p[1] < -size || p[0] > cssW + size || p[1] > cssH + size) continue;
      drawMarkAt(place[2], p[0], p[1], size);
    }
    paintLegend("dots|" + (brandFilter === null ? "all" : brandFilter) + "|" + (studyIds ? chemId : "") + "|" + (showCenters ? "1" : "0") + "|" + hoodFilter, function () {
      if (brandFilter !== null) addMarkSwatch(brandFilter, "One " + data.brands[brandFilter] + " location");
      else if (studyIds) addStudyLegend();
      else addSwatch("#2c261f", "A drawing of a food the brand sells");
      if (showCenters) addFactorySwatch();
    });
  }

  function drawStudyFoods() {
    paperVeil(0.5);
    var places = data.places;
    for (var i = 0; i < places.length; i++) {
      var place = places[i];
      if (!placeVisible(place, i)) continue;
      var p = toPx(place[0], place[1]);
      if (p[0] < -20 || p[1] < -20 || p[0] > cssW + 20 || p[1] > cssH + 20) continue;
      drawMarkAt(place[2], p[0], p[1], 16);
    }
    paintLegend("study|" + chemId + "|" + (showCenters ? "1" : "0") + "|" + hoodFilter, function () {
      addStudyLegend();
      if (showCenters) addFactorySwatch();
    });
  }

  function addStudyLegend() {
    studyIds.forEach(function (index) {
      addMarkSwatch(index, data.brands[index]);
    });
  }

  function drawDensity() {
    var cell = 12;
    var cols = Math.ceil(cssW / cell);
    var rows = Math.ceil(cssH / cell);
    var bins = new Uint32Array(cols * rows);
    var places = data.places;
    for (var i = 0; i < places.length; i++) {
      var place = places[i];
      if (!placeVisible(place, i)) continue;
      var p = toPx(place[0], place[1]);
      var col = Math.floor(p[0] / cell);
      var row = Math.floor(p[1] / cell);
      if (col < 0 || row < 0 || col >= cols || row >= rows) continue;
      bins[row * cols + col]++;
    }
    var counts = [];
    for (var b = 0; b < bins.length; b++) if (bins[b]) counts.push(bins[b]);
    counts.sort(function (a, c) { return a - c; });
    var cuts = [0, 0, 0, 0];
    if (counts.length) {
      for (var k = 0; k < 4; k++) cuts[k] = counts[Math.min(counts.length - 1, Math.floor((k + 1) * 0.2 * counts.length))];
    }
    function band(value) {
      var index = 0;
      while (index < 4 && value > cuts[index]) index++;
      return index;
    }
    var ranges = [];
    for (var r = 0; r < 5; r++) ranges.push([Infinity, -Infinity]);
    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        var value = bins[row * cols + col];
        if (!value) continue;
        var index = band(value);
        ranges[index][0] = Math.min(ranges[index][0], value);
        ranges[index][1] = Math.max(ranges[index][1], value);
        if (brandFilter !== null) {
          ctx.drawImage(sprite(brandFilter), col * cell, row * cell, cell - 1, cell - 1);
        } else {
          ctx.fillStyle = densityInk()[index];
          ctx.fillRect(col * cell, row * cell, cell - 1, cell - 1);
        }
      }
    }
    var key = "bins|" + (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light") + "|" + (brandFilter === null ? "all" : brandFilter) + "|" + (showCenters ? "1" : "0") + "|" + hoodFilter + "|" + ranges.map(function (range) {
      return range[1] < 0 ? "-" : range[0] + ":" + range[1];
    }).join(",");
    paintLegend(key, function () {
      var title = document.createElement("span");
      title.className = "legend-label";
      title.textContent = "Tagged restaurants. Yellow-green is the count. A darker yellow-green is more.";
      legend.appendChild(title);
      if (brandFilter !== null) {
        addMarkSwatch(brandFilter, data.brands[brandFilter] + " in each shaded cell");
      } else {
        for (var s = 0; s < 5; s++) {
          if (ranges[s][1] < 0) continue;
          var label = ranges[s][0] === ranges[s][1] ? commas(ranges[s][0]) : commas(ranges[s][0]) + " to " + commas(ranges[s][1]);
          addSwatch(densityInk()[s], label + " in a cell");
        }
      }
      if (showCenters) addFactorySwatch();
    });
  }

  function paintLegend(key, fill) {
    if (drag || key === legendKey) return;
    legendKey = key;
    legend.textContent = "";
    fill();
  }

  function addMarkSwatch(index, label) {
    var item = document.createElement("span");
    var swatch = document.createElement("canvas");
    swatch.className = "brand-mark";
    swatch.width = 22;
    swatch.height = 22;
    swatch.getContext("2d").drawImage(sprite(index), 0, 0, 22, 22);
    item.appendChild(swatch);
    item.appendChild(document.createTextNode(label));
    legend.appendChild(item);
  }

  var factorySprite = null;

  function factoryMark() {
    if (factorySprite) return factorySprite;
    var canvasMark = document.createElement("canvas");
    canvasMark.width = 64;
    canvasMark.height = 64;
    var g = canvasMark.getContext("2d");
    g.lineJoin = "miter";
    g.fillStyle = "#b06a58";
    g.fillRect(16, 6, 8, 20);
    g.fillRect(34, 2, 8, 24);
    g.strokeStyle = "#4a5158";
    g.lineWidth = 2;
    g.strokeRect(16, 6, 8, 20);
    g.strokeRect(34, 2, 8, 24);
    g.fillStyle = "#7a463c";
    g.fillRect(14, 4, 12, 5);
    g.fillRect(32, 0, 12, 5);
    g.fillStyle = "#e4e1db";
    g.fillRect(6, 26, 52, 34);
    g.fillStyle = "#4a5158";
    g.fillRect(4, 22, 56, 8);
    g.lineWidth = 3;
    g.strokeRect(6, 26, 52, 34);
    g.fillStyle = "#5f7f99";
    g.fillRect(12, 36, 8, 8);
    g.fillRect(28, 36, 8, 8);
    g.fillRect(44, 36, 8, 8);
    g.fillRect(12, 50, 8, 6);
    g.fillRect(28, 50, 8, 6);
    g.fillRect(44, 50, 8, 6);
    factorySprite = canvasMark;
    return canvasMark;
  }

  function addFactorySwatch() {
    var item = document.createElement("span");
    var swatch = document.createElement("canvas");
    swatch.className = "factory-mark";
    swatch.width = 64;
    swatch.height = 64;
    swatch.getContext("2d").drawImage(factoryMark(), 0, 0);
    item.appendChild(swatch);
    item.appendChild(document.createTextNode("Distribution center"));
    legend.appendChild(item);
  }

  function addSwatch(color, label, open) {
    var item = document.createElement("span");
    var swatch = document.createElement("i");
    swatch.className = "health-swatch";
    swatch.style.background = color;
    if (open) swatch.style.boxShadow = "inset 0 0 0 2px #8a4d3a";
    item.appendChild(swatch);
    item.appendChild(document.createTextNode(label));
    legend.appendChild(item);
  }

  function drawCenters() {
    data.centers.forEach(function (center, index) {
      var p = toPx(center.lon, center.lat);
      if (p[0] < -20 || p[1] < -20 || p[0] > cssW + 20 || p[1] > cssH + 20) return;
      var size = index === selectedCenter ? 44 : 34;
      ctx.save();
      ctx.shadowColor = "#f4f0e6";
      ctx.shadowBlur = 5;
      ctx.drawImage(factoryMark(), p[0] - size / 2, p[1] - size / 2, size, size);
      ctx.restore();
      ctx.drawImage(factoryMark(), p[0] - size / 2, p[1] - size / 2, size, size);
    });
  }

  function nearestPlace(x, y) {
    var best = null;
    var bestD = Math.max(10, markSize() * 0.65);
    var places = data.places;
    for (var i = 0; i < places.length; i++) {
      var place = places[i];
      if (!placeVisible(place, i)) continue;
      var p = toPx(place[0], place[1]);
      var d = Math.hypot(p[0] - x, p[1] - y);
      if (d < bestD) {
        bestD = d;
        best = place;
      }
    }
    return best;
  }

  function nearestCenter(x, y) {
    if (!showCenters) return -1;
    var best = -1;
    var bestD = 18;
    data.centers.forEach(function (center, index) {
      var p = toPx(center.lon, center.lat);
      var d = Math.hypot(p[0] - x, p[1] - y);
      if (d < bestD) {
        bestD = d;
        best = index;
      }
    });
    return best;
  }

  var QSR = "Year-end 2024 U.S. units, QSR Magazine 2025 QSR 50.";
  var QSR_EST = "Year-end 2024 U.S. units, QSR Magazine 2025 QSR 50. QSR estimated this figure.";
  var PUBLISHED = {
    "McDonald's": { n: 13706, note: "U.S. systemwide restaurants at December 31, 2025, McDonald's Form 10-K." },
    "Subway": { n: 19502, note: QSR_EST },
    "Chick-fil-A": { n: 3109, note: QSR_EST },
    "Taco Bell": { n: 7604, note: QSR },
    "Wendy's": { n: 5933, note: QSR },
    "Dunkin'": { n: 9768, note: QSR },
    "Chipotle": { n: 3644, note: QSR },
    "Burger King": { n: 6701, note: QSR },
    "Domino's": { n: 7014, note: QSR },
    "Panda Express": { n: 2505, note: QSR },
    "Panera Bread": { n: 2206, note: QSR },
    "Popeyes": { n: 3148, note: QSR },
    "Pizza Hut": { n: 6557, note: QSR },
    "Sonic": { n: 3461, note: QSR },
    "Raising Cane's": { n: 828, note: QSR },
    "Dairy Queen": { n: 4212, note: QSR },
    "KFC": { n: 3669, note: QSR },
    "Wingstop": { n: 2204, note: QSR },
    "Jack in the Box": { n: 2187, note: QSR },
    "Arby's": { n: 3365, note: QSR },
    "Whataburger": { n: 1085, note: QSR },
    "Papa John's": { n: 3291, note: QSR_EST },
    "Jersey Mike's Subs": { n: 2997, note: QSR },
    "Culver's": { n: 997, note: QSR },
    "Little Caesars": { n: 4285, note: QSR_EST },
    "Zaxby's": { n: 968, note: QSR },
    "Jimmy John's": { n: 2689, note: QSR },
    "Five Guys": { n: 1488, note: QSR },
    "In-N-Out Burger": { n: 415, note: QSR_EST },
    "Bojangles'": { n: 825, note: QSR },
    "Hardee's": { n: 1597, note: QSR_EST },
    "Carl's Jr.": { n: 1063, note: QSR_EST },
    "Tropical Smoothie Cafe": { n: 1515, note: QSR },
    "Shake Shack": { n: 373, note: QSR_EST },
    "Qdoba": { n: 777, note: QSR },
    "Firehouse Subs": { n: 1233, note: QSR },
    "El Pollo Loco": { n: 498, note: QSR },
    "Marco's Pizza": { n: 1162, note: QSR },
    "Freddy's": { n: 550, note: QSR },
    "Del Taco": { n: 594, note: QSR },
    "Checkers": { n: 761, note: "Year-end 2024 U.S. units for Checkers and Rally's together, QSR Magazine 2025 QSR 50. QSR does not split the two names." },
    "Church's Chicken": { n: 761, note: QSR },
    "Krispy Krunchy Chicken": { n: 3168, note: QSR },
    "Auntie Anne's": { n: 1221, note: QSR },
    "Smoothie King": { n: 1201, note: QSR },
    "Moe's Southwest Grill": { n: 596, note: QSR },
    "Habit Burger & Grill": { n: 377, note: QSR },
    "Sweetgreen": { n: 246, note: QSR },
    "Potbelly": { n: 442, note: QSR },
    "Captain D's": { n: 530, note: QSR },
    "Jamba": { n: 727, note: QSR },
    "Slim Chickens": { n: 207, note: QSR },
    "Hungry Howie's": { n: 509, note: QSR },
    "Taco John's": { n: 340, note: QSR },
    "Chicken Salad Chick": { n: 289, note: QSR },
    "Schlotzsky's": { n: 308, note: QSR },
    "Pollo Campero": { n: 120, note: QSR },
    "Jollibee": { n: 75, note: QSR },
    "Shipley Do-Nuts": { n: 366, note: QSR },
    "Playa Bowls": { n: 290, note: QSR },
    "Krystal": { n: 279, note: QSR },
    "Cinnabon": { n: 1034, note: QSR },
    "Fazoli's": { n: 196, note: QSR },
    "Penn Station": { n: 322, note: QSR },
    "Sbarro": { n: 375, note: QSR },
    "Lee's Famous Recipe Chicken": { n: 126, note: QSR },
    "Great American Cookies": { n: 397, note: QSR },
    "Bubbakoo's Burritos": { n: 130, note: QSR },
    "Mooyah": { n: 74, note: QSR },
    "Hot Head Burritos": { n: 83, note: QSR }
  };

  function listedCount(index) {
    var pub = PUBLISHED[data.brands[index]];
    return pub ? pub.n : data.counts[index];
  }

  function describe() {
    var mapped = data.places.length;
    var sentence = "This map draws " + commas(mapped) + " fast-food restaurants with a brand that has at least 25 tagged locations.";
    if (data.other) sentence += " " + commas(data.other) + " other branded restaurants are counted and left off the map.";
    if (hoodFilter !== null && hoods && hoods.areas[hoodFilter]) {
      var area = hoods.areas[hoodFilter];
      sentence = hoodLabel(area) + " has " + commas(area.n) + " tagged restaurants within 2 kilometers of that name.";
      if (hoodBrand !== "") sentence += " " + commas(hoodCount(area)) + " are " + data.brands[Number(hoodBrand)] + ".";
    } else if (brandFilter !== null) {
      var name = data.brands[brandFilter];
      var tagged = data.counts[brandFilter];
      var pub = PUBLISHED[name];
      if (pub) {
        sentence = name + " has " + commas(pub.n) + " U.S. restaurants in the published count. This map draws " + commas(tagged) + " tagged locations. " + pub.note;
      } else if (name === "Rally's") {
        sentence = "Rally's has " + commas(tagged) + " tagged locations on this map. QSR Magazine counts Checkers and Rally's together: 761 U.S. units at year-end 2024, with no split between the names.";
      } else if (name === "DQ Grill & Chill") {
        sentence = "DQ Grill & Chill has " + commas(tagged) + " tagged locations on this map. QSR Magazine's Dairy Queen total is 4,212 U.S. units at year-end 2024. That total is listed on the Dairy Queen row.";
      } else if (name === "The Habit Burger Grill") {
        sentence = "The Habit Burger Grill has " + commas(tagged) + " tagged locations on this map. QSR Magazine's Habit Burger & Grill total is 377 U.S. units at year-end 2024. That total is listed on the Habit Burger & Grill row.";
      } else {
        sentence = name + " has " + commas(tagged) + " tagged locations on this map. No published U.S. total is listed for this brand.";
      }
    } else if (CHEM[chemId] && CHEM[chemId].mapLine && (studyIds || CHEM[chemId].unfiltered)) {
      sentence = CHEM[chemId].mapLine;
    }
    if (picked) sentence = picked;
    readout.textContent = sentence;
  }

  function renderBrands() {
    var order = data.brands.map(function (name, index) { return index; });
    order.sort(function (a, b) {
      if (brandSort === "name") return data.brands[a].localeCompare(data.brands[b]);
      return listedCount(b) - listedCount(a) || data.brands[a].localeCompare(data.brands[b]);
    });
    brandBox.textContent = "";
    var all = document.createElement("button");
    all.type = "button";
    all.textContent = "All brands · " + commas(data.places.length) + " tagged";
    if (brandFilter === null) all.className = "is-on";
    all.addEventListener("click", function () {
      brandFilter = null;
      chemId = null;
      studyIds = null;
      picked = "";
      renderBrands();
      renderChemicals();
      describe();
      draw();
    });
    brandBox.appendChild(all);
    order.forEach(function (index) {
      var button = document.createElement("button");
      button.type = "button";
      var mark = document.createElement("canvas");
      mark.className = "brand-mark";
      mark.width = 64;
      mark.height = 64;
      mark.setAttribute("aria-hidden", "true");
      mark.getContext("2d").drawImage(sprite(index), 0, 0);
      button.appendChild(mark);
      var label = document.createElement("span");
      var brandName = data.brands[index];
      var published = PUBLISHED[brandName];
      if (published) {
        label.textContent = brandName + " · " + commas(published.n);
        button.title = commas(data.counts[index]) + " tagged on this map. " + published.note;
      } else {
        label.textContent = brandName + " · " + commas(data.counts[index]) + " tagged";
        button.title = "OpenStreetMap count. No separate published U.S. total is listed for this brand.";
      }
      button.appendChild(label);
      if (brandFilter === index) button.className = "is-on";
      button.addEventListener("click", function () {
        brandFilter = index;
        picked = "";
        selectedCenter = null;
        renderBrands();
        renderCenters();
        describe();
        draw();
      });
      brandBox.appendChild(button);
    });
    renderChainCompare();
  }

  function renderChainCompare() {
    var box = document.getElementById("chain-rank-visual");
    if (!box || !data) return;
    box.textContent = "";
    var fryHead = document.createElement("h3");
    fryHead.textContent = "Acrylamide in french fries";
    box.appendChild(fryHead);
    var fryNote = document.createElement("p");
    fryNote.textContent = "FDA survey, data through November 15, 2002. Bar length is the median of that chain's fry samples, in micrograms per kilogram. A chain with one sample shows that sample. The highest and lowest labels are the ends of this table. The FDA says the results vary from sample to sample and should not be used to choose a brand. A later table of single samples is not mixed into this rank.";
    box.appendChild(fryNote);
    var chem = CHEM.Acrylamide;
    var max = 0;
    var min = Infinity;
    chem.foods.forEach(function (food) {
      if (food.median > max) max = food.median;
      if (food.median < min) min = food.median;
    });
    chem.labels.forEach(function (label, index) {
      var food = chem.foods[index];
      var name = chem.mapNames[index];
      var brandIndex = data.brands.indexOf(name);
      var highest = food.median === max;
      var lowest = food.median === min;
      var line = document.createElement("button");
      line.type = "button";
      line.className = "chem-row" + (highest ? " is-high" : "");
      if (brandIndex >= 0 && brandFilter === brandIndex) line.className += " is-on";
      var title = document.createElement("span");
      title.textContent = name;
      var track = document.createElement("span");
      track.className = "chem-track";
      var bar = document.createElement("i");
      bar.style.width = max > 0 ? (100 * food.median / max) + "%" : "0%";
      track.appendChild(bar);
      var text = document.createElement("span");
      text.textContent = (highest ? "Highest in this table · " : lowest ? "Lowest in this table · " : "") + food.note;
      line.appendChild(title);
      line.appendChild(track);
      line.appendChild(text);
      line.addEventListener("click", function () {
        if (brandIndex < 0) return;
        brandFilter = brandIndex;
        chemId = null;
        studyIds = null;
        hoodFilter = null;
        selectedCenter = null;
        picked = name + " is in the FDA fry table through November 15, 2002: " + food.note + ". The FDA says these results should not be used to choose a brand. The map draws this chain's tagged locations, not the restaurants the FDA sampled.";
        renderBrands();
        renderChemicals();
        if (hoods) renderHoods();
        describe();
        draw();
      });
      box.appendChild(line);
    });
    var fud = document.createElement("p");
    fud.className = "note";
    fud.textContent = "Fuddruckers is in the same FDA table. Its two samples were 346 and 452 µg/kg. It is not on this map, and those two samples are not shown as a median.";
    box.appendChild(fud);

    var plasticHead = document.createElement("h3");
    plasticHead.textContent = "Plasticizers, with the chain names withheld";
    box.appendChild(plasticHead);
    var plasticNote = document.createElement("p");
    plasticNote.textContent = "Edwards and coauthors, San Antonio, 2017–2018. Each pair is one chemical. The longer bar is the higher amount the paper printed. The paper does not say which of the two chains that bar belongs to. A bar in one pair is not comparable to a bar in another pair.";
    box.appendChild(plasticNote);
    var pairs = [
      ["DEHP", "Hamburger chains: McDonald's and Burger King.", "One chain · 44 µg/kg", "The other chain · 23 µg/kg", 44, 23],
      ["DnBP", "Hamburger chains: McDonald's and Burger King.", "One chain · 5.0 µg/kg", "The other chain · 2.8 µg/kg", 5, 2.8],
      ["DEHA", "Tex-Mex chains: Taco Bell and Chipotle.", "One chain · 63.4 µg/kg", "The other chain · below the detection limit", 63.4, 0],
      ["DiNP", "Tex-Mex chains: Taco Bell and Chipotle.", "One chain · 53 µg/kg", "The other chain · 11.5 µg/kg", 53, 11.5],
      ["DnOP", "Pizza chains: Pizza Hut and Domino's.", "One chain · 2.3 µg/kg", "The other chain · below the detection limit", 2.3, 0]
    ];
    pairs.forEach(function (pair) {
      var heading = document.createElement("p");
      heading.className = "chem-set";
      heading.textContent = pair[0] + ". " + pair[1] + " The paper does not say which name was higher.";
      box.appendChild(heading);
      var high = pair[4];
      [["is-high", pair[2], pair[4]], ["", pair[3], pair[5]]].forEach(function (row) {
        var line = document.createElement("div");
        line.className = "chem-row " + row[0];
        var name = document.createElement("span");
        name.textContent = pair[0];
        var track = document.createElement("span");
        track.className = "chem-track";
        var bar = document.createElement("i");
        bar.style.width = high > 0 ? (100 * row[2] / high) + "%" : "0%";
        track.appendChild(bar);
        var text = document.createElement("span");
        text.textContent = row[1];
        line.appendChild(name);
        line.appendChild(track);
        line.appendChild(text);
        box.appendChild(line);
      });
    });
    var dinch = document.createElement("p");
    dinch.textContent = "DINCH was found in hamburgers from only one of the two hamburger chains, McDonald's and Burger King. The paper does not name that chain and does not print a separate median for it.";
    box.appendChild(dinch);

    var packHead = document.createElement("h3");
    packHead.textContent = "Packaging";
    box.appendChild(packHead);
    var pack = document.createElement("p");
    pack.textContent = "Schaider and coauthors measured total fluorine and PFOA in packaging collected in 2014 and 2015. The detection table does not name chains, so this page cannot show a higher or a lower chain for those chemicals. The measurement is of the package, not of the food.";
    box.appendChild(pack);
  }

  var STUDY_CHAINS = {
    burger: ["McDonald's", "Burger King"],
    texmex: ["Taco Bell", "Chipotle"],
    pizza: ["Pizza Hut", "Domino's"]
  };
  var CHEM_FOODS = [
    ["hamburger", "Hamburger with toppings"],
    ["fries", "French fries"],
    ["burrito", "Chicken burrito"],
    ["pizza", "Cheese pizza"],
    ["nuggets", "Chicken nuggets"],
    ["patty", "Plain hamburger patty"]
  ];
  function foodRow(tested, pct, median) {
    return { tested: tested, pct: pct, median: median, sampled: tested > 0 };
  }
  var NONE = foodRow(0, null, null);
  var CHEM = {
    DEHT: {
      group: "texmex",
      foods: [foodRow(13, 100, 2200), foodRow(3, 0, null), foodRow(6, 100, 6000), NONE, NONE, NONE],
      finding: "The highest amount was in chicken burritos: median 6,000 µg/kg in the 6 burritos tested for DEHT. Hamburgers with toppings were 2,200 µg/kg. None of the 3 orders of french fries had it. Cheese pizza, chicken nuggets, and plain patties were not tested for DEHT.",
      chains: "Those burritos were bought at Taco Bell and Chipotle. The paper does not say which of the two had more.",
      mapLine: "Chicken burritos had the highest DEHT. The map shows Taco Bell and Chipotle, the two Tex-Mex chains in the study. These marks are every tagged location of those chains, not the San Antonio restaurants that were tested.",
      body: "DEHT is a terephthalate used in place of DEHP. In the animal studies the Consumer Product Safety Commission reviewed, it did not reduce fertility or sperm measures. The fast-food paper says most of those studies were paid for by industry, and that the few human studies of hormones do not agree. Harm of the kind shown for DEHP is not established."
    },
    DnBP: {
      group: "burger",
      foods: [foodRow(21, 100, 4.8), foodRow(10, 80, 4.5), foodRow(14, 71, 3.5), foodRow(8, 100, 4.1), foodRow(7, 57, 2.4), foodRow(4, 25, null)],
      finding: "DnBP was in every hamburger with toppings and every cheese pizza. The medians were close: 4.8 µg/kg in hamburgers, 4.5 in fries, 4.1 in cheese pizza, 3.5 in chicken burritos, and 2.4 in chicken nuggets. The paper says the food medians were statistically similar. Across all foods from one hamburger chain the median was 5.0 µg/kg, and from the other it was 2.8. The paper does not say which chain was higher.",
      chains: "The hamburger chains in the study were McDonald's and Burger King.",
      mapLine: "DnBP was in every hamburger the study bought. The map shows McDonald's and Burger King. The paper found a difference between those two chains and does not say which one was higher. These marks are every tagged location, not the San Antonio restaurants that were tested.",
      body: "DnBP can suppress testosterone. An EPA review of human studies found robust evidence linking it with semen measures and a longer time to pregnancy. In animals it disrupts development of the male reproductive system."
    },
    DEHP: {
      group: "burger",
      foods: [foodRow(21, 100, 36), foodRow(10, 70, 23.7), foodRow(14, 57, 23), foodRow(8, 0, null), foodRow(7, 100, 26), foodRow(4, 50, 14)],
      finding: "DEHP was in every hamburger with toppings. The hamburger median was 36 µg/kg. Chicken nuggets were 26, fries 23.7, chicken burritos 23, and plain patties 14. It was not detected in cheese pizza. Across all foods from one hamburger chain the median was 44 µg/kg, and from the other it was 23. The paper does not say which chain was higher.",
      chains: "The hamburger chains in the study were McDonald's and Burger King.",
      mapLine: "Hamburgers had the highest DEHP median. The map shows McDonald's and Burger King. The paper found a difference between those two chains and does not say which one was higher. These marks are every tagged location, not the San Antonio restaurants that were tested.",
      body: "ATSDR reports that higher exposure in men has been linked with lower testosterone and lower sperm motility. Higher exposure in pregnancy has been linked with preterm birth and, in children, with a shift in the timing of puberty and with testicles that do not descend. In animals it damages the testes and, before birth, male reproductive development. The EPA review called the human evidence for those male reproductive effects robust."
    },
    DEHA: {
      group: "texmex",
      foods: [foodRow(21, 62, 6.7), foodRow(10, 30, null), foodRow(14, 71, 45.7), foodRow(8, 0, null), foodRow(7, 0, null), foodRow(4, 0, null)],
      finding: "The highest amount was in chicken burritos: median 45.7 µg/kg, against 6.7 in hamburgers with toppings. It was not detected in cheese pizza, chicken nuggets, or plain patties. One Tex-Mex chain's foods had a median of 63.4 µg/kg. The other was below the detection limit. The paper does not say which chain was which.",
      chains: "The Tex-Mex chains in the study were Taco Bell and Chipotle.",
      mapLine: "Chicken burritos had the highest DEHA. The map shows Taco Bell and Chipotle. The paper does not say which of the two had more. These marks are every tagged location, not the San Antonio restaurants that were tested.",
      body: "DEHA is an adipate, not a phthalate. In rats, a high dose reduced litter size and the weight of the offspring. The same reviews did not find the drop in testosterone seen with DEHP."
    },
    DEP: {
      group: "burger",
      foods: [foodRow(21, 38, null), foodRow(10, 50, null), foodRow(14, 36, null), foodRow(8, 13, null), foodRow(7, 29, null), foodRow(4, 100, 16.5)],
      finding: "The only median above the detection limit was in plain hamburger patties: 16.5 µg/kg, and all 4 patties had it. DEP was also found in 5 of 10 orders of fries and 8 of 21 hamburgers with toppings, but those medians were below the detection limit.",
      chains: "The patties came from the hamburger chains in the study, McDonald's and Burger King. The paper does not say which chain's patties were higher.",
      mapLine: "Plain hamburger patties had the only DEP median above the detection limit. The map shows McDonald's and Burger King. The paper does not say which chain was higher. These marks are every tagged location, not the San Antonio restaurants that were tested.",
      body: "DEP is a weaker suppressor of testosterone than DEHP or DnBP in animal studies. The EPA review found slight evidence of male reproductive effects in people, and moderate evidence of a link with preterm birth."
    },
    DiBP: {
      group: "burger",
      foods: [foodRow(8, 88, 2.7), foodRow(7, 57, 1.2), foodRow(8, 13, null), foodRow(8, 50, 1.9), foodRow(7, 0, null), foodRow(4, 0, null)],
      finding: "DiBP was measured only in the first round. The highest median was in hamburgers with toppings: 2.7 µg/kg, in 7 of 8 hamburgers. Cheese pizza was 1.9 and fries were 1.2. Chicken nuggets and plain patties were below the detection limit.",
      chains: "The hamburger chains in the study were McDonald's and Burger King. The paper does not give a named-chain ranking for DiBP.",
      mapLine: "Hamburgers had the highest DiBP median. The map shows McDonald's and Burger King. The paper does not say which chain had more. These marks are every tagged location, not the San Antonio restaurants that were tested.",
      body: "DiBP is close in structure to DnBP, and in animals it can suppress testosterone. The EPA review found only slight evidence in people. It said the studies were fewer, and the exposures lower, than for DnBP."
    },
    DiNP: {
      group: "texmex",
      foods: [foodRow(8, 0, null), foodRow(7, 0, null), foodRow(8, 100, 36), foodRow(8, 50, 5.9), foodRow(7, 0, null), foodRow(4, 0, null)],
      finding: "DiNP was measured only in the first round. It was in every chicken burrito, median 36 µg/kg. Cheese pizza was 5.9. It was not detected in hamburgers, fries, chicken nuggets, or plain patties. One Tex-Mex chain's median was 53 µg/kg and the other's was 11.5. The paper does not say which chain was higher.",
      chains: "The Tex-Mex chains in the study were Taco Bell and Chipotle.",
      mapLine: "Chicken burritos had the highest DiNP. The map shows Taco Bell and Chipotle. The paper does not say which of the two had more. These marks are every tagged location, not the San Antonio restaurants that were tested.",
      body: "The EPA review found moderate evidence linking DiNP with lower testosterone and changes in semen measures. That evidence is weaker than the evidence for DEHP."
    },
    BBzP: {
      group: "burger",
      foods: [foodRow(21, 29, null), foodRow(10, 40, null), foodRow(14, 7, null), foodRow(8, 0, null), foodRow(7, 29, null), foodRow(4, 0, null)],
      finding: "No food had a median above the detection limit. BBzP showed up most often in french fries: 4 of 10 orders. It was in 6 of 21 hamburgers with toppings and 2 of 7 orders of chicken nuggets. It was not detected in cheese pizza or plain patties.",
      chains: "The fries came from the hamburger chains in the study, McDonald's and Burger King. The paper does not say which chain's fries had more.",
      mapLine: "French fries had BBzP most often, and the median was still below the detection limit. The map shows McDonald's and Burger King. These marks are every tagged location, not the San Antonio restaurants that were tested.",
      body: "The EPA review found moderate evidence linking BBzP with semen measures and a longer time to pregnancy."
    },
    DINCH: {
      group: "burger",
      foods: [foodRow(21, 24, null), foodRow(10, 0, null), foodRow(14, 0, null), foodRow(8, 0, null), foodRow(7, 29, null), foodRow(4, 50, 16.3)],
      finding: "The only median above the detection limit was in plain hamburger patties: 16.3 µg/kg, in 2 of 4 patties. In hamburgers with toppings the median was below the detection limit, and the 95th percentile was 590 µg/kg. It was not detected in fries, chicken burritos, or cheese pizza. The paper found DINCH in hamburgers from only one of the two hamburger chains, and does not name that chain.",
      chains: "The hamburger chains in the study were McDonald's and Burger King.",
      mapLine: "Plain patties had the only DINCH median above the detection limit. The map shows McDonald's and Burger King. The paper does not name which chain's hamburgers had DINCH. These marks are every tagged location, not the San Antonio restaurants that were tested.",
      body: "DINCH is a replacement plasticizer. A two-generation study in rats found no effect on reproduction at doses up to 1,000 mg per kilogram of body weight a day. The parent animals had higher liver and kidney weights. The fast-food paper says later experiments disagree about the testes, and human studies are few."
    },
    DnOP: {
      group: "pizza",
      foods: [foodRow(21, 0, null), foodRow(10, 0, null), foodRow(14, 0, null), foodRow(8, 38, null), foodRow(7, 14, null), foodRow(4, 0, null)],
      finding: "DnOP was uncommon. It was detected in 3 of 8 cheese pizzas and 1 of 7 orders of chicken nuggets, and every median was below the detection limit. One pizza chain's foods had a median of 2.3 µg/kg. The other pizza chain was below the detection limit. The paper does not say which chain was which.",
      chains: "The pizza chains in the study were Pizza Hut and Domino's.",
      mapLine: "Cheese pizza was the food where DnOP showed up most often. The map shows Pizza Hut and Domino's. The paper does not say which chain had more. These marks are every tagged location, not the San Antonio restaurants that were tested.",
      body: "DnOP was outside the EPA review of reproductive effects. Animal studies report changes in the liver. Evidence that it suppresses testosterone the way DEHP does is limited."
    },
    DMP: {
      group: null,
      foods: [foodRow(21, 0, null), foodRow(10, 0, null), foodRow(14, 0, null), foodRow(8, 0, null), foodRow(7, 0, null), foodRow(4, 0, null)],
      finding: "DMP was not detected in any of the 64 foods.",
      chains: "There is no chain to rank, because the chemical was not found.",
      mapLine: "",
      body: "DMP was not detected in any food in this study. It is a smaller phthalate, and it is not established as a testosterone suppressor the way DEHP is."
    },
    Acrylamide: {
      mapNames: ["Popeyes", "Chick-fil-A", "Checkers", "McDonald's", "Wendy's", "Arby's", "Burger King", "KFC"],
      labels: [
        ["popeyes", "Popeyes fries"],
        ["cfa", "Chick-fil-A fries"],
        ["checkers", "Checkers fries"],
        ["mcdonalds", "McDonald's fries"],
        ["wendys", "Wendy's fries"],
        ["arbys", "Arby's fries"],
        ["bk", "Burger King fries"],
        ["kfc", "KFC fries"]
      ],
      foods: [
        { tested: 4, pct: 100, median: 547, sampled: true, note: "547 µg/kg median · 4 samples, 301 to 1,030" },
        { tested: 1, pct: 100, median: 389, sampled: true, note: "389 µg/kg · 1 sample" },
        { tested: 2, pct: 100, median: 332, sampled: true, note: "332 µg/kg median · 2 samples, 257 to 407" },
        { tested: 7, pct: 100, median: 270, sampled: true, note: "270 µg/kg median · 7 samples, 155 to 497" },
        { tested: 5, pct: 100, median: 254, sampled: true, note: "254 µg/kg median · 5 samples, 157 to 302" },
        { tested: 1, pct: 100, median: 252, sampled: true, note: "252 µg/kg · 1 sample" },
        { tested: 3, pct: 100, median: 220, sampled: true, note: "220 µg/kg median · 3 samples, 197 to 369" },
        { tested: 4, pct: 100, median: 216, sampled: true, note: "216 µg/kg median · 4 samples, 117 to 313" }
      ],
      scaleNote: "Bar length is the median of that chain's french-fry samples, in micrograms per kilogram. A chain with one sample shows that sample. The FDA says the results vary from sample to sample and should not be used to choose a brand.",
      finding: "All 29 restaurant french-fry samples in this table had acrylamide. The median of all 29 was 270 µg/kg, and the range was 117 to 1,030. Fuddruckers is not on this map. Its two samples were 346 and 452. A later FDA table, data through October 7, 2004, reports single samples: McDonald's french fries 428, Chick-fil-A waffle fries 271, Long John Silver's french fries 337, Burger King hash browns 768, Taco Bell Mexican pizza 53, and a Taco Bell bean burrito below the detection limit.",
      chains: "The map shows the chains in the 2002 fry table that are on this map. The marks are every tagged location, not the restaurants the FDA sampled.",
      mapLine: "Acrylamide was measured in french fries. The map shows the sampled chains that are on this map. These marks are every tagged location, not the restaurants the FDA sampled. The FDA says the results should not be used to choose a brand.",
      review: "The sentence on cancer in laboratory animals is from the FDA's acrylamide survey page.",
      body: "Acrylamide forms when sugars and the amino acid asparagine are cooked at high temperature, as in frying. The FDA reports that high levels caused cancer in laboratory animals, and that those levels were much greater than the levels in human food."
    },
    Fluorine: {
      unfiltered: true,
      labels: [
        ["texmex", "Tex-Mex packaging"],
        ["dessert", "Dessert and bread wrappers"],
        ["burger", "Sandwich and burger wrappers"],
        ["board", "Food-contact paperboard"],
        ["drink", "Other beverage containers"],
        ["cups", "Paper cups"],
        ["outer", "Paper not touching the food"]
      ],
      foods: [
        { tested: 42, pct: 57, median: null, sampled: true },
        { tested: 68, pct: 56, median: null, sampled: true },
        { tested: 138, pct: 38, median: null, sampled: true },
        { tested: 80, pct: 20, median: null, sampled: true },
        { tested: 25, pct: 16, median: null, sampled: true },
        { tested: 30, pct: 0, median: null, sampled: true },
        { tested: 15, pct: 0, median: null, sampled: true }
      ],
      scaleNote: "Bar length is how often total fluorine was above 16 nmol per square centimeter. This is a marker used for PFAS. It is not a measurement of the food.",
      finding: "Of 407 packages, 33% had detectable total fluorine. Dessert and bread wrappers and Tex-Mex packaging had higher detection rates than the other food-contact papers. The main table does not name the chains. A subset of 20 packages was tested for individual PFAS. Some samples with high total fluorine did not show high levels of the PFAS that test could measure.",
      chains: "The map is not filtered. The published detection table does not name the restaurants.",
      mapLine: "Total fluorine was measured in packaging, not in the food. The study's detection table does not name chains, so the map is not filtered.",
      review: "The sentence on health effects is from Schaider and coauthors, 2017. It describes some PFAS, not a dose from one wrapper.",
      body: "The study measured total fluorine in packaging as a marker for PFAS, which are per- and polyfluoroalkyl substances. The authors write that some PFAS have been associated with cancer, developmental toxicity, immunotoxicity, and other health effects. This chart is not a measurement of those effects in a person, and it is not a measurement of the food."
    },
    PFOA: {
      unfiltered: true,
      labels: [["subset", "Packaging tested for individual PFAS"]],
      foods: [
        { tested: 20, pct: 30, median: null, sampled: true, note: "Detected in 6 of 20 packaging samples" }
      ],
      scaleNote: "The bar is the share of the 20 packaging samples in which PFOA was detected. The study did not publish a concentration in the food.",
      finding: "Six of 20 packages collected in 2014 and 2015 had detectable PFOA. The paper notes that U.S. manufacturers had agreed in 2011 to stop distributing products containing C8 perfluorinated compounds for food contact in interstate commerce.",
      chains: "The map is not filtered. The paper does not tie these 6 samples to named restaurants in the detection summary.",
      mapLine: "PFOA was measured in a subset of packaging, not in the food. The map is not filtered to a chain.",
      review: "The detection count is from Schaider and coauthors, 2017.",
      body: "PFOA is one PFAS. In this study it was found in packaging, including after a voluntary agreement to stop distributing C8 compounds for food contact. The chart does not report how much was in the food."
    }
  };

  var EXTRA_CHEMICALS = [
    { name: "Acrylamide", full: "Acrylamide", detected: 100, of: "29 restaurant french-fry samples, FDA survey data through November 15, 2002", set: "fries" },
    { name: "Fluorine", full: "Total fluorine, a marker for PFAS in packaging", detected: 33, of: "407 fast-food packages", set: "pack" },
    { name: "PFOA", full: "Perfluorooctanoic acid, measured in packaging", detected: 30, of: "20 packaging samples tested for individual PFAS", set: "pack" }
  ];

  function syncStudy() {
    var chem = CHEM[chemId];
    var names = chem && (chem.mapNames || (chem.group ? STUDY_CHAINS[chem.group] : null));
    if (!names) {
      studyIds = null;
      return;
    }
    studyIds = names.map(function (name) {
      return data.brands.indexOf(name);
    }).filter(function (index) { return index >= 0; });
  }

  function chemAmount(n) {
    if (n >= 100) return commas(Math.round(n));
    return String(n);
  }

  var HARM_LINE = {
    DEHT: "Harm of the DEHP kind is not established.",
    DnBP: "Can suppress testosterone. Linked with semen measures and a longer time to pregnancy.",
    DEHP: "Lower testosterone, lower sperm motility, and preterm birth.",
    DEHA: "High doses in rats reduced litter size and the weight of the offspring.",
    DEP: "Linked with preterm birth. Evidence of male reproductive effects is slight.",
    DiBP: "Can suppress testosterone in animals. Evidence in people is slight.",
    DiNP: "Linked with lower testosterone and changes in semen measures.",
    BBzP: "Linked with semen measures and a longer time to pregnancy.",
    DINCH: "Higher liver and kidney weights in the parent animals. That study found no effect on reproduction.",
    DnOP: "Animal studies report changes in the liver.",
    DMP: "Not detected. Not established as a testosterone suppressor.",
    Acrylamide: "Forms during high-temperature cooking. High doses caused cancer in laboratory animals. Those doses were much greater than the levels in food.",
    Fluorine: "A marker for PFAS in packaging, not a measurement of the food. Some PFAS are associated with cancer, developmental toxicity, and immunotoxicity.",
    PFOA: "One PFAS, detected in 6 of 20 packaging samples. Not a measurement of the food."
  };
  var harmCache = {};

  function harmSprite(name) {
    if (harmCache[name]) return harmCache[name];
    var mark = document.createElement("canvas");
    mark.width = 64;
    mark.height = 64;
    drawHarm(mark.getContext("2d"), name);
    harmCache[name] = mark;
    return mark;
  }

  function harmArrow(g, x, y, dir) {
    g.fillStyle = dir < 0 ? "#2a1458" : "#1c1915";
    g.beginPath();
    if (dir < 0) {
      g.moveTo(x, y + 28);
      g.lineTo(x - 14, y + 10);
      g.lineTo(x + 14, y + 10);
      g.fill();
      g.fillRect(x - 5, y, 10, 14);
    } else {
      g.moveTo(x, y);
      g.lineTo(x - 14, y + 16);
      g.lineTo(x + 14, y + 16);
      g.fill();
      g.fillRect(x - 5, y + 14, 10, 16);
    }
  }

  function harmSperm(g, x, y, limp, scale) {
    var s = scale || 1;
    g.fillStyle = "#c4b3ef";
    g.strokeStyle = "#2a1458";
    g.lineWidth = 4;
    g.lineCap = "round";
    g.beginPath();
    g.ellipse(x, y, 12 * s, 9 * s, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.beginPath();
    g.moveTo(x + 11 * s, y);
    if (limp) g.bezierCurveTo(x + 24 * s, y + 2, x + 20 * s, y + 20 * s, x + 8 * s, y + 30 * s);
    else g.bezierCurveTo(x + 24 * s, y - 10 * s, x + 34 * s, y + 4 * s, x + 38 * s, y - 8 * s);
    g.stroke();
  }

  function harmBaby(g, x, y, s) {
    g.fillStyle = "#ffd15c";
    g.strokeStyle = "#9a3d5c";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(x, y, 10 * s, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.beginPath();
    g.ellipse(x + 8 * s, y + 16 * s, 13 * s, 9 * s, 0.8, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }

  function harmClock(g, x, y, r) {
    g.fillStyle = "#ffffff";
    g.strokeStyle = "#2c261f";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.lineCap = "round";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x, y - r + 5);
    g.moveTo(x, y);
    g.lineTo(x + r - 6, y + 3);
    g.stroke();
  }

  function harmLiver(g, x, y, s) {
    g.fillStyle = "#9a3d5c";
    g.strokeStyle = "#2c261f";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x, y + 12 * s);
    g.quadraticCurveTo(x, y, x + 18 * s, y + 2 * s);
    g.quadraticCurveTo(x + 34 * s, y - 2 * s, x + 36 * s, y + 16 * s);
    g.quadraticCurveTo(x + 38 * s, y + 32 * s, x + 18 * s, y + 34 * s);
    g.quadraticCurveTo(x + 2 * s, y + 32 * s, x, y + 18 * s);
    g.closePath();
    g.fill();
    g.stroke();
  }

  function harmKidney(g, x, y) {
    g.fillStyle = "#e36b3a";
    g.strokeStyle = "#2c261f";
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(x, y, 12, 18, 0.2, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.strokeStyle = "#f7f1e4";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(x - 2, y, 7, Math.PI * 0.7, Math.PI * 1.4);
    g.stroke();
  }

  function harmFigure(g) {
    g.fillStyle = "#f7f1e4";
    g.strokeStyle = "#2c261f";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(24, 14, 8, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.strokeStyle = "#2c261f";
    g.lineWidth = 4;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(24, 22);
    g.lineTo(24, 44);
    g.moveTo(12, 30);
    g.lineTo(36, 30);
    g.moveTo(24, 44);
    g.lineTo(14, 58);
    g.moveTo(24, 44);
    g.lineTo(34, 58);
    g.stroke();
  }

  function drawHarm(g, name) {
    if (name === "DEHT") {
      harmFigure(g);
      g.fillStyle = "#5530a0";
      g.font = "700 28px Georgia, serif";
      g.fillText("?", 40, 42);
    } else if (name === "DMP") {
      harmFigure(g);
      g.strokeStyle = "#5530a0";
      g.lineWidth = 4;
      g.beginPath();
      g.arc(46, 32, 12, 0, Math.PI * 2);
      g.stroke();
    } else if (name === "DEHP") {
      harmSperm(g, 16, 16, true, 1.15);
      harmBaby(g, 44, 34, 1.05);
    } else if (name === "DnBP") {
      harmSperm(g, 16, 18, true, 1);
      harmClock(g, 48, 40, 16);
    } else if (name === "DiBP") {
      harmFigure(g);
      harmArrow(g, 48, 16, -1);
    } else if (name === "DiNP") {
      harmSperm(g, 18, 20, true, 1.2);
      harmArrow(g, 50, 16, -1);
    } else if (name === "BBzP") {
      harmSperm(g, 16, 30, false, 1);
      harmClock(g, 46, 28, 16);
    } else if (name === "DEP") {
      harmBaby(g, 22, 18, 1.45);
      harmArrow(g, 50, 18, -1);
    } else if (name === "DEHA") {
      [12, 32, 52].forEach(function (x, index) {
        g.strokeStyle = "#2c261f";
        g.lineWidth = 3;
        g.beginPath();
        g.arc(x, 32, 12, 0, Math.PI * 2);
        g.stroke();
        if (index < 2) {
          g.fillStyle = "#ffd15c";
          g.strokeStyle = "#9a3d5c";
          g.beginPath();
          g.arc(x, 34, 6, 0, Math.PI * 2);
          g.fill();
          g.stroke();
        }
      });
    } else if (name === "DINCH") {
      harmLiver(g, 2, 22, 1);
      harmKidney(g, 48, 40);
      harmArrow(g, 46, 2, 1);
    } else if (name === "DnOP") {
      harmLiver(g, 8, 12, 1.35);
      g.strokeStyle = "#f7f1e4";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(24, 28);
      g.quadraticCurveTo(34, 36, 28, 46);
      g.stroke();
    } else if (name === "Acrylamide") {
      band(g, 16, 10, 14, 46, 6, "#ffd15c");
      band(g, 34, 16, 14, 40, 6, "#f5a03a");
      g.strokeStyle = "#9a3d5c";
      g.lineWidth = 3;
      g.lineCap = "round";
      g.beginPath();
      g.arc(20, 14, 8, Math.PI * 1.1, Math.PI * 1.9);
      g.arc(38, 16, 7, Math.PI * 1.15, Math.PI * 1.85);
      g.stroke();
    } else if (name === "Fluorine" || name === "PFOA") {
      g.fillStyle = "#f7f1e4";
      g.strokeStyle = "#2c261f";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(10, 20);
      g.lineTo(54, 20);
      g.lineTo(46, 56);
      g.lineTo(18, 56);
      g.closePath();
      g.fill();
      g.stroke();
      g.beginPath();
      g.moveTo(10, 20);
      g.lineTo(22, 8);
      g.lineTo(54, 20);
      g.stroke();
      if (name === "PFOA") dot(g, 34, 38, 6, "#9a3d5c");
      else {
        dot(g, 26, 36, 3, "#5530a0");
        dot(g, 36, 42, 3, "#5530a0");
        dot(g, 44, 34, 3, "#5530a0");
      }
    }
  }

  function renderFoodFound() {
    var block = document.createElement("div");
    block.className = "food-found";
    var intro = document.createElement("p");
    intro.className = "note";
    intro.textContent = "In each food, these are the plasticizers Edwards and coauthors detected. The percent is how often that chemical was found in the orders of that food. It is not a dose. DiBP and DiNP were measured only in the first round, so those counts are smaller. DEHT was measured in the second round. Cheese pizza, chicken nuggets, and plain patties were not tested for DEHT.";
    block.appendChild(intro);
    var overall = {};
    data.chemicals.forEach(function (row) { overall[row.name] = row.detected; });
    var names = Object.keys(CHEM).filter(function (name) { return CHEM[name].labels == null && CHEM_FOODS.length === CHEM[name].foods.length; });
    CHEM_FOODS.forEach(function (label, index) {
      var head = document.createElement("h3");
      head.textContent = label[1];
      block.appendChild(head);
      var found = [];
      var missed = [];
      var skipped = [];
      names.forEach(function (name) {
        var food = CHEM[name].foods[index];
        if (!food.sampled) skipped.push(name);
        else if (food.pct > 0) found.push({ name: name, pct: food.pct, tested: food.tested, median: food.median });
        else missed.push(name);
      });
      found.sort(function (a, b) {
        return b.pct - a.pct || (overall[b.name] || 0) - (overall[a.name] || 0) || a.name.localeCompare(b.name);
      });
      found.forEach(function (item) {
        var line = document.createElement("div");
        line.className = "food-hit";
        var mark = document.createElement("canvas");
        mark.className = "harm-mark";
        mark.width = 64;
        mark.height = 64;
        mark.setAttribute("aria-hidden", "true");
        mark.getContext("2d").drawImage(harmSprite(item.name), 0, 0);
        var text = document.createElement("span");
        var amount = item.median === null ? "median below the detection limit" : "median " + chemAmount(item.median) + " µg/kg";
        text.textContent = item.name + " · " + item.pct + "% of " + item.tested + " · " + amount;
        line.appendChild(mark);
        line.appendChild(text);
        block.appendChild(line);
      });
      var rest = document.createElement("p");
      rest.className = "note";
      var sentence = "";
      if (missed.length) sentence += "Not detected: " + missed.join(", ") + ".";
      if (skipped.length) sentence += (sentence ? " " : "") + "Not tested: " + skipped.join(", ") + ".";
      rest.textContent = sentence;
      if (sentence) block.appendChild(rest);
    });
    return block;
  }

  function renderChemicals() {
    syncStudy();
    var picks = document.getElementById("chem-picks");
    var visual = document.getElementById("chem-visual");
    if (!picks || !visual) return;
    var rows = data.chemicals.slice();
    var byName = document.getElementById("chem-name").getAttribute("aria-pressed") === "true";
    function chemSet(row) { return row.set || "edwards"; }
    rows.sort(function (a, b) {
      if (chemSet(a) !== chemSet(b)) return 0;
      if (byName) return a.name.localeCompare(b.name);
      return b.detected - a.detected || a.name.localeCompare(b.name);
    });
    picks.textContent = "";
    var all = document.createElement("button");
    all.type = "button";
    all.textContent = "All locations";
    all.setAttribute("aria-pressed", chemId ? "false" : "true");
    if (!chemId) all.className = "is-on";
    all.addEventListener("click", function () {
      chemId = null;
      brandFilter = null;
      studyIds = null;
      picked = "";
      renderChemicals();
      renderBrands();
      describe();
      draw();
    });
    picks.appendChild(all);
    var setLabels = {
      edwards: "Plasticizers in the food. Edwards and coauthors, San Antonio, 2017–2018.",
      fries: "Acrylamide in restaurant fries. FDA survey, data through November 15, 2002.",
      pack: "In the packaging, not in the food. Schaider and coauthors, samples from 2014 and 2015."
    };
    var seenSet = {};
    var foodsDrawn = false;
    rows.forEach(function (row) {
      var setName = chemSet(row);
      if (!seenSet[setName]) {
        if (seenSet.edwards && setName !== "edwards" && !foodsDrawn) {
          picks.appendChild(renderFoodFound());
          foodsDrawn = true;
        }
        seenSet[setName] = true;
        var heading = document.createElement("p");
        heading.className = "chem-set";
        heading.textContent = setLabels[setName] || setName;
        picks.appendChild(heading);
      }
      var button = document.createElement("button");
      button.type = "button";
      var mark = document.createElement("canvas");
      mark.className = "harm-mark";
      mark.width = 64;
      mark.height = 64;
      mark.setAttribute("aria-hidden", "true");
      mark.getContext("2d").drawImage(harmSprite(row.name), 0, 0);
      button.appendChild(mark);
      var copy = document.createElement("span");
      copy.className = "chem-copy";
      var label = document.createElement("span");
      label.textContent = row.name + " " + row.detected + "%";
      var effect = document.createElement("span");
      effect.className = "chem-effect";
      effect.textContent = HARM_LINE[row.name] || "";
      copy.appendChild(label);
      copy.appendChild(effect);
      button.appendChild(copy);
      button.setAttribute("aria-label", row.name + " " + row.detected + "%. " + (HARM_LINE[row.name] || ""));
      button.setAttribute("aria-pressed", chemId === row.name ? "true" : "false");
      if (chemId === row.name) button.className = "is-on";
      button.addEventListener("click", function () {
        chemId = row.name;
        brandFilter = null;
        picked = "";
        selectedCenter = null;
        renderChemicals();
        renderBrands();
        renderCenters();
        describe();
        draw();
      });
      picks.appendChild(button);
    });
    if (seenSet.edwards && !foodsDrawn) picks.appendChild(renderFoodFound());
    visual.textContent = "";
    var chem = CHEM[chemId];
    if (!chem) {
      var prompt = document.createElement("p");
      prompt.textContent = "Choose a chemical. The chart names each food that was tested, says what the chemical does in the body, and draws the chains that sold the food with the highest amount.";
      visual.appendChild(prompt);
      return;
    }
    var rowMeta = null;
    rows.forEach(function (row) { if (row.name === chemId) rowMeta = row; });
    var title = document.createElement("h3");
    title.textContent = chemId + " · " + (rowMeta ? rowMeta.full : "");
    visual.appendChild(title);
    var found = document.createElement("p");
    found.textContent = "Found in " + (rowMeta ? rowMeta.detected + "% of " + rowMeta.of : "the foods") + ". A detection is not a dose, and it is not a diagnosis.";
    visual.appendChild(found);
    var finding = document.createElement("p");
    finding.textContent = chem.finding;
    visual.appendChild(finding);
    var labels = chem.labels || CHEM_FOODS;
    var useMedian = chem.foods.some(function (food) { return food.median !== null; });
    var max = 0;
    chem.foods.forEach(function (food) {
      var value = useMedian ? food.median : food.pct;
      if (value !== null && value > max) max = value;
    });
    var scaleNote = document.createElement("p");
    scaleNote.className = "note";
    scaleNote.textContent = chem.scaleNote || (useMedian
      ? "Bar length is the median amount in that food, in micrograms per kilogram. No bar means the median was below the detection limit, or that food was not in the round."
      : "No food had a median above the detection limit. Bar length is how often the chemical was found in that food.");
    visual.appendChild(scaleNote);
    labels.forEach(function (label, index) {
      var food = chem.foods[index];
      var value = useMedian ? food.median : food.pct;
      var highest = value !== null && value === max && max > 0;
      var line = document.createElement("div");
      line.className = "chem-row" + (highest ? " is-high" : "");
      var name = document.createElement("span");
      name.textContent = label[1];
      var track = document.createElement("span");
      track.className = "chem-track";
      var bar = document.createElement("i");
      bar.style.width = max > 0 && value !== null ? (100 * value / max) + "%" : "0%";
      track.appendChild(bar);
      var text = document.createElement("span");
      if (food.note) text.textContent = food.note;
      else if (!food.sampled) text.textContent = "Not tested in this round";
      else if (useMedian && food.median !== null) text.textContent = chemAmount(food.median) + " µg/kg · " + food.pct + "% of " + food.tested;
      else if (!useMedian) text.textContent = (food.pct || 0) + "% of " + food.tested;
      else text.textContent = "Below the detection limit · " + (food.pct || 0) + "% of " + food.tested;
      if (highest && !food.note) text.textContent = "Highest · " + text.textContent;
      line.appendChild(name);
      line.appendChild(track);
      line.appendChild(text);
      visual.appendChild(line);
    });
    var bodyHead = document.createElement("h3");
    bodyHead.textContent = "In the body";
    visual.appendChild(bodyHead);
    var bodyRow = document.createElement("div");
    bodyRow.className = "harm-body";
    var bodyMark = document.createElement("canvas");
    bodyMark.className = "harm-mark harm-mark-lg";
    bodyMark.width = 64;
    bodyMark.height = 64;
    bodyMark.setAttribute("aria-hidden", "true");
    bodyMark.getContext("2d").drawImage(harmSprite(chemId), 0, 0);
    bodyRow.appendChild(bodyMark);
    var body = document.createElement("p");
    body.textContent = chem.body;
    bodyRow.appendChild(body);
    visual.appendChild(bodyRow);
    var chains = document.createElement("p");
    chains.textContent = chem.chains + " " + (chem.review || "The reviews behind the body text are ATSDR's fact sheet on DEHP, EPA reviews of human studies from 2018 and 2019, and a Consumer Product Safety Commission review of replacement plasticizers.");
    visual.appendChild(chains);
  }

  function renderCenters() {
    var summary = document.getElementById("center-summary");
    if (summary) summary.textContent = data.centers.length + " addresses";
    centerBox.textContent = "";
    data.centers.forEach(function (center, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = center.name + " · " + center.address;
      if (index === selectedCenter) button.className = "is-on";
      button.addEventListener("click", function () {
        selectedCenter = index;
        showCenters = true;
        document.getElementById("show-centers").checked = true;
        picked = center.name + " · " + center.address + ". This is a distribution center Martin Brower lists. It is not a factory, and the road from here to a restaurant is not published." + (center.note ? " " + center.note : "");
        fit(center.lon, center.lat, 1.4);
        setViewPressed("");
        renderCenters();
        describe();
        draw();
      });
      centerBox.appendChild(button);
    });
    var miss = document.getElementById("health-center-miss");
    var missing = data.missingCenters || [];
    miss.textContent = missing.length
      ? missing.map(function (row) {
          return row.name + ", " + row.address + ", did not match a Census Bureau address range, so it is not drawn.";
        }).join(" ")
      : "";
  }

  function pointerPos(event) {
    var rect = canvas.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  }

  canvas.addEventListener("pointerdown", function (event) {
    var p = pointerPos(event);
    drag = { x: p[0], y: p[1], cx: view.cx, cy: view.cy, moved: false, id: event.pointerId };
    canvas.classList.add("is-drag");
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", function (event) {
    if (!drag || drag.id !== event.pointerId) return;
    var p = pointerPos(event);
    if (Math.hypot(p[0] - drag.x, p[1] - drag.y) > 3) drag.moved = true;
    view.cx = drag.cx - (p[0] - drag.x) / view.scale;
    view.cy = drag.cy - (p[1] - drag.y) / view.scale;
    clampView();
    setViewPressed("");
    draw();
  });

  function endDrag(event) {
    if (!drag || drag.id !== event.pointerId) return;
    var moved = drag.moved;
    var p = pointerPos(event);
    drag = null;
    canvas.classList.remove("is-drag");
    if (moved) {
      draw();
      return;
    }
    var center = nearestCenter(p[0], p[1]);
    if (center >= 0) {
      selectedCenter = center;
      var row = data.centers[center];
      picked = row.name + " · " + row.address + ". This is a distribution center Martin Brower lists. It is not a factory, and the road from here to a restaurant is not published." + (row.note ? " " + row.note : "");
      renderCenters();
      describe();
      draw();
      return;
    }
    if (dotMode()) {
      var place = nearestPlace(p[0], p[1]);
      if (place) {
        selectedCenter = null;
        picked = "One " + data.brands[place[2]] + " location.";
        renderCenters();
        describe();
        return;
      }
    }
    zoomAt(p[0], p[1], 1.8);
  }

  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", function (event) {
    if (!drag || drag.id !== event.pointerId) return;
    drag = null;
    canvas.classList.remove("is-drag");
  });

  canvas.addEventListener("wheel", function (event) {
    event.preventDefault();
    var p = pointerPos(event);
    zoomAt(p[0], p[1], event.deltaY > 0 ? 0.8 : 1.25);
  }, { passive: false });

  canvas.addEventListener("dblclick", function (event) {
    event.preventDefault();
  });

  document.getElementById("zoom-in").addEventListener("click", function () {
    zoomAt(cssW / 2, cssH / 2, 1.6);
  });
  document.getElementById("zoom-out").addEventListener("click", function () {
    zoomAt(cssW / 2, cssH / 2, 1 / 1.6);
  });
  function showRegion(lon, lat, span, id) {
    hoodFilter = null;
    fit(lon, lat, span);
    setViewPressed(id);
    renderHoods();
    describe();
    draw();
  }
  document.getElementById("view-us").addEventListener("click", function () {
    showRegion(-97, 38.5, 58, "view-us");
  });
  document.getElementById("view-ak").addEventListener("click", function () {
    showRegion(-146.5, 61.2, 22, "view-ak");
  });
  document.getElementById("view-hi").addEventListener("click", function () {
    showRegion(-157.4, 20.6, 6, "view-hi");
  });
  document.getElementById("hood-clear").addEventListener("click", function () {
    showRegion(-97, 38.5, 58, "view-us");
  });
  document.getElementById("show-centers").addEventListener("change", function (event) {
    showCenters = event.target.checked;
    if (!showCenters) selectedCenter = null;
    renderCenters();
    describe();
    draw();
  });
  document.getElementById("sort-count").addEventListener("click", function () {
    brandSort = "count";
    document.getElementById("sort-count").setAttribute("aria-pressed", "true");
    document.getElementById("sort-name").setAttribute("aria-pressed", "false");
    renderBrands();
  });
  function hoodLabel(area) {
    var place = area.city && area.city !== area.name ? area.name + ", " + area.city : area.name;
    return place + ", " + area.state;
  }

  function hoodCount(area) {
    if (hoodBrand === "") return area.n;
    var want = Number(hoodBrand);
    for (var i = 0; i < area.brands.length; i++) {
      if (area.brands[i][0] === want) return area.brands[i][1];
    }
    return 0;
  }

  function fitArea(id) {
    var minLon = 180;
    var maxLon = -180;
    var minLat = 90;
    var maxLat = -90;
    var n = 0;
    var want = hoodBrand === "" ? null : Number(hoodBrand);
    for (var i = 0; i < data.places.length; i++) {
      if (!hoodOf || hoodOf[i] !== id) continue;
      var place = data.places[i];
      if (want !== null && place[2] !== want) continue;
      if (place[0] < minLon) minLon = place[0];
      if (place[0] > maxLon) maxLon = place[0];
      if (place[1] < minLat) minLat = place[1];
      if (place[1] > maxLat) maxLat = place[1];
      n++;
    }
    if (!n) return;
    fit((minLon + maxLon) / 2, (minLat + maxLat) / 2, Math.max(0.08, (maxLon - minLon) * 1.6));
    setViewPressed("");
  }

  function setHoodSort(next) {
    hoodSort = next;
    document.getElementById("hood-count").setAttribute("aria-pressed", next === "count" ? "true" : "false");
    document.getElementById("hood-variety").setAttribute("aria-pressed", next === "brands" ? "true" : "false");
    document.getElementById("hood-name").setAttribute("aria-pressed", next === "name" ? "true" : "false");
    renderHoods();
  }

  function renderHoods() {
    var box = document.getElementById("health-hoods");
    var note = document.getElementById("hood-note");
    var select = document.getElementById("hood-brand");
    if (!box || !hoods) return;
    if (!select.options.length) {
      var allOpt = document.createElement("option");
      allOpt.value = "";
      allOpt.textContent = "All brands";
      select.appendChild(allOpt);
      data.brands.forEach(function (name, index) {
        var option = document.createElement("option");
        option.value = String(index);
        option.textContent = name;
        select.appendChild(option);
      });
    }
    select.value = hoodBrand;
    var rows = [];
    hoods.areas.forEach(function (area, index) {
      var count = hoodCount(area);
      if (count < 1) return;
      rows.push({ area: area, index: index, count: count });
    });
    rows.sort(function (a, b) {
      if (hoodSort === "name") return hoodLabel(a.area).localeCompare(hoodLabel(b.area));
      if (hoodSort === "brands" && hoodBrand === "") return b.area.brands.length - a.area.brands.length || b.count - a.count;
      return b.count - a.count || hoodLabel(a.area).localeCompare(hoodLabel(b.area));
    });
    var shown = rows.slice(0, 200);
    if (hoodFilter !== null) {
      rows.forEach(function (row) {
        if (row.index === hoodFilter && shown.indexOf(row) < 0) shown.unshift(row);
      });
    }
    box.textContent = "";
    var clear = document.createElement("button");
    clear.type = "button";
    clear.textContent = "All neighborhoods";
    if (hoodFilter === null) clear.className = "is-on";
    clear.addEventListener("click", function () {
      hoodFilter = null;
      picked = "";
      renderHoods();
      describe();
      draw();
    });
    box.appendChild(clear);
    shown.forEach(function (row) {
      var button = document.createElement("button");
      button.type = "button";
      button.id = "hood-" + row.index;
      var countText = hoodSort === "brands" && hoodBrand === ""
        ? commas(row.area.brands.length) + " brands · " + commas(row.area.n)
        : commas(row.count);
      button.textContent = (rows.indexOf(row) + 1) + ". " + hoodLabel(row.area) + " · " + countText;
      if (hoodFilter === row.index) button.className = "is-on";
      if (hoodJump === row.index) {
        hoodJump = null;
        setTimeout(function () {
          var section = document.getElementById("neighborhoods");
          if (section) section.scrollIntoView({ block: "start" });
          button.scrollIntoView({ block: "nearest" });
        }, 0);
      }
      button.addEventListener("click", function () {
        hoodFilter = row.index;
        picked = "";
        selectedCenter = null;
        fitArea(row.index);
        renderHoods();
        describe();
        draw();
      });
      box.appendChild(button);
    });
    var extra = rows.length - shown.length;
    note.textContent = (extra ? "Showing the first 200 of " + commas(rows.length) + " neighborhoods for this sort. " : "")
      + commas(hoods.unassigned) + " tagged restaurants are farther than 2 kilometers from a named neighborhood, so they are not in this rank.";
    var clearMap = document.getElementById("hood-clear");
    if (clearMap) {
      clearMap.hidden = hoodFilter === null;
      if (hoodFilter !== null) setViewPressed("");
    }
  }

  document.getElementById("hood-count").addEventListener("click", function () { setHoodSort("count"); });
  document.getElementById("hood-variety").addEventListener("click", function () { setHoodSort("brands"); });
  document.getElementById("hood-name").addEventListener("click", function () { setHoodSort("name"); });
  document.getElementById("hood-brand").addEventListener("change", function (event) {
    hoodBrand = event.target.value;
    renderHoods();
    describe();
    draw();
  });

  document.getElementById("sort-name").addEventListener("click", function () {
    brandSort = "name";
    document.getElementById("sort-name").setAttribute("aria-pressed", "true");
    document.getElementById("sort-count").setAttribute("aria-pressed", "false");
    renderBrands();
  });
  document.getElementById("chem-rate").addEventListener("click", function () {
    document.getElementById("chem-rate").setAttribute("aria-pressed", "true");
    document.getElementById("chem-name").setAttribute("aria-pressed", "false");
    renderChemicals();
  });
  document.getElementById("chem-name").addEventListener("click", function () {
    document.getElementById("chem-name").setAttribute("aria-pressed", "true");
    document.getElementById("chem-rate").setAttribute("aria-pressed", "false");
    renderChemicals();
  });

  window.addEventListener("resize", resize);

  fetch("census/health.json")
    .then(function (res) {
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    })
    .then(function (payload) {
      data = payload;
      data.chemicals = data.chemicals.concat(EXTRA_CHEMICALS);
      var sources = document.getElementById("health-sources");
      sources.textContent = "";
      appendSource(sources, data.placesSource + " ");
      var osm = document.createElement("a");
      osm.href = "https://www.openstreetmap.org/copyright";
      osm.textContent = "OpenStreetMap copyright";
      sources.appendChild(osm);
      appendSource(sources, ". " + data.centersSource + " ");
      var mb = document.createElement("a");
      mb.href = "https://www.martinbrower.us/contact-us";
      mb.textContent = "Martin Brower contact list";
      sources.appendChild(mb);
      appendSource(sources, ". " + data.chemicalsSource + " Acrylamide: ");
      var fda = document.createElement("a");
      fda.href = "https://www.fda.gov/food/process-contaminants-food/survey-data-acrylamide-food";
      fda.textContent = "FDA survey data on acrylamide in food";
      sources.appendChild(fda);
      appendSource(sources, ", data through November 15, 2002, and a later table through October 7, 2004. Packaging: ");
      var pfas = document.createElement("a");
      pfas.href = "https://pubs.acs.org/doi/10.1021/acs.estlett.6b00435";
      pfas.textContent = "Schaider et al., Environmental Science & Technology Letters, 2017";
      sources.appendChild(pfas);
      appendSource(sources, ". Restaurant counts: ");
      var mcd = document.createElement("a");
      mcd.href = "https://www.sec.gov/Archives/edgar/data/63908/000006390826000035/mcd-20251231.htm";
      mcd.textContent = "McDonald's Form 10-K for the year ended December 31, 2025";
      sources.appendChild(mcd);
      appendSource(sources, " (13,706 U.S. restaurants), and ");
      var qsr = document.createElement("a");
      qsr.href = "https://www.qsrmagazine.com/story/top-50-fast-food-chains-ranked-2025/";
      qsr.textContent = "QSR Magazine's 2025 QSR 50";
      sources.appendChild(qsr);
      appendSource(sources, " (year-end 2024 U.S. units; an estimate is labeled in the brand detail). The map draws OpenStreetMap locations, not every restaurant in those counts.");
      renderBrands();
      var foodHash = /^food-([A-Za-z0-9]+)$/.exec((location.hash || "").replace(/^#/, ""));
      if (foodHash && CHEM[foodHash[1]]) chemId = foodHash[1];
      renderChemicals();
      if (chemId && foodHash && foodHash[1] === chemId) {
        var foodSection = document.getElementById("chemicals");
        if (foodSection) foodSection.scrollIntoView({ block: "start" });
      }
      renderCenters();
      describe();
      resize();
      fetch("census/neighborhoods.json")
        .then(function (res) {
          if (!res.ok) throw new Error(String(res.status));
          return res.json();
        })
        .then(function (payload) {
          if (!payload.placeArea || payload.placeArea.length !== data.places.length) {
            document.getElementById("hood-note").textContent = "The neighborhood file does not match the restaurant map.";
            return;
          }
          hoods = payload;
          hoodOf = payload.placeArea;
          appendSource(sources, " " + payload.source);
          var hoodHash = /^hood-(\d+)$/.exec((location.hash || "").replace(/^#/, ""));
          var hoodId = hoodHash ? Number(hoodHash[1]) : -1;
          function showHood() {
            if (!payload.areas[hoodId]) return;
            hoodFilter = hoodId;
            hoodJump = hoodId;
            if (baseMap) baseMap.resize();
            fitArea(hoodId);
            renderHoods();
            describe();
            draw();
          }
          if (!payload.areas[hoodId]) renderHoods();
          else if (baseMap && !(baseMap.isStyleLoaded && baseMap.isStyleLoaded())) baseMap.once("load", showHood);
          else showHood();
        })
        .catch(function () {
          var note = document.getElementById("hood-note");
          if (note) note.textContent = "The neighborhood file did not load.";
        });
    })
    .catch(function () {
      readout.textContent = "The health file did not load.";
    });
})();
