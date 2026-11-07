(function () {
  var EVERY = 60000;
  var resultsUrl = document.body.getAttribute("data-results");
  if (!resultsUrl) return;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  var BLEND_LINE = "The color mixes the votes reported in that place. The swatches are the colors in that mix. A row with no color is left out of the mix. A place with no votes stays the land color. This does not call a race.";

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

  function mixPlace(data, place) {
    var parts = [];
    var rows = place.rows || [];
    var i;
    for (i = 0; i < rows.length; i++) {
      var votes = rows[i].votes || 0;
      if (!(votes > 0)) continue;
      var color = (party(data, rows[i].id) || {}).color;
      if (!color) continue;
      parts.push({ color: color, votes: votes, name: partyLabel(data, rows[i].id) });
    }
    return { color: mixColor(parts), parts: parts };
  }

  function tint(hex, amount) {
    var rawMap = getComputedStyle(document.documentElement).getPropertyValue("--map").trim();
    var chip = rawMap.charAt(0) === "#"
      ? [parseInt(rawMap.slice(1, 3), 16), parseInt(rawMap.slice(3, 5), 16), parseInt(rawMap.slice(5, 7), 16)]
      : [235, 228, 214];
    var rgb = hex.length === 4
      ? [parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16), parseInt(hex[3] + hex[3], 16)]
      : [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    return "rgb(" + chip.map(function (channel, index) {
      return Math.round(channel + (rgb[index] - channel) * amount);
    }).join(",") + ")";
  }

  function party(data, id) {
    return (data.parties || {})[String(id)] || {};
  }

  function partyLabel(data, id) {
    var row = party(data, id);
    if (row.abbr && row.name) return row.abbr + " · " + row.name;
    return row.abbr || row.name || ("IEC party " + id);
  }

  function count(value) {
    return typeof value === "number" ? value.toLocaleString("en-ZA") : "";
  }

  function clock(value) {
    var date = new Date(value);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleString("en-ZA", {
      timeZone: "Africa/Johannesburg",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function clearMarks(svg) {
    if (svg) svg.querySelectorAll("path.is-on").forEach(function (node) { node.classList.remove("is-on"); });
    document.querySelectorAll(".state-list a.is-on").forEach(function (node) { node.classList.remove("is-on"); });
  }

  function paintMap(data) {
    var slot = document.getElementById("place-slot");
    if (!slot) return Promise.resolve([]);
    var ready = slot.querySelector("svg")
      ? Promise.resolve(slot.querySelector("svg"))
      : fetch("map.svg").then(function (response) { return response.text(); }).then(function (markup) {
          var start = markup.indexOf("<svg");
          slot.innerHTML = start >= 0 ? markup.slice(start) : "";
          var svg = slot.querySelector("svg");
          if (svg) svg.id = "place-map";
          return svg;
        });
    return ready.then(function (svg) {
      var painted = [];
      var seen = {};
      if (!svg) return painted;
      var bySlug = {};
      (data.places || []).forEach(function (place) { bySlug[place.slug] = place; });
      svg.querySelectorAll("path").forEach(function (path) {
        var slug = path.getAttribute("data-slug");
        var place = bySlug[slug];
        var name = path.getAttribute("data-name") || "";
        var mixed = place && place.votes > 0 && blendOn() ? mixPlace(data, place) : null;
        if (mixed && mixed.color) {
          path.style.setProperty("--lead", mixed.color);
          var ranked = mixed.parts.slice().sort(function (a, b) { return b.votes - a.votes; });
          var total = ranked.reduce(function (sum, row) { return sum + row.votes; }, 0);
          var bits = ranked.slice(0, 2).map(function (row) {
            return row.name + " " + Math.round(row.votes / total * 100) + "%";
          });
          path.setAttribute("title", name + ": " + bits.join(", ") + ", blended");
        } else if (place && place.votes > 0 && place.leader && place.color) {
          path.style.setProperty("--lead", tint(place.color, place.amount || 0.7));
          path.setAttribute("title", name + ": " + place.leader + " ahead");
          if (!seen[place.leader]) {
            seen[place.leader] = true;
            painted.push(place);
          }
        } else {
          path.style.removeProperty("--lead");
          path.setAttribute("title", name);
        }
        if (!path.dataset.bound) {
          path.dataset.bound = "1";
          path.addEventListener("click", function () { location.href = "m/" + slug + ".html"; });
          path.addEventListener("mouseenter", function () {
            clearMarks(svg);
            path.classList.add("is-on");
            var link = document.querySelector('.state-list a[data-slug="' + slug + '"]');
            if (link) link.classList.add("is-on");
          });
          path.addEventListener("mouseleave", function () { clearMarks(svg); });
        }
      });
      return painted;
    });
  }

  function blendSwatches(data) {
    var totals = {};
    (data.places || []).forEach(function (place) {
      (place.rows || []).forEach(function (row) {
        var info = party(data, row.id);
        var votes = row.votes || 0;
        var name = partyLabel(data, row.id);
        if (!(votes > 0) || !info.color || !name) return;
        var key = info.color + "\n" + name;
        if (!totals[key]) totals[key] = { color: info.color, name: name, votes: 0 };
        totals[key].votes += votes;
      });
    });
    return Object.keys(totals).map(function (key) { return totals[key]; }).sort(function (a, b) {
      return b.votes - a.votes || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    });
  }

  function paintLegend(data, painted) {
    var legend = document.getElementById("place-legend");
    if (!legend) return;
    legend.textContent = "";
    var blank = el("span", "stay");
    blank.appendChild(el("i", "swatch blank"));
    blank.appendChild(document.createTextNode(" No votes reported"));
    legend.appendChild(blank);
    if (blendOn()) {
      blendSwatches(data).forEach(function (item) {
        var span = el("span", "blend-key");
        var swatch = el("i", "swatch");
        swatch.style.background = item.color;
        span.appendChild(swatch);
        span.appendChild(document.createTextNode(" " + item.name));
        legend.appendChild(span);
      });
    } else {
      painted.forEach(function (place) {
        var span = el("span");
        var swatch = el("i", "swatch");
        swatch.style.background = place.color;
        span.appendChild(swatch);
        span.appendChild(document.createTextNode(" " + place.leader + " ahead"));
        legend.appendChild(span);
      });
    }
    legend.classList.toggle("is-blend", blendOn());
  }

  function mountBlend(redraw) {
    var legend = document.getElementById("place-legend");
    if (!legend || document.getElementById("blend-switch")) return;
    var bar = el("div", "sheet-switch blend-switch");
    bar.id = "blend-switch";
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "How the map is colored");
    var sub = legend.previousElementSibling;
    var leadCopy = sub && sub.classList.contains("sub") ? sub.textContent : "";
    var caption = el("p", "sub blend-caption", "");
    caption.id = "blend-caption";
    function paintCaption() {
      var on = blendOn();
      if (leadCopy && sub) sub.textContent = on ? BLEND_LINE : leadCopy;
      caption.hidden = !on || !!leadCopy;
      caption.textContent = on && !leadCopy ? BLEND_LINE : "";
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
        redraw();
      });
      bar.appendChild(button);
    });
    if (leadCopy) legend.parentNode.insertBefore(bar, sub);
    else {
      legend.parentNode.insertBefore(bar, legend);
      legend.parentNode.insertBefore(caption, legend);
    }
    paintCaption();
  }

  function paintStatus(data) {
    var status = document.getElementById("place-status");
    var slug = document.body.getAttribute("data-place");
    if (!status || slug) return;
    var when = clock(data.reportDate);
    var progress = data.progress || {};
    status.textContent = "";
    if (when) status.appendChild(document.createTextNode("The Commission's count was last dated " + when + ", South Africa time. "));
    if (progress.vdExpected) {
      status.appendChild(document.createTextNode(
        "A voting district is a small counting area, closer to a precinct. Completed: " + count(progress.vdComplete || 0) + " of " + count(progress.vdExpected) + ". "
      ));
    }
    status.appendChild(document.createTextNode("This page does not declare a winner."));
  }

  function paintNational(data) {
    var host = document.getElementById("national-rows");
    if (!host) return;
    host.textContent = "";
    var rows = data.national || [];
    if (!rows.length) return;
    host.appendChild(el("h2", "", "Parties, counted across the whole country"));
    host.appendChild(el("p", "sub", "These are the parties in this local election, in the Electoral Commission's order. The numbers add every municipality together. They are not a vote for president. A zero is a reported zero, so the map stays the land color."));
    var table = el("table", "totals");
    var head = el("tr");
    head.appendChild(el("th", "", "Party"));
    head.appendChild(el("th", "num", "Votes"));
    head.appendChild(el("th", "num", "Share"));
    table.appendChild(head);
    rows.forEach(function (row) {
      var label = partyLabel(data, row.id);
      if (!label) return;
      var line = el("tr");
      var name = el("td", "notranslate", label);
      name.setAttribute("translate", "no");
      line.appendChild(name);
      line.appendChild(el("td", "num", count(row.votes)));
      line.appendChild(el("td", "num", typeof row.percent === "number" ? row.percent.toFixed(2) + "%" : "—"));
      table.appendChild(line);
    });
    host.appendChild(table);
  }

  function paintUnmatched(data) {
    var host = document.getElementById("unmatched");
    if (!host) return;
    host.textContent = "";
    var rows = data.unmatched || [];
    if (!rows.length) return;
    host.appendChild(el("h2", "", "Reported, but not drawn"));
    host.appendChild(el("p", "sub", "The Commission published these totals, and each one did not match a single municipality outline. They are listed here and left in the land color, instead of being placed on a guess."));
    rows.forEach(function (place) {
      var line = el("p", "note");
      var label = place.name || place.code || "Municipality";
      var text = label;
      if (place.votes > 0 && place.leader) text += ": " + place.leader + " ahead, " + count(place.votes) + " votes";
      else if (place.votes === 0) text += ": 0 votes reported";
      else text += ": no vote total";
      line.textContent = text;
      host.appendChild(line);
    });
  }

  function paintPlace(data) {
    var slug = document.body.getAttribute("data-place");
    if (!slug) return;
    var status = document.getElementById("place-status");
    var host = document.getElementById("place-rows");
    var place = null;
    (data.places || []).forEach(function (item) { if (item.slug === slug) place = item; });
    if (!place) {
      if (status) status.textContent = "No vote total has been published for this council yet. On the country map it stays the land color.";
      return;
    }
    if (!(place.votes > 0)) {
      if (status) status.textContent = "The Commission reports " + count(place.votes || 0) + " votes for this council. On the country map it stays the land color.";
      return;
    }
    if (status) {
      status.textContent = place.leader
        ? place.leader + " has more reported votes than the others. That is a lead in the count, not a declared winner."
        : "Votes are reported, and no single party is ahead. The map stays the land color.";
    }
    if (!host) return;
    host.textContent = "";
    var table = el("table", "totals");
    var head = el("tr");
    head.appendChild(el("th", "", "Party"));
    head.appendChild(el("th", "num", "Votes"));
    head.appendChild(el("th", "num", "Share"));
    table.appendChild(head);
    (place.rows || []).forEach(function (row) {
      var label = partyLabel(data, row.id);
      if (!label) return;
      var line = el("tr");
      var name = el("td", "notranslate", label);
      name.setAttribute("translate", "no");
      line.appendChild(name);
      line.appendChild(el("td", "num", count(row.votes)));
      line.appendChild(el("td", "num", typeof row.percent === "number" ? row.percent.toFixed(2) + "%" : "—"));
      table.appendChild(line);
    });
    host.appendChild(table);
  }

  function bindList() {
    var links = document.querySelectorAll(".state-list a[data-slug]");
    links.forEach(function (link) {
      if (link.dataset.bound) return;
      link.dataset.bound = "1";
      var slug = link.getAttribute("data-slug");
      function mark() {
        var svg = document.querySelector("#place-slot svg");
        clearMarks(svg);
        link.classList.add("is-on");
        if (!svg) return;
        var path = svg.querySelector('path[data-slug="' + slug + '"]');
        if (path) path.classList.add("is-on");
      }
      link.addEventListener("mouseenter", mark);
      link.addEventListener("focus", mark);
      link.addEventListener("mouseleave", function () { clearMarks(document.querySelector("#place-slot svg")); });
      link.addEventListener("blur", function () { clearMarks(document.querySelector("#place-slot svg")); });
    });
  }

  function draw(data) {
    paintMap(data).then(function (painted) { paintLegend(data, painted || []); }).catch(function () {});
    paintStatus(data);
    paintNational(data);
    paintUnmatched(data);
    paintPlace(data);
    bindList();
  }

  var latest = null;

  function load() {
    fetch(resultsUrl + "?t=" + Math.floor(Date.now() / EVERY), {cache: "no-store"})
      .then(function (response) {
        if (!response.ok) throw new Error("results");
        return response.json();
      })
      .then(function (data) { latest = data; draw(data); })
      .catch(function () {
        var status = document.getElementById("place-status");
        if (status && !document.body.getAttribute("data-place")) {
          status.textContent = "The results file did not load. Nothing on this map is colored.";
        }
      });
  }

  mountBlend(function () { if (latest) draw(latest); });
  load();
  setInterval(load, EVERY);
  new MutationObserver(function () {
    if (latest) paintMap(latest);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
})();
