(function () {
  var code = (document.body.getAttribute("data-state") || "").toLowerCase();
  if (!code) return;
  var arrivedZip = "";
  try {
    arrivedZip = (new URLSearchParams(location.search).get("zip") || "").replace(/\D/g, "").slice(0, 5);
  } catch (error) {
    arrivedZip = "";
  }
  if (arrivedZip.length !== 5) arrivedZip = "";
  var PARTY = { dem: "#1e4d7b", gop: "#8d3232", ind: "#3e5c45", other: "#5c4a2a" };
  var PARTY_CLASS = { dem: "d", gop: "r", ind: "i", other: "o" };
  var PARTY_LABEL = { dem: "Democratic", gop: "Republican", ind: "Independent", lib: "Libertarian", other: "Other" };
  var feed = null;
  var raceId = "";
  var selected = "";
  var svg = null;
  var summaryEl = document.getElementById("result-summary");
  var switchEl = document.getElementById("result-races");
  var placeSelect = document.getElementById("result-place");
  var detailEl = document.getElementById("result-detail");
  var statusEl = document.getElementById("result-status");
  if (!summaryEl) return;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  var BLEND_LINE = "The color mixes the votes reported in that place. The swatches are the colors in that mix. A place with no votes stays the land color. This does not call a race.";

  function blendOn() {
    try { return localStorage.getItem("leaders-blend") !== "0"; }
    catch (error) { return true; }
  }

  function rememberBlend(on) {
    try { localStorage.setItem("leaders-blend", on ? "1" : "0"); }
    catch (error) {}
  }

  function hexChannels(hex) {
    if (!hex || hex.charAt(0) !== "#") return null;
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

  function partyParts(pairs) {
    var totals = {};
    pairs.forEach(function (pair) {
      var votes = pair.votes || 0;
      var party = pair.party || "";
      if (!(votes > 0) || party === "yes" || party === "no") return;
      party = party || "other";
      totals[party] = (totals[party] || 0) + votes;
    });
    return Object.keys(totals).map(function (party) {
      return { color: PARTY[party] || PARTY.other, votes: totals[party] };
    });
  }

  function tint(hex, amount) {
    var rawMap = getComputedStyle(document.documentElement).getPropertyValue("--map").trim();
    var chip = rawMap.charAt(0) === "#"
      ? [parseInt(rawMap.slice(1, 3), 16), parseInt(rawMap.slice(3, 5), 16), parseInt(rawMap.slice(5, 7), 16)]
      : [235, 228, 214];
    var rgb = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    return "rgb(" + chip.map(function (channel, index) {
      return Math.round(channel + (rgb[index] - channel) * amount);
    }).join(",") + ")";
  }

  function race() {
    if (!feed) return null;
    return feed.races.filter(function (item) { return item.id === raceId; })[0] || feed.races[0] || null;
  }

  function tone(candidates, people) {
    var rows = candidates.map(function (item, index) {
      return { index: index, votes: item[0] || 0 };
    }).filter(function (row) { return row.votes > 0; });
    if (!rows.length) return "";
    var total = rows.reduce(function (sum, row) { return sum + row.votes; }, 0);
    rows.sort(function (a, b) { return b.votes - a.votes; });
    if (rows[1] && rows[0].votes === rows[1].votes) return "";
    var second = rows[1] ? rows[1].votes : 0;
    var gap = (rows[0].votes - second) / total * 100;
    var party = (people[rows[0].index] || {}).party;
    return tint(PARTY[party] || PARTY.other, Math.max(0.4, Math.min(1, gap / 32)));
  }

  function chip(party) {
    if (!party || party === "yes" || party === "no") return null;
    return el("span", "chip " + (PARTY_CLASS[party] || "o"), PARTY_LABEL[party] || party.toUpperCase());
  }

  function candidateSlug(text) {
    var out = "";
    String(text || "").toLowerCase().split("").forEach(function (char) {
      if ((char >= "a" && char <= "z") || (char >= "0" && char <= "9")) out += char;
      else if ((char === " " || char === "-") && out && out.charAt(out.length - 1) !== "-") out += "-";
    });
    return out.replace(/^-+|-+$/g, "") || "item";
  }

  function nameNode(person, prefix) {
    var strong = el("strong", "notranslate");
    strong.setAttribute("translate", "no");
    var id = prefix ? candidateSlug(prefix) + "-" + candidateSlug(person.name) : "";
    if (id && document.getElementById(id)) {
      var link = document.createElement("a");
      link.href = "#" + id;
      link.textContent = person.name;
      strong.appendChild(link);
    } else {
      strong.textContent = person.name;
    }
    return strong;
  }

  function people(parent, rows, prefix) {
    rows.forEach(function (person) {
      var block = el("div", "person" + (person.photo ? "" : " no-photo"));
      if (person.photo) {
        var img = document.createElement("img");
        img.src = person.photo;
        img.alt = "";
        img.addEventListener("error", function () {
          block.classList.add("no-photo");
          img.remove();
        });
        block.appendChild(img);
      }
      var copy = el("div");
      var title = el("div");
      title.appendChild(nameNode(person, prefix));
      var mark = chip(person.party);
      if (mark) title.appendChild(mark);
      copy.appendChild(title);
      copy.appendChild(el("p", "meta", (person.votes || 0).toLocaleString("en-US") + " votes · " + (person.percentLabel || "0%")));
      var bar = el("div", "result-bar");
      var fill = el("i", PARTY_CLASS[person.party] || "o");
      fill.style.width = Math.max(0, Math.min(100, person.percent || 0)) + "%";
      bar.appendChild(fill);
      copy.appendChild(bar);
      block.appendChild(copy);
      parent.appendChild(block);
    });
  }

  function oneShape() {
    return svg && svg.querySelectorAll("path").length === 1;
  }

  function leadTone(item) {
    var people = (item && item.candidates) || [];
    return tone(people.map(function (person) { return [person.votes || 0]; }), people);
  }

  function paintMap(item) {
    if (!svg) return;
    var alone = oneShape() && item && item.kind !== "house";
    var whole = "";
    if (alone && blendOn()) {
      whole = mixColor(partyParts((item.candidates || []).map(function (person) {
        return { party: person.party, votes: person.votes || 0 };
      })));
    }
    if (alone && !whole) whole = leadTone(item);
    svg.querySelectorAll("path").forEach(function (path) {
      path.classList.toggle("is-on", path.getAttribute("data-fips") === selected);
      var row = item && item.counties && item.counties[path.getAttribute("data-fips")];
      var color = "";
      if (blendOn() && row && item.kind === "house") {
        var housePairs = [];
        (row.slices || []).forEach(function (slice) {
          (slice.candidates || []).forEach(function (person) {
            housePairs.push({ party: person.party, votes: person.votes || 0 });
          });
        });
        color = mixColor(partyParts(housePairs));
      } else if (blendOn() && row && row.candidates) {
        color = mixColor(partyParts(row.candidates.map(function (cell, index) {
          return { party: ((item.candidates || [])[index] || {}).party, votes: cell[0] || 0 };
        })));
      }
      if (!color && row && item.kind === "house" && row.party && row.votes) {
        color = tint(PARTY[row.party] || PARTY.other, Math.max(0.4, Math.min(1, (row.gap || 0) / 32)));
      } else if (!color && row && row.candidates) {
        color = tone(row.candidates, item.candidates || []);
      }
      if (!color && alone) color = whole;
      var land = getComputedStyle(document.documentElement).getPropertyValue("--map").trim();
      path.style.fill = color || (land.charAt(0) === "#" ? land.slice(0, 7) : "#ebe4d6");
    });
  }

  function blendLegendParts(item) {
    var pairs = [];
    if (!item) return [];
    if (item.kind === "house") {
      Object.keys(item.counties || {}).forEach(function (fips) {
        var row = item.counties[fips];
        var slices = row.slices || [];
        if (!slices.length && row.party && row.votes) pairs.push({ party: row.party, votes: row.votes });
        slices.forEach(function (slice) {
          (slice.candidates || []).forEach(function (person) {
            pairs.push({ party: person.party, votes: person.votes || 0 });
          });
        });
      });
    } else if (item.counties && Object.keys(item.counties).length) {
      Object.keys(item.counties).forEach(function (fips) {
        ((item.counties[fips] || {}).candidates || []).forEach(function (cell, index) {
          pairs.push({ party: ((item.candidates || [])[index] || {}).party, votes: cell[0] || 0 });
        });
      });
    } else {
      (item.candidates || []).forEach(function (person) {
        pairs.push({ party: person.party, votes: person.votes || 0 });
      });
    }
    var totals = {};
    pairs.forEach(function (pair) {
      var votes = pair.votes || 0;
      var party = pair.party || "";
      if (!(votes > 0) || party === "yes" || party === "no") return;
      party = party || "other";
      if (!totals[party]) totals[party] = { party: party, votes: 0, color: PARTY[party] || PARTY.other };
      totals[party].votes += votes;
    });
    return Object.keys(totals).map(function (party) { return totals[party]; }).sort(function (a, b) {
      return b.votes - a.votes;
    });
  }

  function paintBlendLegend(item) {
    var legend = document.querySelector(".result-legend");
    if (!legend) return;
    legend.querySelectorAll(".blend-key").forEach(function (node) { node.remove(); });
    if (!blendOn()) return;
    blendLegendParts(item).forEach(function (part) {
      var span = el("span", "blend-key");
      var swatch = el("i", "swatch");
      swatch.style.background = part.color;
      span.appendChild(swatch);
      span.appendChild(document.createTextNode(" " + (PARTY_LABEL[part.party] || "Other")));
      legend.appendChild(span);
    });
  }

  function mountBlend() {
    var legend = document.querySelector(".result-legend");
    if (!legend || document.getElementById("blend-switch")) return;
    var bar = el("div", "sheet-switch blend-switch");
    bar.id = "blend-switch";
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "How the map is colored");
    var sub = legend.previousElementSibling;
    var leadCopy = sub && sub.classList.contains("sub") ? sub.textContent : "";
    var caption = el("p", "sub blend-caption", "");
    function paintCaption() {
      var on = blendOn();
      if (leadCopy && sub) sub.textContent = on ? BLEND_LINE : leadCopy;
      caption.hidden = !on || !!leadCopy;
      caption.textContent = on && !leadCopy ? BLEND_LINE : "";
      legend.classList.toggle("is-blend", on);
      bar.querySelectorAll("button").forEach(function (button) {
        var chosen = button.getAttribute("data-blend") === (on ? "blend" : "ahead");
        button.setAttribute("aria-pressed", chosen ? "true" : "false");
      });
    }
    [["ahead", "Who is ahead"], ["blend", "Blend the votes"]].forEach(function (pair) {
      var button = el("button", "", pair[1]);
      button.type = "button";
      button.setAttribute("data-blend", pair[0]);
      button.addEventListener("click", function () {
        rememberBlend(pair[0] === "blend");
        paintCaption();
        paint(false);
      });
      bar.appendChild(button);
    });
    if (leadCopy) legend.parentNode.insertBefore(bar, sub);
    else {
      legend.parentNode.insertBefore(bar, legend);
      legend.parentNode.insertBefore(caption, legend);
    }
    var blank = legend.querySelector(".swatch.blank");
    if (blank && blank.parentNode) blank.parentNode.classList.add("stay");
    paintCaption();
  }

  function paint(refresh) {
    var item = race();
    summaryEl.textContent = "";
    switchEl.querySelectorAll("button").forEach(function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-id") === (item && item.id) ? "true" : "false");
    });
    if (!item) return;
    if (arrivedZip && feed.name) {
      summaryEl.appendChild(el("p", "note", "ZIP " + arrivedZip + " is in " + feed.name + ". These are the statewide results."));
    }
    summaryEl.appendChild(el("h2", "", (item.office || "").replace(/\bOf\b/g, "of")));
    var winner = (item.candidates || []).filter(function (person) { return person.winner; })[0];
    if (winner) summaryEl.appendChild(el("p", "", "The Associated Press reports a winner: " + winner.name + "."));
    if (item.kind === "house") {
      summaryEl.appendChild(el("p", "note", item.counties
        ? "Each county is colored by the U.S. House votes NBC News reports there."
        : "House districts are not counties, so this map is not colored for that race."));
      (item.districts || []).forEach(function (district) {
        var rows = district.candidates || [];
        var called = rows.filter(function (person) { return person.winner && (person.votes || 0) > 0; })[0];
        summaryEl.appendChild(el("h3", "", district.name || "District"));
        if (called) summaryEl.appendChild(el("p", "", "The Associated Press reports a winner: " + called.name + "."));
        people(summaryEl, rows, district.name || "District");
      });
    } else {
      people(summaryEl, item.candidates || [], item.office || "");
    }
    paintMap(item);
    paintBlendLegend(item);
    detailEl.textContent = "";
    if (selected && item.kind === "house" && item.counties && item.counties[selected]) {
      var housePath = svg && svg.querySelector('[data-fips="' + selected + '"]');
      var housePlace = housePath ? housePath.getAttribute("data-name") : "This place";
      detailEl.appendChild(el("h3", "", housePlace));
      (item.counties[selected].slices || []).forEach(function (slice) {
        detailEl.appendChild(el("h3", "", slice.name || "District"));
        people(detailEl, slice.candidates || [], slice.name || "District");
      });
    } else if (selected && item.kind !== "house" && (item.counties || oneShape())) {
      var path = svg && svg.querySelector('[data-fips="' + selected + '"]');
      var place = path ? path.getAttribute("data-name") : "This place";
      detailEl.appendChild(el("h3", "", place));
      var row = item.counties && item.counties[selected];
      if (!row && oneShape()) {
        people(detailEl, item.candidates || [], item.office || "");
      } else {
        var local = (row && row.candidates) || (item.candidates || []).map(function () { return [0, "0%", false]; });
        var paired = (item.candidates || []).map(function (person, index) {
          var cell = local[index] || [0, "0%", false];
          return { name: person.name, party: person.party, photo: person.photo || "", votes: cell[0] || 0, percentLabel: cell[1] || "0%", percent: 0 };
        });
        var total = paired.reduce(function (sum, person) { return sum + person.votes; }, 0);
        paired.forEach(function (person) { person.percent = total ? person.votes / total * 100 : 0; });
        people(detailEl, paired, item.office || "");
      }
    }
    statusEl.textContent = "";
    var when = new Date(feed.updated);
    var clock = isNaN(when.getTime()) ? "" : when.toLocaleString("en-US", {
      timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
    });
    if (clock) statusEl.appendChild(document.createTextNode("Updated " + clock + " Central. "));
    if (item.kind !== "house") statusEl.appendChild(document.createTextNode((item.percentLabel || "0%") + " of the expected vote is in. "));
    if (item.remaining) statusEl.appendChild(document.createTextNode("About " + item.remaining + " votes are still expected. "));
    if (item.pollsClose) statusEl.appendChild(document.createTextNode(item.pollsClose + ". "));
    statusEl.appendChild(document.createTextNode("Unofficial totals from the Associated Press, published by "));
    var link = el("a", "", "NBC News");
    link.href = feed.sourceUrl;
    statusEl.appendChild(link);
    statusEl.appendChild(document.createTextNode(". This page does not call a race."));
    if (refresh && window.leadersRefreshLang) window.leadersRefreshLang();
  }

  var extraPhotos = {};

  function photoKey(name) {
    return code + "|" + (name || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function fillPhotos(json) {
    function fill(person) {
      if (person && !person.photo && extraPhotos[photoKey(person.name)]) person.photo = extraPhotos[photoKey(person.name)];
    }
    (json.races || []).forEach(function (race) {
      (race.candidates || []).forEach(fill);
      (race.districts || []).forEach(function (district) {
        (district.candidates || []).forEach(fill);
      });
    });
  }

  function show(json) {
    var first = !feed;
    fillPhotos(json);
    feed = json;
    if (!switchEl.childNodes.length) {
      (feed.races || []).forEach(function (item) {
        if (item.kind === "measure") return;
        var button = el("button", "", (item.office || "").replace(/\bOf\b/g, "of"));
        button.type = "button";
        button.setAttribute("data-id", item.id);
        button.addEventListener("click", function () {
          raceId = item.id;
          selected = "";
          if (placeSelect) placeSelect.value = "";
          paint(true);
        });
        switchEl.appendChild(button);
      });
      raceId = (feed.races[0] && feed.races[0].id) || "";
    }
    paint(first);
  }

  if (placeSelect) {
    placeSelect.addEventListener("change", function () {
      selected = placeSelect.value;
      paint(true);
    });
  }

  fetch("preview/maps/" + code + ".svg").then(function (response) { return response.text(); }).then(function (markup) {
    var start = markup.indexOf("<svg");
    var slot = document.getElementById("state-slot");
    slot.innerHTML = start >= 0 ? markup.slice(start) : "";
    svg = slot.querySelector("svg");
    if (svg) {
      svg.id = "state-map";
      var options = [];
      svg.querySelectorAll("path").forEach(function (path) {
        options.push({ fips: path.getAttribute("data-fips"), name: path.getAttribute("data-name") });
        path.addEventListener("click", function () {
          var fips = path.getAttribute("data-fips");
          selected = selected === fips ? "" : fips;
          if (placeSelect) placeSelect.value = selected;
          paint(true);
        });
      });
      options.sort(function (a, b) { return a.name.localeCompare(b.name); });
      options.forEach(function (item) {
        placeSelect.appendChild(new Option(item.name, item.fips));
      });
    }
    return Promise.all([
      leadersLive("preview/states/" + code + ".json"),
      fetch("photos/found.json").then(function (response) { return response.ok ? response.json() : {}; }).catch(function () { return {}; })
    ]);
  }).then(function (pair) {
    extraPhotos = pair[1] || {};
    show(pair[0]);
  }).catch(function () {
    statusEl.textContent = "The results for this state did not load.";
  });

  var whereForm = document.getElementById("where-form");
  if (whereForm) {
    var whereNumber = document.getElementById("where-number");
    var whereStreet = document.getElementById("where-street");
    var whereZip = document.getElementById("where-zip");
    var whereOut = document.getElementById("where-result");
    whereForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var number = (whereNumber.value || "").trim().replace(/\s+/g, " ");
      var street = (whereStreet.value || "").trim().replace(/\s+/g, " ");
      var zip = (whereZip.value || "").replace(/\D/g, "").slice(0, 5);
      whereZip.value = zip;
      whereOut.replaceChildren();
      if (!number || !street || zip.length !== 5) {
        whereOut.appendChild(el("p", "zip-error", "Enter a street number, a street name, and a 5-digit ZIP code."));
        return;
      }
      var card = el("div", "where-card");
      card.appendChild(el("p", "kicker", "Polling place"));
      var place = el("h3", "notranslate", number + " " + street + ", " + zip);
      place.setAttribute("translate", "no");
      card.appendChild(place);
      card.appendChild(el("p", "zip-note", "This page does not keep the address. Open the election office lookup and enter the same street number, street name, and ZIP. That office shows the polling place or vote center for this election."));
      var steps = el("ol");
      ["Open the election office lookup.", "Enter the street number, street name, and ZIP you typed here. The office site may ask for them in a different order, or ask for your name.", "Use the place that site returns."].forEach(function (line) {
        steps.appendChild(el("li", "", line));
      });
      card.appendChild(steps);
      var lookup = whereForm.getAttribute("data-lookup");
      if (lookup) {
        var actions = el("div", "where-actions");
        var link = el("a", "", whereForm.getAttribute("data-lookup-label") || "Election office lookup");
        link.href = lookup;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        actions.appendChild(link);
        card.appendChild(actions);
      }
      whereOut.appendChild(card);
    });
  }

  var sampleSteps = document.getElementById("sample-steps");
  var sampleSheet = document.getElementById("sample-candidates");
  if (sampleSteps && sampleSheet) {
    var sampleIndex = 0;
    function sampleContests() {
      return sampleSheet.querySelectorAll(".contest");
    }
    function focusContest(index) {
      var nodes = sampleContests();
      if (!nodes.length) return;
      if (index < 0) index = 0;
      if (index >= nodes.length) index = nodes.length - 1;
      sampleIndex = index;
      Array.prototype.forEach.call(nodes, function (node, i) {
        node.classList.toggle("is-current", i === index);
      });
      var title = nodes[index].querySelector("h3");
      var status = document.getElementById("sample-status");
      if (status) status.textContent = "Contest " + (index + 1) + " of " + nodes.length + (title ? ": " + title.textContent : "");
    }
    sampleSheet.addEventListener("click", function (event) {
      var button = event.target.closest(".choice");
      if (!button) return;
      var turnOff = button.getAttribute("aria-pressed") === "true";
      var contestNode = button.closest(".contest");
      contestNode.querySelectorAll(".choice").forEach(function (other) {
        other.setAttribute("aria-pressed", "false");
      });
      if (!turnOff) button.setAttribute("aria-pressed", "true");
    });
    document.getElementById("contest-back").addEventListener("click", function () { focusContest(sampleIndex - 1); });
    document.getElementById("contest-next").addEventListener("click", function () { focusContest(sampleIndex + 1); });
    sampleSteps.addEventListener("click", function (event) {
      var button = event.target.closest("button");
      if (!button) return;
      sampleSteps.querySelectorAll("button").forEach(function (other) {
        other.classList.toggle("is-on", other === button);
      });
      var step = button.getAttribute("data-step");
      var nodes = sampleContests();
      if (step === "measure") {
        var found = -1;
        Array.prototype.forEach.call(nodes, function (node, index) {
          if (found < 0 && node.getAttribute("data-kind") === "measure") found = index;
        });
        focusContest(found < 0 ? 0 : found);
        return;
      }
      focusContest(0);
    });
    focusContest(0);
  }

  mountBlend();

  setInterval(function () {
    leadersLive("preview/states/" + code + ".json")
      .then(function (json) { fillPhotos(json); show(json); })
      .catch(function () {});
  }, LIVE_EVERY);
  new MutationObserver(function () {
    var item = race();
    if (item && svg) paintMap(item);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
})();
