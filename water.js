(function () {
  var list = document.getElementById("water-list");
  var note = document.getElementById("water-note");
  if (!list) return;

  var STATE = {
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
    CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
    FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
    IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
    ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
    MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
    NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
    NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
    PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
    TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
    WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming"
  };

  var water = null;
  var pickedChem = "";
  var hoods = null;
  var mode = "systems";
  var sort = "qtrs";
  var chemSort = "limit";
  var byCity = null;
  var dots = null;
  var dotMiss = 0;
  var dotTotal = 0;
  var mapDrag = null;
  var mapFitted = false;
  var mapCssW = 900;
  var mapCssH = 560;
  var mapView = { cx: 0.25, cy: 0.4, scale: 800 };
  var hoodPromise = null;

  var CHEM = {
    "2950|mcl": {
      name: "Total trihalomethanes",
      mark: "tthm",
      effect: "Liver, kidney or central nervous system problems; increased risk of cancer.",
      goal: "EPA did not set a group health goal. The separate goals are zero for bromodichloromethane and bromoform, 0.06 mg/L for dibromochloromethane, and 0.07 mg/L for chloroform."
    },
    "2456|mcl": {
      name: "Haloacetic acids (HAA5)",
      mark: "cancer",
      effect: "Increased risk of cancer.",
      goal: "EPA did not set a group health goal. The separate goals are zero for dichloroacetic acid, 0.02 mg/L for trichloroacetic acid, and 0.07 mg/L for monochloroacetic acid. Bromoacetic acid and dibromoacetic acid have no goal in that note."
    },
    "8000|mcl": {
      name: "E. coli",
      mark: "ecoli",
      effect: "EPA recorded an E. coli maximum contaminant level violation under the Revised Total Coliform Rule. Fecal coliform and E. coli indicate that the water may be contaminated with human or animal wastes. Disease-causing microbes in these wastes can cause diarrhea, cramps, nausea, headaches, or other symptoms. These pathogens may pose a special health risk for infants, young children, and people with severely compromised immune systems."
    },
    "1038|mcl": {
      name: "Nitrate-nitrite",
      mark: "nitrate",
      effect: "Infants below the age of six months who drink water containing nitrate in excess of the MCL could become seriously ill and, if untreated, may die. Symptoms include shortness of breath and blue-baby syndrome. EPA states the same for nitrite.",
      goal: "EPA's health goal is 10 mg/L for nitrate and 1 mg/L for nitrite."
    },
    "1040|mcl": {
      name: "Nitrate",
      mark: "nitrate",
      effect: "Infants below the age of six months who drink water containing nitrate in excess of the MCL could become seriously ill and, if untreated, may die. Symptoms include shortness of breath and blue-baby syndrome.",
      goal: "EPA's health goal is 10 mg/L."
    },
    "4006|mcl": {
      name: "Combined uranium",
      mark: "uranium",
      effect: "Increased risk of cancer, kidney toxicity."
    },
    "4010|mcl": {
      name: "Combined radium (226 and 228)",
      mark: "cancer",
      effect: "Increased risk of cancer."
    },
    "4000|mcl": {
      name: "Gross alpha particle activity",
      mark: "cancer",
      effect: "Increased risk of cancer."
    },
    "0800|tt": {
      name: "Long Term 2 Enhanced Surface Water Treatment Rule",
      mark: "gut",
      effect: "The rule is written to control Cryptosporidium. EPA's sentence for that organism: Gastrointestinal illness (such as diarrhea, vomiting, and cramps)."
    },
    "5000|tt": {
      name: "Lead and Copper Rule",
      mark: "lead",
      effect: "EPA's sentence for lead, when water exceeds the action level: Infants and children: Delays in physical or mental development; children could show slight deficits in attention span and learning abilities. Adults: Kidney problems; high blood pressure. EPA's sentence for copper: Short term exposure: Gastrointestinal distress. Long term exposure: Liver or kidney damage."
    },
    "5200|tt": {
      name: "Lead and Copper Rule Revisions",
      mark: "lead",
      effect: "EPA's sentence for lead, when water exceeds the action level: Infants and children: Delays in physical or mental development; children could show slight deficits in attention span and learning abilities. Adults: Kidney problems; high blood pressure. EPA's sentence for copper: Short term exposure: Gastrointestinal distress. Long term exposure: Liver or kidney damage."
    },
    "0700|tt": {
      name: "Ground Water Rule",
      mark: "gut",
      effect: "The rule is written to reduce viruses and bacteria from fecal waste. EPA's sentence for enteric viruses: Gastrointestinal illness (such as diarrhea, vomiting, and cramps)."
    },
    "8000|tt": {
      name: "Revised Total Coliform Rule",
      mark: "ask",
      effect: "EPA's sentence for total coliforms: not a health threat in itself; it is used to indicate whether other potentially harmful bacteria may be present."
    },
    "0400|tt": {
      name: "Stage 1 Disinfectants and Disinfection Byproducts Rule",
      mark: "tthm",
      effect: "EPA's sentence for total trihalomethanes, above the limit: Liver, kidney or central nervous system problems; increased risk of cancer. EPA's sentence for haloacetic acids: Increased risk of cancer."
    },
    "0200|tt": {
      name: "Surface Water Treatment Rule",
      mark: "surface",
      effect: "The rule is written to control Giardia lamblia, viruses, Legionella, and turbidity. EPA's sentence for Giardia lamblia and enteric viruses: Gastrointestinal illness (such as diarrhea, vomiting, and cramps). EPA's sentence for Legionella: Legionnaire's Disease, a type of pneumonia."
    }
  };

  function commas(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function normCity(token) {
    return token.toUpperCase().replace(/\s*\([^)]*\)/g, "").replace(/-\d+$/g, "").replace(/[.]/g, "").replace(/'/g, "").replace(/\s+/g, " ").trim();
  }

  function stateName(code) {
    return STATE[code] || code;
  }

  function healthText(flag) {
    return flag ? "EPA flags a current health-based violation." : "EPA does not flag a current health-based violation.";
  }

  function quarterText(q) {
    return commas(q) + (q === 1 ? " quarter with a violation" : " quarters with a violation");
  }

  function infoFor(code, slot) {
    if (slot === "tt") return CHEM[code + "|tt"] || null;
    return CHEM[code + "|mcl"] || CHEM[code + "|mrdl"] || null;
  }

  function chemDetail(system) {
    var parts = [];
    (system.mcl || []).forEach(function (code) {
      var info = infoFor(code, "mcl");
      if (!info) return;
      parts.push(info.name + " is above the limit. " + info.effect);
    });
    var rules = [];
    (system.tt || []).forEach(function (code) {
      var info = infoFor(code, "tt");
      rules.push(info ? info.name : code);
    });
    var text = "";
    if (parts.length) text += " " + parts.join(" ");
    if (rules.length) text += " Treatment technique: " + rules.join(", ") + ".";
    return text;
  }

  function indexSystems() {
    byCity = {};
    water.systems.forEach(function (system) {
      system.cities.forEach(function (city) {
        var key = system.st + "|" + city;
        if (!byCity[key]) byCity[key] = [];
        byCity[key].push(system);
      });
    });
  }

  function mainSystem(area) {
    var code = null;
    Object.keys(STATE).forEach(function (key) {
      if (STATE[key] === area.state) code = key;
    });
    if (!code) return null;
    var systems = byCity[code + "|" + normCity(area.city)];
    if (!systems || !systems.length) return null;
    var best = systems[0];
    for (var i = 1; i < systems.length; i++) {
      var item = systems[i];
      if (item.pop > best.pop || (item.pop === best.pop && item.name < best.name)) best = item;
    }
    return { system: best, others: systems.length - 1 };
  }

  function rows() {
    if (mode === "hoods") {
      var out = [];
      var missed = 0;
      hoods.areas.forEach(function (area) {
        var found = mainSystem(area);
        if (!found) {
          missed += 1;
          return;
        }
        out.push({
          title: area.name + ", " + area.city + ", " + area.state,
          q: found.system.q,
          h: found.system.h,
          pop: found.system.pop,
          name: area.name,
          detail: found.system.name + " serves " + commas(found.system.pop) + ". " + quarterText(found.system.q) + ". " + healthText(found.system.h) + chemDetail(found.system) + (found.others ? " " + commas(found.others) + (found.others === 1 ? " other community system lists this city." : " other community systems list this city.") : "") + (found.system.what ? " EPA lists: " + found.system.what : "")
        });
      });
      return { rows: out, missed: missed, total: hoods.areas.length };
    }
    return {
      rows: water.systems.map(function (system) {
        var city = system.cities.slice(0, 3).join(", ");
        if (system.cities.length > 3) city += " and " + commas(system.cities.length - 3) + " more";
        return {
          title: system.name,
          q: system.q,
          h: system.h,
          pop: system.pop,
          name: system.name,
          detail: city + ", " + stateName(system.st) + ". Serves " + commas(system.pop) + ". " + quarterText(system.q) + ". " + healthText(system.h) + chemDetail(system) + (system.what ? " EPA lists: " + system.what : "")
        };
      }),
      missed: 0,
      total: water.systems.length
    };
  }

  function showChems(on) {
    document.getElementById("water-sort-rows").hidden = on;
    document.getElementById("water-sort-chems").hidden = !on;
    document.getElementById("water-legend").hidden = on;
    document.getElementById("water-scale-note").hidden = on;
    document.getElementById("water-chem-note").hidden = !on;
    document.getElementById("water-body-legend").hidden = !on;
  }

  function paintLiver(g, x, y, s) {
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

  function paintKidney(g, x, y, s) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    g.fillStyle = "#e36b3a";
    g.strokeStyle = "#2c261f";
    g.lineWidth = 3 / s;
    g.beginPath();
    g.ellipse(0, 0, 12, 18, 0.2, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.strokeStyle = "#f7f1e4";
    g.lineWidth = 3 / s;
    g.beginPath();
    g.arc(-2, 0, 7, Math.PI * 0.7, Math.PI * 1.4);
    g.stroke();
    g.restore();
  }

  function paintCells(g, x, y, s) {
    [[0, 10], [18, 0], [16, 20]].forEach(function (spot) {
      var cx = x + spot[0] * s;
      var cy = y + spot[1] * s;
      g.fillStyle = "#f7f1e4";
      g.strokeStyle = "#1c1915";
      g.lineWidth = 2.5;
      g.beginPath();
      g.arc(cx, cy, 9 * s, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = "#1c1915";
      g.beginPath();
      g.arc(cx, cy, 3.2 * s, 0, Math.PI * 2);
      g.fill();
    });
  }

  function paintHead(g, x, y, s) {
    g.fillStyle = "#f7f1e4";
    g.strokeStyle = "#2c261f";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(x, y, 12 * s, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x - 4 * s, y - 2 * s);
    g.quadraticCurveTo(x, y + 5 * s, x + 5 * s, y - 1 * s);
    g.moveTo(x - 2 * s, y + 2 * s);
    g.quadraticCurveTo(x + 3 * s, y - 2 * s, x + 2 * s, y + 6 * s);
    g.stroke();
  }

  function paintGut(g, x, y, s) {
    g.fillStyle = "#fff1b8";
    g.strokeStyle = "#2c261f";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x, y - 16 * s);
    g.quadraticCurveTo(x + 18 * s, y - 16 * s, x + 16 * s, y);
    g.quadraticCurveTo(x + 14 * s, y + 16 * s, x, y + 16 * s);
    g.quadraticCurveTo(x - 8 * s, y + 8 * s, x - 4 * s, y);
    g.quadraticCurveTo(x - 8 * s, y - 10 * s, x, y - 16 * s);
    g.closePath();
    g.fill();
    g.stroke();
  }

  function paintLungs(g, x, y, s) {
    g.fillStyle = "#5f7f99";
    g.strokeStyle = "#2c261f";
    g.lineWidth = 3;
    [-1, 1].forEach(function (side) {
      g.beginPath();
      g.ellipse(x + side * 9 * s, y, 8 * s, 14 * s, side * 0.25, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    });
  }

  function paintBaby(g, x, y, s) {
    g.fillStyle = "#ffd15c";
    g.strokeStyle = "#9a3d5c";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(x, y, 10 * s, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.beginPath();
    g.ellipse(x + 7 * s, y + 14 * s, 12 * s, 8 * s, 0.7, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }

  function paintArrow(g, x, y, dir) {
    g.fillStyle = dir < 0 ? "#2a1458" : "#1c1915";
    g.beginPath();
    if (dir < 0) {
      g.moveTo(x, y + 22);
      g.lineTo(x - 10, y + 8);
      g.lineTo(x + 10, y + 8);
      g.fill();
      g.fillRect(x - 4, y, 8, 10);
    } else {
      g.moveTo(x, y);
      g.lineTo(x - 10, y + 12);
      g.lineTo(x + 10, y + 12);
      g.fill();
      g.fillRect(x - 4, y + 10, 8, 12);
    }
  }

  function drawBody(g, kind) {
    if (kind === "tthm") {
      paintLiver(g, 0, 2, 0.7);
      paintHead(g, 48, 16, 1);
      paintKidney(g, 16, 50, 0.62);
      paintCells(g, 36, 34, 0.62);
    } else if (kind === "cancer") {
      paintCells(g, 14, 14, 1.45);
    } else if (kind === "ecoli") {
      paintGut(g, 16, 24, 1.05);
      paintHead(g, 48, 16, 1);
      paintBaby(g, 40, 44, 0.62);
    } else if (kind === "nitrate") {
      paintBaby(g, 20, 16, 1.25);
      paintLungs(g, 46, 44, 0.7);
    } else if (kind === "uranium") {
      paintKidney(g, 18, 32, 1.15);
      paintCells(g, 34, 16, 0.95);
    } else if (kind === "gut") {
      paintGut(g, 28, 32, 1.55);
    } else if (kind === "lead") {
      paintBaby(g, 12, 12, 0.7);
      paintArrow(g, 48, 0, -1);
      paintArrow(g, 48, 30, 1);
      paintKidney(g, 14, 50, 0.52);
      paintLiver(g, 30, 34, 0.5);
    } else if (kind === "ask") {
      g.strokeStyle = "#5530a0";
      g.lineWidth = 4;
      g.beginPath();
      g.arc(32, 32, 18, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = "#5530a0";
      g.font = "700 28px Georgia, serif";
      g.textAlign = "center";
      g.fillText("?", 32, 42);
    } else if (kind === "surface") {
      paintGut(g, 16, 30, 1.15);
      paintLungs(g, 46, 32, 0.9);
    }
  }

  function bodyCanvas(kind, size) {
    var mark = document.createElement("canvas");
    mark.width = size;
    mark.height = size;
    mark.setAttribute("aria-hidden", "true");
    var pen = mark.getContext("2d");
    pen.scale(size / 64, size / 64);
    drawBody(pen, kind);
    return mark;
  }

  var BODY_KEY = [
    ["liver", "Liver"],
    ["kidney", "Kidney"],
    ["cells", "Increased risk of cancer"],
    ["head", "Nervous system or a headache"],
    ["gut", "Stomach: diarrhea, cramps, or nausea"],
    ["lungs", "Lungs or breath"],
    ["baby", "An infant"],
    ["down", "A delay in development"],
    ["up", "Higher blood pressure"],
    ["ask", "Not itself a health threat"]
  ];

  function drawPart(g, part) {
    if (part === "liver") paintLiver(g, 8, 8, 1.15);
    else if (part === "kidney") paintKidney(g, 32, 34, 1.2);
    else if (part === "cells") paintCells(g, 14, 12, 1.3);
    else if (part === "head") paintHead(g, 32, 32, 1.8);
    else if (part === "gut") paintGut(g, 26, 32, 1.4);
    else if (part === "lungs") paintLungs(g, 32, 32, 1.15);
    else if (part === "baby") paintBaby(g, 22, 18, 1.2);
    else if (part === "down") paintArrow(g, 32, 16, -1);
    else if (part === "up") paintArrow(g, 32, 14, 1);
    else if (part === "ask") drawBody(g, "ask");
  }

  function renderBodyKey() {
    var box = document.getElementById("water-body-legend");
    if (!box || box.childNodes.length) return;
    BODY_KEY.forEach(function (row) {
      var item = document.createElement("span");
      var mark = document.createElement("canvas");
      mark.width = 64;
      mark.height = 64;
      mark.setAttribute("aria-hidden", "true");
      var pen = mark.getContext("2d");
      drawPart(pen, row[0]);
      item.appendChild(mark);
      item.appendChild(document.createTextNode(row[1]));
      box.appendChild(item);
    });
  }

  function renderChems() {
    var items = (water.chemicals || []).filter(function (item) {
      if (chemSort === "limit") return item.kind === "mcl" || item.kind === "mrdl";
      if (chemSort === "zero") return item.zero === 1 && (item.kind === "mcl" || item.kind === "mrdl");
      if (chemSort === "tt") return item.kind === "tt";
      return true;
    });
    items.sort(function (a, b) {
      var aInfo = CHEM[a.code + "|" + a.kind] || { name: a.code };
      var bInfo = CHEM[b.code + "|" + b.kind] || { name: b.code };
      if (chemSort === "name") return aInfo.name.localeCompare(bInfo.name) || a.kind.localeCompare(b.kind);
      return b.pop - a.pop || aInfo.name.localeCompare(bInfo.name);
    });
    renderBodyKey();
    list.textContent = "";
    var shown = items.slice(0, 200);
    if (pickedChem) {
      items.forEach(function (item) {
        var id = "chem-" + item.code + "-" + item.kind;
        if (id === pickedChem && shown.indexOf(item) < 0) shown.push(item);
      });
    }
    shown.forEach(function (item) {
      var info = CHEM[item.code + "|" + item.kind] || {
        name: item.code,
        effect: "EPA's National Primary Drinking Water Regulations table, as used here, does not state a separate health effect for this code."
      };
      var line = document.createElement("div");
      line.className = "water-chem";
      line.id = "chem-" + item.code + "-" + item.kind;
      var title = document.createElement("span");
      title.className = "water-chem-title";
      if (info.mark) title.appendChild(bodyCanvas(info.mark, 64));
      var name = document.createElement("span");
      name.textContent = info.name;
      title.appendChild(name);
      var text = document.createElement("span");
      var body = document.createElement("b");
      body.textContent = info.effect;
      text.appendChild(body);
      var meta = " " + commas(item.n) + (item.n === 1 ? " community system. " : " community systems. ") + commas(item.pop) + " people. ";
      if (item.kind === "tt") meta += "Treatment technique. Not a measurement of a chemical in the water.";
      else if (item.kind === "mrdl") meta += "Maximum residual disinfectant level.";
      else meta += "Maximum contaminant level.";
      if (item.zero) meta += " EPA's health goal is zero.";
      else if (info.goal) meta += " " + info.goal;
      text.appendChild(document.createTextNode(meta));
      line.appendChild(title);
      line.appendChild(text);
      list.appendChild(line);
      if (pickedChem && line.id === pickedChem) {
        line.setAttribute("data-picked", "true");
        var target = line;
        pickedChem = "";
        setTimeout(function () { target.scrollIntoView({ block: "center" }); }, 0);
      }
    });
    var label = "rows";
    if (chemSort === "tt") label = "treatment techniques";
    else if (chemSort === "zero") label = "contaminants with a health goal of zero";
    else if (chemSort === "limit") label = "contaminants above a limit";
    var order = chemSort === "name" ? "Ordered by name." : "Ordered by people served. That order is not a harm score.";
    note.textContent = "Showing " + commas(items.length) + " " + label + ". " + order;
  }

  function render() {
    if (!water || (mode === "hoods" && !hoods)) return;
    if (mode === "chems") {
      renderChems();
      return;
    }
    var packed = rows();
    var items = packed.rows.slice();
    items.sort(function (a, b) {
      if (sort === "name") return a.name.localeCompare(b.name) || b.q - a.q;
      if (sort === "health") return b.h - a.h || b.q - a.q || a.name.localeCompare(b.name);
      if (sort === "least") return a.q - b.q || a.h - b.h || a.name.localeCompare(b.name);
      return b.q - a.q || b.h - a.h || b.pop - a.pop || a.name.localeCompare(b.name);
    });
    list.textContent = "";
    items.slice(0, 200).forEach(function (item) {
      var line = document.createElement("div");
      line.className = "water-row";
      var title = document.createElement("span");
      title.textContent = item.title;
      var track = document.createElement("span");
      track.className = "water-track";
      var fills = [3, 3, 3, 6, 6, 6, 9, 9, 9, 12, 12, 12].map(function (q) { return quarterFill(q); });
      for (var block = 0; block < 12; block++) {
        var bar = document.createElement("i");
        if (block < item.q) bar.style.background = fills[block];
        track.appendChild(bar);
      }
      var text = document.createElement("span");
      text.textContent = item.detail;
      line.appendChild(title);
      line.appendChild(track);
      line.appendChild(text);
      list.appendChild(line);
    });
    var shown = Math.min(200, items.length);
    var sentence = "Showing the first " + commas(shown) + " of " + commas(items.length) + ".";
    if (mode === "hoods") {
      sentence += " " + commas(packed.missed) + " of " + commas(packed.total) + " neighborhoods have no community system whose served city matches.";
    }
    note.textContent = sentence;
  }

  function press(id, on) {
    var button = document.getElementById(id);
    if (button) button.setAttribute("aria-pressed", on ? "true" : "false");
  }

  document.getElementById("water-systems").addEventListener("click", function () {
    mode = "systems";
    showChems(false);
    press("water-systems", true);
    press("water-hoods", false);
    press("water-chems", false);
    render();
  });
  document.getElementById("water-chems").addEventListener("click", function () {
    mode = "chems";
    showChems(true);
    press("water-systems", false);
    press("water-hoods", false);
    press("water-chems", true);
    render();
  });
  document.getElementById("water-hoods").addEventListener("click", function () {
    mode = "hoods";
    showChems(false);
    press("water-systems", false);
    press("water-hoods", true);
    press("water-chems", false);
    if (!hoods) {
      note.textContent = "Loading neighborhoods.";
      loadHoods().then(function () { render(); }).catch(function () {
        note.textContent = "The neighborhood file did not load.";
      });
      return;
    }
    render();
  });
  document.getElementById("water-qtrs").addEventListener("click", function () {
    sort = "qtrs";
    press("water-qtrs", true);
    press("water-least", false);
    press("water-health", false);
    press("water-name", false);
    render();
  });
  document.getElementById("water-least").addEventListener("click", function () {
    sort = "least";
    press("water-qtrs", false);
    press("water-least", true);
    press("water-health", false);
    press("water-name", false);
    render();
  });
  document.getElementById("water-health").addEventListener("click", function () {
    sort = "health";
    press("water-qtrs", false);
    press("water-least", false);
    press("water-health", true);
    press("water-name", false);
    render();
  });
  document.getElementById("water-name").addEventListener("click", function () {
    sort = "name";
    press("water-qtrs", false);
    press("water-least", false);
    press("water-health", false);
    press("water-name", true);
    render();
  });
  document.getElementById("chem-limit").addEventListener("click", function () {
    chemSort = "limit";
    press("chem-limit", true);
    press("chem-zero", false);
    press("chem-tt", false);
    press("chem-name", false);
    render();
  });
  document.getElementById("chem-zero").addEventListener("click", function () {
    chemSort = "zero";
    press("chem-limit", false);
    press("chem-zero", true);
    press("chem-tt", false);
    press("chem-name", false);
    render();
  });
  document.getElementById("chem-tt").addEventListener("click", function () {
    chemSort = "tt";
    press("chem-limit", false);
    press("chem-zero", false);
    press("chem-tt", true);
    press("chem-name", false);
    render();
  });
  document.getElementById("chem-name").addEventListener("click", function () {
    chemSort = "name";
    press("chem-limit", false);
    press("chem-zero", false);
    press("chem-tt", false);
    press("chem-name", true);
    render();
  });

  var mapCanvas = document.getElementById("water-map");
  var mapCtx = mapCanvas ? mapCanvas.getContext("2d") : null;
  var readout = document.getElementById("water-readout");
  var baseMap = null;

  function mercX(lon) {
    return (lon + 180) / 360;
  }

  function mercY(lat) {
    var clamped = Math.max(-85, Math.min(85, lat));
    var s = Math.sin(clamped * Math.PI / 180);
    return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
  }

  function lonLatFromPx(x, y) {
    var mx = (x - mapCssW / 2) / mapView.scale + mapView.cx;
    var my = (y - mapCssH / 2) / mapView.scale + mapView.cy;
    var lon = mx * 360 - 180;
    var n = Math.PI - 2 * Math.PI * my;
    var lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
    return [lon, lat];
  }

  function toPx(lon, lat) {
    return [
      (mercX(lon) - mapView.cx) * mapView.scale + mapCssW / 2,
      (mercY(lat) - mapView.cy) * mapView.scale + mapCssH / 2
    ];
  }

  function clampMap() {
    var minScale = mapCssW / (70 / 360);
    var maxScale = mapCssW / (0.02 / 360);
    mapView.scale = Math.max(minScale, Math.min(maxScale, mapView.scale));
    var west = mercX(-175);
    var east = mercX(-65);
    var north = mercY(72);
    var south = mercY(15);
    mapView.cx = Math.max(west, Math.min(east, mapView.cx));
    mapView.cy = Math.max(north, Math.min(south, mapView.cy));
  }

  function fitMap(lon, lat, lonSpan) {
    mapView.cx = mercX(lon);
    mapView.cy = mercY(lat);
    mapView.scale = mapCssW / (lonSpan / 360);
    clampMap();
    mapFitted = true;
  }

  function zoomMap(x, y, factor) {
    var before = lonLatFromPx(x, y);
    mapView.scale *= factor;
    clampMap();
    mapView.cx = mercX(before[0]) - (x - mapCssW / 2) / mapView.scale;
    mapView.cy = mercY(before[1]) - (y - mapCssH / 2) / mapView.scale;
    clampMap();
    setMapView("");
    drawMap();
  }

  function setMapView(id) {
    ["water-view-us", "water-view-ak", "water-view-hi"].forEach(function (key) {
      var button = document.getElementById(key);
      if (button) button.setAttribute("aria-pressed", key === id ? "true" : "false");
    });
  }

  function quarterFill(q) {
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    if (q <= 0) return dark ? "#d5f4fb" : "#c5e4ec";
    if (q <= 3) return dark ? "#7ed0e4" : "#5eb8cc";
    if (q <= 6) return dark ? "#3aa8c4" : "#1d8eab";
    if (q <= 9) return dark ? "#1d7f9c" : "#14627a";
    return dark ? "#146078" : "#0c3d4e";
  }

  function dotRadius() {
    var px = mapView.scale / 360;
    if (px >= 80) return 7;
    if (px >= 24) return 5;
    return 3.5;
  }

  function buildDots() {
    dots = [];
    dotMiss = 0;
    dotTotal = hoods.areas.length;
    hoods.areas.forEach(function (area) {
      var found = mainSystem(area);
      if (!found) {
        dotMiss += 1;
        return;
      }
      dots.push({
        lon: area.lon,
        lat: area.lat,
        q: found.system.q,
        h: found.system.h,
        name: area.name + ", " + area.city + ", " + area.state,
        system: found.system.name
      });
    });
  }

  function syncBase() {
    if (!baseMap) return;
    var center = lonLatFromPx(mapCssW / 2, mapCssH / 2);
    var zoom = Math.log(mapView.scale / 512) / Math.LN2;
    baseMap.jumpTo({ center: center, zoom: zoom });
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

  function drawMap() {
    if (!mapCtx) return;
    mapCtx.clearRect(0, 0, mapCssW, mapCssH);
    syncBase();
    if (document.documentElement.getAttribute("data-theme") !== "dark") {
      mapCtx.fillStyle = "rgba(244, 240, 230, 0.55)";
      mapCtx.fillRect(0, 0, mapCssW, mapCssH);
    }
    if (!dots) return;
    var radius = dotRadius();
    for (var i = 0; i < dots.length; i++) {
      var dot = dots[i];
      var p = toPx(dot.lon, dot.lat);
      if (p[0] < -radius || p[1] < -radius || p[0] > mapCssW + radius || p[1] > mapCssH + radius) continue;
      mapCtx.beginPath();
      mapCtx.arc(p[0], p[1], radius, 0, Math.PI * 2);
      mapCtx.fillStyle = quarterFill(dot.q);
      mapCtx.fill();
      mapCtx.lineWidth = 1;
      mapCtx.strokeStyle = dot.q <= 3 ? "#0c3d4e" : "#f4f0e6";
      mapCtx.stroke();
    }
    if (readout && (readout.textContent === "" || readout.textContent === "Loading neighborhoods.")) {
      readout.textContent = commas(dots.length) + " neighborhoods are drawn. " + commas(dotMiss) + " of " + commas(dotTotal) + " have no community system whose served city matches, so they are not drawn.";
    }
  }

  function resizeMap() {
    if (!mapCanvas) return;
    var rect = mapCanvas.getBoundingClientRect();
    mapCssW = Math.max(280, rect.width || mapCssW);
    mapCssH = Math.max(280, rect.height || mapCssH);
    var dpr = window.devicePixelRatio || 1;
    mapCanvas.width = Math.round(mapCssW * dpr);
    mapCanvas.height = Math.round(mapCssH * dpr);
    mapCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!mapFitted) fitMap(-97, 38.5, 58);
    else clampMap();
    if (baseMap) baseMap.resize();
    drawMap();
  }

  function mapPos(event) {
    var rect = mapCanvas.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  }

  function nearestDot(x, y) {
    if (!dots) return null;
    var best = null;
    var bestD = 14 * 14;
    for (var i = 0; i < dots.length; i++) {
      var p = toPx(dots[i].lon, dots[i].lat);
      var dx = p[0] - x;
      var dy = p[1] - y;
      var d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = dots[i];
      }
    }
    return best;
  }

  function loadHoods() {
    if (hoods) return Promise.resolve(hoods);
    if (hoodPromise) return hoodPromise;
    hoodPromise = fetch("census/neighborhoods.json")
      .then(function (response) { return response.json(); })
      .then(function (payload) {
        hoods = payload;
        if (water) buildDots();
        return hoods;
      });
    return hoodPromise;
  }

  if (mapCanvas && window.maplibregl) {
    baseMap = new maplibregl.Map({
      container: "water-basemap",
      style: mapStyle(),
      center: [-97, 38.5],
      zoom: 3,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0
    });
    baseMap.on("load", function () { syncBase(); });
    followTheme(baseMap, function () {
      drawMap();
      if (water) render();
    });
    mapCanvas.addEventListener("pointerdown", function (event) {
      var p = mapPos(event);
      mapDrag = { x: p[0], y: p[1], cx: mapView.cx, cy: mapView.cy, moved: false, id: event.pointerId };
      mapCanvas.classList.add("is-drag");
      mapCanvas.setPointerCapture(event.pointerId);
    });
    mapCanvas.addEventListener("pointermove", function (event) {
      if (!mapDrag || mapDrag.id !== event.pointerId) return;
      var p = mapPos(event);
      if (Math.hypot(p[0] - mapDrag.x, p[1] - mapDrag.y) > 3) mapDrag.moved = true;
      mapView.cx = mapDrag.cx - (p[0] - mapDrag.x) / mapView.scale;
      mapView.cy = mapDrag.cy - (p[1] - mapDrag.y) / mapView.scale;
      clampMap();
      setMapView("");
      drawMap();
    });
    mapCanvas.addEventListener("pointerup", function (event) {
      if (!mapDrag || mapDrag.id !== event.pointerId) return;
      var moved = mapDrag.moved;
      var p = mapPos(event);
      mapDrag = null;
      mapCanvas.classList.remove("is-drag");
      if (moved) {
        drawMap();
        return;
      }
      var hit = nearestDot(p[0], p[1]);
      if (hit && readout) {
        readout.textContent = hit.name + ". " + hit.system + ". " + quarterText(hit.q) + ". " + healthText(hit.h);
        return;
      }
      zoomMap(p[0], p[1], 1.8);
    });
    mapCanvas.addEventListener("pointercancel", function (event) {
      if (!mapDrag || mapDrag.id !== event.pointerId) return;
      mapDrag = null;
      mapCanvas.classList.remove("is-drag");
    });
    mapCanvas.addEventListener("wheel", function (event) {
      event.preventDefault();
      var p = mapPos(event);
      zoomMap(p[0], p[1], event.deltaY > 0 ? 0.8 : 1.25);
    }, { passive: false });
    document.getElementById("water-zoom-in").addEventListener("click", function () {
      zoomMap(mapCssW / 2, mapCssH / 2, 1.4);
    });
    document.getElementById("water-zoom-out").addEventListener("click", function () {
      zoomMap(mapCssW / 2, mapCssH / 2, 1 / 1.4);
    });
    document.getElementById("water-view-us").addEventListener("click", function () {
      fitMap(-97, 38.5, 58);
      setMapView("water-view-us");
      drawMap();
    });
    document.getElementById("water-view-ak").addEventListener("click", function () {
      fitMap(-146.5, 61.2, 22);
      setMapView("water-view-ak");
      drawMap();
    });
    document.getElementById("water-view-hi").addEventListener("click", function () {
      fitMap(-157.4, 20.6, 6);
      setMapView("water-view-hi");
      drawMap();
    });
    window.addEventListener("resize", resizeMap);
    resizeMap();
  }

  fetch("census/water.json")
    .then(function (response) { return response.json(); })
    .then(function (payload) {
      water = payload;
      indexSystems();
      var chemHash = (location.hash || "").replace(/^#/, "");
      if (/^chem-\d+-(mcl|tt|mrdl)$/.test(chemHash)) {
        pickedChem = chemHash;
        mode = "chems";
        showChems(true);
        press("water-systems", false);
        press("water-hoods", false);
        press("water-chems", true);
        chemSort = "name";
        press("chem-limit", false);
        press("chem-zero", false);
        press("chem-tt", false);
        press("chem-name", true);
      }
      render();
      if (readout) readout.textContent = "Loading neighborhoods.";
      return loadHoods();
    })
    .then(function () {
      drawMap();
    })
    .catch(function () {
      if (!water) note.textContent = "The water file did not load.";
      else if (readout) readout.textContent = "The neighborhood file did not load.";
    });
})();
