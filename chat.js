(function () {
  var VOICES = [
    ["#0f6e6a", "#d7f0ee"],
    ["#7a3e78", "#f6e4f4"],
    ["#9a6410", "#f8ecd3"],
    ["#3e6b3a", "#e5f2e1"],
    ["#6e4c9a", "#efe6f8"],
    ["#5c6b2f", "#eef3dc"],
    ["#6b4a3a", "#f3e8e0"],
    ["#1d6a86", "#d9eef4"],
    ["#8a5a2b", "#f6e7d4"],
    ["#4a6b5c", "#e4f3ec"],
    ["#7a4e68", "#f8e6ef"],
    ["#3f5f4a", "#e6f3ea"],
    ["#6a5a2e", "#f4edd8"],
    ["#6b5b8a", "#ece6f6"],
    ["#a56b3c", "#f8eadc"],
    ["#2f6a58", "#dff3ec"]
  ];
  var NET = { x: "X", facebook: "Facebook", instagram: "Instagram", youtube: "YouTube", mastodon: "Mastodon", bluesky: "Bluesky", truth: "Truth Social" };
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var log = document.getElementById("log");
  var status = document.getElementById("chat-status");
  var typing = document.getElementById("typing");
  var findBox = document.getElementById("chat-q");
  var findNote = document.getElementById("chat-find-note");
  var picker = document.getElementById("day-picker");
  var chosen = "";

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function face(person) {
    var letter = (person.name || "?").trim().charAt(0).toUpperCase() || "?";
    if (!person.photo) return el("div", "letter", letter);
    var img = el("img", "face");
    img.alt = "";
    img.src = person.photo;
    img.addEventListener("error", function () {
      var fallback = el("div", "letter", letter);
      img.replaceWith(fallback);
    });
    return img;
  }

  function personKey(name) {
    var chars = [];
    var lower = (name || "").toLowerCase();
    for (var i = 0; i < lower.length; i++) {
      var char = lower.charAt(i);
      var letter = char.toLowerCase() !== char.toUpperCase();
      if (letter || /[0-9]/.test(char)) chars.push(char);
      else if (/\s/.test(char) || char === "-" || char === "'" || char === "\u2019") chars.push(" ");
    }
    return chars.join("").replace(/\s+/g, " ").trim();
  }

  function posted(iso) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) {
      var parts = iso.split("-");
      var only = new Date(+parts[0], +parts[1] - 1, +parts[2]);
      return MONTHS[only.getMonth()] + " " + only.getDate() + ", " + only.getFullYear();
    }
    var date = new Date(iso);
    if (isNaN(date.getTime())) return "";
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var suffix = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    var mm = minutes < 10 ? "0" + minutes : String(minutes);
    return MONTHS[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear() + ", " + hours + ":" + mm + " " + suffix;
  }

  function host(url) {
    return String(url || "").replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "");
  }

  var START = new Date(2026, 10, 3);
  var seen = { posts: "", official: "", ready: false };

  function sinceStart(value) {
    if (!value) return false;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      var parts = value.split("-");
      return new Date(+parts[0], +parts[1] - 1, +parts[2]) >= START;
    }
    var date = new Date(value);
    return !isNaN(date.getTime()) && date >= START;
  }

  function dayKey(value) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return value;
    var date = new Date(value);
    if (isNaN(date.getTime())) return "";
    var month = date.getMonth() + 1;
    var day = date.getDate();
    return date.getFullYear() + "-" + (month < 10 ? "0" : "") + month + "-" + (day < 10 ? "0" : "") + day;
  }

  function todayKey() {
    var date = new Date();
    var month = date.getMonth() + 1;
    var day = date.getDate();
    return date.getFullYear() + "-" + (month < 10 ? "0" : "") + month + "-" + (day < 10 ? "0" : "") + day;
  }

  function dayLabel(key) {
    var parts = key.split("-");
    var date = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    return MONTHS[date.getMonth()] + " " + date.getDate();
  }

  function when(value) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
      var parts = value.split("-");
      return new Date(+parts[0], +parts[1] - 1, +parts[2]).getTime();
    }
    var date = new Date(value);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  }

  function voice(name) {
    var n = 0;
    var text = name || " ";
    for (var i = 0; i < text.length; i++) n = (n * 33 + text.charCodeAt(i)) >>> 0;
    return VOICES[n % VOICES.length];
  }

  function darkNow() {
    return /dark$/.test(document.documentElement.getAttribute("data-theme") || "");
  }

  function hueOf(hex) {
    var n = parseInt(hex.slice(1), 16);
    var r = ((n >> 16) & 255) / 255;
    var g = ((n >> 8) & 255) / 255;
    var b = (n & 255) / 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var h = 0;
    if (max !== min) {
      var d = max - min;
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    var l = (max + min) / 2;
    var s = max === min ? 0 : (l > 0.5 ? d / (2 - max - min) : d / (max + min));
    return [h, s];
  }

  function fromHue(h, s, l) {
    function channel(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    function byte(t) { return Math.round(channel(p, q, t) * 255); }
    return "rgb(" + byte(h + 1 / 3) + ", " + byte(h) + ", " + byte(h - 1 / 3) + ")";
  }

  function paintPerson(who, messages, name) {
    var tone = voice(name);
    var dark = darkNow();
    var accent = tone[0];
    var wash = tone[1];
    var ink = "#1c1915";
    if (dark) {
      var hue = hueOf(tone[0]);
      accent = fromHue(hue[0], Math.max(hue[1], 0.42), 0.74);
      wash = fromHue(hue[0], Math.min(Math.max(hue[1], 0.38), 0.62), 0.2);
      ink = "#f3efe6";
    }
    var button = who.querySelector(".name");
    if (button) button.style.color = accent;
    else who.style.color = accent;
    var title = who.parentElement && who.parentElement.querySelector(".card-name");
    if (title) title.style.color = accent;
    messages.forEach(function (message) {
      message.style.background = wash;
      message.style.color = ink;
      message.style.boxShadow = "inset 4px 0 0 " + accent;
      var link = message.querySelector(".net");
      if (link) link.style.color = accent;
    });
  }

  function repaintVoices() {
    if (!log) return;
    Array.prototype.forEach.call(log.querySelectorAll(".cluster"), function (block) {
      var who = block.querySelector(".who");
      if (!who || who.classList.contains("gov")) return;
      var button = who.querySelector(".name");
      paintPerson(who, block.querySelectorAll(".bubble"), button ? button.textContent : "");
    });
  }

  new MutationObserver(repaintVoices).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"]
  });
  function messageId(value) {
    var n = 0;
    var text = value || "";
    for (var i = 0; i < text.length; i++) n = (n * 33 + text.charCodeAt(i)) >>> 0;
    return "c" + n.toString(16);
  }

  function recordBubble(kind, label, text, url, context) {
    var bubble = el("p", "bubble " + kind);
    bubble.id = messageId(url || text);
    if (url && (url.indexOf("https://") === 0 || url.indexOf("house.html#") === 0)) {
      var link = el("a", "net", label);
      link.href = url;
      bubble.appendChild(link);
    } else if (label) {
      bubble.appendChild(el("span", "net", label));
    }
    if (context && (context.text || context.profile || context.handle)) {
      var quote = el("span", "context");
      var who = el("a", "context-name", context.name || context.handle || "Profile");
      if (context.profile) {
        who.href = context.profile;
        who.target = "_blank";
        who.rel = "noopener";
      }
      quote.appendChild(who);
      if (context.net && context.handle) {
        var opener = el("button", "context-page", "Profile");
        opener.type = "button";
        opener.addEventListener("click", function () {
          openProfile(context.net, context.handle, context.profile);
        });
        quote.appendChild(opener);
      }
      if (context.text) quote.appendChild(el("span", "context-text", context.text));
      bubble.appendChild(quote);
    }
    bubble.appendChild(document.createTextNode(text));
    return bubble;
  }

  function openProfile(net, handle, profile) {
    var key = net + ":" + String(handle || "").toLowerCase();
    var cluster = null;
    Array.prototype.forEach.call(log.querySelectorAll(".cluster"), function (node) {
      if (cluster) return;
      var handles = (node.getAttribute("data-handles") || "").split(" ");
      if (handles.indexOf(key) !== -1) cluster = node;
    });
    if (!cluster) {
      if (profile) window.open(profile, "_blank", "noopener");
      return;
    }
    var block = cluster.closest(".day-block");
    if (block) showDay(block.getAttribute("data-day"));
    cluster.hidden = false;
    var card = cluster.querySelector(".card");
    var button = cluster.querySelector(".name");
    if (card && card.hidden && button) button.click();
    cluster.scrollIntoView({ block: "center" });
  }

  function showDay(key) {
    chosen = key || "";
    var blocks = log.querySelectorAll(".day-block");
    Array.prototype.forEach.call(blocks, function (block) {
      block.hidden = block.getAttribute("data-day") !== chosen;
    });
    if (!picker) return;
    Array.prototype.forEach.call(picker.children, function (button) {
      var on = button.getAttribute("data-day") === chosen;
      button.classList.toggle("is-on", on);
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function render(data, postsFile, official, contactFile) {
    log.textContent = "";
    if (picker) picker.textContent = "";
    var states = data.states || [];
    var buckets = (postsFile && postsFile.people) || {};
    var records = (official && official.people) || {};
    var contacts = (contactFile && contactFile.people) || {};
    var postCount = 0;
    var recordCount = 0;
    var items = [];

    function placeLine(code, label) {
      var small = el("small", "place");
      var img = el("img", "flag");
      img.alt = "";
      img.src = "flags/" + String(code || "us").toLowerCase() + ".svg";
      small.appendChild(img);
      small.appendChild(document.createTextNode(label));
      return small;
    }

    function ordinal(n) {
      var v = n % 100;
      var suffix = "th";
      if (v < 11 || v > 13) {
        if (n % 10 === 1) suffix = "st";
        else if (n % 10 === 2) suffix = "nd";
        else if (n % 10 === 3) suffix = "rd";
      }
      return n + suffix;
    }

    function seatText(item, contact) {
      var state = item.stateName || "";
      var seat = "";
      if (contact.chamber === "senate") seat = state ? "Senator, " + state : "Senator";
      else if (contact.chamber === "house" && typeof contact.district === "number") {
        var district = contact.district === 0 ? "At large" : ordinal(contact.district) + " District";
        seat = state ? state + ", " + district : district;
      } else if (item.office) seat = item.office;
      return [item.party || "", seat, contact.leadership || ""].filter(Boolean).join(" · ");
    }

    function cardFace(name, photo, bioguide) {
      var letter = (name || "?").trim().charAt(0).toUpperCase() || "?";
      var steps = [];
      if (bioguide) {
        steps.push("https://unitedstates.github.io/images/congress/225x275/" + bioguide + ".jpg");
        steps.push("https://bioguide.congress.gov/bioguide/photo/" + bioguide.charAt(0) + "/" + bioguide + ".jpg");
      }
      if (photo) steps.push(photo);
      if (!steps.length) return el("span", "portrait portrait-letter", letter);
      var img = el("img", "portrait");
      img.alt = "Portrait of " + name;
      var step = 0;
      img.src = steps[0];
      img.addEventListener("error", function () {
        step += 1;
        if (step < steps.length) img.src = steps[step];
        else img.replaceWith(el("span", "portrait portrait-letter", letter));
      });
      return img;
    }

    function infoCard(item) {
      var card = el("div", "card");
      card.hidden = true;
      var contact = contacts[item.ident] || {};
      card.appendChild(cardFace(item.name, item.photo, contact.id));
      var copy = el("div", "card-copy");
      copy.appendChild(el("h3", "card-name", item.name));
      var seat = seatText(item, contact);
      if (seat) copy.appendChild(el("p", "", seat));
      var wrote = false;
      function addLine(node) {
        var row = el("p", "");
        row.appendChild(node);
        copy.appendChild(row);
        wrote = true;
      }
      if (contact.phone) {
        var phone = document.createDocumentFragment();
        phone.appendChild(document.createTextNode("Phone "));
        var tel = el("a", "", contact.phone);
        tel.href = "tel:" + contact.phone.replace(/[^\d+]/g, "");
        phone.appendChild(tel);
        addLine(phone);
      }
      if (contact.room) addLine(document.createTextNode(contact.room));
      var officeUrl = contact.url || "";
      var sites = document.createDocumentFragment();
      var siteCount = 0;
      if (officeUrl.indexOf("https://") === 0) {
        var office = el("a", "", host(officeUrl));
        office.href = officeUrl;
        sites.appendChild(office);
        siteCount += 1;
      }
      if (contact.form && contact.form.indexOf("https://") === 0) {
        if (siteCount) sites.appendChild(document.createTextNode(" · "));
        var form = el("a", "", "Contact form");
        form.href = contact.form;
        sites.appendChild(form);
        siteCount += 1;
      }
      if (siteCount) addLine(sites);
      var campaign = item.source || "";
      if (campaign.indexOf("https://") === 0 && campaign.replace(/\/$/, "") !== officeUrl.replace(/\/$/, "")) {
        var site = el("a", "", host(campaign));
        site.href = campaign;
        addLine(site);
      }
      var seenAccounts = {};
      (item.accounts || []).forEach(function (account) {
        if (!account || !account.url || account.url.indexOf("https://") !== 0) return;
        var handle = account.handle || "";
        if (/^\d+$/.test(handle)) return;
        if (seenAccounts[account.url]) return;
        seenAccounts[account.url] = true;
        var net = NET[account.net] || "Site";
        var label = net;
        if (handle && !(account.net === "youtube" && /^UC[\w-]{20,}$/.test(handle))) label += " · " + handle;
        var link = el("a", "", label);
        link.href = account.url;
        addLine(link);
      });
      if (!wrote && !contact.phone && !contact.room && !officeUrl) copy.appendChild(el("p", "", "No phone or website is on file for this name."));
      card.appendChild(copy);
      return card;
    }

    function nameButton(name, card) {
      var button = el("button", "name", name);
      button.type = "button";
      button.setAttribute("aria-expanded", "false");
      button.addEventListener("click", function () {
        card.hidden = !card.hidden;
        button.setAttribute("aria-expanded", card.hidden ? "false" : "true");
      });
      return button;
    }

    function addItem(meta, node) {
      var day = dayKey(meta.at);
      var time = when(meta.at);
      if (!day || !time) return;
      items.push({
        time: time,
        day: day,
        id: meta.id,
        ident: meta.ident || "",
        name: meta.name,
        kind: meta.kind,
        photo: meta.photo || "",
        party: meta.party || "",
        stateName: meta.stateName || "",
        office: meta.office || "",
        code: meta.code,
        place: meta.place,
        source: meta.source || "",
        accounts: meta.accounts || [],
        node: node
      });
    }

    function addOffice(code, name, rows) {
      (rows || []).forEach(function (row) {
        if (!row || !row.text || !sinceStart(row.at)) return;
        recordCount += 1;
        var stamp = posted(row.at);
        var label = (row.source || name) + (stamp ? " · " + stamp : "");
        addItem({
          at: row.at,
          id: code,
          name: name,
          kind: "gov",
          code: "us",
          place: "United States"
        }, recordBubble("gov", label, row.text, row.url));
      });
    }

    addOffice("WH", "White House", (official && official.whitehouse) || []);
    addOffice("HF", "House floor", (official && official.floor) || []);

    states.forEach(function (state) {
      state.people.forEach(function (person) {
        var ident = state.code + "|" + personKey(person.name);
        var bucket = buckets[ident] || {};
        var detail = person.partyLabel || "";
        if (person.office) detail += (detail ? " · " : "") + person.office;
        var place = state.name || state.code;
        if (detail) place += " · " + detail;
        var meta = {
          id: ident,
          ident: ident,
          name: person.name,
          kind: "person",
          photo: person.photo || "",
          party: person.partyLabel || "",
          stateName: state.name || state.code,
          office: person.office || "",
          code: state.code,
          place: place,
          source: person.source || "",
          accounts: bucket.accounts || []
        };
        (bucket.posts || []).forEach(function (post) {
          if (!post || !post.text || !post.url || post.url.indexOf("https://") !== 0 || !sinceStart(post.at)) return;
          postCount += 1;
          var stamp = posted(post.at);
          var label = (NET[post.net] || "Post") + (stamp ? " · " + stamp : "");
          addItem(Object.assign({ at: post.at }, meta), recordBubble("", label, post.text, post.url, post.context));
        });
        (records[ident] || []).forEach(function (row) {
          if (!row || !row.text || !sinceStart(row.at)) return;
          recordCount += 1;
          var stamp = posted(row.at);
          if (row.time) stamp = (stamp ? stamp + ", " : "") + row.time + " ET";
          var label = (row.source || "Roll call") + (stamp ? " · " + stamp : "");
          addItem(Object.assign({ at: row.at }, meta), recordBubble("", label, row.text, row.url));
        });
      });
    });

    items.sort(function (a, b) { return b.time - a.time; });

    var painted = [];
    var cluster = null;
    var lastDay = "";
    var lastId = "";

    function officeFace(item) {
      if (item.id !== "WH") return el("div", "letter", (item.name || "?").charAt(0));
      var img = el("img", "face wh");
      img.alt = "";
      img.src = "photos/white-house.jpg";
      img.addEventListener("error", function () {
        img.replaceWith(el("div", "letter", "W"));
      });
      return img;
    }

    function startCluster(item, parent) {
      var block = el("div", "cluster");
      var avatar = item.kind === "gov" ? officeFace(item) : face({ name: item.name, photo: item.photo });
      block.appendChild(avatar);
      var body = el("div");
      var who = el("p", item.kind === "gov" ? "who gov" : "who");
      var card = null;
      if (item.kind === "gov") who.appendChild(document.createTextNode(item.name));
      else {
        card = infoCard(item);
        who.appendChild(nameButton(item.name, card));
      }
      who.appendChild(placeLine(item.code, item.place));
      body.appendChild(who);
      if (card) body.appendChild(card);
      block.appendChild(body);
      var handles = (item.accounts || []).map(function (account) {
        return account && account.net && account.handle ? account.net + ":" + String(account.handle).toLowerCase() : "";
      }).filter(Boolean);
      if (handles.length) block.setAttribute("data-handles", handles.join(" "));
      parent.appendChild(block);
      return { who: who, body: body, messages: [], name: item.name, kind: item.kind };
    }

    var dayBlock = null;
    items.forEach(function (item) {
      if (item.day !== lastDay) {
        if (cluster) painted.push(cluster);
        dayBlock = el("section", "day-block");
        dayBlock.setAttribute("data-day", item.day);
        dayBlock.hidden = true;
        if (item.day === todayKey()) dayBlock.classList.add("is-today");
        var chip = el("h2", "day");
        chip.appendChild(el("span", "", item.day === todayKey() ? "Today" : dayLabel(item.day)));
        dayBlock.appendChild(chip);
        log.appendChild(dayBlock);
        lastDay = item.day;
        lastId = "";
        cluster = null;
      }
      if (!cluster || item.id !== lastId) {
        if (cluster) painted.push(cluster);
        cluster = startCluster(item, dayBlock);
        lastId = item.id;
      }
      cluster.body.appendChild(item.node);
      cluster.messages.push(item.node);
    });
    if (cluster) painted.push(cluster);
    painted.forEach(function (group) {
      if (group.kind !== "gov") paintPerson(group.who, group.messages, group.name);
    });

    var today = todayKey();
    Array.prototype.forEach.call(log.querySelectorAll(".day-block"), function (block) {
      if (!picker) return;
      var key = block.getAttribute("data-day");
      var count = block.querySelectorAll(".bubble").length;
      var button = el("button", key === today ? "is-today" : "");
      button.type = "button";
      button.setAttribute("data-day", key);
      button.setAttribute("aria-pressed", "false");
      button.appendChild(el("strong", "", key === today ? "Today" : dayLabel(key)));
      button.appendChild(el("span", "", (key === today ? dayLabel(key) + " · " : "") + count + (count === 1 ? " message" : " messages")));
      button.addEventListener("click", function () {
        if (findBox) findBox.value = "";
        Array.prototype.forEach.call(log.querySelectorAll(".cluster, .bubble"), function (node) { node.hidden = false; });
        showDay(key);
        if (findNote) {
          findNote.hidden = true;
          findNote.textContent = "";
        }
      });
      picker.appendChild(button);
    });
    var hash = (location.hash || "").replace(/^#/, "");
    var hashed = hash && document.getElementById(hash);
    var hashedDay = hashed && hashed.closest(".day-block");
    if (hashedDay) chosen = hashedDay.getAttribute("data-day");
    else if (!chosen || !log.querySelector('.day-block[data-day="' + chosen + '"]')) {
      chosen = log.querySelector('.day-block[data-day="' + today + '"]') ? today : ((log.querySelector(".day-block") || {}).getAttribute ? log.querySelector(".day-block").getAttribute("data-day") : "");
    }

    status.textContent = "Since November 3, 2026. " + postCount + " posts. " + recordCount + " official records. Checked " + posted(new Date().toISOString()) + ".";
    typing.hidden = true;
    applyFind(findBox ? findBox.value : "");
    openHash();
  }

  function fold(text) {
    return (text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/['’.]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function matches(text, tokens) {
    var hay = fold(text);
    return tokens.every(function (token) { return hay.indexOf(token) !== -1; });
  }

  function applyFind(query) {
    var tokens = fold(query).split(" ").filter(Boolean);
    var blocks = log.querySelectorAll(".day-block");
    if (!tokens.length) {
      Array.prototype.forEach.call(log.querySelectorAll(".cluster, .bubble"), function (node) { node.hidden = false; });
      showDay(chosen);
      if (findNote) {
        findNote.hidden = true;
        findNote.textContent = "";
      }
      return;
    }
    var visible = 0;
    Array.prototype.forEach.call(blocks, function (block) {
      var any = false;
      block.querySelectorAll(".cluster").forEach(function (node) {
        var who = node.querySelector(".who");
        var named = matches(who ? who.textContent : "", tokens);
        var clusterAny = false;
        node.querySelectorAll(".bubble").forEach(function (bubble) {
          var show = named || matches(bubble.textContent, tokens);
          bubble.hidden = !show;
          if (show) {
            clusterAny = true;
            visible += 1;
          }
        });
        node.hidden = !clusterAny;
        if (clusterAny) any = true;
      });
      block.hidden = !any;
      if (picker) {
        var button = picker.querySelector('[data-day="' + block.getAttribute("data-day") + '"]');
        if (button) {
          button.classList.toggle("is-on", any);
          button.setAttribute("aria-pressed", any ? "true" : "false");
        }
      }
    });
    if (!findNote) return;
    if (!tokens.length) {
      findNote.hidden = true;
      findNote.textContent = "";
      return;
    }
    findNote.hidden = false;
    findNote.textContent = visible ? (visible === 1 ? "1 message matches." : visible + " messages match.") : "No message matches.";
  }

  function openHash() {
    var hash = (location.hash || "").replace(/^#/, "");
    if (!hash) return;
    var target = document.getElementById(hash);
    if (!target) return;
    var previous = log.querySelector(".is-target");
    if (previous) previous.classList.remove("is-target");
    target.classList.add("is-target");
    target.hidden = false;
    var cluster = target.closest(".cluster");
    if (cluster) cluster.hidden = false;
    var block = target.closest(".day-block");
    if (block) showDay(block.getAttribute("data-day"));
    target.scrollIntoView({ block: "center" });
  }

  function readJson(url) {
    var fresh = url + (url.indexOf("?") === -1 ? "?" : "&") + "t=" + Math.floor(Date.now() / 60000);
    return fetch(fresh, { cache: "reload" }).then(function (response) {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    });
  }

  function readJsonRetry(url) {
    return readJson(url).catch(function () { return readJson(url); }).catch(function () { return {}; });
  }

  function pull() {
    if (!seen.ready) status.textContent = "Checking for records since November 3.";
    Promise.all([
      readJsonRetry("chat/messages.json"),
      readJsonRetry("chat/posts.json"),
      readJsonRetry("chat/official.json"),
      readJsonRetry("chat/contacts.json")
    ]).then(function (files) {
      var postsStamp = files[1].updated || "";
      var officialStamp = files[2].updated || "";
      if (!seen.ready || postsStamp !== seen.posts || officialStamp !== seen.official) {
        seen.ready = true;
        seen.posts = postsStamp;
        seen.official = officialStamp;
        try {
          render(files[0], files[1], files[2], files[3]);
        } catch (error) {
          typing.hidden = true;
          status.textContent = error && error.message ? error.message : "The Group Chat file did not load.";
        }
      } else if (status.textContent) {
        status.textContent = status.textContent.replace(/ Checked.*$/, "") + " Checked " + posted(new Date().toISOString()) + ".";
      }
    }).catch(function () {
      typing.hidden = true;
      if (!seen.ready) status.textContent = "The Group Chat file did not load.";
    });
  }

  var findForm = document.getElementById("chat-find");
  if (findBox) findBox.addEventListener("input", function () { applyFind(findBox.value); });
  if (findForm) findForm.addEventListener("submit", function (event) {
    event.preventDefault();
    applyFind(findBox ? findBox.value : "");
  });

  pull();
  setInterval(pull, 60000);
})();
