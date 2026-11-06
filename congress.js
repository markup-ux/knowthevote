(function () {
  var KEY = "DEMO_KEY";
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var STATES = {
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
    CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia",
    HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky",
    LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
    MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
    NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
    OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
    SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
    WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", AS: "American Samoa",
    GU: "Guam", MP: "Northern Mariana Islands", PR: "Puerto Rico", VI: "U.S. Virgin Islands"
  };
  var BILL_PATTERNS = [
    ["HJRES", /^H\s*J\s*RES\s+(\d+)/],
    ["HCONRES", /^H\s*CON\s*RES\s+(\d+)/],
    ["HRES", /^H\s*RES\s+(\d+)/],
    ["HR", /^H\s*R\s+(\d+)/],
    ["SJRES", /^S\s*J\s*RES\s+(\d+)/],
    ["SCONRES", /^S\s*CON\s*RES\s+(\d+)/],
    ["SRES", /^S\s*RES\s+(\d+)/],
    ["S", /^S\s+(\d+)/]
  ];
  var TYPE_LABEL = {
    "YEA-AND-NAY": "Yea-and-nay",
    "2/3 YEA-AND-NAY": "Two-thirds yea-and-nay",
    "RECORDED VOTE": "Recorded vote",
    "2/3 RECORDED VOTE": "Two-thirds recorded vote",
    "QUORUM": "Quorum"
  };
  var data = null;
  var summaries = {};
  var wordCounts = {};
  var queryCacheRaw = null;
  var queryCache = "";
  var spellNote = "";
  var memberIndex = {};
  var selected = "";
  var pinned = "";
  var party = "all";
  var stateCode = "all";
  var voteSide = "all";
  var senateSide = "all";
  var selectedSenate = "";
  var appliedQuery = "";
  var checking = false;
  var mapSlot = document.createElement("div");
  var mapReady = false;
  mapSlot.id = "congress-map-slot";

  function formatDate(iso) {
    var match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    if (!match) return iso || "";
    return MONTHS[+match[2] - 1] + " " + (+match[3]) + ", " + match[1];
  }

  function formatTime(value) {
    var match = /^(\d{1,2}):(\d{2})/.exec(value || "");
    if (!match) return "";
    var hour = +match[1];
    var suffix = hour >= 12 ? "p.m." : "a.m.";
    var shown = hour % 12;
    if (!shown) shown = 12;
    return shown + ":" + match[2] + " " + suffix + " Eastern";
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

  function partyWord(code) {
    if (code === "D") return "Democratic";
    if (code === "R") return "Republican";
    if (code === "I") return "Independent";
    if (code === "L") return "Libertarian";
    return "Another party";
  }

  function partyClass(code) {
    if (code === "D") return "party-d";
    if (code === "R") return "party-r";
    if (code === "I" || code === "L") return "party-i";
    return "party-o";
  }

  function voteWord(code) {
    if (code === "Y") return "Yes";
    if (code === "N") return "No";
    if (code === "P") return "Present";
    if (code === "X") return "Did not vote";
    if (code === "?") return "Other";
    return "Not on this roll call";
  }

  function voteCode(raw) {
    var word = (raw || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (word === "aye" || word === "yea" || word === "yes") return "Y";
    if (word === "no" || word === "nay") return "N";
    if (word.indexOf("present") === 0) return "P";
    if (word === "not voting" || word === "absent") return "X";
    return "?";
  }

  function billKey(raw) {
    var text = (raw || "").toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    for (var i = 0; i < BILL_PATTERNS.length; i++) {
      var match = BILL_PATTERNS[i][1].exec(text);
      if (match) return BILL_PATTERNS[i][0] + match[1];
    }
    return "";
  }

  function summaryFor(legis) {
    var key = billKey(legis);
    return key && summaries[key] ? summaries[key] : null;
  }

  function summaryBlob(legis) {
    var item = summaryFor(legis);
    return item && item.blob ? item.blob : "";
  }

  function indexSummaries() {
    Object.keys(summaries).forEach(function (key) {
      var item = summaries[key];
      var names = (item.sponsors || []).map(function (sponsor) { return sponsor.name || ""; }).join(" ");
      item.blob = [(item.paragraphs || []).join(" "), item.title || "", item.senate || "", item.status || "", item.legis || "", names].join(" ").toLowerCase();
    });
  }

  function sponsorMember(sponsor) {
    var known = memberById(sponsor.id);
    var district = sponsor.district == null || sponsor.district === "" ? null : sponsor.district;
    var fallback = [
      sponsor.id,
      sponsor.name || sponsor.id,
      sponsor.party || "",
      sponsor.state || "",
      district,
      sponsor.chamber || "house",
      sponsor.phone || "",
      sponsor.office || "",
      sponsor.url || "",
      sponsor.contact || "",
      "",
      "",
      null
    ];
    if (known && (known[6] || known[8] || known[9])) return known;
    if (!known) return fallback;
    var merged = known.slice();
    [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(function (index) {
      if (merged[index] == null || merged[index] === "") merged[index] = fallback[index];
    });
    return merged;
  }

  function sponsorNames(sponsors) {
    var names = sponsors.map(function (sponsor) {
      var known = memberById(sponsor.id);
      return known && known[1] ? known[1] : (sponsor.name || "A member");
    });
    if (names.length === 1) return names[0];
    if (names.length === 2) return names[0] + " and " + names[1];
    return names.slice(0, -1).join(", ") + ", and " + names[names.length - 1];
  }

  function sponsorLine(legis) {
    var item = summaryFor(legis);
    var sponsors = item && item.sponsors;
    if (!sponsors || !sponsors.length) return "";
    var byRequest = sponsors.some(function (sponsor) { return sponsor.byRequest; });
    return (byRequest ? "Introduced by request by " : "Introduced by ") + sponsorNames(sponsors) + ".";
  }

  function sponsorBlock(item) {
    var sponsors = item && item.sponsors;
    if (!sponsors || !sponsors.length) return null;
    var box = el("div", "sponsors");
    var byRequest = sponsors.some(function (sponsor) { return sponsor.byRequest; });
    box.appendChild(el("h3", "", byRequest ? "Introduced by request" : "Introduced by"));
    sponsors.forEach(function (sponsor) {
      var card = contactBlock(sponsorMember(sponsor));
      if (!sponsor.current && (sponsor.phone || sponsor.office || sponsor.url)) {
        card.querySelector(".person-copy").appendChild(el("p", "sub", "Last office on file."));
      }
      box.appendChild(card);
    });
    return box;
  }

  function appendStatus(wrap, item) {
    if (!item) return;
    if (item.senate) wrap.appendChild(el("p", "", item.senate));
    if (item.status) {
      var line = "Latest action";
      if (item.statusDate) line += ", " + formatDate(item.statusDate);
      wrap.appendChild(el("p", "", line + ": " + item.status));
    }
    if (item.pending) wrap.appendChild(el("p", "", "The Clerk's roll calls do not include a vote on this bill."));
  }

  function appendSponsors(wrap, item) {
    if (!item) return;
    var people = sponsorBlock(item);
    if (people) {
      wrap.appendChild(people);
      return;
    }
    if (item.sponsors == null) {
      wrap.appendChild(el("p", "sub", "The bill status file did not include a sponsor."));
      return;
    }
    wrap.appendChild(el("p", "", "Congress did not list an individual sponsor for this measure."));
  }

  function textUrl(bill) {
    return bill ? bill.replace(/\/$/, "") + "/text" : "";
  }

  function textLabel(legis) {
    var key = billKey(legis);
    if (key.indexOf("RES") >= 0) return "View the resolution";
    return "View the act";
  }

  function firstSentence(text, limit) {
    if (!text || text.length <= limit) return text || "";
    var slice = text.slice(0, limit);
    var end = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("? "), slice.lastIndexOf("! "));
    if (end > 80) return slice.slice(0, end + 1);
    var space = slice.lastIndexOf(" ");
    if (space > 80) return slice.slice(0, space) + "…";
    return slice + "…";
  }

  function actSentence(legis) {
    var item = summaryFor(legis);
    if (!item || !item.paragraphs || !item.paragraphs.length) return "";
    return firstSentence(item.paragraphs[0], 240);
  }

  function actBlock(legis, bill) {
    if (!legis && !bill) return null;
    var wrap = el("div", "act-note");
    var item = summaryFor(legis);
    var url = textUrl(bill);
    if (!item || !item.paragraphs || !item.paragraphs.length) {
      wrap.appendChild(el("p", "", "The Congressional Research Service has not published a summary of this measure."));
      if (url) {
        var only = el("p", "");
        only.appendChild(link(url, textLabel(legis)));
        wrap.appendChild(only);
      }
      appendStatus(wrap, item);
      appendSponsors(wrap, item);
      return wrap;
    }
    var paragraphs = item.paragraphs;
    var needsMore = paragraphs[0].length > 420 || paragraphs.length > 1;
    var shortNode = el("p", "act-short", needsMore ? firstSentence(paragraphs[0], 420) : paragraphs[0]);
    wrap.appendChild(shortNode);
    var more = null;
    if (needsMore) {
      more = el("div", "act-more");
      more.hidden = true;
      paragraphs.forEach(function (paragraph) { more.appendChild(el("p", "", paragraph)); });
      wrap.appendChild(more);
    }
    var actions = el("p", "");
    if (needsMore) {
      var button = el("button", "linkish", "Read the full summary");
      button.type = "button";
      button.setAttribute("aria-expanded", "false");
      button.addEventListener("click", function () {
        var opening = more.hidden;
        more.hidden = !opening;
        shortNode.hidden = opening;
        button.setAttribute("aria-expanded", opening ? "true" : "false");
        button.textContent = opening ? "Show the short summary" : "Read the full summary";
      });
      actions.appendChild(button);
    }
    if (url) {
      if (actions.childNodes.length) actions.appendChild(document.createTextNode(" · "));
      actions.appendChild(link(url, textLabel(legis)));
    }
    if (actions.childNodes.length) wrap.appendChild(actions);
    var credit = item.source === "title"
      ? "This is the bill's official title. The Congressional Research Service has not published a summary"
      : "Congressional Research Service";
    if (item.source !== "title" && item.asOf) credit += ". " + item.asOf;
    if (item.source !== "title" && item.date) credit += ", " + formatDate(item.date);
    wrap.appendChild(el("p", "sub", credit + "."));
    appendStatus(wrap, item);
    appendSponsors(wrap, item);
    return wrap;
  }

  function mix(from, to, t) {
    function channel(hex, index) { return parseInt(hex.slice(index, index + 2), 16); }
    var parts = [1, 3, 5].map(function (index) {
      return Math.round(channel(from, index) + (channel(to, index) - channel(from, index)) * t).toString(16).padStart(2, "0");
    });
    return "#" + parts.join("");
  }

  function sideColor(side, share) {
    var t = Math.max(0, Math.min(1, (share - 0.5) / 0.5));
    if (side === "Y") return mix("#cfe8d6", "#0e6a38", t);
    if (side === "N") return mix("#f6d0d6", "#8d2344", t);
    return "#c8c0b4";
  }

  function readCast(vote, index, id) {
    if (!vote || vote.cast == null) return "-";
    if (typeof vote.cast === "string") return vote.cast.charAt(index) || "-";
    return vote.cast[id] || "-";
  }

  function host(url) {
    var match = /^https?:\/\/([^/]+)/i.exec(url || "");
    return match ? match[1].replace(/^www\./, "") : url;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function link(url, label) {
    var node = document.createElement("a");
    node.href = url;
    node.target = "_blank";
    node.rel = "noopener";
    node.textContent = label;
    return node;
  }

  function indexMembers() {
    memberIndex = {};
    data.members.forEach(function (member, index) { memberIndex[member[0]] = index; });
  }

  function memberById(id) {
    var index = memberIndex[id];
    return index == null ? null : data.members[index];
  }

  function stateName(code) {
    return STATES[code] || code || "Unknown state";
  }

  function seat(member) {
    if (!member) return "";
    if (member[5] === "senate") {
      var bits = ["Senator", stateName(member[3])];
      if (member[11]) bits.push(member[11]);
      if (member[12]) bits.push("class " + member[12]);
      return bits.join(", ");
    }
    if (member[4] == null) return stateName(member[3]);
    return stateName(member[3]) + ", " + ordinal(member[4]) + " District";
  }

  function passesParty(member) {
    if (party === "all") return true;
    if (party === "other") return member[2] !== "D" && member[2] !== "R";
    return member[2] === party;
  }

  function passesState(member) {
    return stateCode === "all" || member[3] === stateCode;
  }

  function queryText() {
    return appliedQuery;
  }

  function indexWords() {
    wordCounts = {};
    function add(text) {
      var words = String(text || "").toLowerCase().match(/[a-z0-9]{2,}/g) || [];
      words.forEach(function (word) { wordCounts[word] = (wordCounts[word] || 0) + 1; });
    }
    data.votes.forEach(function (vote) {
      add(vote.question);
      add(vote.desc);
      add(vote.legis);
      add(vote.result);
    });
    (data.senateVotes || []).forEach(function (vote) {
      add(vote.question);
      add(vote.desc);
      add(vote.legis);
      add(vote.result);
    });
    data.members.forEach(function (member) { add(member[1]); });
    Object.keys(summaries).forEach(function (key) {
      var item = summaries[key];
      add(item.title);
      add(item.senate);
      add(item.status);
      add(item.legis);
      (item.paragraphs || []).forEach(add);
      (item.sponsors || []).forEach(function (sponsor) { add(sponsor.name); });
    });
  }

  function correctedToken(token) {
    if (wordCounts[token] || token.length < 5) return token;
    var letters = "abcdefghijklmnopqrstuvwxyz";
    var best = "";
    var count = 0;
    function consider(word) {
      var seen = wordCounts[word] || 0;
      if (seen > count) {
        count = seen;
        best = word;
      }
    }
    for (var i = 0; i < token.length; i++) {
      consider(token.slice(0, i) + token.slice(i + 1));
      if (i < token.length - 1) consider(token.slice(0, i) + token.charAt(i + 1) + token.charAt(i) + token.slice(i + 2));
      for (var j = 0; j < letters.length; j++) consider(token.slice(0, i) + letters.charAt(j) + token.slice(i + 1));
    }
    return best || token;
  }

  function interpretedQuery() {
    var raw = queryText();
    if (raw === queryCacheRaw) return queryCache;
    queryCacheRaw = raw;
    spellNote = "";
    var tokens = raw.match(/[a-z0-9]+/g) || [];
    if (!tokens.length) {
      queryCache = "";
      return "";
    }
    var changed = false;
    var next = tokens.map(function (token) {
      var fixed = correctedToken(token);
      if (fixed !== token) changed = true;
      return fixed;
    });
    queryCache = next.join(" ");
    if (changed) spellNote = "Nothing matches \u201c" + raw + ".\u201d Showing results for \u201c" + queryCache + ".\u201d";
    return queryCache;
  }

  function textMatches(text, query) {
    if (!query) return true;
    var hay = String(text || "").toLowerCase();
    return query.split(" ").every(function (token) { return hay.indexOf(token) >= 0; });
  }

  function yearValue() {
    return document.getElementById("congress-year").value;
  }

  function resultValue() {
    return document.getElementById("congress-result").value;
  }

  function voteVisible(vote) {
    if (yearValue() !== "all" && String(vote.year) !== yearValue()) return false;
    var result = resultValue();
    if (result === "other") {
      if (vote.result === "Passed" || vote.result === "Failed" || vote.result === "Agreed to") return false;
    } else if (result !== "all" && vote.result !== result) return false;
    var q = interpretedQuery();
    if (!q) return true;
    var blob = vote.question + " " + vote.desc + " " + vote.legis + " " + vote.result + " " + vote.date + " " + summaryBlob(vote.legis);
    if (textMatches(blob, q)) return true;
    return data.members.some(function (member, index) {
      if (!passesParty(member) || !passesState(member)) return false;
      var code = readCast(vote, index, member[0]);
      if (code === "-" || code === "") return false;
      return textMatches(member[1], q);
    });
  }

  function sortedVotes() {
    return data.votes.slice().sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return b.n - a.n;
    });
  }

  function visibleVotes() {
    return sortedVotes().filter(voteVisible);
  }

  function makeBar(yea, nay, present, notVoting) {
    var bar = el("span", "vote-bar");
    var total = yea + nay + present + notVoting;
    function add(count, color, label) {
      if (!count || !total) return;
      var piece = document.createElement("i");
      piece.style.width = (count / total * 100) + "%";
      piece.style.minWidth = "3px";
      piece.style.background = color;
      piece.title = label;
      bar.appendChild(piece);
    }
    var yn = yea + nay;
    add(yea, sideColor("Y", yn ? yea / yn : 0), yea + " yes");
    add(nay, sideColor("N", yn ? nay / yn : 0), nay + " no");
    add(present, "#3d4f86", present + " present");
    add(notVoting, "#c8c0b4", notVoting + " did not vote");
    if (!total) {
      var empty = document.createElement("i");
      empty.style.width = "100%";
      empty.style.background = "#e6b422";
      bar.appendChild(empty);
    }
    return bar;
  }

  function countLine(vote) {
    var parts = [vote.yea + " yes", vote.nay + " no"];
    if (vote.present) parts.push(vote.present + " present");
    if (vote.notVoting) parts.push(vote.notVoting + " did not vote");
    parts.push(vote.result || "Result not recorded");
    return parts.join(" · ");
  }

  function renderStatus(extra) {
    var votes = data.votes.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var first = votes[0];
    var last = votes[votes.length - 1];
    var line = data.votes.length + " House roll calls";
    if (first && last) line += ", from " + formatDate(first.date) + " through " + formatDate(last.date);
    line += ". The floor list is the week of " + formatDate(data.floor.week) + ".";
    if (extra) line += " " + extra;
    document.getElementById("congress-status").textContent = line;
  }

  function floorVote(item) {
    var key = billKey(item.legis);
    if (!key) return null;
    var found = null;
    data.votes.forEach(function (vote) {
      if (billKey(vote.legis) !== key || vote.date < item.week) return;
      if (!found || vote.date > found.date || (vote.date === found.date && vote.n > found.n)) found = vote;
    });
    return found;
  }

  function renderFloor() {
    var week = data.floor.week;
    var today = new Date();
    var weekDate = new Date(week + "T12:00:00");
    var ahead = weekDate.getTime() > today.getTime();
    var blurb = document.getElementById("floor-blurb");
    blurb.textContent = ahead
      ? "The House published this list for the week of " + formatDate(week) + ". Gold means the item is scheduled and this record has no roll call on or after that Monday. A roll call dated that week replaces the gold bar."
      : "The latest floor list in this copy is the week of " + formatDate(week) + ". That Monday has passed. Gold means no roll call in this record is dated on or after that Monday.";
    if (data.floor.updated) blurb.textContent += " The House file was last updated " + formatDate(data.floor.updated.slice(0, 10)) + ".";
    var list = document.getElementById("floor-list");
    list.innerHTML = "";
    var items = data.floor.items;
    var categories = [];
    items.forEach(function (item) {
      if (categories.indexOf(item.category) < 0) categories.push(item.category);
    });
    categories.forEach(function (category) {
      list.appendChild(el("h3", "", category));
      items.filter(function (item) { return item.category === category; }).forEach(function (item) {
        var vote = floorVote(item);
        var row = el(vote ? "button" : "div", "floor-row" + (vote && vote.id === selected ? " is-on" : ""));
        if (vote) {
          row.type = "button";
          row.setAttribute("data-vote", vote.id);
        }
        var title = item.title || item.legis || "Scheduled item";
        row.appendChild(el("strong", "", title));
        var meta = el("p", "vote-meta");
        if (item.legis) meta.appendChild(document.createTextNode(item.legis + " · "));
        meta.appendChild(document.createTextNode(vote ? "Roll call " + vote.n + " · " + formatDate(vote.date) : "Scheduled"));
        row.appendChild(meta);
        if (vote) row.appendChild(makeBar(vote.yea, vote.nay, vote.present, vote.notVoting));
        else {
          var bar = el("span", "vote-bar");
          var piece = document.createElement("i");
          piece.style.width = "100%";
          piece.style.background = "#e6b422";
          piece.title = "Scheduled";
          bar.appendChild(piece);
          row.appendChild(bar);
        }
        row.appendChild(el("p", "vote-meta", vote ? countLine(vote) : "No roll call on or after " + formatDate(item.week)));
        if (vote) {
          var sentence = actSentence(item.legis);
          if (sentence) row.appendChild(el("p", "act-line", sentence));
          var introduced = sponsorLine(item.legis);
          if (introduced) row.appendChild(el("p", "act-line", introduced));
        } else {
          var note = actBlock(item.legis, item.bill);
          if (note) row.appendChild(note);
          row.appendChild(watchLine(null));
        }
        list.appendChild(row);
      });
    });
  }

  function renderPending() {
    var section = document.getElementById("pending");
    var list = document.getElementById("pending-list");
    if (!section || !list) return;
    list.innerHTML = "";
    var q = interpretedQuery();
    var keys = Object.keys(summaries).filter(function (key) {
      var item = summaries[key];
      if (!item || !item.pending) return false;
      if (!q) return true;
      return textMatches(item.blob || "", q);
    }).sort();
    section.hidden = !keys.length;
    keys.forEach(function (key) {
      var item = summaries[key];
      var block = el("div", "floor-row");
      block.appendChild(el("strong", "", item.title || item.legis || "A bill with no roll call"));
      if (item.legis) block.appendChild(el("p", "vote-meta", item.legis));
      var note = actBlock(item.legis, item.bill);
      if (note) block.appendChild(note);
      list.appendChild(block);
    });
  }

  function rankedVotes() {
    var q = interpretedQuery();
    var votes = visibleVotes();
    if (q) {
      votes.sort(function (a, b) {
        var aDesc = textMatches(a.desc, q) ? (a.desc || "").length : 100000;
        var bDesc = textMatches(b.desc, q) ? (b.desc || "").length : 100000;
        return aDesc - bDesc;
      });
      if (!votes.some(function (vote) { return vote.id === selected; }) && votes[0]) selected = votes[0].id;
    }
    return votes;
  }

  function voteButton(vote) {
    var row = el("button", "vote-row" + (vote.id === selected ? " is-on" : ""));
    row.type = "button";
    row.setAttribute("data-vote", vote.id);
    if (vote.chamber === "senate") row.setAttribute("data-chamber", "senate");
    var when = formatDate(vote.date);
    var clock = formatTime(vote.time);
    if (clock) when += " · " + clock;
    when += " · " + (vote.chamber === "senate" ? "Senate roll call " : "Roll call ") + vote.n;
    row.appendChild(el("p", "vote-meta", when));
    row.appendChild(el("strong", "", vote.question || vote.legis || "House roll call " + vote.n));
    if (vote.desc) row.appendChild(el("p", "", vote.desc));
    if (vote.legis) row.appendChild(el("p", "vote-meta", vote.legis));
    var sentence = actSentence(vote.legis);
    if (sentence) row.appendChild(el("p", "act-line", sentence));
    var introduced = sponsorLine(vote.legis);
    if (introduced) row.appendChild(el("p", "act-line", introduced));
    row.appendChild(makeBar(vote.yea, vote.nay, vote.present, vote.notVoting));
    row.appendChild(el("p", "vote-meta", countLine(vote)));
    return row;
  }

  function renderSearchPanel() {
    var section = document.getElementById("search-results");
    var list = document.getElementById("search-list");
    var countEl = document.getElementById("search-count");
    if (!section || !list || !countEl) return;
    var q = interpretedQuery();
    list.innerHTML = "";
    if (!q) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    var votes = rankedVotes();
    var pending = Object.keys(summaries).filter(function (key) {
      var item = summaries[key];
      return item && item.pending && textMatches(item.blob || "", q);
    }).sort();
    var count = votes.length + (votes.length === 1 ? " House roll call." : " House roll calls.");
    var senateVotes = matchedSenate();
    if (senateVotes.length) count += " " + senateVotes.length + (senateVotes.length === 1 ? " Senate roll call." : " Senate roll calls.");
    if (pending.length) count += " " + pending.length + (pending.length === 1 ? " bill has no roll call yet." : " bills have no roll call yet.");
    if (spellNote) count = spellNote + " " + count;
    countEl.textContent = count;
    pending.forEach(function (key) {
      var item = summaries[key];
      var row = el("div", "floor-row");
      row.appendChild(el("strong", "", item.title || item.legis || "A bill with no roll call"));
      var meta = item.legis || "";
      if (meta) meta += " · ";
      meta += "No House roll call yet";
      row.appendChild(el("p", "vote-meta", meta));
      if (item.status) row.appendChild(el("p", "", item.status));
      list.appendChild(row);
    });
    if (!votes.length && !pending.length && !senateVotes.length) {
      list.appendChild(el("p", "note", "No roll call matches this search."));
      return;
    }
    votes.forEach(function (vote) { list.appendChild(voteButton(vote)); });
    senateVotes.forEach(function (vote) { list.appendChild(voteButton(vote)); });
  }

  function renderVotes() {
    var votes = rankedVotes();
    var count = "Showing " + votes.length + " of " + data.votes.length + " House roll calls.";
    if (spellNote) count = spellNote + " " + count;
    document.getElementById("vote-count").textContent = count;
    var list = document.getElementById("vote-list");
    list.innerHTML = "";
    if (!votes.length) {
      list.appendChild(el("p", "note", "No roll call matches this search."));
      return;
    }
    votes.forEach(function (vote) { list.appendChild(voteButton(vote)); });
  }

  function peopleOnVote(vote) {
    var groups = {};
    data.members.forEach(function (member, index) {
      var code = readCast(vote, index, member[0]);
      if (!code || code === "-") return;
      if (!passesParty(member) || !passesState(member)) return;
      var side = vote.chamber === "senate" ? senateSide : voteSide;
      if (side === "Y" && code !== "Y") return;
      if (side === "N" && code !== "N") return;
      var q = interpretedQuery();
      var about = textMatches(vote.question + " " + vote.desc + " " + vote.legis + " " + summaryBlob(vote.legis), q);
      if (q && !textMatches(member[1], q) && about) {
        /* A question match keeps every member on that roll call. */
      } else if (q && !textMatches(member[1], q)) return;
      var key = member[3] || "—";
      if (!groups[key]) groups[key] = [];
      groups[key].push({ member: member, index: index, code: code });
    });
    return groups;
  }

  function portrait(id, name, large) {
    var img = document.createElement("img");
    img.className = large ? "portrait portrait-lg" : "portrait";
    img.alt = "Portrait of " + name;
    img.loading = "lazy";
    img.decoding = "async";
    var letter = (name || "?").trim().charAt(0).toUpperCase() || "?";
    function showLetter() {
      var tile = el("span", img.className.replace("portrait", "portrait-letter"), letter);
      img.replaceWith(tile);
    }
    img.addEventListener("error", function () {
      if (img.dataset.step !== "bio") {
        img.dataset.step = "bio";
        img.src = "https://bioguide.congress.gov/bioguide/photo/" + id.charAt(0) + "/" + id + ".jpg";
      } else showLetter();
    });
    img.src = "https://unitedstates.github.io/images/congress/225x275/" + id + ".jpg";
    return img;
  }

  function watchLine(date) {
    var line = el("p", "");
    if (date) {
      line.appendChild(link("https://live.house.gov/?date=" + date, "Floor recording"));
      line.appendChild(document.createTextNode(" · "));
      line.appendChild(link("https://www.youtube.com/@USHouseClerk/search?query=" + encodeURIComponent(formatDate(date)), "Clerk's videos for this day"));
    } else {
      line.appendChild(link("https://live.house.gov/", "House floor live"));
    }
    return line;
  }

  function contactBlock(member) {
    var card = el("div", "person-card");
    card.appendChild(portrait(member[0], member[1], true));
    var copy = el("div", "person-copy");
    var name = el("h3", "");
    var nameText = el("span", partyClass(member[2]), member[1]);
    name.appendChild(nameText);
    copy.appendChild(name);
    var bits = [partyWord(member[2]), seat(member)];
    if (member[10]) bits.push(member[10]);
    copy.appendChild(el("p", "", bits.filter(Boolean).join(" · ")));
    if (member[6]) {
      var phone = el("p", "");
      phone.appendChild(document.createTextNode("Phone "));
      phone.appendChild(link("tel:" + member[6].replace(/[^\d+]/g, ""), member[6]));
      copy.appendChild(phone);
    }
    if (member[7]) copy.appendChild(el("p", "", member[7]));
    if (member[8] || member[9]) {
      var sites = el("p", "");
      if (member[8]) sites.appendChild(link(member[8], host(member[8])));
      if (member[8] && member[9]) sites.appendChild(document.createTextNode(" · "));
      if (member[9]) sites.appendChild(link(member[9], "Contact form"));
      copy.appendChild(sites);
    }
    if (!member[6] && !member[7] && !member[8]) copy.appendChild(el("p", "note", "No office phone or website is in the member file for this name."));
    card.appendChild(copy);
    return card;
  }

  function memberRecord(member) {
    var yea = 0, nay = 0, present = 0, absent = 0;
    var rows = [];
    sortedVotes().forEach(function (vote) {
      if (yearValue() !== "all" && String(vote.year) !== yearValue()) return;
      var index = memberIndex[member[0]];
      var code = readCast(vote, index, member[0]);
      if (!code || code === "-") return;
      if (code === "Y") yea += 1;
      else if (code === "N") nay += 1;
      else if (code === "P") present += 1;
      else if (code === "X") absent += 1;
      rows.push({ vote: vote, code: code });
    });
    return { yea: yea, nay: nay, present: present, absent: absent, rows: rows };
  }

  function renderDetail() {
    var box = document.getElementById("open-vote");
    if (mapSlot.parentNode) mapSlot.parentNode.removeChild(mapSlot);
    box.innerHTML = "";
    var vote = null;
    data.votes.forEach(function (item) { if (item.id === selected) vote = item; });
    if (!vote) return;
    box.appendChild(el("h2", "", vote.question || "House roll call " + vote.n));
    var when = formatDate(vote.date);
    var clock = formatTime(vote.time);
    if (clock) when += " · " + clock;
    when += " · Roll call " + vote.n;
    if (TYPE_LABEL[vote.type] || vote.type) when += " · " + (TYPE_LABEL[vote.type] || vote.type);
    box.appendChild(el("p", "vote-meta", when));
    if (vote.desc) box.appendChild(el("p", "deck", vote.desc));
    var note = actBlock(vote.legis, vote.bill);
    if (note) box.appendChild(note);
    var links = el("p", "");
    if (vote.legis) links.appendChild(document.createTextNode(vote.legis + " · "));
    if (vote.bill) {
      links.appendChild(link(vote.bill, "Bill"));
      links.appendChild(document.createTextNode(" · "));
    }
    if (vote.source) links.appendChild(link(vote.source, "Clerk's file"));
    box.appendChild(links);
    if (vote.date) {
      box.appendChild(watchLine(vote.date));
      box.appendChild(el("p", "sub", "FloorCast keeps the House floor for this day, including this roll call. The Clerk's channel lists a video when one was posted."));
    }
    box.appendChild(makeBar(vote.yea, vote.nay, vote.present, vote.notVoting));
    box.appendChild(el("p", "", countLine(vote)));
    if (vote.majority === "D" || vote.majority === "R" || vote.majority === "I") {
      box.appendChild(el("p", "sub", "The Clerk recorded the House majority party as " + partyWord(vote.majority) + "."));
    }
    var order = ["D", "R", "I", "L"];
    var parties = vote.parties || {};
    Object.keys(parties).forEach(function (code) { if (order.indexOf(code) < 0) order.push(code); });
    order.forEach(function (code) {
      var row = parties[code];
      if (!row) return;
      var total = row[0] + row[1] + row[2] + row[3];
      if (!total) return;
      var line = el("div", "party-line");
      line.appendChild(el("span", partyClass(code), partyWord(code)));
      line.appendChild(makeBar(row[0], row[1], row[2], row[3]));
      var detail = row[0] + " yes · " + row[1] + " no";
      if (row[2]) detail += " · " + row[2] + " present";
      if (row[3]) detail += " · " + row[3] + " did not vote";
      line.appendChild(el("span", "", detail));
      box.appendChild(line);
    });

    box.appendChild(mapSlot);
    box.appendChild(el("p", "sub", "A green state cast more yes votes than no votes. A rose state cast more no votes. A darker color is a larger share of that state's yes and no votes. Plum is a tie. Beige means no yes or no was recorded there."));
    paintMap(vote);

    if (pinned) {
      var person = memberById(pinned);
      if (person) {
        var card = contactBlock(person);
        var index = memberIndex[person[0]];
        var code = readCast(vote, index, person[0]);
        var copy = card.querySelector(".person-copy");
        copy.insertBefore(el("p", "", "On this roll call: " + voteWord(code) + "."), copy.children[1] || null);
        var clear = el("p", "");
        var button = el("button", "linkish", "Close this member");
        button.type = "button";
        button.addEventListener("click", function () { pinned = ""; renderDetail(); });
        clear.appendChild(button);
        copy.appendChild(clear);
        if (person[5] === "house") {
          var record = memberRecord(person);
          copy.appendChild(el("p", "", "In the roll calls shown for this year filter: " + record.yea + " yes, " + record.nay + " no, " + record.present + " present, " + record.absent + " did not vote."));
          copy.appendChild(makeBar(record.yea, record.nay, record.present, record.absent));
        }
        box.appendChild(card);
      }
    }

    appendWhoVoted(box, vote);
  }

  function appendWhoVoted(box, vote) {
    box.appendChild(el("h3", "", "Who voted"));
    var side = vote.chamber === "senate" ? senateSide : voteSide;
    var sideSwitch = el("div", "sheet-switch");
    sideSwitch.id = vote.chamber === "senate" ? "senate-side" : "vote-side";
    sideSwitch.setAttribute("role", "group");
    sideSwitch.setAttribute("aria-label", "Yes or no");
    [["all", "All"], ["Y", "Yes"], ["N", "No"]].forEach(function (choice) {
      var button = el("button", "", choice[1]);
      button.type = "button";
      button.setAttribute("aria-pressed", side === choice[0] ? "true" : "false");
      button.addEventListener("click", function () {
        if (vote.chamber === "senate") {
          senateSide = choice[0];
          renderSenateDetail();
        } else {
          voteSide = choice[0];
          renderDetail();
        }
      });
      sideSwitch.appendChild(button);
    });
    box.appendChild(sideSwitch);
    var groups = peopleOnVote(vote);
    var states = Object.keys(groups).sort(function (a, b) { return stateName(a).localeCompare(stateName(b)); });
    if (!states.length) {
      var empty = "No member matches this party, state, or search on the open roll call.";
      if (side === "Y") empty = "No member who voted yes matches this party, state, or search.";
      if (side === "N") empty = "No member who voted no matches this party, state, or search.";
      box.appendChild(el("p", "note", empty));
    }
    states.forEach(function (code) {
      var block = el("div", "state-block");
      block.appendChild(el("h3", "", stateName(code)));
      groups[code].sort(function (a, b) {
        var aSenate = a.member[5] === "senate" ? 0 : 1;
        var bSenate = b.member[5] === "senate" ? 0 : 1;
        if (aSenate !== bSenate) return aSenate - bSenate;
        if (!aSenate) {
          function rank(member) {
            var word = (member[11] || "").toLowerCase();
            if (word.indexOf("senior") >= 0) return 0;
            if (word.indexOf("junior") >= 0) return 1;
            if (word.indexOf("former") >= 0) return 2;
            return 3;
          }
          var ar = rank(a.member);
          var br = rank(b.member);
          if (ar !== br) return ar - br;
        } else {
          var ad = a.member[4] == null ? 999 : a.member[4];
          var bd = b.member[4] == null ? 999 : b.member[4];
          if (ad !== bd) return ad - bd;
        }
        return a.member[1].localeCompare(b.member[1]);
      }).forEach(function (entry) {
        var row = el("button", "person-row" + (entry.member[0] === pinned ? " is-on" : ""));
        row.type = "button";
        row.setAttribute("data-person", entry.member[0]);
        row.appendChild(portrait(entry.member[0], entry.member[1], false));
        var copy = el("div", "");
        var name = el("strong", partyClass(entry.member[2]), entry.member[1]);
        copy.appendChild(name);
        var meta = [partyWord(entry.member[2]), seat(entry.member), voteWord(entry.code)];
        if (entry.code === "?" && vote.other && vote.other[entry.member[0]]) meta[2] = vote.other[entry.member[0]];
        if (entry.member[6]) meta.push(entry.member[6]);
        copy.appendChild(el("p", "person-meta", meta.join(" · ")));
        var yn = entry.code === "Y" || entry.code === "N";
        var share = yn ? 1 : 0.5;
        var swatch = el("span", "mini-bar");
        var piece = document.createElement("i");
        piece.style.width = "100%";
        piece.style.background = entry.code === "Y" ? sideColor("Y", share) : entry.code === "N" ? sideColor("N", share) : entry.code === "P" ? "#3d4f86" : "#c8c0b4";
        swatch.appendChild(piece);
        copy.appendChild(swatch);
        row.appendChild(copy);
        block.appendChild(row);
      });
      box.appendChild(block);
    });
  }

  function paintMap(vote) {
    var svg = mapSlot.querySelector("svg");
    if (!svg) return;
    var tally = {};
    data.members.forEach(function (member, index) {
      if (member[5] !== "house") return;
      var code = readCast(vote, index, member[0]);
      if (!tally[member[3]]) tally[member[3]] = { Y: 0, N: 0, P: 0, X: 0 };
      if (tally[member[3]][code] != null) tally[member[3]][code] += 1;
    });
    svg.querySelectorAll("path").forEach(function (path) {
      var code = path.getAttribute("data-code");
      var row = tally[code] || { Y: 0, N: 0, P: 0, X: 0 };
      var yn = row.Y + row.N;
      var fill = "#ebe4d6";
      var label = stateName(code) + ". No yes or no on this roll call.";
      if (yn && row.Y === row.N) {
        fill = "#6a4a78";
        label = stateName(code) + ". Yes " + row.Y + ", no " + row.N + ". Tie.";
      } else if (row.Y > row.N) {
        fill = sideColor("Y", row.Y / yn);
        label = stateName(code) + ". Yes " + row.Y + ", no " + row.N + ".";
      } else if (row.N > row.Y) {
        fill = sideColor("N", row.N / yn);
        label = stateName(code) + ". Yes " + row.Y + ", no " + row.N + ".";
      } else if (row.P) {
        fill = "#3d4f86";
        label = stateName(code) + ". Present, with no yes or no.";
      }
      path.style.fill = fill;
      path.setAttribute("title", label);
      var dark = fill === "#0e6a38" || fill === "#8d2344" || fill === "#6a4a78" || fill === "#3d4f86";
      path.classList.toggle("is-on", code === stateCode);
      path.setAttribute("aria-label", label);
      if (dark) path.setAttribute("data-dark", "1");
    });
  }

  function loadMap() {
    if (mapReady || mapSlot.querySelector("svg")) return;
    mapReady = true;
    fetch("preview/us.svg").then(function (response) { return response.text(); }).then(function (markup) {
      var start = markup.indexOf("<svg");
      mapSlot.innerHTML = start >= 0 ? markup.slice(start) : "";
      var svg = mapSlot.querySelector("svg");
      if (!svg) return;
      svg.id = "congress-map";
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", "States colored by the open House roll call");
      svg.querySelectorAll("path").forEach(function (path) {
        path.addEventListener("click", function () {
          var code = path.getAttribute("data-code");
          stateCode = stateCode === code ? "all" : code;
          document.getElementById("congress-state").value = stateCode;
          render();
        });
      });
      var vote = null;
      data.votes.forEach(function (item) { if (item.id === selected) vote = item; });
      if (vote) paintMap(vote);
    }).catch(function () { mapReady = false; });
  }

  function renderSenators() {
    var list = document.getElementById("senator-list");
    list.innerHTML = "";
    var q = queryText();
    var people = data.members.filter(function (member) {
      if (member[5] !== "senate") return false;
      if (!passesParty(member) || !passesState(member)) return false;
      if (!q) return true;
      return (member[1] + " " + stateName(member[3]) + " " + member[7]).toLowerCase().indexOf(q) >= 0;
    });
    if (!people.length) {
      list.appendChild(el("p", "note", "No senator matches this party, state, or search."));
      return;
    }
    var groups = {};
    people.forEach(function (member) {
      if (!groups[member[3]]) groups[member[3]] = [];
      groups[member[3]].push(member);
    });
    Object.keys(groups).sort(function (a, b) { return stateName(a).localeCompare(stateName(b)); }).forEach(function (code) {
      list.appendChild(el("h3", "", stateName(code)));
      groups[code].sort(function (a, b) { return a[1].localeCompare(b[1]); }).forEach(function (member) {
        var row = el("button", "person-row" + (member[0] === pinned ? " is-on" : ""));
        row.type = "button";
        row.setAttribute("data-person", member[0]);
        row.appendChild(portrait(member[0], member[1], false));
        var copy = el("div", "");
        copy.appendChild(el("strong", partyClass(member[2]), member[1]));
        var meta = [partyWord(member[2])];
        if (member[11]) meta.push(member[11]);
        if (member[12]) meta.push("class " + member[12]);
        if (member[10]) meta.push(member[10]);
        if (member[6]) meta.push(member[6]);
        if (member[7]) meta.push(member[7]);
        copy.appendChild(el("p", "person-meta", meta.join(" · ")));
        row.appendChild(copy);
        list.appendChild(row);
      });
    });
  }

  function senateVisible(vote) {
    if (yearValue() !== "all" && String(vote.year) !== yearValue()) return false;
    var result = resultValue();
    var text = vote.result || "";
    if (result === "Passed" && !/passed|confirmed/i.test(text)) return false;
    if (result === "Failed" && !/rejected|failed/i.test(text)) return false;
    if (result === "Agreed to" && !/agreed/i.test(text)) return false;
    if (result === "other" && /passed|confirmed|rejected|failed|agreed/i.test(text)) return false;
    var q = interpretedQuery();
    if (!q) return true;
    var blob = vote.question + " " + vote.desc + " " + vote.legis + " " + vote.result + " " + vote.date + " " + summaryBlob(vote.legis);
    if (textMatches(blob, q)) return true;
    return data.members.some(function (member) {
      if (member[5] !== "senate") return false;
      if (!passesParty(member) || !passesState(member)) return false;
      var code = readCast(vote, memberIndex[member[0]], member[0]);
      if (!code || code === "-") return false;
      return textMatches(member[1], q);
    });
  }

  function matchedSenate() {
    var votes = (data.senateVotes || []).filter(senateVisible);
    var q = interpretedQuery();
    if (q) {
      votes.sort(function (a, b) {
        var aDesc = textMatches(a.desc, q) ? (a.desc || "").length : 100000;
        var bDesc = textMatches(b.desc, q) ? (b.desc || "").length : 100000;
        return aDesc - bDesc;
      });
    }
    if (!votes.some(function (vote) { return vote.id === selectedSenate; })) selectedSenate = votes[0] ? votes[0].id : "";
    return votes;
  }

  function renderSenateVotes() {
    var list = document.getElementById("senate-list");
    var countEl = document.getElementById("senate-count");
    if (!list || !countEl) return;
    var votes = matchedSenate();
    var all = data.senateVotes || [];
    var count = "Showing " + votes.length + " of " + all.length + " Senate roll calls.";
    if (spellNote) count = spellNote + " " + count;
    if (all[0] && all[0].date) count += " Newest in this copy: " + formatDate(all[0].date) + ".";
    countEl.textContent = count;
    list.innerHTML = "";
    if (!votes.length) {
      list.appendChild(el("p", "note", "No Senate roll call matches this search."));
      var open = document.getElementById("open-senate");
      if (open) open.innerHTML = "";
      return;
    }
    votes.forEach(function (vote) { list.appendChild(voteButton(vote)); });
  }

  function renderSenateDetail() {
    var box = document.getElementById("open-senate");
    if (!box) return;
    box.innerHTML = "";
    var vote = null;
    (data.senateVotes || []).forEach(function (item) { if (item.id === selectedSenate) vote = item; });
    if (!vote) return;
    box.appendChild(el("h2", "", vote.question || "Senate roll call " + vote.n));
    var when = formatDate(vote.date) + " · Senate roll call " + vote.n;
    box.appendChild(el("p", "vote-meta", when));
    if (vote.desc) box.appendChild(el("p", "deck", vote.desc));
    var summary = summaryFor(vote.legis);
    if (summary && summary.paragraphs && summary.paragraphs.length) {
      var note = actBlock(vote.legis, vote.bill);
      if (note) box.appendChild(note);
    }
    var links = el("p", "");
    if (vote.legis) links.appendChild(document.createTextNode(vote.legis + " · "));
    if (vote.bill) {
      links.appendChild(link(vote.bill, vote.legis.indexOf("PN ") === 0 ? "Nomination" : "Bill"));
      links.appendChild(document.createTextNode(" · "));
    }
    if (vote.source) links.appendChild(link(vote.source, "Voteview roll call"));
    box.appendChild(links);
    box.appendChild(makeBar(vote.yea, vote.nay, vote.present, vote.notVoting));
    box.appendChild(el("p", "", countLine(vote)));
    if (pinned) {
      var person = memberById(pinned);
      if (person) {
        var card = contactBlock(person);
        var code = readCast(vote, memberIndex[person[0]], person[0]);
        var copy = card.querySelector(".person-copy");
        copy.insertBefore(el("p", "", "On this roll call: " + voteWord(code) + "."), copy.children[1] || null);
        var clear = el("p", "");
        var button = el("button", "linkish", "Close this member");
        button.type = "button";
        button.addEventListener("click", function () {
          pinned = "";
          renderSenateDetail();
        });
        clear.appendChild(button);
        copy.appendChild(clear);
        box.appendChild(card);
      }
    }
    appendWhoVoted(box, vote);
  }

  function chooseSenate(id, scroll) {
    selectedSenate = id;
    if (history.replaceState) history.replaceState(null, "", "#" + id);
    renderSenateVotes();
    renderSenateDetail();
    if (scroll) {
      var open = document.getElementById("open-senate");
      if (open) open.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function render() {
    queryCacheRaw = null;
    renderFloor();
    renderSearchPanel();
    renderPending();
    renderVotes();
    renderDetail();
    renderSenateVotes();
    renderSenateDetail();
    renderSenators();
    loadMap();
  }

  function renderMatches() {
    queryCacheRaw = null;
    renderSearchPanel();
    renderPending();
    renderVotes();
    renderDetail();
    renderSenateVotes();
    renderSenateDetail();
    renderSenators();
  }

  function fillStates() {
    var select = document.getElementById("congress-state");
    var seen = {};
    data.members.forEach(function (member) { if (member[3]) seen[member[3]] = true; });
    var codes = Object.keys(seen).sort(function (a, b) { return stateName(a).localeCompare(stateName(b)); });
    select.appendChild(new Option("All states", "all"));
    codes.forEach(function (code) { select.appendChild(new Option(stateName(code), code)); });
  }

  function choose(id, scroll) {
    selected = id;
    if (history.replaceState) history.replaceState(null, "", "#" + id);
    render();
    if (scroll) {
      var open = document.getElementById("open-vote");
      if (open) open.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function api(path) {
    var join = path.indexOf("?") >= 0 ? "&" : "?";
    return fetch("https://api.congress.gov/v3" + path + join + "api_key=" + KEY);
  }

  function listSession(session, offset, rows) {
    return api("/house-vote/119/" + session + "?limit=250&offset=" + offset).then(function (response) {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    }).then(function (body) {
      var page = body.houseRollCallVotes || [];
      var all = rows.concat(page);
      if (body.pagination && body.pagination.next && page.length) return listSession(session, offset + page.length, all);
      return all;
    });
  }

  function haveRoll(year, number) {
    return data.votes.some(function (vote) { return vote.year === year && vote.n === number; });
  }

  function addLiveMember(row) {
    if (!row.bioguideID || memberById(row.bioguideID)) return;
    data.members.push([
      row.bioguideID,
      ((row.firstName || "") + " " + (row.lastName || "")).trim() || row.bioguideID,
      row.voteParty || "",
      row.voteState || "",
      null,
      "house",
      "",
      "",
      "",
      "",
      "",
      "",
      null
    ]);
    indexMembers();
  }

  function liveVote(body) {
    var vote = body.houseRollCallVoteMemberVotes || body.houseRollCallVote || body;
    var results = vote.results || [];
    var cast = {};
    var parties = {};
    var yea = 0, nay = 0, present = 0, notVoting = 0;
    var other = {};
    results.forEach(function (row) {
      addLiveMember(row);
      var code = voteCode(row.voteCast);
      cast[row.bioguideID] = code;
      if (code === "?") other[row.bioguideID] = row.voteCast;
      if (code === "Y") yea += 1;
      else if (code === "N") nay += 1;
      else if (code === "P") present += 1;
      else notVoting += 1;
      var partyCode = row.voteParty || "O";
      if (!parties[partyCode]) parties[partyCode] = [0, 0, 0, 0];
      if (code === "Y") parties[partyCode][0] += 1;
      else if (code === "N") parties[partyCode][1] += 1;
      else if (code === "P") parties[partyCode][2] += 1;
      else parties[partyCode][3] += 1;
    });
    var date = (vote.startDate || "").slice(0, 10);
    var year = +date.slice(0, 4);
    var item = {
      id: "h-" + year + "-" + vote.rollCallNumber,
      chamber: "house",
      year: year,
      session: vote.sessionNumber,
      n: vote.rollCallNumber,
      date: date,
      time: (vote.startDate || "").slice(11, 16),
      question: vote.voteQuestion || "",
      desc: "",
      legis: vote.legislationType && vote.legislationNumber ? vote.legislationType + " " + vote.legislationNumber : "",
      bill: vote.legislationUrl || "",
      result: vote.result || "",
      type: vote.voteType || "",
      majority: "",
      yea: yea,
      nay: nay,
      present: present,
      notVoting: notVoting,
      parties: parties,
      cast: cast,
      source: vote.sourceDataURL || ""
    };
    if (Object.keys(other).length) item.other = other;
    return item;
  }

  function storeLive() {
    try {
      var extraVotes = data.votes.filter(function (vote) { return vote.live; });
      sessionStorage.setItem("lv-congress-live", JSON.stringify({ at: Date.now(), votes: extraVotes }));
    } catch (error) { /* A full storage box still leaves the page usable. */ }
  }

  function restoreLive() {
    try {
      var saved = JSON.parse(sessionStorage.getItem("lv-congress-live") || "null");
      if (!saved || !saved.votes) return;
      saved.votes.forEach(function (vote) {
        if (!haveRoll(vote.year, vote.n)) data.votes.push(vote);
      });
    } catch (error) { /* Ignore a broken saved check. */ }
  }

  function checkLive(manual) {
    if (checking) return;
    var last = 0;
    try { last = +sessionStorage.getItem("lv-congress-checked") || 0; } catch (error) { last = 0; }
    if (!manual && Date.now() - last < 20 * 60 * 1000) return;
    checking = true;
    renderStatus("Checking Congress.gov.");
    listSession(2, 0, []).then(function (rows) {
      var missing = rows.filter(function (row) {
        var year = +(row.startDate || "").slice(0, 4);
        return year && row.rollCallNumber && !haveRoll(year, row.rollCallNumber);
      });
      if (!missing.length) {
        try { sessionStorage.setItem("lv-congress-checked", String(Date.now())); } catch (error) { /* ignore */ }
        checking = false;
        renderStatus("Congress.gov lists no House roll call newer than this copy.");
        return;
      }
      return Promise.all(missing.slice(0, 8).map(function (row) {
        var year = (row.startDate || "").slice(0, 4);
        return api("/house-vote/119/" + row.sessionNumber + "/" + row.rollCallNumber + "/members").then(function (response) {
          if (!response.ok) throw new Error(String(response.status));
          return response.json();
        }).then(liveVote);
      })).then(function (votes) {
        votes.forEach(function (vote) {
          vote.live = true;
          if (!haveRoll(vote.year, vote.n)) data.votes.push(vote);
        });
        storeLive();
        try { sessionStorage.setItem("lv-congress-checked", String(Date.now())); } catch (error) { /* ignore */ }
        checking = false;
        if (!selected && votes[0]) selected = votes[0].id;
        render();
        renderStatus("Added " + votes.length + " House roll call" + (votes.length === 1 ? "" : "s") + " from Congress.gov.");
      });
    }).catch(function (error) {
      checking = false;
      var message = String(error && error.message || "");
      renderStatus(message === "429" || message === "403"
        ? "Congress.gov asked this browser to wait. The saved copy is on the page."
        : "Congress.gov did not answer. The saved copy is on the page.");
    });
  }

  function boot(payload) {
    data = payload;
    data.senateVotes = (payload.senate && payload.senate.votes) || [];
    var seenMember = {};
    data.members.forEach(function (member) { seenMember[member[0]] = true; });
    ((payload.senate && payload.senate.members) || []).forEach(function (member) {
      if (!seenMember[member[0]]) data.members.push(member);
    });
    indexSummaries();
    indexWords();
    indexMembers();
    restoreLive();
    fillStates();
    var votes = sortedVotes();
    var hash = location.hash.replace(/^#/, "");
    selected = votes.some(function (vote) { return vote.id === hash; }) ? hash : (votes[0] ? votes[0].id : "");
    selectedSenate = data.senateVotes.some(function (vote) { return vote.id === hash; }) ? hash : (data.senateVotes[0] ? data.senateVotes[0].id : "");
    renderStatus("");
    render();
    function clearSearch() {
      appliedQuery = "";
      queryCacheRaw = null;
      var input = document.getElementById("congress-q");
      if (input) input.value = "";
      renderMatches();
    }
    document.getElementById("congress-find").addEventListener("submit", function (event) {
      event.preventDefault();
      appliedQuery = (document.getElementById("congress-q").value || "").trim().toLowerCase();
      queryCacheRaw = null;
      renderMatches();
      var section = document.getElementById("search-results");
      if (appliedQuery && section && !section.hidden) section.scrollIntoView({ block: "nearest" });
    });
    document.getElementById("congress-clear").addEventListener("click", clearSearch);
    document.getElementById("congress-clear-results").addEventListener("click", clearSearch);
    document.getElementById("congress-year").addEventListener("change", render);
    document.getElementById("congress-result").addEventListener("change", render);
    document.getElementById("congress-state").addEventListener("change", function (event) {
      stateCode = event.target.value;
      render();
    });
    document.getElementById("congress-party").addEventListener("click", function (event) {
      var button = event.target.closest("button[data-party]");
      if (!button) return;
      party = button.getAttribute("data-party");
      document.querySelectorAll("#congress-party button").forEach(function (item) {
        item.setAttribute("aria-pressed", item === button ? "true" : "false");
      });
      render();
    });
    document.getElementById("floor-list").addEventListener("click", function (event) {
      var button = event.target.closest("button[data-vote]");
      if (button) choose(button.getAttribute("data-vote"), true);
    });
    document.getElementById("vote-list").addEventListener("click", function (event) {
      var button = event.target.closest("button[data-vote]");
      if (!button) return;
      if (button.getAttribute("data-chamber") === "senate") chooseSenate(button.getAttribute("data-vote"), true);
      else choose(button.getAttribute("data-vote"), true);
    });
    document.getElementById("search-list").addEventListener("click", function (event) {
      var button = event.target.closest("button[data-vote]");
      if (!button) return;
      if (button.getAttribute("data-chamber") === "senate") chooseSenate(button.getAttribute("data-vote"), true);
      else choose(button.getAttribute("data-vote"), true);
    });
    document.getElementById("senate-list").addEventListener("click", function (event) {
      var button = event.target.closest("button[data-vote]");
      if (button) chooseSenate(button.getAttribute("data-vote"), true);
    });
    document.body.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-person]");
      if (!button) return;
      pinned = button.getAttribute("data-person");
      if (event.target.closest("#open-senate")) {
        renderSenateDetail();
        var senateCard = document.querySelector("#open-senate .person-card");
        if (senateCard) senateCard.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      renderDetail();
      renderSenators();
      var card = document.querySelector("#open-vote .person-card");
      if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    document.getElementById("congress-check").addEventListener("click", function () { checkLive(true); });
    checkLive(false);
    setInterval(function () { checkLive(false); }, 20 * 60 * 1000);
  }

  fetch("congress/votes.json?v=1").then(function (response) {
    if (!response.ok) throw new Error(String(response.status));
    return response.json();
  }).then(function (payload) {
    return fetch("congress/summaries.json?v=4").then(function (response) {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    }).then(function (extra) {
      summaries = extra || {};
      return fetch("congress/senate.json?v=1").then(function (response) {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      }).then(function (senate) {
        payload.senate = senate;
        return payload;
      }).catch(function () {
        payload.senate = null;
        return payload;
      });
    }).catch(function () {
      summaries = {};
      return payload;
    });
  }).then(boot).catch(function () {
    document.getElementById("congress-status").textContent = "The roll call file did not load.";
  });
})();
