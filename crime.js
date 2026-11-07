(function () {
  function mapHex() {
    var raw = getComputedStyle(document.documentElement).getPropertyValue("--map").trim();
    return raw.charAt(0) === "#" ? raw.slice(0, 7) : "#ebe4d6";
  }
  function mapStyle() {
    return /dark$/.test(document.documentElement.getAttribute("data-theme") || "")
      ? "https://tiles.openfreemap.org/styles/dark"
      : "https://tiles.openfreemap.org/styles/liberty";
  }

  function followTheme(map, redraw) {
    map.__style = mapStyle();
    new MutationObserver(function () {
      var next = mapStyle();
      if (next !== map.__style) {
        map.__style = next;
        map.setStyle(next);
        map.once("style.load", redraw);
        return;
      }
      redraw();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  function dotRing() {
    return /dark$/.test(document.documentElement.getAttribute("data-theme") || "") ? "#f4f7fb" : "#1c1915";
  }
  var INK = ["#e8eaf6", "#c5cae9", "#7986cb", "#3949ab", "#1a237e"];
  var SEX_INK = ["#fde7f0", "#f4b6d0", "#e48ab0", "#ad1457", "#6a0d3a"];
  var ARREST_INK = ["#feedde", "#fdbe85", "#fd8d3c", "#e6550d", "#a63603"];
  var PAIR_INK = ["#f7f4e4", "#e4dba0", "#c4b45a", "#7a6a1a", "#3e3510"];
  var MEASURES = [
    { id: "fraud", label: "Fraud", arrest: true, noun: "fraud arrests", one: "fraud arrest", blurb: "Orange is fraud arrests from Table 69, agencies that sent 12 months of arrest data. A darker orange is a higher rate. The rate uses the population printed for that state in Table 69. This is an arrest, a citation, or a summons. It is not an estimated offense known to law enforcement. Table 29 estimates 90,184 fraud arrests in the United States. The states on this map are the Table 69 count." },
    { id: "forgery", label: "Forgery and counterfeiting", arrest: true, noun: "forgery and counterfeiting arrests", one: "forgery and counterfeiting arrest", blurb: "Orange is forgery and counterfeiting arrests from Table 69, agencies that sent 12 months of arrest data. A darker orange is a higher rate. The rate uses the population printed for that state in Table 69. This is an arrest, a citation, or a summons. It is not an estimated offense known to law enforcement. Table 29 estimates 33,034 forgery and counterfeiting arrests in the United States. The states on this map are the Table 69 count." },
    { id: "embezzlement", label: "Embezzlement", arrest: true, noun: "embezzlement arrests", one: "embezzlement arrest", blurb: "Orange is embezzlement arrests from Table 69, agencies that sent 12 months of arrest data. A darker orange is a higher rate. The rate uses the population printed for that state in Table 69. This is an arrest, a citation, or a summons. It is not an estimated offense known to law enforcement. Table 29 estimates 7,629 embezzlement arrests in the United States. The states on this map are the Table 69 count." },
    { id: "violent", label: "Violent crime", noun: "violent crime offenses", one: "violent crime offense", blurb: "Darker is a higher violent-crime rate. Violent crime is murder and nonnegligent manslaughter, rape, robbery, and aggravated assault." },
    { id: "homicide", label: "Murder", noun: "murder and nonnegligent manslaughter offenses", one: "murder and nonnegligent manslaughter offense", blurb: "Darker is a higher rate of murder and nonnegligent manslaughter." },
    { id: "rape", label: "Rape", noun: "rape offenses", one: "rape offense", blurb: "Darker is a higher rape rate. The count uses the definition the FBI adopted in 2013." },
    { id: "robbery", label: "Robbery", noun: "robbery offenses", one: "robbery offense", blurb: "Darker is a higher robbery rate." },
    { id: "assault", label: "Aggravated assault", noun: "aggravated assault offenses", one: "aggravated assault offense", blurb: "Darker is a higher aggravated-assault rate." },
    { id: "property", label: "Property crime", noun: "property crime offenses", one: "property crime offense", blurb: "Darker is a higher property-crime rate. Property crime is burglary, larceny-theft, and motor vehicle theft." },
    { id: "burglary", label: "Burglary", noun: "burglary offenses", one: "burglary offense", blurb: "Darker is a higher burglary rate." },
    { id: "larceny", label: "Larceny-theft", noun: "larceny-theft offenses", one: "larceny-theft offense", blurb: "Darker is a higher larceny-theft rate." },
    { id: "vehicle", label: "Motor vehicle theft", noun: "motor vehicle theft offenses", one: "motor vehicle theft offense", blurb: "Darker is a higher motor-vehicle-theft rate." }
  ];

  var data = null;
  var measure = "fraud";
  var sortKey = "rate";
  var sortDir = -1;
  var selected = null;
  var svg = null;

  var slot = document.getElementById("crime-slot");
  var legend = document.getElementById("crime-legend");
  var blurb = document.getElementById("crime-blurb");
  var status = document.getElementById("crime-status");
  var list = document.getElementById("crime-states");
  var detail = document.getElementById("crime-detail");
  if (!slot) return;

  function people(n) {
    return Math.round(n).toLocaleString("en-US");
  }

  function rate(count, pop) {
    return Math.round(count / pop * 1000000) / 10;
  }

  function rateText(count, pop) {
    return rate(count, pop).toFixed(1);
  }

  function legendCaption(legend, text) {
    legend.innerHTML = "";
    var caption = document.createElement("span");
    caption.className = "legend-unit";
    caption.textContent = text;
    legend.appendChild(caption);
  }

  function pairLabel(label) {
    if (label === "Black or African American") return "Black";
    if (label === "Hispanic or Latino") return "Hispanic";
    if (label === "Not Hispanic or Latino") return "Not Hispanic";
    return label;
  }

  function pairNote(note, labels) {
    var extra = labels.filter(function (label) { return pairLabel(label) !== label; }).map(function (label) {
      return pairLabel(label) + " is " + label + " in the FBI table.";
    });
    return extra.length ? note + " " + extra.join(" ") : note;
  }

  function current() {
    return MEASURES.filter(function (item) { return item.id === measure; })[0];
  }

  function place(state) {
    if (!state) return "the United States";
    if (state.code === "DC") return "the District of Columbia";
    return state.name;
  }

  function countOf(row, id) {
    return row[id];
  }

  function band(value, values, count) {
    var below = 0;
    for (var i = 0; i < values.length; i++) if (values[i] < value) below++;
    return Math.min(count - 1, Math.floor(below / values.length * count));
  }

  function shadeOf(value, values, ink) {
    var colors = ink || INK;
    var step = band(value, values, colors.length);
    return { fill: colors[step], light: step >= 3, band: "q" + step };
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

  function addLabels(map) {
    map.querySelectorAll("path").forEach(function (path) {
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
      map.appendChild(text);
    });
  }

  function measureCount(state) {
    if (current().arrest) {
      var row = arrestRow(state.code);
      return row ? row[measure] : 0;
    }
    return state[measure];
  }

  function measurePop(state) {
    if (current().arrest) {
      var row = arrestRow(state.code);
      return row && row.pop ? row.pop : 0;
    }
    return state.pop;
  }

  function paint() {
    if (!svg) return;
    var texts = {};
    svg.querySelectorAll("text.map-code").forEach(function (text) {
      texts[text.getAttribute("data-code")] = text;
    });
    var rates = data.states.map(function (state) { return rate(measureCount(state), measurePop(state)); });
    var ink = current().arrest ? ARREST_INK : null;
    var bands = {};
    svg.querySelectorAll("path[data-code]").forEach(function (path) {
      var code = path.getAttribute("data-code");
      var state = data.states.filter(function (item) { return item.code === code; })[0];
      path.classList.toggle("is-on", !!selected && selected.code === code);
      if (!state) {
        path.style.fill = mapHex();
        return;
      }
      var shade = shadeOf(rate(measureCount(state), measurePop(state)), rates, ink);
      path.style.fill = shade.fill;
      if (texts[code]) texts[code].classList.toggle("on-dark", shade.light);
      if (!bands[shade.band]) bands[shade.band] = { fill: shade.fill, values: [] };
      bands[shade.band].values.push(rate(measureCount(state), measurePop(state)));
    });
    legendCaption(legend, current().arrest
      ? "Per 100,000 people in 2025. Population printed for that state in the FBI arrest table."
      : "Per 100,000 people in 2025. Population printed on the FBI's offense row.");
    Object.keys(bands).sort().forEach(function (key) {
      var group = bands[key];
      var span = document.createElement("span");
      var swatch = document.createElement("i");
      swatch.className = "swatch";
      swatch.style.background = group.fill;
      span.appendChild(swatch);
      var lo = Math.min.apply(null, group.values);
      var hi = Math.max.apply(null, group.values);
      span.appendChild(document.createTextNode(lo === hi ? lo.toFixed(1) : lo.toFixed(1) + " to " + hi.toFixed(1)));
      legend.appendChild(span);
    });
    blurb.textContent = current().blurb;
    svg.setAttribute("aria-label", current().arrest
      ? "Map of the states, colored by arrests per 100,000 people in 2025"
      : "Map of the states, colored by estimated offenses per 100,000 people in 2025");
  }

  function readSort(state) {
    if (sortKey === "name") return state.name;
    if (sortKey === "count") return measureCount(state);
    if (sortKey === "prior") {
      if (current().arrest) return rate(measureCount(state), measurePop(state));
      return rate(state.prior[measure], state.prior.pop);
    }
    return rate(measureCount(state), measurePop(state));
  }

  function sentence(state) {
    var item = current();
    if (item.arrest) {
      if (!state) {
        var total = data.states.reduce(function (sum, itemState) { return sum + measureCount(itemState); }, 0);
        return "Table 69 reports " + people(total) + " " + item.noun + " in the states and the District of Columbia in 2025, from agencies that sent 12 months of arrest data. Table 29 estimates " + people(arrests.estimatedArrests[measure]) + " " + item.noun + " in the United States. The map uses the Table 69 counts. An arrest in this table is an arrest, a citation, or a summons.";
      }
      var count = measureCount(state);
      var noun = count === 1 ? item.one : item.noun;
      var line = "Table 69 reports " + people(count) + " " + noun + " in " + place(state) + " in 2025. That is " + rateText(count, measurePop(state)) + " per 100,000 people in the population printed for this state in Table 69, " + people(measurePop(state)) + ". These are agencies that sent 12 months of arrest data. An arrest here is an arrest, a citation, or a summons.";
      var row = arrestRow(state.code);
      if (row && row.note) line += " " + row.note;
      return line;
    }
    var rowState = state || data.nation;
    var earlier = state ? state.prior : data.nationPrior;
    var count = countOf(rowState, measure);
    var noun = count === 1 ? item.one : item.noun;
    var line = "The FBI estimates " + people(count) + " " + noun + " in " + place(state) + " in 2025. That is " + rateText(count, rowState.pop) + " per 100,000 people in the FBI's population for this row, " + people(rowState.pop) + ". The 2024 estimate in this file is " + people(earlier[measure]) + ", a rate of " + rateText(earlier[measure], earlier.pop) + ".";
    if (state && state.note) line += " The FBI's note in this file: " + state.note;
    return line;
  }

  function renderTable(rows) {
    var wrap = document.createElement("div");
    wrap.className = "census-scroll";
    var table = document.createElement("table");
    table.className = "totals";
    table.id = "crime-table";
    var columns = current().arrest
      ? [
        { id: "name", label: "State" },
        { id: "count", label: "Arrests", num: true },
        { id: "rate", label: "Per 100,000", num: true }
      ]
      : [
        { id: "name", label: "State" },
        { id: "count", label: "Offenses", num: true },
        { id: "rate", label: "Per 100,000", num: true },
        { id: "prior", label: "2024 per 100,000", num: true }
      ];
    var head = document.createElement("thead");
    var headRow = document.createElement("tr");
    columns.forEach(function (column) {
      var cell = document.createElement("th");
      cell.scope = "col";
      if (column.num) cell.className = "num";
      if (column.id === sortKey) cell.setAttribute("aria-sort", sortDir < 0 ? "descending" : "ascending");
      var button = document.createElement("button");
      button.type = "button";
      button.className = "linkish";
      button.textContent = column.label;
      button.addEventListener("click", function () {
        if (sortKey === column.id) sortDir = -sortDir;
        else {
          sortKey = column.id;
          sortDir = column.id === "name" ? 1 : -1;
        }
        render();
      });
      cell.appendChild(button);
      headRow.appendChild(cell);
    });
    head.appendChild(headRow);
    table.appendChild(head);
    var body = document.createElement("tbody");
    rows.forEach(function (state) {
      var tr = document.createElement("tr");
      tr.setAttribute("data-key", state.code);
      if (selected && selected.code === state.code) tr.className = "is-on";
      columns.forEach(function (column) {
        var cell = document.createElement("td");
        if (column.num) cell.className = "num";
        if (column.id === "name") {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "linkish notranslate";
          button.setAttribute("translate", "no");
          button.textContent = state.name;
          button.addEventListener("click", function () { choose(state.code, true); });
          cell.appendChild(button);
        } else if (column.id === "count") {
          cell.textContent = people(measureCount(state));
        } else if (column.id === "prior") {
          cell.textContent = rateText(state.prior[measure], state.prior.pop);
        } else {
          cell.textContent = rateText(measureCount(state), measurePop(state));
        }
        tr.appendChild(cell);
      });
      body.appendChild(tr);
    });
    table.appendChild(body);
    wrap.appendChild(table);
    return wrap;
  }

  function render() {
    detail.innerHTML = "";
    if (selected) {
      var back = document.createElement("p");
      back.className = "census-actions";
      var backButton = document.createElement("button");
      backButton.type = "button";
      backButton.textContent = "All states";
      backButton.addEventListener("click", function () { choose(null, true); });
      back.appendChild(backButton);
      detail.appendChild(back);
    }
    var title = document.createElement("h2");
    title.textContent = selected ? selected.name : "The states and the District of Columbia";
    detail.appendChild(title);
    var copy = document.createElement("p");
    copy.textContent = sentence(selected);
    detail.appendChild(copy);
    var rows = data.states.slice().sort(function (a, b) {
      var left = readSort(a);
      var right = readSort(b);
      if (typeof left === "string" || typeof right === "string") return String(left).localeCompare(String(right)) * sortDir;
      if (left === right) return 0;
      return (left - right) * sortDir;
    });
    detail.appendChild(renderTable(rows));
    paint();
    syncSort("crime-sort", sortKey, sortDir);
    paintHoods();
    list.querySelectorAll("button").forEach(function (button) {
      button.classList.toggle("is-on", !!selected && button.getAttribute("data-code") === selected.code);
    });
  }

  function choose(code, scroll) {
    selected = code ? data.states.filter(function (state) { return state.code === code; })[0] : null;
    render();
    if (scroll) detail.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function bind() {
    svg.querySelectorAll("path[data-code]").forEach(function (path) {
      var code = path.getAttribute("data-code");
      path.addEventListener("click", function () {
        if (svg.__panned) { svg.__panned = false; return; }
        choose(code, true);
      });
      path.addEventListener("mouseenter", function () {
        var state = data.states.filter(function (item) { return item.code === code; })[0];
        if (!state) return;
        status.textContent = state.name + " · " + rateText(measureCount(state), measurePop(state)) + " per 100,000 people in 2025";
      });
      path.addEventListener("mouseleave", function () { status.textContent = ""; });
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
      button.addEventListener("click", function () { choose(state.code, true); });
      list.appendChild(button);
    });
  }

  function buildMeasures() {
    var bar = document.getElementById("crime-measures");
    MEASURES.forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.setAttribute("data-measure", item.id);
      button.setAttribute("aria-pressed", item.id === measure ? "true" : "false");
      button.textContent = item.label;
      button.addEventListener("click", function () {
        measure = item.id;
        sortKey = "rate";
        sortDir = -1;
        bar.querySelectorAll("button").forEach(function (other) {
          other.setAttribute("aria-pressed", other.getAttribute("data-measure") === measure ? "true" : "false");
        });
        render();
      });
      bar.appendChild(button);
    });
  }

  var sexMode = "reported";
  var sexSortKey = "rate";
  var sexSortDir = -1;
  var sexSelected = null;
  var sexSvg = null;
  var arrests = null;
  var SEX_GROUPS = [
    { id: "white", label: "White", pct: "whitePct", count: "white" },
    { id: "black", label: "Black or African American", pct: "blackPct", count: "black" },
    { id: "aian", label: "American Indian or Alaska Native", pct: "aianPct", count: "aian" },
    { id: "asian", label: "Asian", pct: "asianPct", count: "asian" },
    { id: "nhpi", label: "Native Hawaiian or Other Pacific Islander", pct: "nhpiPct", count: "nhpi" }
  ];
  var SEX_ORDER = [
    "Rape",
    "Sex offenses (except rape and prostitution)",
    "Murder and nonnegligent manslaughter",
    "Robbery",
    "Aggravated assault",
    "Violent crime"
  ];

  function arrestRow(code) {
    return arrests.states.filter(function (row) { return row.code === code; })[0];
  }

  function shareText(value) {
    var rounded = Math.round(value * 10) / 10;
    return (rounded * 10) % 10 === 0 ? String(rounded) : rounded.toFixed(1);
  }

  function censusHispanicShare() {
    return arrests && arrests.population && arrests.population.hispanic
      ? arrests.population.hispanic.share
      : null;
  }

  function raceLine(label, pct, census, caption) {
    var line = document.createElement("div");
    line.className = "race-row";
    var name = document.createElement("span");
    name.textContent = label;
    var track = document.createElement("span");
    track.className = "race-track";
    track.setAttribute("aria-hidden", "true");
    var bar = document.createElement("i");
    if (pct != null) bar.style.width = pct + "%";
    track.appendChild(bar);
    if (census != null) {
      var tick = document.createElement("span");
      tick.className = "race-tick";
      tick.style.left = census + "%";
      track.appendChild(tick);
    }
    var fig = document.createElement("span");
    fig.className = "race-fig";
    var arrestShare = document.createElement("span");
    arrestShare.textContent = caption;
    var censusFig = document.createElement("span");
    censusFig.textContent = census == null ? "" : "Census " + shareText(census) + "%";
    fig.appendChild(arrestShare);
    fig.appendChild(censusFig);
    line.appendChild(name);
    line.appendChild(track);
    line.appendChild(fig);
    return line;
  }

  function appendRaceRows(block, record) {
    var lines = SEX_GROUPS.map(function (group) {
      var pct = record[group.pct];
      return {
        pct: pct == null ? -1 : pct,
        line: raceLine(group.label, pct, censusShare(group.id), pct == null ? "Asterisk in the table" : shareText(pct) + "% of arrests")
      };
    });
    if (record.hispanicPct != null) {
      lines.push({
        pct: record.hispanicPct,
        line: raceLine("Hispanic or Latino", record.hispanicPct, censusHispanicShare(), shareText(record.hispanicPct) + "% of arrests with ethnicity")
      });
    }
    lines.sort(function (a, b) { return b.pct - a.pct; });
    lines.forEach(function (item) { block.appendChild(item.line); });
    if (record.hispanicPct == null) return;
    var note = document.createElement("p");
    note.className = "note";
    note.textContent = "Ethnicity was reported on " + people(record.ethnicityTotal) + " arrests. Hispanic or Latino is ethnicity, not a race. A person counted here is also counted in a race row.";
    block.appendChild(note);
  }

  function censusShare(id) {
    var group = arrests.population.groups.filter(function (item) { return item.id === id; })[0];
    return group ? group.share : null;
  }

  function sexValue(state) {
    if (sexMode === "arrests") {
      var row = arrestRow(state.code);
      return rate(row ? row.rape : 0, state.pop);
    }
    return rate(state.rape, state.pop);
  }

  function sexNotes(state) {
    var bits = [];
    if (state.note) bits.push(state.note);
    var row = arrestRow(state.code);
    if (row && row.note && bits.indexOf(row.note) < 0) bits.push(row.note);
    return bits.length ? " Note: " + bits.join(" ") : "";
  }

  function sexSentence(state) {
    var offenses = people(data.nation.rape);
    var offenseRate = rateText(data.nation.rape, data.nation.pop);
    var arrestEstimate = people(arrests.estimatedArrests.rape);
    if (!state) {
      if (sexMode === "arrests") {
        return "The FBI estimates " + arrestEstimate + " rape arrests in the United States in 2025, and " + offenses + " rape offenses. The offense rate is " + offenseRate + " per 100,000 people in the FBI's population, " + people(data.nation.pop) + ". The map colors Table 69, the rape arrests reported by agencies that sent 12 months of data, divided by the population in the estimated-offenses file. That is not a clearance rate, and it is not a charging rate. The race of people in the reports that did not end in an arrest is not in these tables.";
      }
      return "The FBI estimates " + offenses + " rape offenses in the United States in 2025. That is " + offenseRate + " per 100,000 people in the FBI's population, " + people(data.nation.pop) + ". The FBI estimates " + arrestEstimate + " rape arrests in the same year. That national arrest count is Table 29. The map's state arrest counts are Table 69. The race of people in the reports that did not end in an arrest is not in these tables.";
    }
    var row = arrestRow(state.code);
    var count = row ? row.rape : 0;
    return "The FBI estimates " + people(state.rape) + " rape offenses in " + place(state) + " in 2025. That is " + rateText(state.rape, state.pop) + " per 100,000 people in the FBI's population for this row, " + people(state.pop) + ". Agencies that sent 12 months of arrest data reported " + people(count) + " rape arrests. That is " + rateText(count, state.pop) + " per 100,000 people in the same population. The arrest count is Table 69. It is not a clearance rate, and it is not a charge a prosecutor filed." + sexNotes(state);
  }

  function sexSortValue(state, key) {
    var row = arrestRow(state.code);
    var count = row ? row.rape : 0;
    if (key === "name") return state.name;
    if (key === "offenses") return state.rape;
    if (key === "arrests") return count;
    if (key === "arrestRate") return rate(count, state.pop);
    return rate(state.rape, state.pop);
  }

  function paintSex() {
    if (!sexSvg) return;
    var legend = document.getElementById("sex-legend");
    var blurb = document.getElementById("sex-blurb");
    var texts = {};
    sexSvg.querySelectorAll("text.map-code").forEach(function (text) {
      texts[text.getAttribute("data-code")] = text;
    });
    var values = data.states.map(sexValue);
      var ink = sexMode === "arrests" ? ARREST_INK : SEX_INK;
    var bands = {};
    sexSvg.querySelectorAll("path[data-code]").forEach(function (path) {
      var code = path.getAttribute("data-code");
      var state = data.states.filter(function (item) { return item.code === code; })[0];
      path.classList.toggle("is-on", !!sexSelected && sexSelected.code === code);
      if (!state) {
        path.style.fill = mapHex();
        return;
      }
      var shade = shadeOf(sexValue(state), values, ink);
      path.style.fill = shade.fill;
      if (texts[code]) texts[code].classList.toggle("on-dark", shade.light);
      if (!bands[shade.band]) bands[shade.band] = { fill: shade.fill, values: [] };
      bands[shade.band].values.push(sexValue(state));
    });
    legendCaption(legend, sexMode === "arrests"
      ? "Per 100,000 people in 2025. Arrests from agencies that sent 12 months, divided by the population on the offense row."
      : "Per 100,000 people in 2025. Population printed on the FBI's offense row.");
    Object.keys(bands).sort().forEach(function (key) {
      var group = bands[key];
      var span = document.createElement("span");
      var swatch = document.createElement("i");
      swatch.className = "swatch";
      swatch.style.background = group.fill;
      span.appendChild(swatch);
      var lo = Math.min.apply(null, group.values);
      var hi = Math.max.apply(null, group.values);
      span.appendChild(document.createTextNode(lo === hi ? lo.toFixed(1) : lo.toFixed(1) + " to " + hi.toFixed(1)));
      legend.appendChild(span);
    });
    sexSvg.setAttribute("aria-label", sexMode === "arrests"
      ? "Map of the states, colored by rape arrests per 100,000 people in 2025"
      : "Map of the states, colored by the estimated rape rate per 100,000 people in 2025");
    blurb.textContent = sexMode === "arrests"
      ? "Orange is rape arrests from agencies that sent 12 months of data, per 100,000 people in the FBI population used for the offense rate. A darker orange is a higher rate. The count is an arrest, a citation, or a summons."
      : "Rose is the estimated rape rate. A darker rose is a higher rate. The count is offenses known to law enforcement.";
  }

  function renderSexTable(rows) {
    var wrap = document.createElement("div");
    wrap.className = "census-scroll";
    var table = document.createElement("table");
    table.className = "totals";
    var columns = [
      { id: "name", label: "State" },
      { id: "offenses", label: "Offenses", num: true },
      { id: "rate", label: "Offenses per 100,000", num: true },
      { id: "arrests", label: "Arrests", num: true },
      { id: "arrestRate", label: "Arrests per 100,000", num: true }
    ];
    var head = document.createElement("thead");
    var headRow = document.createElement("tr");
    columns.forEach(function (column) {
      var cell = document.createElement("th");
      cell.scope = "col";
      if (column.num) cell.className = "num";
      if (column.id === sexSortKey) cell.setAttribute("aria-sort", sexSortDir < 0 ? "descending" : "ascending");
      var button = document.createElement("button");
      button.type = "button";
      button.className = "linkish";
      button.textContent = column.label;
      button.addEventListener("click", function () {
        if (sexSortKey === column.id) sexSortDir = -sexSortDir;
        else {
          sexSortKey = column.id;
          sexSortDir = column.id === "name" ? 1 : -1;
        }
        renderSex();
      });
      cell.appendChild(button);
      headRow.appendChild(cell);
    });
    head.appendChild(headRow);
    table.appendChild(head);
    var body = document.createElement("tbody");
    rows.forEach(function (state) {
      var row = arrestRow(state.code);
      var count = row ? row.rape : 0;
      var tr = document.createElement("tr");
      if (sexSelected && sexSelected.code === state.code) tr.className = "is-on";
      columns.forEach(function (column) {
        var cell = document.createElement("td");
        if (column.num) cell.className = "num";
        if (column.id === "name") {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "linkish notranslate";
          button.setAttribute("translate", "no");
          button.textContent = state.name;
          button.addEventListener("click", function () { chooseSex(state.code, true); });
          cell.appendChild(button);
        } else if (column.id === "offenses") {
          cell.textContent = people(state.rape);
        } else if (column.id === "arrests") {
          cell.textContent = people(count);
        } else if (column.id === "arrestRate") {
          cell.textContent = rateText(count, state.pop);
        } else {
          cell.textContent = rateText(state.rape, state.pop);
        }
        tr.appendChild(cell);
      });
      body.appendChild(tr);
    });
    table.appendChild(body);
    wrap.appendChild(table);
    return wrap;
  }

  function renderSex() {
    var detail = document.getElementById("sex-detail");
    detail.innerHTML = "";
    if (sexSelected) {
      var back = document.createElement("p");
      back.className = "census-actions";
      var backButton = document.createElement("button");
      backButton.type = "button";
      backButton.textContent = "All states";
      backButton.addEventListener("click", function () { chooseSex(null, true); });
      back.appendChild(backButton);
      detail.appendChild(back);
    }
    var title = document.createElement("h2");
    title.textContent = sexSelected ? sexSelected.name : "The states and the District of Columbia";
    detail.appendChild(title);
    var copy = document.createElement("p");
    copy.textContent = sexSentence(sexSelected);
    detail.appendChild(copy);
    var rows = data.states.slice().sort(function (a, b) {
      var left = sexSortValue(a, sexSortKey);
      var right = sexSortValue(b, sexSortKey);
      if (typeof left === "string" || typeof right === "string") return String(left).localeCompare(String(right)) * sexSortDir;
      if (left === right) return 0;
      return (left - right) * sexSortDir;
    });
    detail.appendChild(renderSexTable(rows));
    paintSex();
    syncSort("sex-sort", sexSortKey, sexSortDir);
  }

  function chooseSex(code, scroll) {
    sexSelected = code ? data.states.filter(function (state) { return state.code === code; })[0] : null;
    renderSex();
    if (scroll) document.getElementById("sex-detail").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderRace() {
    var host = document.getElementById("sex-race");
    if (!host) return;
    host.innerHTML = "";
    var key = document.createElement("p");
    key.className = "note";
    key.textContent = "The bar is the share of arrests. The mark on a race row is the Census race-alone share. The mark on Hispanic or Latino is the Census Hispanic share of the population.";
    host.appendChild(key);
    SEX_ORDER.forEach(function (offense) {
      var record = arrests.race.rows.filter(function (row) { return row.offense === offense; })[0];
      if (!record) return;
      var block = document.createElement("div");
      block.className = "race-block";
      var heading = document.createElement("h3");
      heading.textContent = offense;
      block.appendChild(heading);
      var intro = document.createElement("p");
      intro.textContent = people(record.total) + " arrests in this table.";
      block.appendChild(intro);
      appendRaceRows(block, record);
      host.appendChild(block);
    });
  }

  function setupSex(markup) {
    var sexSlot = document.getElementById("sex-slot");
    var sexStatus = document.getElementById("sex-status");
    if (!sexSlot || !arrests) {
      if (sexStatus) sexStatus.textContent = "The arrest file did not load.";
      return;
    }
    var start = markup.indexOf("<svg");
    sexSlot.innerHTML = start >= 0 ? markup.slice(start) : "";
    sexSvg = sexSlot.querySelector("svg");
    if (!sexSvg) {
      sexStatus.textContent = "The arrest file did not load.";
      return;
    }
    sexSvg.querySelectorAll("[id]").forEach(function (node) { node.removeAttribute("id"); });
    sexSvg.id = "sex-map";
    sexSvg.setAttribute("aria-label", "Map of the states, colored by the rape rate or the rape-arrest rate");
    addLabels(sexSvg);
    sexSvg.querySelectorAll("path[data-code]").forEach(function (path) {
      path.addEventListener("click", function () {
        if (sexSvg.__panned) { sexSvg.__panned = false; return; }
        chooseSex(path.getAttribute("data-code"), true);
      });
      path.addEventListener("mouseenter", function () {
        var state = data.states.filter(function (item) { return item.code === path.getAttribute("data-code"); })[0];
        if (!state) return;
        var row = arrestRow(state.code);
        var count = row ? row.rape : 0;
        var value = sexMode === "arrests" ? rateText(count, state.pop) : rateText(state.rape, state.pop);
        sexStatus.textContent = state.name + " · " + value + " per 100,000 people in 2025";
      });
      path.addEventListener("mouseleave", function () { sexStatus.textContent = ""; });
    });
    var bar = document.getElementById("sex-measures");
    [
      { id: "reported", label: "Reported" },
      { id: "arrests", label: "Arrests" }
    ].forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.setAttribute("data-measure", item.id);
      button.setAttribute("aria-pressed", item.id === sexMode ? "true" : "false");
      button.textContent = item.label;
      button.addEventListener("click", function () {
        sexMode = item.id;
        sexSortKey = item.id === "arrests" ? "arrestRate" : "rate";
        sexSortDir = -1;
        bar.querySelectorAll("button").forEach(function (other) {
          other.setAttribute("aria-pressed", other.getAttribute("data-measure") === sexMode ? "true" : "false");
        });
        renderSex();
      });
      bar.appendChild(button);
    });
    sexStatus.textContent = "";
    renderRace();
    renderSex();
  }

  function syncSort(barId, key, dir) {
    var bar = document.getElementById(barId);
    if (!bar) return;
    bar.querySelectorAll("button").forEach(function (button) {
      var on = button.getAttribute("data-sort") === key && button.getAttribute("data-dir") === String(dir);
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function wireSort(barId, apply) {
    var bar = document.getElementById(barId);
    if (!bar) return;
    bar.addEventListener("click", function (event) {
      var button = event.target.closest("button");
      if (!button || !data) return;
      apply(button.getAttribute("data-sort"), +button.getAttribute("data-dir"));
    });
  }

  function attachZoom(map, barId) {
    if (!map) return;
    var box = map.viewBox.baseVal;
    var base = { x: box.x, y: box.y, w: box.width, h: box.height };
    var view = { x: base.x, y: base.y, w: base.w, h: base.h };
    var drag = null;
    function apply() {
      map.setAttribute("viewBox", view.x + " " + view.y + " " + view.w + " " + view.h);
    }
    function clamp() {
      var minW = base.w / 14;
      view.w = Math.max(minW, Math.min(base.w, view.w));
      view.h = view.w * base.h / base.w;
      view.x = Math.max(base.x, Math.min(base.x + base.w - view.w, view.x));
      view.y = Math.max(base.y, Math.min(base.y + base.h - view.h, view.y));
    }
    function zoom(factor, clientX, clientY) {
      var rect = map.getBoundingClientRect();
      var rx = (clientX - rect.left) / rect.width;
      var ry = (clientY - rect.top) / rect.height;
      var cx = view.x + rx * view.w;
      var cy = view.y + ry * view.h;
      view.w = view.w / factor;
      view.h = view.h / factor;
      view.x = cx - rx * view.w;
      view.y = cy - ry * view.h;
      clamp();
      apply();
    }
    function reset() {
      view.x = base.x;
      view.y = base.y;
      view.w = base.w;
      view.h = base.h;
      apply();
    }
    var bar = document.getElementById(barId);
    if (bar && !bar.childElementCount) {
      [["Zoom in", 1.6], ["Zoom out", 1 / 1.6], ["United States", 0]].forEach(function (item) {
        var button = document.createElement("button");
        button.type = "button";
        if (item[0] === "Zoom in") button.appendChild(zoomMark(false, barId === "sex-zoom"));
        if (item[0] === "Zoom out") button.appendChild(zoomMark(true, barId === "sex-zoom"));
        button.appendChild(document.createTextNode(item[0]));
        button.addEventListener("click", function () {
          if (!item[1]) reset();
          else {
            var rect = map.getBoundingClientRect();
            zoom(item[1], rect.left + rect.width / 2, rect.top + rect.height / 2);
          }
        });
        bar.appendChild(button);
      });
    }
    map.addEventListener("wheel", function (event) {
      event.preventDefault();
      zoom(event.deltaY > 0 ? 1 / 1.25 : 1.25, event.clientX, event.clientY);
    }, { passive: false });
    map.addEventListener("pointerdown", function (event) {
      var code = event.target.getAttribute && event.target.getAttribute("data-code");
      drag = { x: event.clientX, y: event.clientY, vx: view.x, vy: view.y, moved: false, id: event.pointerId, code: code };
      map.setPointerCapture(event.pointerId);
    });
    map.addEventListener("pointermove", function (event) {
      if (!drag || drag.id !== event.pointerId) return;
      var rect = map.getBoundingClientRect();
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 4) drag.moved = true;
      view.x = drag.vx - (event.clientX - drag.x) / rect.width * view.w;
      view.y = drag.vy - (event.clientY - drag.y) / rect.height * view.h;
      clamp();
      apply();
    });
    map.addEventListener("pointerup", function (event) {
      if (!drag || drag.id !== event.pointerId) return;
      var moved = drag.moved;
      var code = drag.code;
      drag = null;
      map.__panned = true;
      if (moved || !code) return;
      if (map.id === "sex-map") chooseSex(code, true);
      else choose(code, true);
    });
    map.addEventListener("pointercancel", function () { drag = null; });
  }

  var cityData = null;
  var hoodSortKey = "rate";
  var hoodSortDir = -1;
  var hoodPick = null;
  var hoodCanvas = null;
  var hoodCtx = null;
  var hoodBase = null;
  var hoodView = { cx: 0.25, cy: 0.4, scale: 800 };
  var hoodCssW = 800;
  var hoodCssH = 560;
  var hoodDrag = null;
  var hoodFitted = false;

  function zoomMark(out, rose) {
    var dark = rose ? "#ad1457" : "#3949ab";
    var light = rose ? "#fde7f0" : "#e8eaf6";
    var ink = rose ? "#6a0d3a" : "#1a237e";
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "zoom-mark");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    var circle = document.createElementNS(svg.namespaceURI, "circle");
    circle.setAttribute("cx", "10");
    circle.setAttribute("cy", "10");
    circle.setAttribute("r", "6.2");
    circle.setAttribute("fill", out ? light : dark);
    if (out) {
      circle.setAttribute("stroke", dark);
      circle.setAttribute("stroke-width", "1.4");
    }
    var sign = document.createElementNS(svg.namespaceURI, "path");
    sign.setAttribute("d", out ? "M6.6 10h6.8" : "M10 6.6v6.8M6.6 10h6.8");
    sign.setAttribute("stroke", out ? ink : "#f4f0e6");
    sign.setAttribute("stroke-width", "1.7");
    sign.setAttribute("stroke-linecap", "round");
    var handle = document.createElementNS(svg.namespaceURI, "path");
    handle.setAttribute("d", "M14.6 14.6L20.2 20.2");
    handle.setAttribute("stroke", "#1c1915");
    handle.setAttribute("stroke-width", "2");
    handle.setAttribute("stroke-linecap", "round");
    svg.appendChild(circle);
    svg.appendChild(sign);
    svg.appendChild(handle);
    return svg;
  }

  function mercX(lon) { return (lon + 180) / 360; }
  function mercY(lat) {
    var clamped = Math.max(-85, Math.min(85, lat));
    var s = Math.sin(clamped * Math.PI / 180);
    return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
  }
  function hoodLonLat(x, y) {
    var mx = (x - hoodCssW / 2) / hoodView.scale + hoodView.cx;
    var my = (y - hoodCssH / 2) / hoodView.scale + hoodView.cy;
    var lon = mx * 360 - 180;
    var n = Math.PI - 2 * Math.PI * my;
    var lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
    return [lon, lat];
  }
  function hoodPx(lon, lat) {
    return [
      (mercX(lon) - hoodView.cx) * hoodView.scale + hoodCssW / 2,
      (mercY(lat) - hoodView.cy) * hoodView.scale + hoodCssH / 2
    ];
  }
  function clampHood() {
    hoodView.scale = Math.max(hoodCssW / (70 / 360), Math.min(hoodCssW / (0.02 / 360), hoodView.scale));
    hoodView.cx = Math.max(mercX(-175), Math.min(mercX(-65), hoodView.cx));
    hoodView.cy = Math.max(mercY(72), Math.min(mercY(15), hoodView.cy));
  }
  function fitHood(lon, lat, lonSpan) {
    hoodView.cx = mercX(lon);
    hoodView.cy = mercY(lat);
    hoodView.scale = hoodCssW / (lonSpan / 360);
    clampHood();
    hoodFitted = true;
  }
  function zoomHood(x, y, factor) {
    var before = hoodLonLat(x, y);
    hoodView.scale *= factor;
    clampHood();
    hoodView.cx = mercX(before[0]) - (x - hoodCssW / 2) / hoodView.scale;
    hoodView.cy = mercY(before[1]) - (y - hoodCssH / 2) / hoodView.scale;
    clampHood();
    drawHoods();
  }
  function cityOf(index) { return cityData.cities[index]; }
  function cityCount(city, id) {
    if (id === "all") return city.counts[0] + city.counts[5];
    return city.counts[cityData.fields.indexOf(id)];
  }
  function rateLabel(count, pop) {
    var bits = rate(count, pop).toFixed(1).split(".");
    bits[0] = Number(bits[0]).toLocaleString("en-US");
    return bits.join(".");
  }
  var hoodMeasureId = "all";
  var HOOD_MEASURES = [
    { id: "all", label: "All crime", noun: "violent-crime and property-crime offenses", one: "violent-crime or property-crime offense" },
    { id: "fraud", label: "Fraud", arrest: true, noun: "fraud arrests", one: "fraud arrest" },
    { id: "forgery", label: "Forgery and counterfeiting", arrest: true, noun: "forgery and counterfeiting arrests", one: "forgery and counterfeiting arrest" },
    { id: "embezzlement", label: "Embezzlement", arrest: true, noun: "embezzlement arrests", one: "embezzlement arrest" }
  ].concat(MEASURES.filter(function (item) { return !item.arrest; }));

  function hoodItem() {
    return HOOD_MEASURES.filter(function (item) { return item.id === hoodMeasureId; })[0];
  }
  function hoodState(row) {
    var match = data.states.filter(function (state) { return state.name === row[2]; })[0];
    return match ? arrestRow(match.code) : null;
  }
  function hoodCount(row) {
    if (hoodItem().arrest) {
      var record = hoodState(row);
      return record ? record[hoodMeasureId] : 0;
    }
    return cityCount(cityOf(row[5]), hoodMeasureId);
  }
  function hoodPop(row) {
    if (hoodItem().arrest) {
      var record = hoodState(row);
      return record && record.pop ? record.pop : 0;
    }
    return cityOf(row[5]).pop;
  }
  function hoodRate(row) {
    return rate(hoodCount(row), hoodPop(row));
  }
  function hoodSentence(row) {
    var item = hoodItem();
    var count = hoodCount(row);
    var noun = count === 1 ? item.one : item.noun;
    if (item.arrest) {
      var record = hoodState(row);
      var line = row[0] + " is in " + row[2] + ". Table 69 reports " + people(count) + " " + noun + " in " + row[2] + " in 2025. That is " + rateLabel(count, hoodPop(row)) + " per 100,000 people in the population printed for that state in Table 69, " + people(hoodPop(row)) + ". Table 8 does not publish " + item.label.toLowerCase() + " by city, so this is the state's arrest rate. It is not a count inside " + row[0] + " or in " + row[1] + ".";
      if (record && record.note) line += " " + record.note;
      return line;
    }
    var city = cityOf(row[5]);
    var line = row[0] + ", " + row[1] + ", " + row[2] + ". ";
    if (item.id === "all") {
      line += "Table 8 reports " + people(city.counts[0]) + " violent-crime offenses and " + people(city.counts[5]) + " property-crime offenses in " + city.city + ", " + city.state + ", in 2025. All crime here is those counts added, " + people(count) + ". ";
    } else {
      line += "Table 8 reports " + people(count) + " " + noun + " in " + city.city + ", " + city.state + ", in 2025. ";
    }
    line += "That is " + rateLabel(count, city.pop) + " per 100,000 people in the population on that row, " + people(city.pop) + ". This is the city's offenses known to law enforcement. It is not a count inside the neighborhood.";
    if (item.id === "all") line += " Arson is not included.";
    if (city.city !== row[1]) line += " Table 8 lists the city as " + city.city + ".";
    if (city.note) line += " " + city.note;
    return line;
  }
  var hoodListMeasure = null;
  function drawHoods() {
    if (!hoodCtx || !cityData) return;
    if (hoodBase) {
      var center = hoodLonLat(hoodCssW / 2, hoodCssH / 2);
      hoodBase.jumpTo({ center: center, zoom: Math.log(hoodView.scale / 512) / Math.LN2 });
    }
    hoodCtx.clearRect(0, 0, hoodCssW, hoodCssH);
    var ink = hoodItem().arrest ? ARREST_INK : INK;
    var values;
    var shades;
    function shadeFor(value, sorted) {
      var lo = 0;
      var hi = sorted.length;
      while (lo < hi) {
        var mid = (lo + hi) >> 1;
        if (sorted[mid] < value) lo = mid + 1;
        else hi = mid;
      }
      var step = Math.min(ink.length - 1, Math.floor(lo / sorted.length * ink.length));
      return { fill: ink[step], light: step >= 3, band: "q" + step };
    }
    if (hoodItem().arrest) {
      var stateRates = data.states.map(function (state) {
        var record = arrestRow(state.code);
        return record && record.pop ? rate(record[hoodMeasureId], record.pop) : 0;
      });
      var byName = {};
      data.states.forEach(function (state, index) { byName[state.name] = stateRates[index]; });
      var sortedStates = stateRates.slice().sort(function (a, b) { return a - b; });
      values = cityData.hoods.map(function (row) { return byName[row[2]] || 0; });
      shades = values.map(function (value) { return shadeFor(value, sortedStates); });
    } else {
      values = cityData.cities.map(function (city) { return rate(cityCount(city, hoodMeasureId), city.pop); });
      var sorted = values.slice().sort(function (a, b) { return a - b; });
      shades = values.map(function (value) { return shadeFor(value, sorted); });
    }
    var radius = hoodView.scale / 360 >= 80 ? 7 : hoodView.scale / 360 >= 24 ? 5 : 3.5;
    var bands = {};
    var picked = null;
    cityData.hoods.forEach(function (row, index) {
      var shade = hoodItem().arrest ? shades[index] : shades[row[5]];
      var value = hoodItem().arrest ? values[index] : values[row[5]];
      if (!bands[shade.band]) bands[shade.band] = { fill: shade.fill, lo: value, hi: value };
      else {
        if (value < bands[shade.band].lo) bands[shade.band].lo = value;
        if (value > bands[shade.band].hi) bands[shade.band].hi = value;
      }
      var p = hoodPx(row[3], row[4]);
      if (p[0] < -radius || p[1] < -radius || p[0] > hoodCssW + radius || p[1] > hoodCssH + radius) return;
      var on = hoodPick && hoodPick[0] === row[0] && hoodPick[1] === row[1] && hoodPick[3] === row[3];
      if (on) { picked = { p: p, fill: shade.fill }; return; }
      hoodCtx.beginPath();
      hoodCtx.arc(p[0], p[1], radius, 0, Math.PI * 2);
      hoodCtx.fillStyle = shade.fill;
      hoodCtx.fill();
      hoodCtx.lineWidth = 1;
      hoodCtx.strokeStyle = shade.light ? "#f4f7fb" : "#1c1915";
      hoodCtx.stroke();
    });
    if (picked) {
      hoodCtx.beginPath();
      hoodCtx.arc(picked.p[0], picked.p[1], radius + 3, 0, Math.PI * 2);
      hoodCtx.fillStyle = picked.fill;
      hoodCtx.fill();
      hoodCtx.lineWidth = 2;
      hoodCtx.strokeStyle = dotRing();
      hoodCtx.stroke();
    }
    var legend = document.getElementById("crime-hood-legend");
    if (!legend) return;
    if (hoodCanvas) {
      hoodCanvas.setAttribute("aria-label", hoodItem().arrest
        ? "Neighborhoods colored by the state arrest rate per 100,000 people in 2025"
        : "Neighborhoods colored by the city offense rate per 100,000 people in 2025");
    }
    legendCaption(legend, hoodItem().arrest
      ? "Per 100,000 people in 2025. The state's population in the FBI arrest table."
      : "Per 100,000 people in 2025. Population printed on the city's FBI row.");
    Object.keys(bands).sort().forEach(function (key) {
      var group = bands[key];
      var span = document.createElement("span");
      var swatch = document.createElement("i");
      swatch.className = "swatch";
      swatch.style.background = group.fill;
      span.appendChild(swatch);
      var lo = group.lo;
      var hi = group.hi;
      span.appendChild(document.createTextNode(lo === hi ? lo.toFixed(1) : lo.toFixed(1) + " to " + hi.toFixed(1)));
      legend.appendChild(span);
    });
  }
  function renderHoodList() {
    var host = document.getElementById("crime-hood-list");
    var note = document.getElementById("crime-hood-note");
    if (!host || !cityData) return;
    var rows = cityData.hoods.slice().sort(function (a, b) {
      if (hoodSortKey === "name") return (a[0] + a[1]).localeCompare(b[0] + b[1]) * hoodSortDir;
      var left = hoodRate(a);
      var right = hoodRate(b);
      if (left === right) return a[0].localeCompare(b[0]);
      return (left - right) * hoodSortDir;
    });
    host.innerHTML = "";
    rows.slice(0, 150).forEach(function (row) {
      var button = document.createElement("button");
      button.type = "button";
      if (hoodPick && hoodPick[0] === row[0] && hoodPick[1] === row[1] && hoodPick[3] === row[3]) button.className = "is-on";
      button.textContent = row[0] + ", " + row[1] + ", " + row[2] + " · " + rateLabel(hoodCount(row), hoodPop(row)) + " per 100,000";
      button.addEventListener("click", function () {
        hoodPick = row;
        fitHood(row[3], row[4], 0.4);
        document.getElementById("crime-hood-readout").textContent = hoodSentence(row);
        renderHoodList();
        drawHoods();
        document.getElementById("crime-hood-wrap").scrollIntoView({ behavior: "smooth", block: "center" });
      });
      host.appendChild(button);
    });
    var order = hoodSortKey === "name" ? "name" : (hoodItem().arrest ? "the state " + hoodItem().label.toLowerCase() + " arrest rate" : "the city " + hoodItem().label.toLowerCase() + " rate");
    note.textContent = "Showing the first 150 of " + people(cityData.matched) + " neighborhoods with a city in Table 8. " + people(cityData.areas - cityData.matched) + " of " + people(cityData.areas) + " neighborhoods have no matching city, so they are not listed. Ordered by " + order + ".";
    if (hoodItem().id === "all") note.textContent += " All crime is the city's violent-crime count plus its property-crime count. Arson is not included.";
    if (hoodItem().arrest) note.textContent += " These dots are the state " + hoodItem().label.toLowerCase() + " arrest rate from Table 69. Table 8 does not publish " + hoodItem().label.toLowerCase() + " by city.";
    syncSort("crime-hood-sort", hoodSortKey, hoodSortDir);
  }
  function paintHoods() {
    drawHoods();
    if (!cityData || hoodListMeasure === hoodMeasureId) return;
    hoodListMeasure = hoodMeasureId;
    renderHoodList();
  }
  function nearestHood(x, y) {
    var best = null;
    var bestD = 14 * 14;
    cityData.hoods.forEach(function (row) {
      var p = hoodPx(row[3], row[4]);
      var d = (p[0] - x) * (p[0] - x) + (p[1] - y) * (p[1] - y);
      if (d < bestD) { bestD = d; best = row; }
    });
    return best;
  }
  function hoodPos(event) {
    var rect = hoodCanvas.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  }
  function resizeHood() {
    if (!hoodCanvas) return;
    var rect = hoodCanvas.getBoundingClientRect();
    hoodCssW = Math.max(280, rect.width || hoodCssW);
    hoodCssH = Math.max(280, rect.height || hoodCssH);
    var dpr = window.devicePixelRatio || 1;
    hoodCanvas.width = Math.round(hoodCssW * dpr);
    hoodCanvas.height = Math.round(hoodCssH * dpr);
    hoodCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!hoodFitted) fitHood(-97, 38.5, 58);
    else clampHood();
    if (hoodBase) hoodBase.resize();
    drawHoods();
  }
  function setupHoods(payload) {
    cityData = payload;
    var statusLine = document.getElementById("crime-hood-note");
    hoodCanvas = document.getElementById("crime-hood-map");
    if (!cityData || !hoodCanvas) {
      if (statusLine) statusLine.textContent = "The city file did not load.";
      return;
    }
    hoodCtx = hoodCanvas.getContext("2d");
    var measureBar = document.getElementById("crime-hood-measures");
    HOOD_MEASURES.forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = item.label;
      button.setAttribute("aria-pressed", item.id === hoodMeasureId ? "true" : "false");
      button.addEventListener("click", function () {
        hoodMeasureId = item.id;
        hoodListMeasure = item.id;
        Array.prototype.forEach.call(measureBar.querySelectorAll("button"), function (other) {
          other.setAttribute("aria-pressed", other === button ? "true" : "false");
        });
        var readout = document.getElementById("crime-hood-readout");
        if (readout) readout.textContent = hoodPick ? hoodSentence(hoodPick) : "";
        renderHoodList();
        drawHoods();
      });
      measureBar.appendChild(button);
    });
    var zoomBar = document.getElementById("crime-hood-zoom");
    [["Zoom in", 1.4], ["Zoom out", 1 / 1.4]].forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.appendChild(zoomMark(item[0] === "Zoom out", false));
      button.appendChild(document.createTextNode(item[0]));
      button.addEventListener("click", function () { zoomHood(hoodCssW / 2, hoodCssH / 2, item[1]); });
      zoomBar.appendChild(button);
    });
    [["Lower 48", -97, 38.5, 58], ["Alaska", -146.5, 61.2, 22], ["Hawaii", -157.4, 20.6, 6]].forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = item[0];
      button.addEventListener("click", function () {
        fitHood(item[1], item[2], item[3]);
        drawHoods();
      });
      zoomBar.appendChild(button);
    });
    if (window.maplibregl) {
      hoodBase = new maplibregl.Map({
        container: "crime-hood-base",
        style: mapStyle(),
        center: [-97, 38.5],
        zoom: 3,
        interactive: false,
        attributionControl: false,
        fadeDuration: 0
      });
      hoodBase.on("load", function () { drawHoods(); });
      followTheme(hoodBase, function () { drawHoods(); });
    }
    hoodCanvas.addEventListener("pointerdown", function (event) {
      var p = hoodPos(event);
      hoodDrag = { x: p[0], y: p[1], cx: hoodView.cx, cy: hoodView.cy, moved: false, id: event.pointerId };
      hoodCanvas.classList.add("is-drag");
      hoodCanvas.setPointerCapture(event.pointerId);
    });
    hoodCanvas.addEventListener("pointermove", function (event) {
      if (!hoodDrag || hoodDrag.id !== event.pointerId) return;
      var p = hoodPos(event);
      if (Math.hypot(p[0] - hoodDrag.x, p[1] - hoodDrag.y) > 3) hoodDrag.moved = true;
      hoodView.cx = hoodDrag.cx - (p[0] - hoodDrag.x) / hoodView.scale;
      hoodView.cy = hoodDrag.cy - (p[1] - hoodDrag.y) / hoodView.scale;
      clampHood();
      drawHoods();
    });
    hoodCanvas.addEventListener("pointerup", function (event) {
      if (!hoodDrag || hoodDrag.id !== event.pointerId) return;
      var moved = hoodDrag.moved;
      var p = hoodPos(event);
      hoodDrag = null;
      hoodCanvas.classList.remove("is-drag");
      if (moved) return;
      var hit = nearestHood(p[0], p[1]);
      if (!hit) {
        zoomHood(p[0], p[1], 1.8);
        return;
      }
      hoodPick = hit;
      document.getElementById("crime-hood-readout").textContent = hoodSentence(hit);
      renderHoodList();
      drawHoods();
    });
    hoodCanvas.addEventListener("pointercancel", function () {
      hoodDrag = null;
      hoodCanvas.classList.remove("is-drag");
    });
    hoodCanvas.addEventListener("wheel", function (event) {
      event.preventDefault();
      var p = hoodPos(event);
      zoomHood(p[0], p[1], event.deltaY > 0 ? 0.8 : 1.25);
    }, { passive: false });
    window.addEventListener("resize", resizeHood);
    wireSort("crime-hood-sort", function (key, dir) {
      hoodSortKey = key;
      hoodSortDir = dir;
      renderHoodList();
    });
    resizeHood();
    renderHoodList();
    setupSexHoods();
  }

  function setupSexHoods() {
    var canvas = document.getElementById("sex-hood-map");
    var note = document.getElementById("sex-hood-note");
    if (!cityData || !canvas) {
      if (note) note.textContent = "The city file did not load.";
      return;
    }
    var rapeIndex = cityData.fields.indexOf("rape");
    var ctx = canvas.getContext("2d");
    var base = null;
    var view = { cx: 0.25, cy: 0.4, scale: 800 };
    var cssW = 800;
    var cssH = 560;
    var drag = null;
    var fitted = false;
    var pick = null;
    var sortKey = "rate";
    var sortDir = -1;
    function rapeCount(city) { return city.counts[rapeIndex]; }
    function rapeRate(city) { return rate(rapeCount(city), city.pop); }
    function rowRate(row) { return rapeRate(cityOf(row[5])); }
    function rowCount(row) { return rapeCount(cityOf(row[5])); }
    function lonLat(x, y) {
      var mx = (x - cssW / 2) / view.scale + view.cx;
      var my = (y - cssH / 2) / view.scale + view.cy;
      var lon = mx * 360 - 180;
      var n = Math.PI - 2 * Math.PI * my;
      var lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
      return [lon, lat];
    }
    function px(lon, lat) {
      return [(mercX(lon) - view.cx) * view.scale + cssW / 2, (mercY(lat) - view.cy) * view.scale + cssH / 2];
    }
    function clamp() {
      view.scale = Math.max(cssW / (70 / 360), Math.min(cssW / (0.02 / 360), view.scale));
      view.cx = Math.max(mercX(-175), Math.min(mercX(-65), view.cx));
      view.cy = Math.max(mercY(72), Math.min(mercY(15), view.cy));
    }
    function fit(lon, lat, lonSpan) {
      view.cx = mercX(lon);
      view.cy = mercY(lat);
      view.scale = cssW / (lonSpan / 360);
      clamp();
      fitted = true;
    }
    function zoomAt(x, y, factor) {
      var before = lonLat(x, y);
      view.scale *= factor;
      clamp();
      view.cx = mercX(before[0]) - (x - cssW / 2) / view.scale;
      view.cy = mercY(before[1]) - (y - cssH / 2) / view.scale;
      clamp();
      draw();
    }
    function sentence(row) {
      var city = cityOf(row[5]);
      var count = rapeCount(city);
      var noun = count === 1 ? "rape offense" : "rape offenses";
      var line = row[0] + ", " + row[1] + ", " + row[2] + ". Table 8 reports " + people(count) + " " + noun + " in " + city.city + ", " + city.state + ", in 2025. That is " + rateLabel(count, city.pop) + " per 100,000 people in the population on that row, " + people(city.pop) + ". This is the city's offenses known to law enforcement. It is not a count inside the neighborhood, and it is not an arrest.";
      if (city.city !== row[1]) line += " Table 8 lists the city as " + city.city + ".";
      if (city.note) line += " " + city.note;
      return line;
    }
    function draw() {
      if (base) {
        var center = lonLat(cssW / 2, cssH / 2);
        base.jumpTo({ center: center, zoom: Math.log(view.scale / 512) / Math.LN2 });
      }
      ctx.clearRect(0, 0, cssW, cssH);
      var values = cityData.cities.map(rapeRate);
      var sorted = values.slice().sort(function (a, b) { return a - b; });
      var shades = values.map(function (value) {
        var lo = 0;
        var hi = sorted.length;
        while (lo < hi) {
          var mid = (lo + hi) >> 1;
          if (sorted[mid] < value) lo = mid + 1;
          else hi = mid;
        }
        var step = Math.min(SEX_INK.length - 1, Math.floor(lo / sorted.length * SEX_INK.length));
        return { fill: SEX_INK[step], light: step >= 3, band: "q" + step };
      });
      var radius = view.scale / 360 >= 80 ? 7 : view.scale / 360 >= 24 ? 5 : 3.5;
      var bands = {};
      var picked = null;
      cityData.hoods.forEach(function (row) {
        var shade = shades[row[5]];
        var value = values[row[5]];
        if (!bands[shade.band]) bands[shade.band] = { fill: shade.fill, lo: value, hi: value };
        else {
          if (value < bands[shade.band].lo) bands[shade.band].lo = value;
          if (value > bands[shade.band].hi) bands[shade.band].hi = value;
        }
        var p = px(row[3], row[4]);
        if (p[0] < -radius || p[1] < -radius || p[0] > cssW + radius || p[1] > cssH + radius) return;
        var on = pick && pick[0] === row[0] && pick[1] === row[1] && pick[3] === row[3];
        if (on) { picked = { p: p, fill: shade.fill }; return; }
        ctx.beginPath();
        ctx.arc(p[0], p[1], radius, 0, Math.PI * 2);
        ctx.fillStyle = shade.fill;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = shade.light ? "#f4f7fb" : "#1c1915";
        ctx.stroke();
      });
      if (picked) {
        ctx.beginPath();
        ctx.arc(picked.p[0], picked.p[1], radius + 3, 0, Math.PI * 2);
        ctx.fillStyle = picked.fill;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = dotRing();
        ctx.stroke();
      }
      var legend = document.getElementById("sex-hood-legend");
      var sexHoodMap = document.getElementById("sex-hood-map");
      if (sexHoodMap) sexHoodMap.setAttribute("aria-label", "Neighborhoods colored by the city rape rate per 100,000 people in 2025");
      legendCaption(legend, "Per 100,000 people in 2025. Population printed on the city's FBI row.");
      Object.keys(bands).sort().forEach(function (key) {
        var group = bands[key];
        var span = document.createElement("span");
        var swatch = document.createElement("i");
        swatch.className = "swatch";
        swatch.style.background = group.fill;
        span.appendChild(swatch);
        span.appendChild(document.createTextNode(group.lo === group.hi ? group.lo.toFixed(1) : group.lo.toFixed(1) + " to " + group.hi.toFixed(1)));
        legend.appendChild(span);
      });
    }
    function renderList() {
      var host = document.getElementById("sex-hood-list");
      var rows = cityData.hoods.slice().sort(function (a, b) {
        if (sortKey === "name") return (a[0] + a[1]).localeCompare(b[0] + b[1]) * sortDir;
        var left = sortKey === "count" ? rowCount(a) : rowRate(a);
        var right = sortKey === "count" ? rowCount(b) : rowRate(b);
        if (left === right) return a[0].localeCompare(b[0]);
        return (left - right) * sortDir;
      });
      host.innerHTML = "";
      rows.slice(0, 150).forEach(function (row) {
        var city = cityOf(row[5]);
        var button = document.createElement("button");
        button.type = "button";
        if (pick && pick[0] === row[0] && pick[1] === row[1] && pick[3] === row[3]) button.className = "is-on";
        button.textContent = row[0] + ", " + row[1] + ", " + row[2] + " · " + rateLabel(rapeCount(city), city.pop) + " per 100,000 · " + people(rapeCount(city)) + " reports";
        button.addEventListener("click", function () {
          pick = row;
          fit(row[3], row[4], 0.4);
          document.getElementById("sex-hood-readout").textContent = sentence(row);
          renderList();
          draw();
          document.getElementById("sex-hood-wrap").scrollIntoView({ behavior: "smooth", block: "center" });
        });
        host.appendChild(button);
      });
      var order = sortKey === "name" ? "name" : (sortKey === "count" ? "the number of reports" : "the city rape rate");
      note.textContent = "Showing the first 150 of " + people(cityData.matched) + " neighborhoods with a city in Table 8. " + people(cityData.areas - cityData.matched) + " of " + people(cityData.areas) + " neighborhoods have no matching city, so they are not listed. Ordered by " + order + ".";
      syncSort("sex-hood-sort", sortKey, sortDir);
    }
    function pos(event) {
      var rect = canvas.getBoundingClientRect();
      return [event.clientX - rect.left, event.clientY - rect.top];
    }
    function nearest(x, y) {
      var best = null;
      var bestD = 14 * 14;
      cityData.hoods.forEach(function (row) {
        var p = px(row[3], row[4]);
        var d = (p[0] - x) * (p[0] - x) + (p[1] - y) * (p[1] - y);
        if (d < bestD) { bestD = d; best = row; }
      });
      return best;
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
      else clamp();
      if (base) base.resize();
      draw();
    }
    var zoomBar = document.getElementById("sex-hood-zoom");
    [["Zoom in", 1.4], ["Zoom out", 1 / 1.4]].forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.appendChild(zoomMark(item[0] === "Zoom out", true));
      button.appendChild(document.createTextNode(item[0]));
      button.addEventListener("click", function () { zoomAt(cssW / 2, cssH / 2, item[1]); });
      zoomBar.appendChild(button);
    });
    [["Lower 48", -97, 38.5, 58], ["Alaska", -146.5, 61.2, 22], ["Hawaii", -157.4, 20.6, 6]].forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = item[0];
      button.addEventListener("click", function () {
        fit(item[1], item[2], item[3]);
        draw();
      });
      zoomBar.appendChild(button);
    });
    if (window.maplibregl) {
      base = new maplibregl.Map({
        container: "sex-hood-base",
        style: mapStyle(),
        center: [-97, 38.5],
        zoom: 3,
        interactive: false,
        attributionControl: false,
        fadeDuration: 0
      });
      base.on("load", function () { draw(); });
      followTheme(base, function () { draw(); });
    }
    canvas.addEventListener("pointerdown", function (event) {
      var p = pos(event);
      drag = { x: p[0], y: p[1], cx: view.cx, cy: view.cy, moved: false, id: event.pointerId };
      canvas.classList.add("is-drag");
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointermove", function (event) {
      if (!drag || drag.id !== event.pointerId) return;
      var p = pos(event);
      if (Math.hypot(p[0] - drag.x, p[1] - drag.y) > 3) drag.moved = true;
      view.cx = drag.cx - (p[0] - drag.x) / view.scale;
      view.cy = drag.cy - (p[1] - drag.y) / view.scale;
      clamp();
      draw();
    });
    canvas.addEventListener("pointerup", function (event) {
      if (!drag || drag.id !== event.pointerId) return;
      var moved = drag.moved;
      var p = pos(event);
      drag = null;
      canvas.classList.remove("is-drag");
      if (moved) return;
      var hit = nearest(p[0], p[1]);
      if (!hit) {
        zoomAt(p[0], p[1], 1.8);
        return;
      }
      pick = hit;
      document.getElementById("sex-hood-readout").textContent = sentence(hit);
      renderList();
      draw();
    });
    canvas.addEventListener("pointercancel", function () {
      drag = null;
      canvas.classList.remove("is-drag");
    });
    canvas.addEventListener("wheel", function (event) {
      event.preventDefault();
      var p = pos(event);
      zoomAt(p[0], p[1], event.deltaY > 0 ? 0.8 : 1.25);
    }, { passive: false });
    window.addEventListener("resize", resize);
    wireSort("sex-hood-sort", function (key, dir) {
      sortKey = key;
      sortDir = dir;
      renderList();
    });
    resize();
    renderList();
  }

  var offenseData = null;
  var offenseFilter = "all";
  var offenseSortKey = "estimated";
  var offenseSortDir = -1;

  function offenseRows() {
    return offenseData.rows.filter(function (row) {
      if (row.group === "total") return false;
      if (offenseFilter === "white-collar") return row.group === "white-collar";
      return true;
    }).sort(function (a, b) {
      if (offenseSortKey === "name") return a.offense.localeCompare(b.offense) * offenseSortDir;
      if (a.estimated === b.estimated) return a.offense.localeCompare(b.offense);
      return (a.estimated - b.estimated) * offenseSortDir;
    });
  }

  function pctCell(value) {
    if (value == null) return "*";
    return shareText(value);
  }

  function renderOffenseBars() {
    var host = document.getElementById("offense-bars");
    if (!host || !arrests || !offenseData) return;
    host.innerHTML = "";
    var rows = offenseData.rows.filter(function (row) {
      return row.group === "white-collar";
    }).sort(function (a, b) {
      return b.estimated - a.estimated;
    });
    rows.forEach(function (record) {
      var block = document.createElement("div");
      block.className = "race-block";
      var heading = document.createElement("h3");
      heading.textContent = record.offense;
      block.appendChild(heading);
      var intro = document.createElement("p");
      intro.textContent = people(record.raceTotal) + " arrests in the race table. Table 29 estimates " + people(record.estimated) + " arrests.";
      block.appendChild(intro);
      appendRaceRows(block, record);
      host.appendChild(block);
    });
  }

  function renderOffenseTable(rows) {
    var host = document.getElementById("offense-table");
    host.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.className = "census-scroll source-scroll";
    var table = document.createElement("table");
    table.className = "totals source-table";
    var columns = [
      { id: "offense", label: "Offense" },
      { id: "estimated", label: "Table 29 estimate", num: true },
      { id: "raceTotal", label: "Table 43 total", num: true },
      { id: "white", pct: "whitePct", label: "White", num: true },
      { id: "black", pct: "blackPct", label: "Black", num: true },
      { id: "aian", pct: "aianPct", label: "American Indian", num: true },
      { id: "asian", pct: "asianPct", label: "Asian", num: true },
      { id: "nhpi", pct: "nhpiPct", label: "Pacific Islander", num: true },
      { id: "ethnicityTotal", label: "With ethnicity", num: true },
      { id: "hispanicPct", label: "Hispanic", num: true }
    ];
    var head = document.createElement("thead");
    var headRow = document.createElement("tr");
    columns.forEach(function (column) {
      var cell = document.createElement("th");
      cell.scope = "col";
      if (column.num) cell.className = "num";
      cell.textContent = column.label;
      headRow.appendChild(cell);
    });
    head.appendChild(headRow);
    table.appendChild(head);
    var body = document.createElement("tbody");
    rows.forEach(function (row) {
      var tr = document.createElement("tr");
      columns.forEach(function (column) {
        var cell = document.createElement("td");
        if (column.num) cell.className = "num";
        if (column.pct) {
          cell.appendChild(document.createTextNode(people(row[column.id])));
          var share = document.createElement("small");
          share.textContent = row[column.pct] == null ? "*" : pctCell(row[column.pct]) + "%";
          cell.appendChild(share);
        } else if (column.id === "offense") cell.textContent = row.offense;
        else if (column.id === "hispanicPct") cell.textContent = row.hispanicPct == null ? "*" : pctCell(row.hispanicPct) + "%";
        else cell.textContent = people(row[column.id]);
        tr.appendChild(cell);
      });
      body.appendChild(tr);
    });
    table.appendChild(body);
    wrap.appendChild(table);
    host.appendChild(wrap);
  }

  function renderOffenses() {
    var summary = document.getElementById("offense-summary");
    var notes = document.getElementById("offense-notes");
    var rows = offenseRows();
    var violent = offenseData.rows.filter(function (row) { return row.offense === "Violent crime"; })[0];
    var property = offenseData.rows.filter(function (row) { return row.offense === "Property crime"; })[0];
    summary.textContent = "Table 29 estimates " + people(offenseData.estimatedTotal) + " arrests. It also estimates " + people(violent.estimated) + " violent-crime arrests and " + people(property.estimated) + " property-crime arrests. The property-crime arrest estimate includes arson. The property-crime count on the state map does not. Showing " + people(rows.length) + " offense categories.";
    renderOffenseBars();
    renderOffenseTable(rows);
    notes.innerHTML = "";
    offenseData.notes.forEach(function (text) {
      var line = document.createElement("p");
      line.className = "note";
      line.textContent = text;
      notes.appendChild(line);
    });
    var star = document.createElement("p");
    star.className = "note";
    star.textContent = "An asterisk is printed where Table 43 prints an asterisk instead of a percent. Hispanic is a percent of the arrests in that offense that included ethnicity.";
    notes.appendChild(star);
    syncSort("offense-sort", offenseSortKey, offenseSortDir);
    var filterBar = document.getElementById("offense-filter");
    filterBar.querySelectorAll("button").forEach(function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-filter") === offenseFilter ? "true" : "false");
    });
  }

  function setupOffenses(payload) {
    offenseData = payload;
    var statusLine = document.getElementById("offense-status");
    if (!offenseData) {
      if (statusLine) statusLine.textContent = "The offense file did not load.";
      return;
    }
    document.getElementById("offense-filter").addEventListener("click", function (event) {
      var button = event.target.closest("button");
      if (!button) return;
      offenseFilter = button.getAttribute("data-filter");
      renderOffenses();
    });
    wireSort("offense-sort", function (key, dir) {
      offenseSortKey = key;
      offenseSortDir = dir;
      renderOffenses();
    });
    if (statusLine) statusLine.textContent = "";
    renderOffenses();
  }

  var pairData = null;
  var pairMode = "offender";

  function pairShade(pct) {
    var step = pct >= 100 ? 4 : Math.min(4, Math.floor(pct / 20));
    return { fill: PAIR_INK[step], light: step >= 3 };
  }

  function renderPairGrid(hostId, title, labels, counts, note) {
    var host = document.getElementById(hostId);
    if (!host) return;
    host.innerHTML = "";
    var heading = document.createElement("h3");
    heading.textContent = title;
    host.appendChild(heading);
    var blurb = document.createElement("p");
    blurb.textContent = pairMode === "offender"
      ? "Each row is the offender. Each column is the victim. The percent is the share of that offender row."
      : "Each row is the victim. Each column is the offender. The percent is the share of that victim row.";
    host.appendChild(blurb);
    var table = document.createElement("table");
    table.className = "pair-table";
    var head = document.createElement("thead");
    var headRow = document.createElement("tr");
    var corner = document.createElement("th");
    corner.textContent = pairMode === "offender" ? "Offender" : "Victim";
    headRow.appendChild(corner);
    labels.forEach(function (label) {
      var cell = document.createElement("th");
      cell.textContent = pairLabel(label);
      if (pairLabel(label) !== label) cell.title = label;
      headRow.appendChild(cell);
    });
    head.appendChild(headRow);
    table.appendChild(head);
    var body = document.createElement("tbody");
    labels.forEach(function (rowLabel, rowIndex) {
      var tr = document.createElement("tr");
      var rowHead = document.createElement("th");
      rowHead.scope = "row";
      rowHead.textContent = pairLabel(rowLabel);
      if (pairLabel(rowLabel) !== rowLabel) rowHead.title = rowLabel;
      tr.appendChild(rowHead);
      var total = 0;
      labels.forEach(function (_, colIndex) {
        var victim = pairMode === "offender" ? colIndex : rowIndex;
        var offender = pairMode === "offender" ? rowIndex : colIndex;
        total += counts[victim][offender];
      });
      labels.forEach(function (_, colIndex) {
        var victim = pairMode === "offender" ? colIndex : rowIndex;
        var offender = pairMode === "offender" ? rowIndex : colIndex;
        var count = counts[victim][offender];
        var pct = total ? Math.round(count / total * 1000) / 10 : 0;
        var shade = pairShade(pct);
        var cell = document.createElement("td");
        cell.style.background = shade.fill;
        if (shade.light) cell.className = "on-dark";
        var amount = document.createElement("span");
        amount.textContent = people(count);
        var share = document.createElement("small");
        share.textContent = pct.toFixed(1) + "% of this row";
        cell.appendChild(amount);
        cell.appendChild(share);
        tr.appendChild(cell);
      });
      body.appendChild(tr);
    });
    table.appendChild(body);
    var scroller = document.createElement("div");
    scroller.className = "pair-scroll";
    scroller.appendChild(table);
    host.appendChild(scroller);
    var line = document.createElement("p");
    line.className = "note";
    line.textContent = pairNote(note, labels);
    host.appendChild(line);
  }

  function renderPairs() {
    renderPairGrid("pair-race", "Race", pairData.raceLabels, pairData.raceCounts, pairData.raceNote);
    renderPairGrid("pair-ethnicity", "Ethnicity", pairData.ethnicityLabels, pairData.ethnicityCounts, pairData.ethnicityNote);
    var bar = document.getElementById("pair-mode");
    bar.querySelectorAll("button").forEach(function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-mode") === pairMode ? "true" : "false");
    });
  }

  function setupPairs(payload) {
    pairData = payload;
    var statusLine = document.getElementById("pair-status");
    if (!pairData) {
      if (statusLine) statusLine.textContent = "The homicide table did not load.";
      return;
    }
    document.getElementById("pair-mode").addEventListener("click", function (event) {
      var button = event.target.closest("button");
      if (!button) return;
      pairMode = button.getAttribute("data-mode");
      renderPairs();
    });
    if (statusLine) statusLine.textContent = "Olive runs from a small share of the row to a large share. The same olive is used for every group.";
    renderPairs();
  }


  buildMeasures();
  status.textContent = "Reading the FBI estimates.";
  Promise.all([
    fetch("census/crime.json?t=" + Math.floor(Date.now() / 3600000)).then(function (response) { if (!response.ok) throw new Error("json"); return response.json(); }),
    fetch("preview/us.svg").then(function (response) { if (!response.ok) throw new Error("map"); return response.text(); }),
    fetch("census/arrests.json?v=2").then(function (response) { if (!response.ok) throw new Error("arrests"); return response.json(); }).catch(function () { return null; }),
    fetch("census/crime-cities.json").then(function (response) { if (!response.ok) throw new Error("cities"); return response.json(); }).catch(function () { return null; }),
    fetch("census/offenses.json").then(function (response) { if (!response.ok) throw new Error("offenses"); return response.json(); }).catch(function () { return null; }),
    fetch("census/homicide-pairs.json").then(function (response) { if (!response.ok) throw new Error("pairs"); return response.json(); }).catch(function () { return null; })
  ]).then(function (parts) {
    data = parts[0];
    arrests = parts[2];
    var markup = parts[1];
    var start = markup.indexOf("<svg");
    slot.innerHTML = start >= 0 ? markup.slice(start) : "";
    svg = slot.querySelector("svg");
    if (!svg) throw new Error("map");
    svg.id = "crime-map";
    svg.setAttribute("aria-label", "Map of the states, colored by an FBI crime rate");
    addLabels(svg);
    bind();
    attachZoom(svg, "crime-zoom");
    buildList();
    status.textContent = "";
    wireSort("crime-sort", function (key, dir) {
      sortKey = key;
      sortDir = dir;
      render();
    });
    render();
    setupSex(markup);
    if (sexSvg) attachZoom(sexSvg, "sex-zoom");
    if (arrests) {
      wireSort("sex-sort", function (key, dir) {
        sexSortKey = key;
        sexSortDir = dir;
        renderSex();
      });
    }
    setupHoods(parts[3]);
    setupOffenses(parts[4]);
    setupPairs(parts[5]);
  }).catch(function () {
    status.textContent = "The crime file did not load.";
  });
})();
