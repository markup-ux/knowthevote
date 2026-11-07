(function () {
  var PHOTOS = (typeof GALLERY_PHOTOS !== "undefined" && GALLERY_PHOTOS.length) ? GALLERY_PHOTOS : [
    { id: "photo-1551301285-bdfcd0f17a02", slug: "T2gyvHmkS98", user: "tuckergood", by: "Tucker Good", alt: "The dome of the Illinois State Capitol in Springfield", subject: "buildings" },
    { id: "photo-1597335586198-e31434d3a856", slug: "CDsAkr_mBeg", user: "minimouche", by: "Florian Pintar", alt: "The United States Capitol in Washington" },
    { id: "photo-1756963322523-1e9bb61ee31d", slug: "ayZoJTphaCs", user: "gabrielrana", by: "Gabriel Tovar", alt: "The United States Capitol, dome and columns, with a flag in front" },
    { id: "photo-1761060279424-fc79b2e80635", slug: "WRutiX6XxV8", user: "nhuenerfuerst", by: "Nils Huenerfuerst", alt: "The United States Capitol at the end of a street lined with autumn trees" },
    { id: "photo-1519922838705-9d6cb8bcfaea", slug: "oN_cUY1v7hs", user: "someguy", by: "Andy Feliciotti", alt: "The United States Capitol reflected in a wet plaza" },
    { id: "photo-1749094193595-838dc6e6b7c4", slug: "Spg_nmwVfds", user: "fabian_lp", by: "Fabian Lozano", alt: "The National Congress in Brasília, two towers between two bowls" },
    { id: "photo-1601782007806-42de5253b04d", slug: "b1E206D6FvQ", user: "g_leighton", by: "Gustavo Leighton", alt: "A national congress in black and white, two towers between two bowls, reflected in water" },
    { id: "photo-1701606115482-bed68b482c89", slug: "UMK1mwunTZ8", user: "nathan_cima", by: "Nathan Cima", alt: "The courthouse in Montpellier, a columned front under a pediment" },
    { id: "photo-1711003596872-aa68f08a4b8e", slug: "Bh6u25Qv9qA", user: "fotomagi", by: "Dragon White Munthe", alt: "An empty courtroom, with a wooden bench and dark panels" },
    { id: "photo-1658958327132-a80f8a9409fb", slug: "osJUjMNpcak", user: "finephotographics", by: "Fine Photographics", alt: "A courthouse front of columns, a carved pediment, and broad steps" },
    { id: "photo-1603119380999-ef522dd64b3c", slug: "U8WfiRpsQ7Y", user: "ianhutchinson92", by: "Ian Hutchinson", alt: "A courthouse pediment carved with the words equal justice, above columns" },
    { id: "photo-1483600516620-7254872369ae", slug: "ICXMkhRdquA", user: "jtc", by: "Jesse Collins", alt: "Courthouse columns seen from below, rising to a coffered ceiling" },
    { id: "photo-1688417486375-3508bc17b941", slug: "3Xl3lI5gjqg", user: "timmossholder", by: "Tim Mossholder", alt: "A flag flying in front of a columned courthouse" },
    { id: "photo-1678440515574-0dc75039b8fe", slug: "V12FTtOFhRk", user: "timmossholder", by: "Tim Mossholder", alt: "A black-and-white view of a courthouse, columns under a carved pediment" },
    { id: "photo-1453945619913-79ec89a82c51", slug: "Vq__yk6faOI", user: "claireandy", by: "Claire Anderson", alt: "A row of courthouse columns under a carved pediment" },
    { id: "photo-1719947688696-31ffb21b5d5e", slug: "OqQXH3W42JQ", user: "tzielonka", by: "Tomasz Zielonka", alt: "Broad steps leading up to a courthouse across an open plaza" },
    { id: "photo-1540910419892-4a36d2c3266c", slug: "T9CXBZLUvic", user: "element5digital", by: "Element5 Digital", alt: "A hand putting a ballot into a box" },
    { id: "photo-1597700331582-aab3614b3c0c", slug: "_4us-wUwO30", user: "libraryofcongress", by: "Library of Congress", alt: "A voter putting a ballot into a box at a school polling place in 1964" },
    { id: "photo-1638501479049-de7a4100b4a4", slug: "TdrLky1wwA4", user: "oksdesign", by: "Oxana Melis", alt: "A ballot drop box outside a community center" },
    { id: "photo-1494172961521-33799ddd43a5", slug: "IBWJsMObnnU", user: "ajaegers", by: "Arnaud Jaegers", alt: "A ballot envelope going into a slot" },
    { id: "photo-1603032813605-2c91e257e2ae", slug: "ApHrNurIYpk", user: "glencarrie", by: "Glen Carrie", alt: "Letter tiles spelling vote" },
    { id: "photo-1667964277001-a885796a5926", slug: "GdNyt7Cinj0", user: "erniejourneys", by: "Ernie Journeys", alt: "Vote here signs outside a mall entrance" },
    { id: "photo-1487274910620-1add53247020", slug: "-NY2yXT2EOE", user: "kellysikkema", by: "Kelly Sikkema", alt: "A United States passport on a clipboard" },
    { id: "photo-1450101499163-c8848c66ca85", slug: "OQMZwNd3ThU", user: "amstram", by: "Scott Graham", alt: "A hand writing with a pen on a sheet of paper" },
    { id: "photo-1595126731003-755959b6baf8", slug: "nxcs8wwj9J0", user: "tiffanytertipes", by: "Tiffany Tertipes", alt: "A pen lying on a form that says not to forget to sign" },
    { id: "photo-1696831519501-e4a0515a9a2c", slug: "GQXtl7L4Ldc", user: "markusspiske", by: "Markus Spiske", alt: "A pen beside a mail envelope" },
    { id: "photo-1521791055366-0d553872125f", slug: "GJao3ZTX9gU", user: "cytonn_photography", by: "Cytonn Photography", alt: "A hand writing with a pen on a lined form" },
    { id: "photo-1564846824194-346b7871b855", slug: "9i5eqBarv-k", user: "yapics", by: "Leon Seibert", alt: "A hand filling in a form, with a blank sheet underneath" },
    { id: "photo-1595126907069-4d65de64ef38", slug: "-7pxs081f3U", user: "tiffanytertipes", by: "Tiffany Tertipes", alt: "Two return envelopes on an otherwise empty table" },
    { id: "photo-1595265616410-a6119ff0c87e", slug: "sY5-f-eviXs", user: "tiffanytertipes", by: "Tiffany Tertipes", alt: "A return envelope on a mostly empty table" }
  ];

  var MAPS = [
    { id: "us", name: "United States", svg: "preview/us.svg", kind: "us" },
    { id: "za", name: "South Africa", svg: "za/map.svg", results: "za/results.json" },
    { id: "br", name: "Brazil", svg: "br/map.svg", results: "br/results.json" },
    { id: "ch", name: "Switzerland", svg: "ch/map.svg", results: "ch/results.json" },
    { id: "sk", name: "Slovakia", svg: "sk/map.svg", results: "sk/results.json" },
    { id: "se", name: "Sweden", svg: "se/map.svg", results: "se/results.json" },
    { id: "cy", name: "Cyprus", svg: "cy/map.svg", results: "cy/results.json" },
    { id: "de", name: "Germany", svg: "de/map.svg", results: "de/results.json" },
    { id: "au", name: "Australia", svg: "au/map.svg", results: "au/results.json" },
    { id: "jp", name: "Japan", svg: "jp/map.svg", results: "jp/results.json" },
    { id: "pl", name: "Poland", svg: "pl/map.svg", results: "pl/results.json" },
    { id: "cz", name: "Czechia", svg: "cz/map.svg", results: "cz/results.json" },
    { id: "es", name: "Spain", svg: "es/map.svg", results: "es/results.json" },
    { id: "fr", name: "France", svg: "fr/map.svg", results: "fr/results.json" },
    { id: "it", name: "Italy", svg: "it/map.svg", results: "it/results.json" }
  ];

  var SUBJECTS = [
    { id: "all", name: "All" },
    { id: "buildings", name: "Buildings" },
    { id: "courts", name: "Courts" },
    { id: "voting", name: "Voting" },
    { id: "gatherings", name: "Gatherings" },
    { id: "art", name: "Art" },
    { id: "monuments", name: "Monuments" }
  ];
  var PARTY = { dem: "#1e4d7b", gop: "#8d3232", ind: "#3e5c45", other: "#5c4a2a" };
  var stage = document.getElementById("wall-stage");
  var canvas = document.getElementById("wall-canvas");
  var mapHost = document.getElementById("wall-map");
  var mapLabel = document.getElementById("wall-map-label");
  var credit = document.getElementById("wall-credit");
  var panel = document.getElementById("wall-panel");
  var mapToggle = document.getElementById("wall-map-toggle");
  var mapPick = document.getElementById("wall-map-pick");
  var holdBtn = document.getElementById("wall-hold");
  var fullBtn = document.getElementById("wall-full");
  var subjectHost = document.getElementById("wall-subjects");
  var sortPick = document.getElementById("wall-sort");
  var browseBtn = document.getElementById("wall-browse");
  var sheet = document.getElementById("wall-sheet");
  var grid = document.getElementById("wall-grid");
  var photoAlpha = document.getElementById("wall-photo-alpha");
  var photoSize = document.getElementById("wall-photo-size");
  var mapAlpha = document.getElementById("wall-map-alpha");
  var mapSize = document.getElementById("wall-map-size");
  var fadeSpeed = document.getElementById("wall-fade");
  var waitTime = document.getElementById("wall-wait");
  var ctx = canvas.getContext("2d");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var subject = "all";
  var order = "subject";
  var photos = [];
  var browsing = false;
  var index = -1;
  var current = null;
  var previous = null;
  var fade = 1;
  var fadeToken = 0;
  var busy = false;
  var timer = null;
  var quietTimer = null;
  var pinning = false;
  var wokeAt = 0;
  var backing = { w: 0, h: 0, dpr: 0 };
  var svgCache = {};
  var resultsCache = {};
  var mapToken = 0;
  var loaded = {};
  var loadedEdge = {};
  var sharpening = {};
  var gridFrom = 0;
  var gridTo = 0;
  var gridStep = 60;
  var booted = false;

  credit.setAttribute("aria-live", "polite");
  canvas.setAttribute("aria-hidden", "true");
  mapHost.setAttribute("aria-hidden", "true");

  MAPS.forEach(function (map) {
    var option = document.createElement("option");
    option.value = map.id;
    option.textContent = map.name;
    mapPick.appendChild(option);
  });

  SUBJECTS.forEach(function (item) {
    var button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-subject", item.id);
    button.addEventListener("click", function () {
      subject = item.id;
      syncSubjects();
      retarget();
      save();
    });
    subjectHost.appendChild(button);
  });

  function boot() {
    if (booted) return;
    booted = true;
    restore();
    photos = arrange();
    syncSubjects();
    applyMapChrome();
    measure();
    if (mapOn()) mountMap(mapPick.value);
    go(1);
  }

  var catalog = new XMLHttpRequest();
  catalog.open("GET", "gallery-photos.json?t=" + Math.floor(Date.now() / 3600000), true);
  catalog.onload = function () {
    if (catalog.status >= 200 && catalog.status < 300) {
      try {
        var list = JSON.parse(catalog.responseText);
        if (list && list.length) PHOTOS = list;
      } catch (error) {}
    }
    boot();
  };
  catalog.onerror = function () { boot(); };
  catalog.send();

  photoAlpha.addEventListener("input", function () {
    syncRange(photoAlpha, "wall-photo-alpha-val");
    save();
    redraw();
  });
  photoSize.addEventListener("input", function () {
    syncRange(photoSize, "wall-photo-size-val");
    save();
    redraw();
  });
  mapAlpha.addEventListener("input", function () {
    syncRange(mapAlpha, "wall-map-alpha-val");
    applyMapChrome();
    save();
  });
  mapSize.addEventListener("input", function () {
    syncRange(mapSize, "wall-map-size-val");
    applyMapChrome();
    save();
  });
  fadeSpeed.addEventListener("input", function () {
    syncFade();
    save();
  });
  waitTime.addEventListener("input", function () {
    syncWait();
    save();
    arm();
  });
  mapToggle.addEventListener("click", function () {
    var on = !mapOn();
    mapToggle.setAttribute("aria-pressed", on ? "true" : "false");
    applyMapChrome();
    save();
    if (on) mountMap(mapPick.value);
  });
  mapPick.addEventListener("change", function () {
    save();
    if (mapOn()) mountMap(mapPick.value);
  });
  holdBtn.addEventListener("click", function () {
    var on = holdBtn.getAttribute("aria-pressed") !== "true";
    holdBtn.setAttribute("aria-pressed", on ? "true" : "false");
    holdBtn.textContent = on ? "Holding" : "Hold";
    arm();
  });
  document.getElementById("wall-prev").addEventListener("click", function () { go(-1); });
  document.getElementById("wall-next").addEventListener("click", function () { go(1); });
  sortPick.addEventListener("change", function () {
    order = sortPick.value;
    retarget();
    save();
  });
  browseBtn.addEventListener("click", function () {
    setBrowsing(!browsing);
  });
  sheet.addEventListener("scroll", function () {
    if (!browsing || gridTo >= photos.length) return;
    if (sheet.scrollTop + sheet.clientHeight < sheet.scrollHeight - 280) return;
    appendThumbs();
  });
  fullBtn.addEventListener("click", function () {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (stage.requestFullscreen) stage.requestFullscreen().catch(function () {});
  });
  document.addEventListener("fullscreenchange", function () {
    fullBtn.textContent = document.fullscreenElement ? "Leave full screen" : "Fill the screen";
    measure();
  });

  window.addEventListener("resize", measure);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", measure);
  window.addEventListener("mousemove", wake);
  window.addEventListener("pointerdown", function (event) {
    if (panel.contains(event.target)) pinning = true;
    wake();
  });
  window.addEventListener("pointerup", function () {
    pinning = false;
    wake();
  });
  panel.addEventListener("focusin", wake);
  stage.addEventListener("click", function (event) {
    if (panel.contains(event.target) || sheet.contains(event.target) || !stage.contains(event.target)) return;
    if (tagFrom(event.target, "A")) return;
    if (Date.now() - wokeAt < 450) return;
    if (document.body.classList.contains("is-quiet")) {
      wake();
      return;
    }
    go(1);
  });
  document.addEventListener("keydown", function (event) {
    wake();
    var tag = event.target && event.target.tagName;
    var typing = tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";
    if (event.key === "ArrowRight" && !typing) {
      event.preventDefault();
      go(1);
    } else if (event.key === "ArrowLeft" && !typing) {
      event.preventDefault();
      go(-1);
    } else if ((event.key === "m" || event.key === "M") && !typing) {
      mapToggle.click();
    } else if ((event.key === "f" || event.key === "F") && !typing) {
      fullBtn.click();
    } else if (event.key === "Escape" && browsing) {
      setBrowsing(false);
    } else if (event.code === "Space" && tag !== "BUTTON" && tag !== "INPUT" && tag !== "SELECT") {
      event.preventDefault();
      holdBtn.click();
    }
  });

  setInterval(function () {
    if (!mapOn() || mapPick.value !== "us" || !svgCache.us || typeof leadersLive !== "function") return;
    leadersLive("preview/leads.json").then(function (data) {
      paintUs(svgCache.us, data);
    }).catch(function () {});
  }, typeof LIVE_EVERY === "number" ? LIVE_EVERY : 15000);

  function mapOn() {
    return mapToggle.getAttribute("aria-pressed") === "true";
  }

  function mapById(id) {
    var i;
    for (i = 0; i < MAPS.length; i++) if (MAPS[i].id === id) return MAPS[i];
    return MAPS[0];
  }

  function restore() {
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem("leaders-pictures") || "{}") || {}; }
    catch (error) { saved = {}; }
    if (mapById(saved.map).id === saved.map) mapPick.value = saved.map;
    if (saved.mapOn) mapToggle.setAttribute("aria-pressed", "true");
    if (subjectName(saved.subject)) subject = saved.subject;
    if (saved.sort === "subject" || saved.sort === "photographer" || saved.sort === "mixed") order = saved.sort;
    setRange(photoAlpha, "wall-photo-alpha-val", saved.photoAlpha);
    setRange(photoSize, "wall-photo-size-val", saved.photoSize);
    setRange(mapAlpha, "wall-map-alpha-val", saved.mapAlpha);
    setRange(mapSize, "wall-map-size-val", saved.mapSize);
    setFade(saved.fade);
    setWait(saved.wait);
  }

  function setRange(input, valId, raw) {
    var num = +raw;
    if (raw == null || !(num >= +input.min && num <= +input.max)) num = +input.value;
    input.value = String(num);
    syncRange(input, valId);
  }

  function syncRange(input, valId) {
    var shown = input.value + "%";
    document.getElementById(valId).textContent = shown;
    input.setAttribute("aria-valuenow", input.value);
    input.setAttribute("aria-valuetext", input.value + " percent");
  }

  function setFade(raw) {
    var num = +raw;
    if (raw == null || !(num >= 0 && num <= 30)) num = 7;
    fadeSpeed.value = String(num);
    syncFade();
  }

  function syncFade() {
    var num = +fadeSpeed.value;
    if (fadeSpeed.value === "" || !isFinite(num)) num = 7;
    var seconds = Math.round(num) / 10;
    var short = seconds + "s";
    var long = seconds + (seconds === 1 ? " second" : " seconds");
    document.getElementById("wall-fade-val").textContent = short;
    fadeSpeed.setAttribute("aria-valuenow", String(num));
    fadeSpeed.setAttribute("aria-valuetext", long);
  }

  function fadeMs() {
    var num = +fadeSpeed.value;
    if (fadeSpeed.value === "" || !isFinite(num)) num = 7;
    return Math.max(0, num) * 100;
  }

  function setWait(raw) {
    var num = +raw;
    if (raw == null || !(num >= 0 && num <= 120)) num = 20;
    waitTime.value = String(num);
    syncWait();
  }

  function syncWait() {
    var num = +waitTime.value;
    if (waitTime.value === "" || !isFinite(num)) num = 20;
    num = Math.round(num);
    var words = waitWords(num);
    document.getElementById("wall-wait-val").textContent = words.short;
    waitTime.setAttribute("aria-valuenow", String(num));
    waitTime.setAttribute("aria-valuetext", words.long);
  }

  function waitWords(seconds) {
    if (!(seconds > 0)) return { short: "Off", long: "Off" };
    if (seconds < 60) return { short: seconds + "s", long: seconds + (seconds === 1 ? " second" : " seconds") };
    var minutes = Math.floor(seconds / 60);
    var rest = seconds % 60;
    var long = minutes + (minutes === 1 ? " minute" : " minutes");
    var short = minutes + " min";
    if (rest) {
      long += " " + rest + " seconds";
      short += " " + rest + "s";
    }
    return { short: short, long: long };
  }

  function waitMs() {
    var num = +waitTime.value;
    if (waitTime.value === "" || !isFinite(num)) num = 20;
    return Math.max(0, num) * 1000;
  }

  function save() {
    try {
      localStorage.setItem("leaders-pictures", JSON.stringify({
        map: mapPick.value,
        mapOn: mapOn(),
        photoAlpha: photoAlpha.value,
        photoSize: photoSize.value,
        mapAlpha: mapAlpha.value,
        mapSize: mapSize.value,
        fade: fadeSpeed.value,
        wait: waitTime.value,
        subject: subject,
        sort: order
      }));
    } catch (error) {}
  }

  function ratio(input, fallback) {
    var num = +input.value;
    if (input.value === "" || !isFinite(num)) num = fallback;
    return num / 100;
  }

  function applyMapChrome() {
    var on = mapOn();
    stage.style.setProperty("--map-scale", String(ratio(mapSize, 100)));
    stage.style.setProperty("--map-alpha", String(ratio(mapAlpha, 62)));
    mapHost.hidden = !on;
    mapLabel.hidden = !on;
    mapToggle.textContent = on ? "Hide the map" : "Show the map";
    measure();
  }

  function mountMap(id) {
    var token = ++mapToken;
    var map = mapById(id);
    mapLabel.hidden = !mapOn();
    mapLabel.textContent = "Loading the " + map.name + " map.";
    ensureMap(map).then(function (svg) {
      if (token !== mapToken || mapPick.value !== map.id) return;
      mapHost.replaceChildren(svg);
      mapLabel.textContent = map.name + ". A color is a lead in reported votes, not a call.";
    }).catch(function () {
      if (token !== mapToken) return;
      mapHost.replaceChildren();
      mapLabel.textContent = "This map did not load.";
    });
  }

  function ensureMap(map) {
    var ready = svgCache[map.id]
      ? Promise.resolve(svgCache[map.id])
      : fetch(map.svg).then(function (response) {
          if (!response.ok) throw new Error("svg");
          return response.text();
        }).then(function (markup) {
          var svg = parseSvg(markup);
          svgCache[map.id] = svg;
          return svg;
        });
    return ready.then(function (svg) { return colorMap(map, svg); });
  }

  function colorMap(map, svg) {
    if (map.kind === "us") {
      if (typeof leadersLive !== "function") return Promise.resolve(svg);
      return leadersLive("preview/leads.json").then(function (data) {
        paintUs(svg, data);
        return svg;
      });
    }
    return loadResults(map).then(function (data) {
      paintPlaces(svg, data);
      return svg;
    });
  }

  function loadResults(map) {
    if (!resultsCache[map.id]) {
      resultsCache[map.id] = fetch(map.results).then(function (response) {
        if (!response.ok) throw new Error("results");
        return response.json();
      }).catch(function (error) {
        delete resultsCache[map.id];
        throw error;
      });
    }
    return resultsCache[map.id];
  }

  function parseSvg(markup) {
    var start = markup.indexOf("<svg");
    if (start < 0) throw new Error("svg");
    var doc = new DOMParser().parseFromString(markup.slice(start), "image/svg+xml");
    var svg = doc.documentElement;
    if (!svg || String(svg.nodeName).toLowerCase() !== "svg") throw new Error("svg");
    var node = document.importNode(svg, true);
    node.removeAttribute("id");
    node.setAttribute("aria-hidden", "true");
    node.setAttribute("focusable", "false");
    return node;
  }

  function blendOn() {
    try { return localStorage.getItem("leaders-blend") !== "0"; }
    catch (error) { return true; }
  }

  function hexChannels(hex) {
    if (!hex || hex.charAt(0) !== "#") return null;
    if (hex.length === 4) {
      return [parseInt(hex.charAt(1) + hex.charAt(1), 16), parseInt(hex.charAt(2) + hex.charAt(2), 16), parseInt(hex.charAt(3) + hex.charAt(3), 16)];
    }
    if (hex.length === 7) {
      return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    }
    return null;
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

  function tint(hex, amount) {
    var rgb = hexChannels(hex);
    if (!rgb) return hex || "";
    var rawMap = getComputedStyle(document.documentElement).getPropertyValue("--map").trim();
    var chip = rawMap.charAt(0) === "#"
      ? [parseInt(rawMap.slice(1, 3), 16), parseInt(rawMap.slice(3, 5), 16), parseInt(rawMap.slice(5, 7), 16)]
      : [235, 228, 214];
    return "rgb(" + chip.map(function (channel, i) {
      return Math.round(channel + (rgb[i] - channel) * amount);
    }).join(",") + ")";
  }

  function mixRows(data, place) {
    var parts = [];
    (place.rows || []).forEach(function (row) {
      var votes = row.votes || 0;
      if (!(votes > 0)) return;
      var color = row.color;
      if (!color && data.parties && row.id != null) color = (data.parties[String(row.id)] || {}).color;
      if (!color) return;
      parts.push({ color: color, votes: votes });
    });
    return mixColor(parts);
  }

  function paintPlaces(svg, data) {
    var bySlug = {};
    var blend = blendOn();
    (data.places || []).forEach(function (place) { if (place.slug) bySlug[place.slug] = place; });
    svg.querySelectorAll("path").forEach(function (path) {
      var place = bySlug[path.getAttribute("data-slug") || ""];
      var color = "";
      if (place && place.votes > 0) {
        if (blend) color = mixRows(data, place);
        if (!color && place.color) color = tint(place.color, place.amount == null ? 0.7 : place.amount);
      }
      if (color) path.style.setProperty("--lead", color);
      else path.style.removeProperty("--lead");
    });
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
      { color: PARTY[party], votes: lead },
      { color: PARTY[other], votes: 1 - lead }
    ];
  }

  function paintUs(svg, data) {
    var rows = (data && data.states) || {};
    var blend = blendOn();
    svg.querySelectorAll("path").forEach(function (path) {
      var row = rows[path.getAttribute("data-code")] || {};
      var parts = [];
      var color = "";
      if (blend) {
        parts = shareParts(row);
        if (!parts.length) parts = marginParts(row);
        color = mixColor(parts);
      }
      if (!color && row.party && row.votes) {
        var amount = Math.max(0.4, Math.min(1, (row.gap || 0) / 32));
        color = tint(PARTY[row.party] || PARTY.other, amount);
      }
      if (color) path.style.setProperty("--lead", color);
      else path.style.removeProperty("--lead");
    });
  }

  function pictureZoom() {
    return ratio(photoSize, 100);
  }

  function screenBox() {
    var viewW = stage.clientWidth;
    var viewH = stage.clientHeight;
    var top = 0;
    var bottom = 0;
    if (document.fullscreenElement && !document.body.classList.contains("is-quiet")) {
      var bar = stage.querySelector("header");
      top = bar ? bar.offsetHeight : 0;
      bottom = panel.offsetHeight || 0;
    }
    return {
      x: 0,
      y: top,
      w: viewW,
      h: Math.max(1, viewH - top - bottom),
      viewW: viewW,
      viewH: viewH
    };
  }

  function targetEdge() {
    var viewW = stage.clientWidth || 1280;
    var viewH = stage.clientHeight || 800;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    return Math.min(4096, Math.max(1200, Math.ceil(Math.max(viewW, viewH) * dpr * Math.max(pictureZoom(), 1))));
  }

  function sourceWidthNeeded(img, zoom) {
    var box = screenBox();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var span = Math.max(box.w, box.h * img.naturalWidth / img.naturalHeight);
    if (!document.fullscreenElement) span *= Math.max(zoom, 1);
    return Math.ceil(span * dpr);
  }

  function photoUrl(photo, edge) {
    var width = Math.min(4096, Math.max(640, Math.ceil(edge || targetEdge())));
    return "https://images.unsplash.com/" + photo.id + "?auto=format&fit=max&w=" + width + "&q=90";
  }

  function loadPhoto(photo, edge) {
    var width = Math.min(4096, Math.max(640, Math.ceil(edge || targetEdge())));
    var have = loaded[photo.id];
    var asked = loadedEdge[photo.id] || 0;
    if (have && (have.naturalWidth + 16 >= width || asked >= width)) return Promise.resolve(have);
    return fetchImage(photoUrl(photo, width), true).then(function (img) {
      loadedEdge[photo.id] = Math.max(asked, width);
      if (!loaded[photo.id] || img.naturalWidth >= loaded[photo.id].naturalWidth) loaded[photo.id] = img;
      return loaded[photo.id];
    });
  }

  function fetchImage(url, allowRetry) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      if (allowRetry) img.crossOrigin = "anonymous";
      img.onload = function () {
        if (img.naturalWidth > 0) resolve(img);
        else reject(new Error("photo"));
      };
      img.onerror = function () {
        if (allowRetry) fetchImage(url, false).then(resolve, reject);
        else reject(new Error("photo"));
      };
      img.src = url;
    });
  }

  function preload(i) {
    loadPhoto(photos[i]).catch(function () {});
  }

  function go(step) {
    if (busy) return;
    var tries = 0;
    function attempt(from) {
      if (tries >= photos.length) {
        credit.textContent = "The photographs did not load.";
        return;
      }
      tries += 1;
      var i = (from + step + photos.length) % photos.length;
      busy = true;
      loadPhoto(photos[i]).then(function (img) {
        busy = false;
        index = i;
        show(img);
        arm();
      }).catch(function () {
        busy = false;
        attempt(i);
      });
    }
    attempt(index);
  }

  function show(img) {
    fadeToken += 1;
    if (reduced || !current || !(fadeMs() > 0)) {
      current = img;
      previous = null;
      fade = 1;
      redraw();
    } else {
      previous = current;
      current = img;
      startFade();
    }
    writeCredit();
    markGrid();
    if (photos.length) preload((index + 1) % photos.length);
  }

  function startFade() {
    var token = fadeToken;
    var start = performance.now();
    fade = 0;
    function step(now) {
      if (token !== fadeToken) return;
      fade = Math.min(1, (now - start) / fadeMs());
      redraw();
      if (fade < 1) requestAnimationFrame(step);
      else previous = null;
    }
    requestAnimationFrame(step);
  }

  function redraw() {
    var viewW = stage.clientWidth;
    var viewH = stage.clientHeight;
    if (!(viewW > 0) || !(viewH > 0)) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (backing.w !== viewW || backing.h !== viewH || backing.dpr !== dpr) {
      backing.w = viewW;
      backing.h = viewH;
      backing.dpr = dpr;
      canvas.width = Math.max(1, Math.round(viewW * dpr));
      canvas.height = Math.max(1, Math.round(viewH * dpr));
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#1c1915";
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.imageSmoothingEnabled = true;
    if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";
    var alpha = ratio(photoAlpha, 100);
    var zoom = pictureZoom();
    var box = screenBox();
    if (previous && fade < 1) drawFit(previous, box, zoom, alpha * (1 - fade));
    if (current) drawFit(current, box, zoom, alpha * (previous && fade < 1 ? fade : 1));
    ctx.globalAlpha = 1;
    ensureSharp();
  }

  function ensureSharp() {
    var photo = photos[index];
    var img = current;
    if (!photo || !img || sharpening[photo.id]) return;
    var zoom = pictureZoom();
    var need = Math.min(4096, sourceWidthNeeded(img, zoom));
    if (img.naturalWidth + 16 >= need) return;
    if ((loadedEdge[photo.id] || 0) >= need) return;
    sharpening[photo.id] = true;
    loadPhoto(photo, need).then(function (next) {
      sharpening[photo.id] = false;
      if (photos[index] !== photo || !next || !current) return;
      if (next.naturalWidth > current.naturalWidth) {
        current = next;
        redraw();
      }
    }).catch(function () {
      sharpening[photo.id] = false;
      loadedEdge[photo.id] = Math.max(loadedEdge[photo.id] || 0, need);
    });
  }

  function drawFit(img, box, zoom, alpha) {
    if (!(img.naturalWidth > 0) || !(img.naturalHeight > 0) || !(alpha > 0)) return;
    var x = box.x;
    var y = box.y;
    var w = box.w;
    var h = box.h;
    if (!document.fullscreenElement) {
      var fit = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
      w = img.naturalWidth * fit;
      h = img.naturalHeight * fit;
      x += (box.w - w) / 2;
      y += (box.h - h) / 2;
    }
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, x, y, w, h);
  }

  function writeCredit() {
    var photo = photos[index];
    if (!photo) return;
    credit.replaceChildren();
    var label = subjectName(photo.subject);
    credit.appendChild(document.createTextNode((index + 1) + " of " + photos.length + ". " + (label ? label + ". " : "") + photo.alt + ". Photo by "));
    var who = document.createElement("a");
    who.className = "notranslate";
    who.setAttribute("translate", "no");
    who.href = "https://unsplash.com/@" + photo.user + "?utm_source=leaders.vote&utm_medium=referral";
    who.rel = "noopener noreferrer";
    who.target = "_blank";
    who.textContent = photo.by;
    credit.appendChild(who);
    credit.appendChild(document.createTextNode(" on "));
    var site = document.createElement("a");
    site.href = "https://unsplash.com/photos/" + photo.slug + "?utm_source=leaders.vote&utm_medium=referral";
    site.rel = "noopener noreferrer";
    site.target = "_blank";
    site.textContent = "Unsplash";
    credit.appendChild(site);
  }

  function arm() {
    clearInterval(timer);
    timer = null;
    if (reduced || browsing || holdBtn.getAttribute("aria-pressed") === "true" || !(waitMs() > 0)) return;
    timer = setInterval(function () {
      if (document.hidden) return;
      go(1);
    }, waitMs());
  }

  function measure() {
    stage.style.setProperty("--dock", panel.offsetHeight + "px");
    redraw();
  }

  function wake() {
    var wasQuiet = document.body.classList.contains("is-quiet");
    document.body.classList.remove("is-quiet");
    if (wasQuiet) {
      wokeAt = Date.now();
      if (document.fullscreenElement) redraw();
    }
    clearTimeout(quietTimer);
    quietTimer = setTimeout(function () {
      if (pinning || browsing) {
        wake();
        return;
      }
      document.body.classList.add("is-quiet");
      if (document.fullscreenElement) redraw();
    }, 5000);
  }

  function tagFrom(node, tag) {
    while (node && node !== stage) {
      if (node.tagName === tag) return true;
      node = node.parentNode;
    }
    return false;
  }

  function subjectName(id) {
    var i;
    for (i = 0; i < SUBJECTS.length; i++) if (SUBJECTS[i].id === id) return SUBJECTS[i].name;
    return "";
  }

  function countSubject(id) {
    var n = 0;
    var i;
    for (i = 0; i < PHOTOS.length; i++) {
      if (id === "all" || PHOTOS[i].subject === id) n += 1;
    }
    return n;
  }

  function syncSubjects() {
    var buttons = subjectHost.querySelectorAll("button");
    var i;
    for (i = 0; i < buttons.length; i++) {
      var id = buttons[i].getAttribute("data-subject");
      buttons[i].setAttribute("aria-pressed", id === subject ? "true" : "false");
      buttons[i].textContent = subjectName(id) + " " + countSubject(id);
    }
    if (sortPick.value !== order) sortPick.value = order;
  }

  function arrange() {
    var list = [];
    var i;
    for (i = 0; i < PHOTOS.length; i++) {
      if (subject === "all" || PHOTOS[i].subject === subject) list.push(PHOTOS[i]);
    }
    if (order === "mixed") return shuffle(list);
    list.sort(function (a, b) {
      if (order === "photographer") return a.by.localeCompare(b.by) || a.alt.localeCompare(b.alt);
      return (a.subject || "").localeCompare(b.subject || "") || a.by.localeCompare(b.by) || a.alt.localeCompare(b.alt);
    });
    return list;
  }

  function retarget() {
    var id = photos[index] && photos[index].id;
    photos = arrange();
    var found = -1;
    var i;
    for (i = 0; i < photos.length; i++) if (photos[i].id === id) found = i;
    if (found >= 0) {
      index = found;
      paintGrid();
      writeCredit();
      if (photos.length) preload((index + 1) % photos.length);
      return;
    }
    index = -1;
    paintGrid();
    if (!photos.length) {
      credit.textContent = "No photographs in this subject.";
      return;
    }
    go(1);
  }

  function thumbUrl(photo) {
    return "https://images.unsplash.com/" + photo.id + "?auto=format&fit=crop&w=320&h=200&q=60";
  }

  function addThumb(i) {
    var photo = photos[i];
    var button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-index", String(i));
    button.setAttribute("aria-label", photo.alt + ". Photo by " + photo.by);
    var img = document.createElement("img");
    img.alt = "";
    img.loading = "lazy";
    img.src = thumbUrl(photo);
    button.appendChild(img);
    button.addEventListener("click", function () { jumpTo(i); });
    grid.appendChild(button);
  }

  function moreButton(next) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "wall-more";
    button.textContent = next ? "More photographs" : "Earlier photographs";
    button.addEventListener("click", function () {
      if (next) appendThumbs();
      else revealEarlier();
    });
    return button;
  }

  function paintGrid() {
    if (sheet.hidden) return;
    var start = 0;
    if (index > 0) start = Math.floor(index / gridStep) * gridStep;
    gridFrom = start;
    gridTo = Math.min(photos.length, start + gridStep);
    grid.replaceChildren();
    if (gridFrom > 0) grid.appendChild(moreButton(false));
    var i;
    for (i = gridFrom; i < gridTo; i++) addThumb(i);
    if (gridTo < photos.length) grid.appendChild(moreButton(true));
    markGrid(true);
  }

  function appendThumbs() {
    if (gridTo >= photos.length) return;
    var buttons = grid.querySelectorAll(".wall-more");
    var last = buttons.length ? buttons[buttons.length - 1] : null;
    if (last && last.textContent.indexOf("More") === 0) last.remove();
    var start = gridTo;
    gridTo = Math.min(photos.length, gridTo + gridStep);
    var i;
    for (i = start; i < gridTo; i++) addThumb(i);
    if (gridTo < photos.length) grid.appendChild(moreButton(true));
    markGrid();
  }

  function revealEarlier() {
    gridFrom = Math.max(0, gridFrom - gridStep);
    paintGrid();
    sheet.scrollTop = 0;
  }

  function markGrid(scroll) {
    if (sheet.hidden) return;
    var buttons = grid.querySelectorAll("button[data-index]");
    var i;
    for (i = 0; i < buttons.length; i++) {
      var at = +buttons[i].getAttribute("data-index");
      if (at === index) {
        buttons[i].setAttribute("aria-current", "true");
        if (scroll && buttons[i].scrollIntoView) buttons[i].scrollIntoView({ block: "nearest", inline: "nearest" });
      } else {
        buttons[i].removeAttribute("aria-current");
      }
    }
  }

  function jumpTo(i) {
    if (busy || !photos[i]) return;
    busy = true;
    loadPhoto(photos[i]).then(function (img) {
      busy = false;
      index = i;
      show(img);
      arm();
    }).catch(function () {
      busy = false;
    });
  }

  function setBrowsing(on) {
    browsing = on;
    sheet.hidden = !on;
    browseBtn.setAttribute("aria-pressed", on ? "true" : "false");
    browseBtn.setAttribute("aria-expanded", on ? "true" : "false");
    browseBtn.textContent = on ? "Close browse" : "Browse";
    if (on) paintGrid();
    arm();
    measure();
  }

  function shuffle(list) {
    var copy = list.slice();
    var i;
    for (i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var hold = copy[i];
      copy[i] = copy[j];
      copy[j] = hold;
    }
    return copy;
  }

  wake();
  new MutationObserver(function () {
    if (mapOn()) mountMap(mapPick.value);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
})();
