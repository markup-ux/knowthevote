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

  function text(data, key, fallback) {
    var strings = data.strings || {};
    return strings[key] || fallback;
  }

  function tint(hex, amount) {
    var chip = [235, 228, 214];
    var rgb = hex.length === 4
      ? [parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16), parseInt(hex[3] + hex[3], 16)]
      : [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    return "rgb(" + chip.map(function (channel, index) {
      return Math.round(channel + (rgb[index] - channel) * amount);
    }).join(",") + ")";
  }

  function count(value) {
    return typeof value === "number" ? value.toLocaleString("en") : "";
  }

  function share(value) {
    return typeof value === "number" ? value.toFixed(2) + "%" : "—";
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
        if (place && place.votes > 0 && place.leader && place.color) {
          path.style.setProperty("--lead", tint(place.color, place.amount || 0.7));
          path.setAttribute("title", name + ": " + place.leader);
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

  function paintLegend(data, painted) {
    var legend = document.getElementById("place-legend");
    if (!legend) return;
    legend.textContent = "";
    var blank = el("span");
    blank.appendChild(el("i", "swatch blank"));
    blank.appendChild(document.createTextNode(" " + text(data, "blank", "No votes reported")));
    legend.appendChild(blank);
    painted.forEach(function (place) {
      var span = el("span");
      var swatch = el("i", "swatch");
      swatch.style.background = place.color;
      span.appendChild(swatch);
      span.appendChild(document.createTextNode(" " + place.leader));
      legend.appendChild(span);
    });
  }

  function paintStatus(data) {
    var status = document.getElementById("place-status");
    if (!status || document.body.getAttribute("data-place")) return;
    if (data.status) status.textContent = data.status;
  }

  function addTable(host, heading, note, rows, nameHeading) {
    if (!rows || !rows.length) return;
    if (heading) host.appendChild(el("h2", "", heading));
    if (note) host.appendChild(el("p", "sub", note));
    var table = el("table", "totals");
    var head = el("tr");
    head.appendChild(el("th", "", nameHeading || "Name"));
    head.appendChild(el("th", "num", "Votes"));
    head.appendChild(el("th", "num", "Share"));
    table.appendChild(head);
    rows.forEach(function (row) {
      var line = el("tr");
      var name = el("td", "notranslate", row.name || "");
      name.setAttribute("translate", "no");
      line.appendChild(name);
      line.appendChild(el("td", "num", count(row.votes)));
      line.appendChild(el("td", "num", share(row.percent)));
      table.appendChild(line);
    });
    host.appendChild(table);
  }

  function paintNational(data) {
    var host = document.getElementById("national-rows");
    if (!host) return;
    host.textContent = "";
    (data.tables || []).forEach(function (table) {
      addTable(host, table.title, table.note, table.rows, table.column);
    });
  }

  function paintLists(data) {
    var host = document.getElementById("extra");
    if (!host) return;
    host.textContent = "";
    (data.lists || []).forEach(function (list) {
      host.appendChild(el("h2", "", list.title || ""));
      if (list.note) host.appendChild(el("p", "deck", list.note));
      (list.items || []).forEach(function (item) {
        var line = el("p", "note");
        line.textContent = item.name + (item.detail ? ": " + item.detail : "");
        host.appendChild(line);
      });
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
      if (status) status.textContent = text(data, "missing", "No vote total has been published for this place yet. It stays beige.");
      return;
    }
    if (!(place.votes > 0)) {
      if (status) status.textContent = text(data, "zero", "The reported total is zero. The map stays beige.");
      return;
    }
    if (status) status.textContent = place.leader ? place.summary : text(data, "tie", "Votes are reported, and no one is strictly ahead. The map stays beige.");
    if (!host) return;
    host.textContent = "";
    addTable(host, "", "", place.rows, "Name");
    (place.tables || []).forEach(function (table) {
      addTable(host, table.title, table.note, table.rows, table.column);
    });
  }

  function bindList() {
    document.querySelectorAll(".state-list a[data-slug]").forEach(function (link) {
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
    paintLists(data);
    paintPlace(data);
    bindList();
  }

  function load() {
    fetch(resultsUrl + "?t=" + Math.floor(Date.now() / EVERY), {cache: "no-store"})
      .then(function (response) {
        if (!response.ok) throw new Error("results");
        return response.json();
      })
      .then(draw)
      .catch(function () {
        var status = document.getElementById("place-status");
        if (status && !document.body.getAttribute("data-place")) {
          status.textContent = "The results file did not load. Nothing on this map is colored.";
        }
      });
  }

  load();
  setInterval(load, EVERY);
})();
