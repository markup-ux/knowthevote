(function () {
  var script = document.currentScript;
  var src = (script && script.getAttribute("src")) || "";
  var base = src.replace(/[^/]*$/, "");
  var page = /(?:^|\/)search\.html$/i.test(location.pathname);
  var items = null;
  var pending = null;
  var active = -1;
  var shown = [];

  var style = document.createElement("style");
  style.id = "site-search-style";
  style.textContent = [
    ".bar-top { flex-wrap: wrap; }",
    ".site-search { position: relative; flex: 1 1 180px; max-width: 340px; min-width: 0; margin: 0 12px; }",
    ".site-search input { width: 100%; font: inherit; font-size: 15px; color: var(--bar-ink); background: transparent; border: 1px solid var(--bar-ink); padding: 6px 10px; }",
    ".site-search input::placeholder { color: var(--bar-ink); opacity: 0.75; }",
    ".site-search input:focus-visible { outline: 2px solid var(--bar-line); outline-offset: 2px; }",
    ".site-search-list { position: absolute; z-index: 5; left: 0; right: 0; top: calc(100% + 8px); margin: 0; padding: 0; list-style: none; background: var(--paper); color: var(--ink); border: 1px solid var(--ink); max-height: min(360px, 60vh); overflow: auto; }",
    ".site-search-list a, .site-search-list p { display: flex; align-items: center; gap: 10px; margin: 0; padding: 8px 12px; text-decoration: none; border-bottom: 1px solid var(--line); }",
    ".site-search-list a.is-on, .site-search-list a:hover { background: var(--chip); }",
    ".site-search-list strong { display: block; font-weight: 650; }",
    ".site-search-list span, .search-hits span { display: block; color: var(--muted); font-size: 14px; }",
    ".search-copy { min-width: 0; }",
    ".search-face, .search-letter { width: 36px; height: 46px; flex: none; object-fit: cover; object-position: center top; background: #e4ddd0; }",
    ".search-letter { display: flex; align-items: center; justify-content: center; font-family: Georgia, 'Palatino Linotype', serif; font-size: 20px; }",
    ".search-hits { list-style: none; margin: 18px 0 0; padding: 0; max-width: 720px; }",
    ".search-hits a { display: flex; align-items: center; gap: 14px; text-decoration: none; padding: 12px 2px; border-top: 1px solid var(--line); }",
    ".search-hits a:hover, .search-hits a:focus-visible { background: var(--chip); }",
    ".search-hits .search-face, .search-hits .search-letter { width: 56px; height: 70px; font-size: 28px; }",
    ".search-hits strong { display: block; font-family: Georgia, 'Palatino Linotype', serif; font-weight: 500; font-size: 22px; }",
    "#search-form input { width: min(100%, 28rem); }",
    "@media (max-width: 640px) { .site-search { flex-basis: 100%; order: 3; max-width: none; margin: 0; } }"
  ].join("\n");
  document.head.appendChild(style);

  var bar = document.querySelector("header .bar-top");
  var lang = bar && bar.querySelector(".lang");
  var form = document.createElement("form");
  form.className = "site-search";
  form.setAttribute("role", "search");
  form.action = base + "search.html";
  form.method = "get";
  var label = document.createElement("label");
  label.className = "visually-hidden";
  label.htmlFor = "site-q";
  label.textContent = "Search the site";
  var input = document.createElement("input");
  input.id = "site-q";
  input.name = "q";
  input.type = "search";
  input.placeholder = "Search";
  input.setAttribute("autocomplete", "off");
  input.setAttribute("autocapitalize", "off");
  input.setAttribute("spellcheck", "false");
  input.setAttribute("enterkeyhint", "search");
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", "site-search-list");
  input.setAttribute("aria-label", "Search the site");
  var list = document.createElement("div");
  list.id = "site-search-list";
  list.className = "site-search-list";
  list.setAttribute("role", "listbox");
  list.hidden = true;
  form.appendChild(label);
  form.appendChild(input);
  form.appendChild(list);
  if (bar) {
    if (lang) bar.insertBefore(form, lang);
    else bar.appendChild(form);
  }

  var pageInput = document.getElementById("search-q");
  var pageBox = document.getElementById("search-page");

  function fold(text) {
    return (text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/['’.]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function hrefFor(item) {
    return base + item[2];
  }

  function hasToken(hay, token) {
    if (!token) return false;
    if (hay.indexOf(token) !== -1) return true;
    if (token.length < 2) return false;
    return hay.replace(/ /g, "").indexOf(token) !== -1;
  }

  function snippet(text, tokens) {
    var low = (text || "").toLowerCase();
    var best = -1;
    tokens.forEach(function (token) {
      var pos = low.indexOf(token);
      if (pos < 0 && token.length >= 3) {
        var compact = "";
        var map = [];
        for (var i = 0; i < low.length; i++) {
          var ch = low.charAt(i);
          if ((ch >= "a" && ch <= "z") || (ch >= "0" && ch <= "9")) {
            compact += ch;
            map.push(i);
          }
        }
        var at = compact.indexOf(token);
        if (at >= 0) pos = map[at];
      }
      if (pos >= 0 && (best < 0 || pos < best)) best = pos;
    });
    if (best < 0) return "";
    var start = Math.max(0, best - 48);
    var end = Math.min(text.length, best + 110);
    var cut = text.slice(start, end).replace(/\s+/g, " ").trim();
    if (start > 0) cut = "…" + cut;
    if (end < text.length) cut += "…";
    return cut;
  }

  function detailFor(item, query) {
    var name = fold(item[0]);
    var tokens = fold(query).split(" ").filter(Boolean);
    var named = tokens.every(function (token) { return hasToken(name, token); });
    if (!named && item[4]) {
      var quote = snippet(item[4], tokens);
      if (quote) return quote;
    }
    return item[1];
  }

  function copyFor(item, query) {
    var copy = document.createElement("span");
    copy.className = "search-copy";
    var strong = document.createElement("strong");
    strong.className = "notranslate";
    strong.setAttribute("translate", "no");
    strong.textContent = item[0];
    var detail = document.createElement("span");
    detail.textContent = detailFor(item, query);
    copy.appendChild(strong);
    copy.appendChild(detail);
    return copy;
  }

  function addPortrait(link, item) {
    var photo = item[5] || "";
    if (!photo) return;
    if (photo.length > 1) {
      var img = document.createElement("img");
      img.className = "search-face";
      img.alt = "";
      img.src = photo.indexOf("https://") === 0 ? photo : base + photo;
      img.addEventListener("error", function () {
        var mark = document.createElement("div");
        mark.className = "search-letter";
        mark.setAttribute("aria-hidden", "true");
        mark.textContent = (item[0] || "?").trim().charAt(0).toUpperCase() || "?";
        img.replaceWith(mark);
      });
      link.appendChild(img);
      return;
    }
    var mark = document.createElement("div");
    mark.className = "search-letter";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = photo;
    link.appendChild(mark);
  }

  function scoreItem(item, query) {
    var name = fold(item[0]);
    var rest = fold((item[1] || "") + " " + (item[4] || ""));
    var q = fold(query);
    if (q.length < 2) return null;
    var tokens = q.split(" ");
    var words = name.split(" ");
    var squashedName = name.replace(/ /g, "");
    var squashedQuery = q.replace(/ /g, "");
    if (q.length < 3) {
      var prefix = squashedName.indexOf(q) === 0;
      for (var i = 0; i < words.length; i++) {
        if (words[i].indexOf(q) === 0) prefix = true;
      }
      if (!prefix) return null;
    } else {
      for (var t = 0; t < tokens.length; t++) {
        if (!hasToken(name, tokens[t]) && !hasToken(rest, tokens[t])) return null;
      }
    }
    var nameScore = 0;
    var spelled = squashedQuery.length >= 3 && (squashedName === squashedQuery || squashedName.indexOf(squashedQuery) === 0);
    if (name === q || (squashedQuery.length >= 3 && squashedName === squashedQuery)) nameScore = 1000;
    else if (name.indexOf(q) === 0 || spelled) nameScore = 800;
    else if (tokens.every(function (token) { return words.some(function (word) { return word.indexOf(token) === 0; }); })) nameScore = 750;
    else if (tokens.every(function (token) { return hasToken(name, token); })) nameScore = 650;
    return {
      item: item,
      score: nameScore || 80,
      nameHit: nameScore > 0,
      exact: name === q || (squashedQuery.length >= 3 && squashedName === squashedQuery),
      rank: item[3] || 0,
      name: item[0]
    };
  }

  function search(query) {
    var hits = [];
    (items || []).forEach(function (item) {
      var hit = scoreItem(item, query);
      if (hit) hits.push(hit);
    });
    if (hits.some(function (hit) { return hit.exact; })) {
      hits = hits.filter(function (hit) { return hit.nameHit; });
    }
    hits.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.name.localeCompare(b.name);
    });
    return hits;
  }

  function closeList() {
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    active = -1;
  }

  function paintList(hits) {
    list.innerHTML = "";
    shown = hits.slice(0, 8);
    if (page || fold(input.value).length < 2) {
      closeList();
      return;
    }
    if (!shown.length) {
      var empty = document.createElement("p");
      empty.textContent = "Nothing on Leaders.vote matches that.";
      list.appendChild(empty);
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
      return;
    }
    shown.forEach(function (hit, index) {
      var link = document.createElement("a");
      link.href = hrefFor(hit.item);
      link.id = "site-search-opt-" + index;
      link.setAttribute("role", "option");
      addPortrait(link, hit.item);
      link.appendChild(copyFor(hit.item, input.value));
      list.appendChild(link);
    });
    if (hits.length > shown.length) {
      var more = document.createElement("a");
      more.className = "more";
      more.href = base + "search.html?q=" + encodeURIComponent(input.value.trim());
      more.textContent = "All " + hits.length + " matches";
      list.appendChild(more);
    }
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    markActive();
  }

  function markActive() {
    var links = list.querySelectorAll("[role='option']");
    for (var i = 0; i < links.length; i++) {
      links[i].classList.toggle("is-on", i === active);
    }
    if (active >= 0 && links[active]) input.setAttribute("aria-activedescendant", links[active].id);
    else input.removeAttribute("aria-activedescendant");
  }

  function paintPage(query) {
    if (!pageBox) return;
    pageBox.innerHTML = "";
    var q = fold(query);
    var note = document.createElement("p");
    note.className = "note";
    if (!items) {
      note.textContent = "The search list did not load.";
      pageBox.appendChild(note);
      return;
    }
    if (q.length < 2) {
      if (!q) return;
      note.textContent = "Type at least two letters.";
      pageBox.appendChild(note);
      return;
    }
    var hits = search(query);
    note.textContent = hits.length ? (hits.length === 1 ? "1 match." : hits.length + " matches.") : "Nothing on Leaders.vote matches that.";
    pageBox.appendChild(note);
    if (!hits.length) return;
    var ul = document.createElement("ul");
    ul.className = "search-hits";
    hits.slice(0, 50).forEach(function (hit) {
      var li = document.createElement("li");
      var link = document.createElement("a");
      link.href = hrefFor(hit.item);
      addPortrait(link, hit.item);
      link.appendChild(copyFor(hit.item, query));
      li.appendChild(link);
      ul.appendChild(li);
    });
    pageBox.appendChild(ul);
    if (hits.length > 50) {
      var more = document.createElement("p");
      more.className = "note";
      more.textContent = "Showing the first 50.";
      pageBox.appendChild(more);
    }
  }

  function applyQuery(value, source) {
    if (input && source !== input) input.value = value;
    if (pageInput && source !== pageInput) pageInput.value = value;
    active = -1;
    if (!items) return;
    var hits = search(value);
    paintList(hits);
    if (page) {
      paintPage(value);
      var next = "search.html" + (value.trim() ? "?q=" + encodeURIComponent(value.trim()) : "");
      if (location.pathname.slice(-11) === "search.html" || /search\.html$/i.test(location.pathname)) {
        history.replaceState(null, "", next);
      }
    }
  }

  function load() {
    if (pending) return pending;
    pending = fetch(base + "search.json?v=7")
      .then(function (response) {
        if (!response.ok) throw new Error("search");
        return response.json();
      })
      .then(function (data) {
        items = data.items || [];
        return items;
      })
      .catch(function (error) {
        pending = null;
        throw error;
      });
    return pending;
  }

  function onType(event) {
    var value = event.target.value;
    load().then(function () {
      applyQuery(value, event.target);
    }).catch(function () {
      if (page) paintPage(value);
      else {
        list.innerHTML = "";
        var failed = document.createElement("p");
        failed.textContent = "The search list did not load.";
        list.appendChild(failed);
        list.hidden = false;
        input.setAttribute("aria-expanded", "true");
      }
    });
  }

  if (input) {
    input.addEventListener("input", onType);
    input.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeList();
        return;
      }
      if (list.hidden) return;
      var options = list.querySelectorAll("[role='option']");
      if (event.key === "ArrowDown") {
        event.preventDefault();
        active = Math.min(options.length - 1, active + 1);
        markActive();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        active = Math.max(-1, active - 1);
        markActive();
      } else if (event.key === "Enter" && active >= 0 && options[active]) {
        event.preventDefault();
        location.href = options[active].href;
      }
    });
    form.addEventListener("submit", function () {
      if (page) return;
    });
    list.addEventListener("mousedown", function (event) {
      event.preventDefault();
    });
  }

  if (pageInput) {
    pageInput.addEventListener("input", onType);
    var pageForm = document.getElementById("search-form");
    if (pageForm) {
      pageForm.addEventListener("submit", function (event) {
        event.preventDefault();
        load().then(function () { applyQuery(pageInput.value, pageInput); });
      });
    }
  }

  document.addEventListener("click", function (event) {
    if (!event.target.closest || !event.target.closest(".site-search")) closeList();
  });
  document.addEventListener("keydown", function (event) {
    if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
    var tag = (event.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || event.target.isContentEditable) return;
    if (!input) return;
    event.preventDefault();
    input.focus();
  });

  var params = new URLSearchParams(location.search);
  var initial = params.get("q") || "";
  if (initial && input) input.value = initial;
  if (initial && pageInput) pageInput.value = initial;
  if (page || initial) {
    load().then(function () {
      if (page) paintPage(initial);
      else if (initial && document.activeElement === input) paintList(search(initial));
    }).catch(function () {
      items = null;
      if (page) paintPage(initial);
    });
  }
})();
