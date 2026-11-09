(function () {
  var ALIAS = {
    nba: { "Trail Blazers": "Blazers" },
    nhl: { Mammoth: "Utah Mammoth" },
    mls: {
      "CF Montréal": "Montréal",
      "CF Montreal": "Montréal",
      "Kansas City": "Sporting KC",
      "LA Galaxy": "Galaxy",
      Miami: "Inter Miami",
      "Red Bull NY": "Red Bulls",
      Seattle: "Sounders"
    }
  };
  var LEAGUES = [
    { id: "lg-nfl", key: "nfl", sport: "football", slug: "nfl", plan: "nfl" },
    { id: "lg-nba", key: "nba", sport: "basketball", slug: "nba", plan: "window", back: 8, ahead: 8 },
    { id: "lg-nhl", key: "nhl", sport: "hockey", slug: "nhl", plan: "window", back: 8, ahead: 8 },
    { id: "lg-mlb", key: "mlb", sport: "baseball", slug: "mlb", plan: "mlb" },
    { id: "lg-mls", key: "mls", sport: "soccer", slug: "usa.1", plan: "mls" },
    { id: "lg-wnba", key: "wnba", sport: "basketball", slug: "wnba", plan: "wnba" }
  ];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var memory = {};
  var refreshing = false;

  function boot() {
    if (!document.getElementById("panel-sports")) {
      setTimeout(boot, 50);
      return;
    }
    LEAGUES.forEach(function (meta) {
      var note = document.querySelector("#" + meta.id + " .note");
      if (note) note.textContent = "Updating scores";
    });
    refresh(true);
    setInterval(function () {
      if (document.hidden) return;
      refresh(false);
    }, 60000);
    setInterval(function () {
      if (document.hidden) return;
      refresh(true);
    }, 600000);
  }

  function refresh(full) {
    if (refreshing) return;
    refreshing = true;
    var jobs = LEAGUES.map(function (meta) {
      var urls = full || !memory[meta.id] ? null : hotUrls(meta);
      var load = urls ? fetchUrls(urls) : loadLeague(meta);
      return load.then(function (events) {
        if (!events) return;
        if (!full && memory[meta.id]) events = merge(memory[meta.id], events);
        if (!events.length) return;
        memory[meta.id] = events;
        paint(meta, events);
      }).catch(function () {
        var note = document.querySelector("#" + meta.id + " .note");
        if (note && !memory[meta.id]) note.textContent = "Scores did not load";
      });
    });
    Promise.all(jobs).then(function () { refreshing = false; }, function () { refreshing = false; });
  }

  function hotUrls(meta) {
    var events = memory[meta.id] || [];
    if (meta.plan === "nfl" && meta.weekUrl) {
      var live = events.some(function (event) { return event.state === "in"; });
      var day = new Date().getDay();
      if (live || day === 0 || day === 1 || day === 4) return [meta.weekUrl];
      return [dateUrl(meta, ymd(new Date()))];
    }
    var dates = {};
    dates[ymd(new Date())] = true;
    dates[ymd(addDays(new Date(), -1))] = true;
    events.forEach(function (event) {
      if (event.state === "in") dates[ymd(new Date(event.date))] = true;
    });
    return Object.keys(dates).map(function (date) { return dateUrl(meta, date); });
  }

  function loadLeague(meta) {
    return scoreboard(meta, ymd(new Date())).then(function (board) {
      rememberWeek(meta, board);
      return extraDates(meta, board).then(function (more) {
        var urls = unique(baseUrls(meta, board).concat(more.map(function (date) { return dateUrl(meta, date); })));
        return fetchUrls(urls);
      });
    });
  }

  function rememberWeek(meta, board) {
    if (!board || meta.plan !== "nfl") return;
    var week = board.week && board.week.number;
    var type = board.leagues && board.leagues[0].season.type.type;
    if (!week) return;
    var seasonType = type === 3 ? 3 : 2;
    meta.weekUrl = "https://site.api.espn.com/apis/site/v2/sports/" + meta.sport + "/" + meta.slug + "/scoreboard?seasontype=" + seasonType + "&week=" + week;
  }

  function baseUrls(meta, board) {
    if (meta.plan === "nfl") {
      var week = (board.week && board.week.number) || 1;
      var type = board.leagues && board.leagues[0].season.type.type;
      var seasonType = type === 3 ? 3 : 2;
      var urls = [];
      [week - 1, week, week + 1, week + 2].forEach(function (n) {
        if (n >= 1 && n <= 23) {
          urls.push("https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=" + seasonType + "&week=" + n);
        }
      });
      return urls;
    }
    var dates = [];
    if (meta.plan === "window") {
      for (var i = -meta.back; i <= meta.ahead; i++) dates.push(ymd(addDays(new Date(), i)));
    } else if (meta.plan === "mlb") {
      var year = String((board.leagues[0].season && board.leagues[0].season.year) || new Date().getFullYear());
      var next = String(Number(year) + 1);
      for (var day = 24; day <= 30; day++) dates.push(year + "09" + (day < 10 ? "0" : "") + day);
      for (var open = 19; open <= 28; open++) dates.push(next + "02" + open);
      calendarDates(board).forEach(function (date) {
        if (date >= year + "0901") dates.push(date);
      });
    } else if (meta.plan === "mls") {
      var start = ymd(addDays(new Date(), -50));
      var end = ymd(addDays(new Date(), 45));
      calendarDates(board).forEach(function (date) {
        if (date >= start && date <= end) dates.push(date);
      });
    } else if (meta.plan === "wnba") {
      calendarDates(board).slice(-20).forEach(function (date) { dates.push(date); });
    }
    return dates.map(function (date) { return dateUrl(meta, date); });
  }

  function extraDates(meta, board) {
    if (meta.plan !== "mlb" && meta.plan !== "mls" && meta.plan !== "wnba") return Promise.resolve([]);
    var end = board.leagues && board.leagues[0].season && board.leagues[0].season.endDate;
    if (!end) return Promise.resolve([]);
    var offsets = meta.plan === "wnba" ? [120, 190] : [100];
    return Promise.all(offsets.map(function (days) {
      var probe = new Date(new Date(end).getTime() + days * 86400000);
      return scoreboard(meta, ymd(probe)).then(function (next) {
        return calendarDates(next).slice(0, 14);
      }).catch(function () { return []; });
    })).then(function (groups) {
      var dates = [];
      groups.forEach(function (group) { dates = dates.concat(group); });
      return dates;
    });
  }

  function fetchUrls(urls) {
    return mapLimit(unique(urls), 4, function (url) {
      return fetch(url).then(function (res) {
        return res.ok ? res.json() : null;
      }).catch(function () { return null; });
    }).then(function (boards) {
      var events = [];
      boards.forEach(function (board) {
        events = events.concat(eventsFrom(board));
      });
      return dedupe(events);
    });
  }

  function scoreboard(meta, date) {
    return fetch(dateUrl(meta, date)).then(function (res) {
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    });
  }

  function dateUrl(meta, date) {
    return "https://site.api.espn.com/apis/site/v2/sports/" + meta.sport + "/" + meta.slug + "/scoreboard?dates=" + date;
  }

  function calendarDates(board) {
    var cal = (board && board.leagues && board.leagues[0] && board.leagues[0].calendar) || [];
    return cal.map(function (item) {
      return String(item).slice(0, 10).replace(/-/g, "");
    }).filter(function (date) { return /^\d{8}$/.test(date); });
  }

  function eventsFrom(board) {
    var list = [];
    ((board && board.events) || []).forEach(function (event) {
      var comp = (event.competitions || [])[0];
      if (!comp) return;
      var status = (comp.status && comp.status.type) || {};
      list.push({
        id: event.id,
        date: event.date,
        state: status.state || "",
        detail: status.shortDetail || "",
        status: status.name || "",
        completed: !!status.completed,
        sides: (comp.competitors || []).map(function (side) {
          return {
            name: side.team && (side.team.shortDisplayName || side.team.displayName) || "",
            home: side.homeAway === "home",
            score: side.score == null ? "" : String(side.score),
            winner: !!side.winner
          };
        })
      });
    });
    return list;
  }

  function dedupe(events) {
    var byId = {};
    events.forEach(function (event) {
      if (!event || !event.id) return;
      byId[event.id] = event;
    });
    return Object.keys(byId).map(function (id) { return byId[id]; });
  }

  function merge(previous, incoming) {
    return dedupe(previous.concat(incoming));
  }

  function paint(meta, events) {
    var panel = document.getElementById(meta.id);
    if (!panel) return;
    var buckets = {};
    events.forEach(function (event) {
      event.sides.forEach(function (side, index) {
        var name = clubName(meta.key, side.name);
        if (!name || name === "TBD Away" || name === "TBD Home") return;
        var other = event.sides[index === 0 ? 1 : 0];
        if (!other) return;
        if (!buckets[name]) buckets[name] = {};
        consider(buckets[name], event, side, other);
      });
    });
    if (!panel._logos) {
      panel._logos = {};
      panel.querySelectorAll(".teams li").forEach(function (row) {
        var label = row.querySelector(".tm");
        var logo = row.querySelector(".logo");
        if (label && logo) panel._logos[label.textContent] = logo;
      });
    }
    var live = 0;
    panel.querySelectorAll(".teams li").forEach(function (row) {
      ensureMatch(row, panel._logos);
      var label = row.querySelector(".tm");
      var name = label ? label.textContent : "";
      var bucket = buckets[name];
      var score = row.querySelector(".sc");
      var opponent = row.querySelector(".op");
      var next = row.querySelector(".nx");
      if (!score || !opponent || !next) return;
      if (!bucket || (!bucket.last && !bucket.live)) {
        score.textContent = "\u2014";
        showOpp(panel._logos, row, true, "");
        opponent.textContent = "No result posted";
        next.textContent = bucket && bucket.next ? nextLine(meta, bucket.next) : "Next game not posted";
        row.classList.remove("is-live");
        return;
      }
      var shown = bucket.live || bucket.last;
      if (bucket.live) live += 1;
      score.textContent = resultText(shown);
      showOpp(panel._logos, row, shown.side.home, oppName(meta, shown));
      opponent.innerHTML = caption(meta, shown);
      next.innerHTML = bucket.next ? nextLine(meta, bucket.next) : "Next game not posted";
      row.classList.toggle("is-live", !!bucket.live);
    });
    var note = panel.querySelector(".note");
    if (note) {
      var clock = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      note.textContent = (live ? "Live \u00b7 " : "") + "Updated " + clock;
    }
    if (window.applyScoreSearch) window.applyScoreSearch();
  }

  function consider(bucket, event, side, other) {
    var when = new Date(event.date).getTime();
    var game = { event: event, side: side, other: other, when: when };
    if (event.state === "in") {
      if (!bucket.live || when >= bucket.live.when) bucket.live = game;
      return;
    }
    if (event.completed && event.state === "post" && !/CANCEL|POSTPONE/i.test(event.status)) {
      if (!bucket.last || when >= bucket.last.when) bucket.last = game;
      return;
    }
    if (when >= Date.now() - 3 * 60 * 60 * 1000 && (!bucket.next || when < bucket.next.when)) bucket.next = game;
  }

  function resultText(game) {
    var us = game.side.score;
    var them = game.other.score;
    if (game.event.state === "in") return us + "\u2013" + them;
    if (us === them && game.side.winner) return "W SO";
    if (us === them && game.other.winner) return "L SO";
    if (us === them) return "D " + us + "\u2013" + them;
    return (game.side.winner ? "W " : "L ") + us + "\u2013" + them;
  }

  var copyCount = 0;

  function ensureMatch(row, logos) {
    if (row.querySelector(".match")) return;
    var logo = row.querySelector(".logo");
    var tm = row.querySelector(".tm");
    var op = row.querySelector(".op");
    var match = document.createElement("div");
    match.className = "match";
    var word = document.createElement("span");
    word.className = "vs-word";
    word.textContent = "vs";
    var slot = document.createElement("span");
    slot.className = "opp-slot";
    if (logo) match.appendChild(logo);
    match.appendChild(word);
    match.appendChild(slot);
    var names = document.createElement("p");
    names.className = "names";
    if (tm) names.appendChild(tm);
    var sep = document.createElement("span");
    sep.className = "sep";
    sep.setAttribute("aria-hidden", "true");
    sep.textContent = " \u00b7 ";
    names.appendChild(sep);
    if (op) names.appendChild(op);
    row.insertBefore(match, row.firstChild);
    var next = row.querySelector(".nx");
    if (next) row.insertBefore(names, next);
    else row.appendChild(names);
    if (!op) return;
    var parsed = op.textContent.match(/^(vs|at)\s+(.+?)\s+\u00b7\s+(.*)$/);
    if (!parsed) return;
    word.textContent = parsed[1];
    op.textContent = parsed[2] + " \u00b7 " + parsed[3];
    fillSlot(logos, slot, parsed[2]);
  }

  function showOpp(logos, row, home, name) {
    var word = row.querySelector(".vs-word");
    var slot = row.querySelector(".opp-slot");
    if (!word || !slot) return;
    if (!name || name === "TBD") {
      word.hidden = true;
      slot.hidden = true;
      fillSlot(logos, slot, "");
      return;
    }
    word.hidden = false;
    slot.hidden = false;
    word.textContent = home ? "vs" : "at";
    fillSlot(logos, slot, name);
  }

  function fillSlot(logos, slot, name) {
    while (slot.firstChild) slot.removeChild(slot.firstChild);
    var logo = name && logos ? logos[name] : null;
    if (logo) slot.appendChild(cloneLogo(logo));
  }

  function cloneLogo(svg) {
    var copy = svg.cloneNode(true);
    copyCount += 1;
    var suffix = "-x" + copyCount;
    var map = {};
    copy.querySelectorAll("[id]").forEach(function (node) {
      map[node.getAttribute("id")] = node.getAttribute("id") + suffix;
    });
    copy.querySelectorAll("*").forEach(function (node) {
      var id = node.getAttribute("id");
      if (id && map[id]) node.setAttribute("id", map[id]);
      ["clip-path", "fill", "stroke", "filter", "mask"].forEach(function (attr) {
        var value = node.getAttribute(attr);
        if (!value || value.indexOf("url(#") === -1) return;
        Object.keys(map).forEach(function (oldId) {
          value = value.split("url(#" + oldId + ")").join("url(#" + map[oldId] + ")");
        });
        node.setAttribute(attr, value);
      });
    });
    copy.setAttribute("aria-hidden", "true");
    return copy;
  }

  function caption(meta, game) {
    var detail = game.event.state === "in" && game.event.detail ? " \u00b7 " + escapeHtml(game.event.detail) : "";
    return escapeHtml(oppName(meta, game)) + detail + " \u00b7 " + timeTag(game.event.date);
  }

  function oppName(meta, game) {
    var name = clubName(meta.key, game.other.name);
    if (name === "TBD Away" || name === "TBD Home" || !name) return "TBD";
    return name;
  }

  function nextLine(meta, game) {
    return "Next \u00b7 " + place(meta, game) + " \u00b7 " + timeTag(game.event.date);
  }

  function place(meta, game) {
    var name = clubName(meta.key, game.other.name);
    if (name === "TBD Away" || name === "TBD Home" || !name) name = "TBD";
    return (game.side.home ? "vs " : "at ") + escapeHtml(name);
  }

  function timeTag(iso) {
    return "<time datetime=\"" + escapeHtml(iso) + "\">" + escapeHtml(whenText(iso)) + "</time>";
  }

  function whenText(iso) {
    var date = new Date(iso);
    var text = MONTHS[date.getMonth()] + " " + date.getDate();
    if (date.getFullYear() !== new Date().getFullYear()) text += ", " + date.getFullYear();
    return text;
  }

  function clubName(key, espnName) {
    var table = ALIAS[key] || {};
    return table[espnName] || espnName;
  }

  function ymd(date) {
    var month = date.getMonth() + 1;
    var day = date.getDate();
    return "" + date.getFullYear() + (month < 10 ? "0" : "") + month + (day < 10 ? "0" : "") + day;
  }

  function addDays(date, count) {
    var copy = new Date(date.getTime());
    copy.setDate(copy.getDate() + count);
    return copy;
  }

  function unique(list) {
    var seen = {};
    return list.filter(function (item) {
      if (!item || seen[item]) return false;
      seen[item] = true;
      return true;
    });
  }

  function escapeHtml(text) {
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  }

  function mapLimit(items, limit, worker) {
    var results = new Array(items.length);
    var next = 0;
    var active = 0;
    if (!items.length) return Promise.resolve(results);
    return new Promise(function (resolve) {
      function pump() {
        if (next >= items.length && active === 0) {
          resolve(results);
          return;
        }
        while (active < limit && next < items.length) {
          (function (index) {
            active += 1;
            worker(items[index]).then(function (value) {
              results[index] = value;
            }).catch(function () {
              results[index] = null;
            }).then(function () {
              active -= 1;
              pump();
            });
          })(next);
          next += 1;
        }
      }
      pump();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
