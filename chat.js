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
  var manualDay = "";
  var manualOn = "";
  var openDay = "";

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
    var root = document.documentElement;
    return /dark$/.test(root.getAttribute("data-theme") || "") || root.classList.contains("theme-mix-dark");
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
    var accent = tone[0];
    if (darkNow()) {
      var hue = hueOf(tone[0]);
      accent = fromHue(hue[0], Math.max(hue[1], 0.42), 0.74);
    }
    var cluster = who.parentElement;
    if (cluster) cluster.style.setProperty("--voice", accent);
    var button = who.querySelector(".name");
    if (button) button.style.color = accent;
    else who.style.color = accent;
    var title = cluster && cluster.querySelector(".card-name");
    if (title) title.style.color = accent;
    var card = cluster && cluster.querySelector(".card");
    if (card) {
      card.style.background = "";
      card.style.boxShadow = "";
    }
    messages.forEach(function (message) {
      message.style.background = "";
      message.style.color = "";
      message.style.boxShadow = "";
      var link = message.querySelector(".net");
      if (link) link.style.color = "";
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
    attributeFilter: ["data-theme", "class"]
  });
  function messageId(value) {
    var n = 0;
    var text = value || "";
    for (var i = 0; i < text.length; i++) n = (n * 33 + text.charCodeAt(i)) >>> 0;
    return "c" + n.toString(16);
  }

  function domainName(value) {
    return /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(value || "");
  }

  function readMention(text, at, net) {
    var body = text.slice(at + 1);
    var token;
    if (net === "mastodon") {
      var full = body.match(/^([A-Za-z0-9_]{1,30})@([A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+)/);
      if (full && domainName(full[2])) return { handle: full[1] + "@" + full[2], length: full[0].length };
      token = body.match(/^[A-Za-z0-9_]{1,30}/);
      if (!token || (body.length > token[0].length && /[A-Za-z0-9_@.]/.test(body.charAt(token[0].length)))) return null;
      return { handle: token[0], length: token[0].length };
    }
    if (net === "bluesky") {
      token = body.match(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+/);
      if (!token || !domainName(token[0])) return null;
      return { handle: token[0], length: token[0].length };
    }
    if (net === "x" || net === "truth") {
      token = body.match(/^[A-Za-z0-9_]+/);
      if (!token || token[0].length > (net === "x" ? 15 : 30)) return null;
      return { handle: token[0], length: token[0].length };
    }
    return null;
  }

  function profileUrl(net, handle, poster) {
    if (net === "x") return "https://x.com/" + handle;
    if (net === "bluesky") return "https://bsky.app/profile/" + handle;
    if (net === "truth") return "https://truthsocial.com/@" + handle;
    if (net === "mastodon") {
      var user = handle;
      var host = "";
      var split = handle.indexOf("@");
      if (split !== -1) {
        user = handle.slice(0, split);
        host = handle.slice(split + 1);
      } else if (poster && poster.indexOf("@") !== -1) {
        host = poster.slice(poster.indexOf("@") + 1);
      }
      if (user && domainName(host)) return "https://" + host + "/@" + user;
    }
    return "";
  }

  function appendMessage(parent, text, net, poster) {
    var source = text || "";
    var i = 0;
    while (i < source.length) {
      var at = source.indexOf("@", i);
      if (at === -1) {
        parent.appendChild(document.createTextNode(source.slice(i)));
        return;
      }
      var before = at > 0 ? source.charAt(at - 1) : "";
      var mention = !before || !/[A-Za-z0-9/]/.test(before) ? readMention(source, at, net) : null;
      var url = mention ? profileUrl(net, mention.handle, poster) : "";
      if (!mention || !url) {
        parent.appendChild(document.createTextNode(source.slice(i, at + 1)));
        i = at + 1;
        continue;
      }
      if (at > i) parent.appendChild(document.createTextNode(source.slice(i, at)));
      parent.appendChild(mentionLink(net, "@" + mention.handle, url));
      i = at + 1 + mention.length;
    }
  }

  function ownRetweet(text, handle) {
    if (!text || !handle) return text || "";
    var escaped = String(handle).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return text.replace(new RegExp("^RT\\s+@" + escaped + "\\s*:\\s*", "i"), "");
  }

  function recordBubble(kind, label, text, url, context, net, poster, counts) {
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
      var who = mentionLink(context.net, context.name || context.handle || "", context.profile || "");
      who.className = "context-name";
      quote.appendChild(who);
      if (context.text) {
        var quoted = el("span", "context-text");
        appendMessage(quoted, ownRetweet(context.text, context.handle), context.net, context.handle);
        quote.appendChild(quoted);
      }
      bubble.appendChild(quote);
    }
    appendMessage(bubble, ownRetweet(text, poster), net, poster);
    appendStats(bubble, counts);
    return bubble;
  }

  function statIcon(kind) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.8");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    if (kind === "replies") path.setAttribute("d", "M5 16.5V19l3.4-2.5H18a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6.5a2 2 0 0 0 2 2z");
    else if (kind === "reposts") path.setAttribute("d", "M7 7h10.2M14.2 4.2 17.2 7l-3 2.8M17 17H6.8M9.8 19.8 6.8 17l3-2.8");
    else if (kind === "likes") path.setAttribute("d", "M12 19.2 10.9 18C6.4 14 4 11.7 4 8.8 4 6.5 5.8 4.8 8 4.8c1.3 0 2.5.6 3.2 1.6.7-1 1.9-1.6 3.2-1.6 2.2 0 4 1.7 4 4 0 2.9-2.4 5.2-6.9 9.2z");
    else path.setAttribute("d", "M4 19V11M9 19V7M14 19V4M19 19v-6");
    svg.appendChild(path);
    return svg;
  }

  function appendStats(parent, counts) {
    if (!counts) return;
    var words = [
      ["replies", "reply", "replies"],
      ["reposts", "repost", "reposts"],
      ["likes", "like", "likes"],
      ["views", "view", "views"]
    ];
    var row = el("span", "stats");
    words.forEach(function (item) {
      var number = Number(counts[item[0]]);
      if (!isFinite(number) || number < 0) return;
      var shown = Math.round(number).toLocaleString("en-US");
      var stat = el("span", "stat stat-" + item[0]);
      stat.setAttribute("title", shown + " " + (number === 1 ? item[1] : item[2]));
      stat.setAttribute("aria-label", shown + " " + (number === 1 ? item[1] : item[2]));
      stat.appendChild(statIcon(item[0]));
      stat.appendChild(el("span", "stat-n", shown));
      row.appendChild(stat);
    });
    if (row.childNodes.length) parent.appendChild(row);
  }

  function networkMark(net) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "mark");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", "currentColor");
    if (net === "x") path.setAttribute("d", "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z");
    else if (net === "bluesky") path.setAttribute("d", "M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.038.415-.054-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498.142-6.498-.138-.016-.277-.034-.415-.056.14.016.279.034.415.054 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z");
    else if (net === "mastodon") path.setAttribute("d", "M12 2.2c2.8 0 5.1 1.8 5.1 5.1v4.2c0 1.9-1.1 2.8-2.8 2.8-1.1 0-1.9-.5-2.3-1.2-.4.7-1.2 1.2-2.3 1.2-1.7 0-2.8-.9-2.8-2.8V7.3c0-3.3 2.3-5.1 5.1-5.1zm-2 3.6v3.4c0 .6.4 1 1 1s1-.4 1-1V5.8h-2zm4 0v3.4c0 .6.4 1 1 1s1-.4 1-1V5.8h-2z");
    else if (net === "truth") path.setAttribute("d", "M4 3.5h16v4h-6v13h-4v-13H4z");
    else return document.createDocumentFragment();
    svg.appendChild(path);
    return svg;
  }

  function mentionLink(net, label, url) {
    var node = url && url.indexOf("https://") === 0 ? document.createElement("a") : document.createElement("span");
    node.className = "mention";
    if (node.tagName === "A") {
      node.href = url;
      node.target = "_blank";
      node.rel = "noopener";
    }
    var mark = networkMark(net);
    if (mark.tagName) node.appendChild(mark);
    node.appendChild(document.createTextNode(label));
    return node;
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

    function partyTone(label) {
      var word = (label || "").toLowerCase();
      if (word.indexOf("democrat") === 0) return "d";
      if (word.indexOf("republican") === 0) return "r";
      if (word.indexOf("independent") === 0 || word.indexOf("libertarian") === 0) return "i";
      return "o";
    }

    function placeText(item, contact) {
      var state = item.stateName || "";
      var seat = "";
      if (contact.chamber === "senate") seat = state ? "Senator, " + state : "Senator";
      else if (contact.chamber === "house" && typeof contact.district === "number") {
        var district = contact.district === 0 ? "At large" : ordinal(contact.district) + " District";
        seat = state ? state + ", " + district : district;
      } else if (item.office) seat = item.office;
      return [seat, contact.leadership || ""].filter(Boolean).join(" · ");
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
      var contact = contacts[item.ident] || {};
      var card = el("div", "card card-" + partyTone(item.party));
      card.hidden = true;
      card.appendChild(cardFace(item.name, item.photo, contact.id));
      var copy = el("div", "card-copy");
      copy.appendChild(el("h3", "card-name", item.name));
      var place = placeText(item, contact);
      if (item.party || place) {
        var seat = el("p", "card-seat");
        if (item.party) seat.appendChild(el("span", "card-party", item.party));
        if (place) seat.appendChild(document.createTextNode(place));
        copy.appendChild(seat);
      }
      var wrote = false;
      function addLine(className, node) {
        var row = el("p", className);
        row.appendChild(node);
        copy.appendChild(row);
        wrote = true;
      }
      function marked(href, markName, label, aria) {
        var anchor = el("a", "");
        anchor.href = href;
        if (window.leadersMark) anchor.appendChild(leadersMark(markName));
        if (label) anchor.appendChild(el("span", "mark-label", label));
        if (aria) anchor.setAttribute("aria-label", aria);
        return anchor;
      }
      if (contact.phone) {
        addLine("card-phone", marked("tel:" + contact.phone.replace(/[^\d+]/g, ""), "phone", contact.phone, "Phone " + contact.phone));
      }
      if (contact.room) {
        var room = document.createDocumentFragment();
        if (window.leadersMark) room.appendChild(leadersMark("office"));
        room.appendChild(el("span", "", contact.room));
        addLine("card-room", room);
      }
      var officeUrl = contact.url || "";
      var sites = document.createDocumentFragment();
      var siteCount = 0;
      if (officeUrl.indexOf("https://") === 0) {
        sites.appendChild(marked(officeUrl, "gov", host(officeUrl), "Official website " + host(officeUrl)));
        siteCount += 1;
      }
      if (contact.form && contact.form.indexOf("https://") === 0) {
        sites.appendChild(marked(contact.form, "form", "", "Contact form"));
        siteCount += 1;
      }
      if (siteCount) addLine("card-gov", sites);
      var campaign = item.source || "";
      if (campaign.indexOf("https://") === 0 && campaign.replace(/\/$/, "") !== officeUrl.replace(/\/$/, "")) {
        addLine("card-camp", marked(campaign, "campaign", host(campaign), "Campaign website " + host(campaign)));
      }
      var seenAccounts = {};
      (item.accounts || []).forEach(function (account) {
        if (!account || !account.url || account.url.indexOf("https://") !== 0) return;
        var handle = account.handle || "";
        if (/^\d+$/.test(handle)) return;
        if (seenAccounts[account.url]) return;
        seenAccounts[account.url] = true;
        var net = NET[account.net] || "Site";
        var showHandle = handle && !(account.net === "youtube" && /^UC[\w-]{20,}$/.test(handle));
        addLine("card-social", marked(account.url, account.net, showHandle ? handle : "", net + (showHandle ? " " + handle : "")));
      });
      if (!wrote && !contact.phone && !contact.room && !officeUrl) copy.appendChild(el("p", "card-note", "No phone or website is on file for this name."));
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
          addItem(Object.assign({ at: post.at }, meta), recordBubble("", label, post.text, post.url, post.context, post.net, post.handle, post.counts));
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
    if (!log.querySelector('.day-block[data-day="' + today + '"]')) {
      var todayBlock = el("section", "day-block is-today");
      todayBlock.setAttribute("data-day", today);
      todayBlock.hidden = true;
      var todayChip = el("h2", "day");
      todayChip.appendChild(el("span", "", "Today"));
      todayBlock.appendChild(todayChip);
      todayBlock.appendChild(el("p", "empty-day", "No messages yet today."));
      log.insertBefore(todayBlock, log.firstChild);
    }
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
        manualDay = key;
        manualOn = todayKey();
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
    if (manualDay && manualOn === today && log.querySelector('.day-block[data-day="' + manualDay + '"]')) chosen = manualDay;
    else if (hashedDay) chosen = hashedDay.getAttribute("data-day");
    else chosen = today;
    openDay = today;

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
    var rolled = openDay && todayKey() !== openDay;
    if (!seen.ready) status.textContent = "Checking for records since November 3.";
    Promise.all([
      readJsonRetry("chat/messages.json"),
      readJsonRetry("chat/posts.json"),
      readJsonRetry("chat/official.json"),
      readJsonRetry("chat/contacts.json")
    ]).then(function (files) {
      var postsStamp = files[1].updated || "";
      var officialStamp = files[2].updated || "";
      if (!seen.ready || postsStamp !== seen.posts || officialStamp !== seen.official || rolled) {
        var place = null;
        if (seen.ready && window.scrollY > 280) {
          var bubbles = log.querySelectorAll(".bubble");
          for (var i = 0; i < bubbles.length; i++) {
            var rect = bubbles[i].getBoundingClientRect();
            if (rect.bottom > 90) {
              place = { id: bubbles[i].id, top: rect.top };
              break;
            }
          }
        }
        seen.ready = true;
        seen.posts = postsStamp;
        seen.official = officialStamp;
        try {
          render(files[0], files[1], files[2], files[3]);
          if (place && place.id) {
            var kept = document.getElementById(place.id);
            if (kept) window.scrollBy(0, kept.getBoundingClientRect().top - place.top);
          }
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
