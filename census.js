(function () {
  function mapHex() {
    var raw = getComputedStyle(document.documentElement).getPropertyValue("--map").trim();
    return raw.charAt(0) === "#" ? raw.slice(0, 7) : "#ebe4d6";
  }
  var INK = ["#e8e0f7", "#c4b3ef", "#8b6ad4", "#5530a0", "#2a1458"];
  var LOSS = ["#f3e4da", "#e2c2b0", "#c48b74", "#8a4d3a"];
  var GAIN = ["#dce6da", "#b7d0b4", "#6fa376", "#2c5a3c"];
  var MEASURES = [
    { id: "pop", label: "Population", blurb: "Purple is the population. A darker purple is more people on July 1, 2025." },
    { id: "change", label: "Change since 2020", blurb: "Brown is a drop from the April 1, 2020 estimates base. Green is a rise. Darker is a larger change." },
    { id: "age18", label: "Age 18 and older", blurb: "Purple is the count of people age 18 and older. A darker purple is more people on July 1, 2025." },
    { id: "medAge", label: "Median age", blurb: "Purple is the median age. A darker purple is an older median age on July 1, 2025." },
    { id: "seats", label: "House seats", blurb: "Purple is the number of voting seats in the House. A darker purple is more seats. The 2020 census assigned them. The District of Columbia has a delegate." }
  ];

  var data = null;
  var measure = "pop";
  var sortKey = "pop";
  var sortDir = -1;
  var selected = null;
  var selectedCounty = null;
  var countySortKey = "pop";
  var countySortDir = -1;
  var usSvg = null;
  var countySvg = null;
  var countyToken = 0;

  var slot = document.getElementById("census-slot");
  var legend = document.getElementById("census-legend");
  var blurb = document.getElementById("census-blurb");
  var status = document.getElementById("census-status");
  var list = document.getElementById("census-states");
  var detail = document.getElementById("census-detail");

  function people(n) {
    return Math.round(n).toLocaleString("en-US");
  }

  function signed(n) {
    var value = Math.round(n);
    if (value > 0) return "+" + value.toLocaleString("en-US");
    if (value < 0) return "\u2212" + Math.abs(value).toLocaleString("en-US");
    return "0";
  }

  function format(id, value) {
    if (value == null) return "Delegate";
    if (id === "change") return signed(value);
    if (id === "medAge") return Number(value).toFixed(1);
    if (id === "seats") return String(value);
    return people(value);
  }

  function stateValue(state, id) {
    if (id === "change") return state.pop - state.base;
    if (id === "name") return state.name;
    return state[id];
  }

  function countyValue(row, id) {
    if (id === "name") return row[1];
    if (id === "change") return row[2] - row[3];
    return row[2];
  }

  function ordinal(n) {
    var teen = n % 100;
    if (teen >= 11 && teen <= 13) return n + "th";
    return n + ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th");
  }

  function band(value, list, count) {
    if (!list.length) return 0;
    var below = 0;
    for (var i = 0; i < list.length; i++) if (list[i] < value) below++;
    return Math.min(count - 1, Math.floor(below / list.length * count));
  }

  function shades(values, mode) {
    var present = values.filter(function (value) { return value != null; });
    if (mode === "change") {
      var loss = present.filter(function (value) { return value < 0; }).map(Math.abs);
      var gain = present.filter(function (value) { return value > 0; });
      return function (value) {
        if (value == null || value === 0) return { fill: mapHex(), light: false, band: "flat" };
        if (value < 0) {
          var lossBand = band(Math.abs(value), loss, 4);
          return { fill: LOSS[lossBand], light: lossBand >= 2, band: "loss" + lossBand };
        }
        var gainBand = band(value, gain, 4);
        return { fill: GAIN[gainBand], light: gainBand >= 2, band: "gain" + gainBand };
      };
    }
    return function (value) {
      if (value == null) return { fill: mapHex(), light: false, band: "none" };
      var step = band(value, present, 5);
      return { fill: INK[step], light: step >= 2, band: "q" + step };
    };
  }

  function changeSentence(pop, base) {
    var diff = pop - base;
    var baseText = "the April 1, 2020 estimates base of " + people(base);
    if (!diff) return "That matches " + baseText + ".";
    return "That is " + people(Math.abs(diff)) + (diff > 0 ? " more" : " fewer") + " than " + baseText + ".";
  }

  function seatSentence(state) {
    if (state.seats == null) {
      return "The District of Columbia has a delegate in the House. The 2020 census assigned it no voting seat.";
    }
    var noun = state.seats === 1 ? "seat" : "seats";
    var line = "The 2020 census assigned " + state.seats + " " + noun + " in the House of Representatives";
    if (!state.seatChange) return line + ", the same number as after the 2010 census.";
    var count = Math.abs(state.seatChange);
    var word = count === 1 ? "seat" : "seats";
    return line + ", " + count + " " + word + (state.seatChange > 0 ? " more" : " fewer") + " than after the 2010 census.";
  }

  function compare(read, direction) {
    return function (a, b) {
      var left = read(a);
      var right = read(b);
      var leftText = typeof left === "string";
      var rightText = typeof right === "string";
      if (left == null && right == null) return 0;
      if (left == null) return 1;
      if (right == null) return -1;
      if (leftText || rightText) return String(left).localeCompare(String(right)) * direction;
      if (left === right) return 0;
      return (left - right) * direction;
    };
  }

  function labelAt(path) {
    var code = path.getAttribute("data-code");
    var best = null;
    (path.getAttribute("d") || "").split(/[Mm]/).forEach(function (part) {
      var nums = part.match(/-?\d+(?:\.\d+)?/g);
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

  function addLabels(svg) {
    svg.querySelectorAll("path").forEach(function (path) {
      var code = path.getAttribute("data-code");
      var spot = labelAt(path);
      if (!spot || !code) return;
      var text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("class", "map-code notranslate");
      text.setAttribute("translate", "no");
      text.setAttribute("data-code", code);
      text.setAttribute("x", spot.x);
      text.setAttribute("y", spot.y);
      text.setAttribute("font-size", spot.size);
      text.textContent = code;
      svg.appendChild(text);
    });
  }

  function paint(svg, items, mode) {
    var color = shades(items.map(function (item) { return item.value; }), mode);
    var bands = {};
    items.forEach(function (item) {
      var shade = color(item.value);
      item.path.style.fill = shade.fill;
      if (item.text) item.text.classList.toggle("on-dark", shade.light);
      if (!bands[shade.band]) bands[shade.band] = { fill: shade.fill, values: [] };
      if (item.value != null && shade.band !== "none") bands[shade.band].values.push(item.value);
      if (shade.band === "none") bands[shade.band].delegate = true;
    });
    return bands;
  }

  function legendOrder(key) {
    if (key === "flat" || key === "none") return 40;
    if (key.indexOf("loss") === 0) return 30 - Number(key.slice(4));
    if (key.indexOf("gain") === 0) return 50 + Number(key.slice(4));
    if (key.indexOf("q") === 0) return Number(key.slice(1));
    return 0;
  }

  function drawLegend(bands, id) {
    legend.innerHTML = "";
    Object.keys(bands).sort(function (a, b) { return legendOrder(a) - legendOrder(b); }).forEach(function (key) {
      var group = bands[key];
      var span = document.createElement("span");
      var swatch = document.createElement("i");
      swatch.className = "swatch";
      swatch.style.background = group.fill;
      span.appendChild(swatch);
      if (group.delegate) {
        span.appendChild(document.createTextNode("Delegate"));
      } else if (group.values.length) {
        var lo = Math.min.apply(null, group.values);
        var hi = Math.max.apply(null, group.values);
        span.appendChild(document.createTextNode(lo === hi ? format(id, lo) : format(id, lo) + " to " + format(id, hi)));
      }
      legend.appendChild(span);
    });
  }

  function paintCountry() {
    if (!usSvg) return;
    var texts = {};
    usSvg.querySelectorAll("text.map-code").forEach(function (text) {
      texts[text.getAttribute("data-code")] = text;
    });
    var items = [];
    usSvg.querySelectorAll("path[data-code]").forEach(function (path) {
      var code = path.getAttribute("data-code");
      var state = data.states.filter(function (item) { return item.code === code; })[0];
      path.classList.toggle("is-on", !!selected && selected.code === code);
      items.push({ path: path, text: texts[code], value: state ? stateValue(state, measure) : null });
    });
    drawLegend(paint(usSvg, items, measure === "change" ? "change" : "amount"), measure);
    var current = MEASURES.filter(function (item) { return item.id === measure; })[0];
    blurb.textContent = current.blurb;
  }

  function countyMode() {
    return measure === "change" ? "change" : "pop";
  }

  function paintCounties() {
    if (!countySvg || !selected) return;
    var rows = data.counties[selected.fips];
    var byFips = {};
    rows.forEach(function (row) { byFips[row[0]] = row; });
    var mode = countyMode();
    var items = [];
    var paths = countySvg.querySelectorAll("path[data-fips]");
    var matched = 0;
    paths.forEach(function (path) {
      var row = byFips[path.getAttribute("data-fips")];
      if (row) matched++;
      path.classList.toggle("is-on", !!row && row[0] === selectedCounty);
      items.push({ path: path, value: row ? countyValue(row, mode) : null });
    });
    paint(countySvg, items, mode === "change" ? "change" : "amount");
    var note = document.getElementById("county-note");
    var regions = rows.length && rows.every(function (row) { return row[1].indexOf("Planning Region") >= 0; });
      if (!matched && regions) {
      note.textContent = "This map draws " + paths.length + " counties. The Census Bureau's July 1, 2025 file uses " + rows.length + " planning regions, and those are the rows in the table.";
      return;
    }
    var lines = [];
    if (mode === "change") lines.push("Counties are colored by the change from the April 1, 2020 estimates base to July 1, 2025. Darker green is a larger rise, and darker brown is a larger drop.");
    else lines.push("Counties are colored by the July 1, 2025 population estimate. Darker is more people in this state.");
    var mapOnly = paths.length - matched;
    var fileOnly = rows.length - matched;
    if (mapOnly) lines.push(mapOnly === 1 ? "One place on this map has no estimate in the county file, so it stays uncolored." : mapOnly + " places on this map have no estimate in the county file, so they stay uncolored.");
    if (fileOnly) lines.push(fileOnly === 1 ? "The table lists one more place than this map draws." : "The table lists " + fileOnly + " more places than this map draws.");
    note.textContent = lines.join(" ");
  }

  function rankText(state) {
    var ahead = data.states.filter(function (item) { return item.pop > state.pop; }).length;
    return "This population ranks " + ordinal(ahead + 1) + " of " + data.states.length + ".";
  }

  function writeCountyLine() {
    var copy = document.getElementById("county-copy");
    if (!selected || !selectedCounty) {
      copy.textContent = "";
      return;
    }
    var row = data.counties[selected.fips].filter(function (item) { return item[0] === selectedCounty; })[0];
    if (!row) {
      copy.textContent = "";
      return;
    }
    copy.textContent = row[1] + ". The Census Bureau estimates " + people(row[2]) + " people lived here on July 1, 2025. " + changeSentence(row[2], row[3]);
  }

  function renderTable(columns, rows, read, onPick, activeKey) {
    var wrap = document.createElement("div");
    wrap.className = "census-scroll";
    var table = document.createElement("table");
    table.className = "totals";
    table.id = "census-table";
    var head = document.createElement("thead");
    var headRow = document.createElement("tr");
    columns.forEach(function (column) {
      var cell = document.createElement("th");
      cell.scope = "col";
      if (column.num) cell.className = "num";
      var button = document.createElement("button");
      button.type = "button";
      button.className = "linkish";
      button.textContent = column.label;
      var active = column.state ? column.id === sortKey : column.id === countySortKey;
      if (active) {
        var dir = column.state ? sortDir : countySortDir;
        cell.setAttribute("aria-sort", dir < 0 ? "descending" : "ascending");
      }
      button.addEventListener("click", function () {
        var keyName = column.state ? "state" : "county";
        var current = keyName === "state" ? sortKey : countySortKey;
        var dir = keyName === "state" ? sortDir : countySortDir;
        if (current === column.id) dir = -dir;
        else dir = column.id === "name" ? 1 : -1;
        if (keyName === "state") { sortKey = column.id; sortDir = dir; }
        else { countySortKey = column.id; countySortDir = dir; }
        renderDetail();
      });
      cell.appendChild(button);
      headRow.appendChild(cell);
    });
    head.appendChild(headRow);
    table.appendChild(head);
    var body = document.createElement("tbody");
    rows.forEach(function (row) {
      var tr = document.createElement("tr");
      tr.setAttribute("data-key", row.key);
      if (activeKey && row.key === activeKey) tr.className = "is-on";
      columns.forEach(function (column) {
        var cell = document.createElement("td");
        if (column.num) cell.className = "num";
        if (column.id === "name") {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "linkish notranslate";
          button.setAttribute("translate", "no");
          button.textContent = read(row, "name");
          button.addEventListener("click", function () { onPick(row); });
          cell.appendChild(button);
        } else {
          var value = read(row, column.id);
          cell.textContent = value == null ? "Delegate" : format(column.id, value);
        }
        tr.appendChild(cell);
      });
      body.appendChild(tr);
    });
    table.appendChild(body);
    wrap.appendChild(table);
    return wrap;
  }

  function renderDetail() {
    detail.innerHTML = "";
    if (!selected) {
      var nation = data.nation;
      detail.appendChild(heading("The states and the District of Columbia"));
      detail.appendChild(paragraph("The Census Bureau estimates " + people(nation.pop) + " people lived in the 50 states and the District of Columbia on July 1, 2025. " + changeSentence(nation.pop, nation.base) + " The Bureau estimates " + people(nation.age18) + " of those people were 18 or older. The median age was " + nation.medAge.toFixed(1) + ". The 2020 census assigned 435 seats in the House of Representatives."));
      var states = data.states.slice().sort(compare(function (state) { return stateValue(state, sortKey); }, sortDir));
      detail.appendChild(renderTable([
        { id: "name", label: "State", state: true },
        { id: "pop", label: "Population", num: true, state: true },
        { id: "change", label: "Change", num: true, state: true },
        { id: "age18", label: "Age 18 and older", num: true, state: true },
        { id: "medAge", label: "Median age", num: true, state: true },
        { id: "seats", label: "House seats", num: true, state: true }
      ], states.map(function (state) { return { key: state.code, state: state }; }), function (row, id) {
        return id === "name" ? row.state.name : stateValue(row.state, id);
      }, function (row) { chooseState(row.state.code, true); }, null));
      paintCountry();
      markStateList();
      return;
    }

    var back = document.createElement("p");
    back.className = "census-actions";
    var backButton = document.createElement("button");
    backButton.type = "button";
    backButton.textContent = "All states";
    backButton.addEventListener("click", function () { chooseState(null, true); });
    back.appendChild(backButton);
    detail.appendChild(back);
    detail.appendChild(heading(selected.name));
    var place = selected.name === "District of Columbia" ? "the District of Columbia" : selected.name;
    detail.appendChild(paragraph("The Census Bureau estimates " + people(selected.pop) + " people lived in " + place + " on July 1, 2025. " + changeSentence(selected.pop, selected.base) + " " + rankText(selected)));
    detail.appendChild(paragraph("The Bureau estimates " + people(selected.age18) + " of those people were 18 or older on that date. The median age was " + Number(selected.medAge).toFixed(1) + "."));
    detail.appendChild(paragraph(seatSentence(selected)));
    var guide = document.createElement("p");
    var link = document.createElement("a");
    link.href = selected.href;
    link.textContent = "Open the " + selected.name + " voter guide.";
    guide.appendChild(link);
    detail.appendChild(guide);

    var countySlot = document.createElement("div");
    countySlot.id = "county-slot";
    detail.appendChild(countySlot);
    var note = document.createElement("p");
    note.id = "county-note";
    note.className = "note";
    detail.appendChild(note);
    var countyCopy = document.createElement("p");
    countyCopy.id = "county-copy";
    detail.appendChild(countyCopy);

    var rows = data.counties[selected.fips].slice().sort(compare(function (row) {
      return countyValue(row, countySortKey);
    }, countySortDir));
    detail.appendChild(renderTable([
      { id: "name", label: "Area" },
      { id: "pop", label: "Population", num: true },
      { id: "change", label: "Change", num: true }
    ], rows.map(function (row) { return { key: row[0], row: row }; }), function (item, id) {
      return countyValue(item.row, id);
    }, function (item) { chooseCounty(item.key); }, selectedCounty));

    if (countySvg && countySvg.getAttribute("data-code") === selected.code) {
      countySlot.appendChild(countySvg);
      paintCounties();
      writeCountyLine();
    } else {
      loadCounties(selected, countySlot);
    }
    paintCountry();
    markStateList();
  }

  function heading(text) {
    var node = document.createElement("h2");
    node.className = "notranslate";
    node.setAttribute("translate", "no");
    node.textContent = text;
    return node;
  }

  function paragraph(text) {
    var node = document.createElement("p");
    node.textContent = text;
    return node;
  }

  function loadCounties(state, countySlot) {
    var token = ++countyToken;
    countySvg = null;
    fetch("preview/maps/" + state.code.toLowerCase() + ".svg").then(function (response) {
      if (!response.ok) throw new Error("map");
      return response.text();
    }).then(function (markup) {
      if (token !== countyToken || !selected || selected.code !== state.code) return;
      var start = markup.indexOf("<svg");
      countySlot.innerHTML = start >= 0 ? markup.slice(start) : "";
      countySvg = countySlot.querySelector("svg");
      if (!countySvg) return;
      countySvg.id = "census-counties";
      countySvg.setAttribute("data-code", state.code);
      countySvg.setAttribute("aria-label", "Map of " + state.name);
      countySvg.querySelectorAll("path[data-fips]").forEach(function (path) {
        path.addEventListener("click", function () {
          var fips = path.getAttribute("data-fips");
          var known = data.counties[state.fips].some(function (row) { return row[0] === fips; });
          if (known) chooseCounty(fips);
        });
        path.addEventListener("mouseenter", function () {
          var row = data.counties[state.fips].filter(function (item) { return item[0] === path.getAttribute("data-fips"); })[0];
          var name = path.getAttribute("data-name") || "";
          status.textContent = row ? row[1] + " · " + people(row[2]) : name;
        });
      });
      paintCounties();
      writeCountyLine();
    }).catch(function () {
      if (token === countyToken) noteText("The county map did not load. The counts are in the table.");
    });
  }

  function noteText(text) {
    var note = document.getElementById("county-note");
    if (note) note.textContent = text;
  }

  function markStateList() {
    list.querySelectorAll("button").forEach(function (button) {
      button.classList.toggle("is-on", !!selected && button.getAttribute("data-code") === selected.code);
    });
  }

  function chooseCounty(fips) {
    selectedCounty = fips;
    paintCounties();
    writeCountyLine();
    detail.querySelectorAll("#census-table tbody tr").forEach(function (row) {
      row.classList.toggle("is-on", row.getAttribute("data-key") === fips);
    });
    if (selected && fips) history.replaceState(null, "", "#" + selected.code + "." + fips);
  }

  function chooseState(code, scroll, county) {
    selectedCounty = county || null;
    countySvg = null;
    countyToken++;
    selected = code ? data.states.filter(function (state) { return state.code === code; })[0] : null;
    if (selected && (measure === "pop" || measure === "change")) {
      countySortKey = measure;
      countySortDir = -1;
    } else {
      countySortKey = "pop";
      countySortDir = -1;
    }
    if (selected) history.replaceState(null, "", "#" + selected.code + (selectedCounty ? "." + selectedCounty : ""));
    else history.replaceState(null, "", "census.html");
    renderDetail();
    if (selectedCounty) {
      writeCountyLine();
      var countyRow = detail.querySelector("#census-table tbody tr.is-on");
      if (countyRow) countyRow.scrollIntoView({ block: "center" });
    } else if (scroll) detail.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setMeasure(id) {
    measure = id;
    sortKey = id;
    sortDir = -1;
    document.querySelectorAll("#census-measures button").forEach(function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-measure") === id ? "true" : "false");
    });
    if (selected) {
      countySortKey = id === "change" ? "change" : "pop";
      countySortDir = -1;
    }
    renderDetail();
    if (selected) paintCounties();
  }

  function bindCountry() {
    usSvg.querySelectorAll("path[data-code]").forEach(function (path) {
      var code = path.getAttribute("data-code");
      path.addEventListener("click", function () { chooseState(code, true); });
      path.addEventListener("mouseenter", function () {
        var state = data.states.filter(function (item) { return item.code === code; })[0];
        if (!state) return;
        status.textContent = state.name + " · " + format(measure, stateValue(state, measure));
      });
      path.addEventListener("mouseleave", function () {
        status.textContent = "";
      });
    });
  }

  function buildList() {
    data.states.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).forEach(function (state) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "notranslate";
      button.setAttribute("translate", "no");
      button.setAttribute("data-code", state.code);
      button.textContent = state.name;
      button.addEventListener("click", function () { chooseState(state.code, true); });
      list.appendChild(button);
    });
  }

  function buildMeasures() {
    var bar = document.getElementById("census-measures");
    MEASURES.forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.setAttribute("data-measure", item.id);
      button.setAttribute("aria-pressed", item.id === measure ? "true" : "false");
      button.textContent = item.label;
      button.addEventListener("click", function () { setMeasure(item.id); });
      bar.appendChild(button);
    });
  }

  buildMeasures();
  status.textContent = "Reading the Census Bureau counts.";
  Promise.all([
    fetch("census/us.json?t=" + Math.floor(Date.now() / 3600000)).then(function (response) { if (!response.ok) throw new Error("json"); return response.json(); }),
    fetch("preview/us.svg").then(function (response) { if (!response.ok) throw new Error("map"); return response.text(); })
  ]).then(function (parts) {
    data = parts[0];
    var markup = parts[1];
    var start = markup.indexOf("<svg");
    slot.innerHTML = start >= 0 ? markup.slice(start) : "";
    usSvg = slot.querySelector("svg");
    if (!usSvg) throw new Error("map");
    usSvg.id = "census-map";
    usSvg.setAttribute("aria-label", "Map of the states, colored by a Census Bureau count");
    addLabels(usSvg);
    bindCountry();
    buildList();
    status.textContent = "";
    var rawHash = (location.hash || "").replace(/^#/, "");
    var hashParts = rawHash.split(".");
    var hash = (hashParts[0] || "").toUpperCase();
    var hashCounty = hashParts[1] || "";
    var fromHash = data.states.filter(function (state) { return state.code === hash; })[0];
    if (fromHash) chooseState(fromHash.code, false, hashCounty);
    else renderDetail();
  }).catch(function () {
    status.textContent = "The census file did not load.";
  });
  new MutationObserver(function () {
    if (!data) return;
    paintCountry();
    if (countySvg) paintCounties();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
})();
