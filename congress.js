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
  var money = {};
  var introduced = {};
  var introducedList = [];
  var billsVoted = {};
  var introLimit = 80;
  var selectedIntro = "";
  var wordCounts = {};
  var queryCacheRaw = null;
  var queryCache = "";
  var spellNote = "";
  var memberIndex = {};
  var selected = "";
  var pinned = "";
  var presidents = [];
  var openPresident = "";
  var party = "all";
  var stateCode = "all";
  var voteSide = "all";
  var senateSide = "all";
  var selectedSenate = "";
  var slips = [];
  var selectedSlip = "";
  var appliedQuery = "";
  var searchPerson = "";
  var searchIntroLimit = 100;
  var searchPeopleLimit = 80;
  var checking = false;
  var slipChecking = false;
  var slipNote = "";
  var STATE_CODE = {};
  var NO_SENATE = { DC: true, PR: true, GU: true, VI: true, MP: true, AS: true };
  Object.keys(STATES).forEach(function (code) { STATE_CODE[STATES[code].toLowerCase()] = code; });
  STATE_CODE["the district of columbia"] = "DC";
  STATE_CODE["the virgin islands"] = "VI";
  STATE_CODE["virgin islands"] = "VI";
  STATE_CODE["the northern mariana islands"] = "MP";
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

  var BILL_LABEL = {
    HJRES: "H.J.Res.", HCONRES: "H.Con.Res.", HRES: "H.Res.", HR: "H.R.",
    SJRES: "S.J.Res.", SCONRES: "S.Con.Res.", SRES: "S.Res.", S: "S."
  };
  var BILL_SLUG = {
    HJRES: "house-joint-resolution", HCONRES: "house-concurrent-resolution", HRES: "house-resolution", HR: "house-bill",
    SJRES: "senate-joint-resolution", SCONRES: "senate-concurrent-resolution", SRES: "senate-resolution", S: "senate-bill"
  };

  function billKey(raw) {
    var text = (raw || "").toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    for (var i = 0; i < BILL_PATTERNS.length; i++) {
      var match = BILL_PATTERNS[i][1].exec(text);
      if (match) return BILL_PATTERNS[i][0] + match[1];
    }
    return "";
  }

  function keyParts(key) {
    var match = /^(HCONRES|HJRES|HRES|HR|SCONRES|SJRES|SRES|S)(\d+)$/.exec(key || "");
    return match ? [match[1], match[2]] : null;
  }

  function billLabelFromKey(key) {
    var parts = keyParts(key);
    return parts ? BILL_LABEL[parts[0]] + " " + parts[1] : key;
  }

  function congressBillUrl(key) {
    var parts = keyParts(key);
    if (!parts) return "";
    return "https://www.congress.gov/bill/119th-congress/" + BILL_SLUG[parts[0]] + "/" + parts[1];
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
      item.blob = [(item.paragraphs || []).join(" "), item.title || "", item.senate || "", item.status || "", item.legis || "", names, money[key] || ""].join(" ").toLowerCase();
    });
  }

  function indexIntroduced() {
    introducedList = Object.keys(introduced).map(function (key) {
      var item = introduced[key];
      item.key = key;
      item.legis = billLabelFromKey(key);
      var people = item.p || [];
      var names = people.map(function (person) { return person[1] || ""; }).join(" ");
      var places = people.map(function (person) { return (person[3] || "") + " " + (person[5] || ""); }).join(" ");
      var states = people.map(function (person) { return stateName(person[3] || ""); }).join(" ");
      var parties = people.map(function (person) { return partyWord(person[2] || ""); }).join(" ");
      item.blob = [item.t || "", item.o || "", item.s || "", item.legis, item.key, item.d || "", names, places, states, parties, money[key] || ""].join(" ").toLowerCase();
      return item;
    }).sort(function (a, b) {
      if (a.d !== b.d) return a.d < b.d ? 1 : -1;
      var aNumber = keyParts(a.key);
      var bNumber = keyParts(b.key);
      var aRank = aNumber ? parseInt(aNumber[1], 10) : 0;
      var bRank = bNumber ? parseInt(bNumber[1], 10) : 0;
      return bRank - aRank;
    });
  }

  function indexBills() {
    billsVoted = {};
    function add(vote) {
      var key = billKey(vote.legis);
      if (!key) return;
      if (!billsVoted[key]) billsVoted[key] = [];
      billsVoted[key].push(vote);
    }
    data.votes.forEach(add);
    (data.senateVotes || []).forEach(add);
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

  function voteIntroducers(vote) {
    if (!vote || vote.chamber === "senate") return [];
    var key = billKey(vote.legis);
    var intro = key && introduced[key];
    if (intro && intro.p && intro.p.length) return intro.p;
    var summary = summaryFor(vote.legis);
    var sponsors = summary && summary.sponsors;
    if (!sponsors || !sponsors.length) return [];
    return sponsors.map(function (sponsor) {
      var known = sponsor.id ? memberById(sponsor.id) : null;
      return [
        sponsor.id || "",
        (known && known[1]) || sponsor.name || "A member",
        sponsor.party || (known && known[2]) || "",
        sponsor.state || (known && known[3]) || "",
        sponsor.district == null ? null : sponsor.district,
        sponsor.chamber === "senate" ? "senator" : "representative",
        sponsor.byRequest ? 1 : 0
      ];
    });
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
    var key = billKey(legis) || legis || "";
    if (key.indexOf("RES") >= 0) return "Read the full resolution";
    return "Read the full bill";
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

  function moneyLine(legis) {
    var key = billKey(legis);
    var line = key && money[key];
    return typeof line === "string" ? line : "";
  }

  function dollarValue(raw, unit) {
    var number = String(raw).indexOf(",") >= 0 ? parseFloat(String(raw).replace(/,/g, "")) : parseFloat(raw);
    var word = (unit || "").toLowerCase();
    if (word === "million") number *= 1000000;
    if (word === "billion") number *= 1000000000;
    if (word === "trillion") number *= 1000000000000;
    return number;
  }

  function spendingAmounts(line) {
    var found = [];
    var pattern = /\$(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(?:\s+(million|billion|trillion))?/gi;
    var match;
    while ((match = pattern.exec(line))) {
      var value = dollarValue(match[1], match[2]);
      if (!value || value < 100000) continue;
      var before = line.slice(Math.max(0, match.index - 70), match.index).toLowerCase();
      var after = line.slice(match.index + match[0].length, match.index + match[0].length + 48);
      var around = before + " " + after.toLowerCase();
      if (around.indexOf("debt limit") >= 0) continue;
      if (/not to exceed|shall not exceed|not more than|or more|or less|at least|at most|in excess|exceeding|exceeds|valued over|reduced by|drops below|under \$|up to|fine of/.test(around)) continue;
      var spends = /^\s*for\b/i.test(after) || /funding|provid|appropriat|taxpayer|paid out|\btransfer\b|\bbudget\b/.test(around);
      if (!spends) continue;
      found.push({ value: value, label: match[0].replace(/\s+/g, " "), at: match.index, length: match[0].length });
    }
    found.sort(function (a, b) { return b.value - a.value; });
    return found;
  }

  function moneyFacts(legis, extra) {
    var line = moneyLine(legis);
    var found = line ? spendingAmounts(line) : [];
    if (extra) found = found.concat(spendingAmounts(extra));
    if (!found.length) return null;
    found.sort(function (a, b) { return b.value - a.value; });
    return { top: found[0], all: found, line: line };
  }

  var taxpayerItems = [];

  function indexTaxpayer() {
    var byKey = {};
    function consider(key, title, extra, date) {
      if (!key) return;
      var legis = billLabelFromKey(key);
      var facts = moneyFacts(legis, extra || "");
      if (!facts) return;
      var current = byKey[key];
      if (!current) {
        byKey[key] = {
          key: key,
          legis: legis,
          title: title || legis,
          value: facts.top.value,
          label: facts.top.label,
          line: facts.line || "",
          date: date || ""
        };
        return;
      }
      if (title && (!current.title || current.title === current.legis)) current.title = title;
      if (date && !current.date) current.date = date;
      if (facts.line && !current.line) current.line = facts.line;
      if (facts.top.value > current.value) {
        current.value = facts.top.value;
        current.label = facts.top.label;
      }
    }
    Object.keys(money).forEach(function (key) {
      var summary = summaries[key] || {};
      consider(key, summary.title || "", money[key], summary.date || "");
    });
    introducedList.forEach(function (item) {
      consider(item.key, item.t || "", introTitles(item), item.d || "");
    });
    Object.keys(summaries).forEach(function (key) {
      var item = summaries[key];
      consider(key, item.title || "", (item.paragraphs || []).join(" "), item.date || "");
    });
    taxpayerItems = Object.keys(byKey).map(function (key) { return byKey[key]; });
    taxpayerItems.sort(function (a, b) { return b.value - a.value; });
  }

  function taxpayerPeople(key) {
    var intro = introduced[key];
    if (intro && intro.p && intro.p.length) {
      return intro.p.map(function (person) { return [person[0], person[1], person[2], person[3]]; });
    }
    var summary = summaries[key];
    if (summary && summary.sponsors && summary.sponsors.length) {
      return summary.sponsors.map(function (sponsor) { return [sponsor.id, sponsor.name, sponsor.party, sponsor.state]; });
    }
    return [];
  }

  function taxpayerPasses(item) {
    var intro = introduced[item.key];
    var year = intro && intro.d ? String(intro.d).slice(0, 4) : String(item.date || "").slice(0, 4);
    if (yearValue() !== "all" && year !== yearValue()) return false;
    var people = taxpayerPeople(item.key);
    if (!people.length) return party === "all" && stateCode === "all";
    return people.some(function (person) {
      return passesParty(person) && passesState(person);
    });
  }

  function taxpayerBlurb(item) {
    if (item.line) return "";
    var title = String(item.title || "").replace(/\s+/g, " ").trim().toLowerCase();
    var summary = summaries[item.key];
    var paragraphs = summary && summary.paragraphs ? summary.paragraphs : [];
    var text = "";
    paragraphs.some(function (paragraph) {
      if (!spendingAmounts(paragraph).length) return false;
      text = paragraph;
      return true;
    });
    if (!text && paragraphs.length) text = paragraphs[0];
    if (!text) {
      var intro = introduced[item.key];
      if (intro && intro.o) text = intro.o;
    }
    if (!text) return "";
    var short = firstSentence(text, 420);
    var flat = String(short || "").replace(/\s+/g, " ").trim().toLowerCase();
    if (!flat || flat === title || title.indexOf(flat) === 0) return "";
    return short;
  }

  function renderTaxpayer() {
    var list = document.getElementById("taxpayer-list");
    var countEl = document.getElementById("taxpayer-count");
    if (!list || !countEl) return;
    var rows = taxpayerItems.filter(taxpayerPasses);
    var hidden = taxpayerItems.length - rows.length;
    var count = hidden
      ? "Showing " + rows.length + " of " + taxpayerItems.length + " measures that name an amount of taxpayer money. The year, state, or party chosen above hides the other " + hidden + ". Largest first."
      : taxpayerItems.length + " measures on this page name an amount of taxpayer money. Largest first.";
    countEl.textContent = count;
    list.innerHTML = "";
    if (!rows.length) {
      list.appendChild(el("p", "note", "No measure on this page names taxpayer money for these choices."));
      return;
    }
    rows.forEach(function (item) {
      var shell = el("div", "intro-row" + (item.key === selectedIntro ? " is-on" : ""));
      var row = el("button", "vote-row");
      row.type = "button";
      row.setAttribute("data-money", item.key);
      var title = el("strong", "with-money");
      title.appendChild(document.createTextNode(item.title || item.legis || "Measure"));
      addMoneyChip(title, item.legis, (item.title || "") + " " + (item.line || ""));
      if (!title.querySelector(".money-chip")) title.appendChild(moneyChip({ value: item.value, label: item.label }));
      row.appendChild(title);
      var meta = item.legis || "";
      if (item.date) meta += (meta ? " · " : "") + formatDate(item.date);
      if (meta) row.appendChild(el("p", "vote-meta", meta));
      var intro = introduced[item.key];
      var whoRow = el("div", "intro-who");
      var faces = intro ? introFaces(intro) : null;
      if (!faces) {
        var sponsors = summaries[item.key] && summaries[item.key].sponsors;
        if (sponsors && sponsors.length) {
          faces = el("div", "intro-faces");
          sponsors.forEach(function (sponsor) {
            faces.appendChild(portrait(sponsor.id, sponsor.name || "A member", false));
          });
        }
      }
      if (faces) whoRow.appendChild(faces);
      if (intro) {
        var who = el("p", "act-line");
        appendIntroducers(who, intro);
        whoRow.appendChild(who);
      }
      if (whoRow.childNodes.length) row.appendChild(whoRow);
      if (item.line) {
        var cash = el("p", "act-line");
        cash.appendChild(paintMoney(item.line));
        row.appendChild(cash);
      } else {
        var blurb = taxpayerBlurb(item);
        if (blurb) {
          var about = el("p", "act-line");
          about.appendChild(paintMoney(blurb));
          row.appendChild(about);
        }
      }
      var votes = billsVoted[item.key] || [];
      if (votes.length) row.appendChild(el("p", "vote-meta", votes.length === 1 ? "One roll call on this page." : votes.length + " roll calls on this page."));
      shell.appendChild(row);
      var page = textUrl(congressBillUrl(item.key));
      if (page) {
        var read = el("p", "intro-read");
        read.appendChild(link(page, textLabel(item.legis || item.key)));
        shell.appendChild(read);
      }
      list.appendChild(shell);
    });
  }

  function actSentence(legis) {
    var cash = moneyLine(legis);
    if (cash) return cash;
    var item = summaryFor(legis);
    if (!item || !item.paragraphs || !item.paragraphs.length) return "";
    return firstSentence(item.paragraphs[0], 240);
  }

  function actBlock(legis, bill) {
    if (!legis && !bill) return null;
    var wrap = el("div", "act-note");
    var item = summaryFor(legis);
    var url = textUrl(bill);
    var cash = moneyLine(legis);
    var paragraphs = item && item.paragraphs ? item.paragraphs.slice() : [];
    if (!paragraphs.length && !cash) {
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
    if (cash) {
      var moneyNode = el("p", "act-money");
      moneyNode.appendChild(paintMoney(cash));
      wrap.appendChild(moneyNode);
    }
    if (cash && paragraphs[0] === cash) paragraphs = paragraphs.slice(1);
    if (cash) {
      if (!paragraphs.length) {
        if (url) {
          var moneyLink = el("p", "");
          moneyLink.appendChild(link(url, textLabel(legis)));
          wrap.appendChild(moneyLink);
        }
        appendStatus(wrap, item);
        appendSponsors(wrap, item);
        return wrap;
      }
      var moneyMore = el("div", "act-more");
      moneyMore.hidden = true;
      paragraphs.forEach(function (paragraph) { moneyMore.appendChild(el("p", "", paragraph)); });
      wrap.appendChild(moneyMore);
      var moneyActions = el("p", "");
      var moneyButton = el("button", "linkish", "Read the full summary");
      moneyButton.type = "button";
      moneyButton.setAttribute("aria-expanded", "false");
      moneyButton.addEventListener("click", function () {
        var opening = moneyMore.hidden;
        moneyMore.hidden = !opening;
        moneyButton.setAttribute("aria-expanded", opening ? "true" : "false");
        moneyButton.textContent = opening ? "Show the short summary" : "Read the full summary";
      });
      moneyActions.appendChild(moneyButton);
      if (url) {
        moneyActions.appendChild(document.createTextNode(" · "));
        moneyActions.appendChild(link(url, textLabel(legis)));
      }
      wrap.appendChild(moneyActions);
      var moneyCredit = item && item.source === "title"
        ? "This is the bill's official title. The Congressional Research Service has not published a summary"
        : "Congressional Research Service";
      if (item && item.source !== "title" && item.asOf) moneyCredit += ". " + item.asOf;
      if (item && item.source !== "title" && item.date) moneyCredit += ", " + formatDate(item.date);
      wrap.appendChild(el("p", "sub", moneyCredit + "."));
      appendStatus(wrap, item);
      appendSponsors(wrap, item);
      return wrap;
    }
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

  function moneyInk(value) {
    var t = 0;
    if (value > 0) t = Math.max(0, Math.min(1, (Math.log10(value) - 6) / 6));
    return { bg: mix("#f6e4b8", "#6b2b0f", t), fg: t >= 0.58 ? "#fff8ef" : "#2c1d0e" };
  }

  function moneyChip(amount) {
    var ink = moneyInk(amount.value);
    var chip = el("span", "money-chip");
    chip.textContent = amount.label;
    chip.style.background = ink.bg;
    chip.style.color = ink.fg;
    chip.title = "Taxpayer money. A paler brass mark is a smaller amount. A deeper bronze mark is a larger amount.";
    return chip;
  }

  function addMoneyChip(node, legis, extra) {
    var facts = moneyFacts(legis, extra);
    if (!facts) return node;
    node.appendChild(moneyChip(facts.top));
    return node;
  }

  function paintMoney(text) {
    var node = document.createDocumentFragment();
    var amounts = spendingAmounts(text);
    var marks = {};
    amounts.forEach(function (amount) { marks[amount.at] = amount; });
    var pattern = /\$(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(?:\s+(million|billion|trillion))?/gi;
    var last = 0;
    var match;
    while ((match = pattern.exec(text))) {
      if (match.index > last) node.appendChild(document.createTextNode(text.slice(last, match.index)));
      var amount = marks[match.index];
      if (amount) node.appendChild(moneyChip(amount));
      else node.appendChild(document.createTextNode(match[0]));
      last = match.index + match[0].length;
    }
    if (last < text.length) node.appendChild(document.createTextNode(text.slice(last)));
    return node;
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
    data.members.forEach(function (member) { add(memberBlob(member)); });
    presidents.forEach(function (person) { add(presidentBlob(person)); });
    (data.floor && data.floor.items || []).forEach(function (item) {
      add(item.title);
      add(item.legis);
      add(item.category);
    });
    Object.keys(money).forEach(function (key) { add(money[key]); });
    Object.keys(summaries).forEach(function (key) {
      var item = summaries[key];
      add(item.title);
      add(item.senate);
      add(item.status);
      add(item.legis);
      (item.paragraphs || []).forEach(add);
      (item.sponsors || []).forEach(function (sponsor) { add(sponsor.name); });
    });
    introducedList.forEach(function (item) {
      add(item.t);
      add(item.o);
      add(item.s);
      add(item.legis);
      (item.p || []).forEach(function (person) { add(person[1]); });
    });
    slips.forEach(function (item) { add(slipBlob(item)); });
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
    var flat = hay.replace(/[^a-z0-9]+/g, "");
    return query.split(" ").every(function (token) {
      return hay.indexOf(token) >= 0 || flat.indexOf(token) >= 0;
    });
  }

  function memberBlob(member) {
    var district = member[4] == null ? "" : ordinal(member[4]) + " district";
    var chamber = member[5] === "senate" ? "senator senate" : "representative house";
    return [member[1], partyWord(member[2]), member[2], stateName(member[3]), member[3], chamber, district, member[6], member[7], member[8], member[10], member[11], member[12], seat(member)].join(" ");
  }

  function floorBlob(item) {
    return [item.title, item.legis, item.category, item.week, summaryBlob(item.legis), moneyLine(item.legis)].join(" ");
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
        var titleNode = el("strong", "with-money");
        titleNode.appendChild(document.createTextNode(item.title || item.legis || "Scheduled item"));
        addMoneyChip(titleNode, item.legis);
        row.appendChild(titleNode);
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
          var sentenceNode = el("p", "act-line");
          var cash = moneyLine(item.legis);
          if (cash) sentenceNode.appendChild(paintMoney(cash));
          else sentenceNode.textContent = actSentence(item.legis);
          if (sentenceNode.textContent || sentenceNode.childNodes.length) row.appendChild(sentenceNode);
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
      if (!item || !item.pending || introduced[key]) return false;
      if (!q) return true;
      return textMatches(item.blob || "", q);
    }).sort();
    section.hidden = !keys.length;
    keys.forEach(function (key) {
      var item = summaries[key];
      var block = el("div", "floor-row");
      var pendingTitle = el("strong", "with-money");
      pendingTitle.appendChild(document.createTextNode(item.title || item.legis || "A bill with no roll call"));
      addMoneyChip(pendingTitle, item.legis);
      block.appendChild(pendingTitle);
      if (item.legis) block.appendChild(el("p", "vote-meta", item.legis));
      var note = actBlock(item.legis, item.bill);
      if (note) block.appendChild(note);
      list.appendChild(block);
    });
  }

  function introPeople(item) {
    return item && item.p ? item.p : [];
  }

  function introPasses(item) {
    if (yearValue() !== "all" && String(item.d || "").slice(0, 4) !== yearValue()) return false;
    var result = resultValue();
    if (result !== "all") {
      var votes = billsVoted[item.key] || [];
      var matched = votes.some(function (vote) {
        var word = vote.result || "";
        if (result === "Passed") return /passed|confirmed/i.test(word);
        if (result === "Failed") return /rejected|failed/i.test(word);
        if (result === "Agreed to") return /agreed/i.test(word);
        return !/passed|confirmed|rejected|failed|agreed/i.test(word);
      });
      if (!matched) return false;
    }
    var people = introPeople(item);
    if (!people.length) return party === "all" && stateCode === "all";
    return people.some(function (person) {
      return passesParty([person[0], person[1], person[2], person[3]]) && passesState([person[0], person[1], person[2], person[3]]);
    });
  }

  function appendIntroducers(node, item) {
    var people = introPeople(item);
    if (!people.length) {
      node.appendChild(document.createTextNode("The bill status file did not name an introducer."));
      return;
    }
    var byRequest = people.some(function (person) { return person[6]; });
    node.appendChild(document.createTextNode(byRequest ? "Introduced by request by " : "Introduced by "));
    people.forEach(function (person, index) {
      if (index) node.appendChild(document.createTextNode(index === people.length - 1 ? " and " : ", "));
      var role = person[5] || "member";
      node.appendChild(document.createTextNode(role.charAt(0).toUpperCase() + role.slice(1) + " "));
      node.appendChild(el("span", partyClass(person[2]), person[1] || "A member"));
    });
    node.appendChild(document.createTextNode("."));
  }

  function introFaces(item) {
    var people = introPeople(item);
    if (!people.length) return null;
    var box = el("div", "intro-faces");
    people.forEach(function (person) {
      box.appendChild(portrait(person[0], person[1] || "A member", false));
    });
    return box;
  }

  function introSponsors(item) {
    return introPeople(item).map(function (person) {
      return {
        id: person[0],
        name: person[1],
        party: person[2],
        state: person[3],
        district: person[4],
        chamber: person[5] === "senator" ? "senate" : "house",
        byRequest: !!person[6]
      };
    });
  }

  function introTitles(item) {
    return [item.t || "", item.o || ""].join(" ");
  }

  function introButton(item) {
    var shell = el("div", "intro-row" + (item.key === selectedIntro ? " is-on" : ""));
    var row = el("button", "vote-row");
    row.type = "button";
    row.setAttribute("data-intro", item.key);
    var when = "Introduced " + formatDate(item.d);
    when += item.c === "senate" ? " · Senate" : " · House";
    row.appendChild(el("p", "vote-meta", when));
    var title = el("strong", "with-money");
    title.appendChild(document.createTextNode(item.t || item.legis || "Introduced measure"));
    addMoneyChip(title, item.legis, introTitles(item));
    row.appendChild(title);
    if (item.legis) row.appendChild(el("p", "vote-meta", item.legis));
    var whoRow = el("div", "intro-who");
    var faces = introFaces(item);
    if (faces) whoRow.appendChild(faces);
    var who = el("p", "act-line");
    appendIntroducers(who, item);
    whoRow.appendChild(who);
    row.appendChild(whoRow);
    if (item.o) {
      var official = el("p", "act-line");
      official.appendChild(paintMoney(item.o));
      row.appendChild(official);
    } else if (moneyLine(item.legis)) {
      var cash = el("p", "act-line");
      cash.appendChild(paintMoney(moneyLine(item.legis)));
      row.appendChild(cash);
    }
    if (item.s) row.appendChild(el("p", "vote-meta", item.s));
    shell.appendChild(row);
    var page = textUrl(congressBillUrl(item.key));
    if (page) {
      var read = el("p", "intro-read");
      read.appendChild(link(page, textLabel(item.legis || item.key)));
      shell.appendChild(read);
    }
    return shell;
  }

  function renderIntroDetail() {
    var slot = document.getElementById("open-intro");
    if (!slot) return;
    slot.innerHTML = "";
    var item = selectedIntro ? introduced[selectedIntro] : null;
    if (!item) return;
    var wrap = el("div", "act-note");
    var heading = el("h3", "with-money");
    heading.appendChild(document.createTextNode(item.t || item.legis || "Introduced measure"));
    addMoneyChip(heading, item.legis, introTitles(item));
    wrap.appendChild(heading);
    var page = congressBillUrl(item.key);
    var text = textUrl(page);
    if (text) {
      var read = el("p", "intro-read");
      read.appendChild(link(text, textLabel(item.legis || item.key)));
      wrap.appendChild(read);
    }
    wrap.appendChild(el("p", "vote-meta", (item.legis || "") + " · Introduced " + formatDate(item.d)));
    var who = el("p", "");
    appendIntroducers(who, item);
    wrap.appendChild(who);
    if (item.o) {
      var official = el("p", "");
      official.appendChild(paintMoney(item.o));
      wrap.appendChild(official);
    }
    if (item.s) {
      var status = "Latest action";
      if (item.sd) status += ", " + formatDate(item.sd);
      wrap.appendChild(el("p", "", status + ": " + item.s));
    }
    var summary = summaryFor(item.legis);
    if (summary && summary.paragraphs && summary.paragraphs.length) {
      var note = actBlock(item.legis, page);
      if (note) wrap.appendChild(note);
    } else {
      appendSponsors(wrap, { sponsors: introSponsors(item) });
      wrap.appendChild(el("p", "sub", "This is the title in the bill status file. The full text is on Congress.gov."));
    }
    var votes = (billsVoted[item.key] || []).slice().sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return b.n - a.n;
    });
    if (!votes.length) {
      wrap.appendChild(el("p", "", "The roll calls on this page do not include a vote on this measure."));
    } else {
      wrap.appendChild(el("p", "", votes.length === 1 ? "One roll call on this page is about this measure." : votes.length + " roll calls on this page are about this measure."));
      votes.slice(0, 4).forEach(function (vote) {
        var button = el("button", "linkish", (vote.chamber === "senate" ? "Senate roll call " : "House roll call ") + vote.n + " · " + formatDate(vote.date) + " · " + (vote.result || ""));
        button.type = "button";
        button.setAttribute("data-vote", vote.id);
        if (vote.chamber === "senate") button.setAttribute("data-chamber", "senate");
        var holder = el("p", "");
        holder.appendChild(button);
        wrap.appendChild(holder);
      });
    }
    slot.appendChild(wrap);
  }

  function renderIntroduced() {
    var list = document.getElementById("introduced-list");
    var countEl = document.getElementById("introduced-count");
    var more = document.getElementById("introduced-more");
    if (!list || !countEl) return;
    var rows = introducedList.filter(introPasses);
    countEl.textContent = "Showing " + Math.min(rows.length, introLimit) + " of " + introducedList.length + " bills and resolutions introduced in this Congress.";
    if (rows.length !== introducedList.length) countEl.textContent += " " + rows.length + " match the year, result, state, and party chosen above.";
    list.innerHTML = "";
    if (!rows.length) {
      list.appendChild(el("p", "note", "No introduction matches these choices."));
      if (more) more.hidden = true;
      renderIntroDetail();
      return;
    }
    rows.slice(0, introLimit).forEach(function (item) { list.appendChild(introButton(item)); });
    if (more) more.hidden = rows.length <= introLimit;
    renderIntroDetail();
  }

  function matchedIntroduced() {
    var q = interpretedQuery();
    if (!q) return [];
    return introducedList.filter(function (item) { return textMatches(item.blob, q); });
  }

  function matchedFloor() {
    var q = interpretedQuery();
    var items = data.floor && data.floor.items || [];
    if (!q) return [];
    return items.filter(function (item) { return textMatches(floorBlob(item), q); });
  }

  function matchedPeople() {
    var q = interpretedQuery();
    if (!q) return [];
    return data.members.filter(function (member) {
      return passesParty(member) && passesState(member) && textMatches(memberBlob(member), q);
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
    var title = el("strong", "with-money");
    title.appendChild(document.createTextNode(vote.question || vote.legis || "House roll call " + vote.n));
    if (!vote.desc) addMoneyChip(title, vote.legis);
    row.appendChild(title);
    if (vote.desc) {
      var desc = el("p", "with-money");
      desc.appendChild(document.createTextNode(vote.desc));
      addMoneyChip(desc, vote.legis);
      row.appendChild(desc);
    }
    if (vote.legis) row.appendChild(el("p", "vote-meta", vote.legis));
    var sentenceNode = el("p", "act-line");
    var cash = moneyLine(vote.legis);
    if (cash) sentenceNode.appendChild(paintMoney(cash));
    else if (actSentence(vote.legis)) sentenceNode.textContent = actSentence(vote.legis);
    if (sentenceNode.textContent || sentenceNode.childNodes.length) row.appendChild(sentenceNode);
    var people = voteIntroducers(vote);
    if (people.length) {
      var whoRow = el("div", "intro-who");
      var faces = el("div", "intro-faces");
      people.forEach(function (person) {
        faces.appendChild(portrait(person[0], person[1] || "A member", false));
      });
      whoRow.appendChild(faces);
      var who = el("p", "act-line");
      appendIntroducers(who, { p: people });
      whoRow.appendChild(who);
      row.appendChild(whoRow);
    } else {
      var introduced = sponsorLine(vote.legis);
      if (introduced) row.appendChild(el("p", "act-line", introduced));
    }
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
    if (!q && searchPerson) {
      var direct = memberById(searchPerson);
      section.hidden = !direct;
      if (!direct) return;
      countEl.textContent = "1 member.";
      var directRow = el("button", "person-row is-on");
      directRow.type = "button";
      directRow.setAttribute("data-person", direct[0]);
      directRow.appendChild(portrait(direct[0], direct[1], false));
      var directCopy = el("div", "");
      directCopy.appendChild(el("strong", partyClass(direct[2]), direct[1]));
      var directMeta = [direct[5] === "senate" ? "Senator" : "Representative", partyWord(direct[2]), stateName(direct[3])];
      if (direct[11]) directMeta.push(direct[11]);
      if (direct[7]) directMeta.push(direct[7]);
      directCopy.appendChild(el("p", "person-meta", directMeta.filter(Boolean).join(" · ")));
      directRow.appendChild(directCopy);
      list.appendChild(directRow);
      var directCard = contactBlock(direct);
      directCard.classList.add("pinned-card");
      list.appendChild(directCard);
      return;
    }
    if (!q) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    var people = matchedPeople();
    var floorItems = matchedFloor();
    var votes = rankedVotes();
    var pending = Object.keys(summaries).filter(function (key) {
      var item = summaries[key];
      return item && item.pending && !introduced[key] && textMatches(item.blob || "", q);
    }).sort();
    var count = votes.length + (votes.length === 1 ? " House roll call." : " House roll calls.");
    var senateVotes = matchedSenate();
    if (senateVotes.length) count += " " + senateVotes.length + (senateVotes.length === 1 ? " Senate roll call." : " Senate roll calls.");
    if (floorItems.length) count += " " + floorItems.length + " on the floor list.";
    if (pending.length) count += " " + pending.length + (pending.length === 1 ? " bill has no roll call yet." : " bills have no roll call yet.");
    var intros = matchedIntroduced();
    var introShown = intros.slice(0, searchIntroLimit);
    var peopleShown = people.slice(0, searchPeopleLimit);
    var slipRows = slips.filter(slipPasses);
    var presidentHits = matchedPresidents();
    if (presidentHits.length) count += " " + presidentHits.length + (presidentHits.length === 1 ? " president." : " presidents.");
    if (people.length) count += " " + people.length + (people.length === 1 ? " member." : " members.");
    if (intros.length) count += " " + intros.length + " introduced.";
    if (slipRows.length) count += " " + slipRows.length + (slipRows.length === 1 ? " blue slip." : " blue slips.");
    if (intros.length > introShown.length) count += " The first " + introShown.length + " introductions are listed.";
    if (spellNote) count = spellNote + " " + count;
    countEl.textContent = count;
    presidentHits.forEach(function (person) {
      list.appendChild(presidentRow(person));
      if (person.id === openPresident) list.appendChild(presidentCard(person));
    });
    peopleShown.forEach(function (member) {
      var row = el("button", "person-row" + (member[0] === searchPerson ? " is-on" : ""));
      row.type = "button";
      row.setAttribute("data-person", member[0]);
      row.appendChild(portrait(member[0], member[1], false));
      var copy = el("div", "");
      copy.appendChild(el("strong", partyClass(member[2]), member[1]));
      var meta = [member[5] === "senate" ? "Senator" : "Representative", partyWord(member[2]), stateName(member[3])];
      if (member[11]) meta.push(member[11]);
      if (member[7]) meta.push(member[7]);
      copy.appendChild(el("p", "person-meta", meta.join(" · ")));
      row.appendChild(copy);
      list.appendChild(row);
      if (member[0] === searchPerson) {
        var card = contactBlock(member);
        card.classList.add("pinned-card");
        list.appendChild(card);
      }
    });
    if (people.length > peopleShown.length) {
      var morePeople = el("button", "linkish", "Show more members");
      morePeople.type = "button";
      morePeople.setAttribute("data-more", "people");
      var peopleHolder = el("p", "");
      peopleHolder.appendChild(morePeople);
      list.appendChild(peopleHolder);
    }
    floorItems.forEach(function (item) {
      var vote = floorVote(item);
      var row = el(vote ? "button" : "div", "floor-row");
      if (vote) {
        row.type = "button";
        row.setAttribute("data-vote", vote.id);
      }
      var titleNode = el("strong", "with-money");
      titleNode.appendChild(document.createTextNode(item.title || item.legis || "Scheduled item"));
      addMoneyChip(titleNode, item.legis);
      row.appendChild(titleNode);
      var meta = "On the floor list";
      if (item.legis) meta += " · " + item.legis;
      if (item.category) meta += " · " + item.category;
      row.appendChild(el("p", "vote-meta", meta));
      list.appendChild(row);
    });
    pending.forEach(function (key) {
      var item = summaries[key];
      var row = el("div", "floor-row");
      var searchTitle = el("strong", "with-money");
      searchTitle.appendChild(document.createTextNode(item.title || item.legis || "A bill with no roll call"));
      addMoneyChip(searchTitle, item.legis);
      row.appendChild(searchTitle);
      var meta = item.legis || "";
      if (meta) meta += " · ";
      meta += "No House roll call yet";
      row.appendChild(el("p", "vote-meta", meta));
      if (item.status) row.appendChild(el("p", "", item.status));
      list.appendChild(row);
    });
    if (!votes.length && !pending.length && !senateVotes.length && !intros.length && !floorItems.length && !people.length && !slipRows.length) {
      var miss = "Nothing on this page matches this search.";
      countEl.textContent = spellNote ? spellNote + " " + miss : miss;
      list.appendChild(el("p", "note", miss));
      return;
    }
    slipRows.forEach(function (item) { list.appendChild(slipButton(item)); });
    votes.forEach(function (vote) { list.appendChild(voteButton(vote)); });
    senateVotes.forEach(function (vote) { list.appendChild(voteButton(vote)); });
    introShown.forEach(function (item) { list.appendChild(introButton(item)); });
    if (intros.length > introShown.length) {
      var moreIntro = el("button", "linkish", "Show more introductions");
      moreIntro.type = "button";
      moreIntro.setAttribute("data-more", "intro");
      var introHolder = el("p", "");
      introHolder.appendChild(moreIntro);
      list.appendChild(introHolder);
    }
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
      if (side === "X" && code !== "X") return;
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
    var heading = el("h2", "with-money");
    heading.appendChild(document.createTextNode(vote.question || "House roll call " + vote.n));
    if (!vote.desc) addMoneyChip(heading, vote.legis);
    box.appendChild(heading);
    var when = formatDate(vote.date);
    var clock = formatTime(vote.time);
    if (clock) when += " · " + clock;
    when += " · Roll call " + vote.n;
    if (TYPE_LABEL[vote.type] || vote.type) when += " · " + (TYPE_LABEL[vote.type] || vote.type);
    box.appendChild(el("p", "vote-meta", when));
    if (vote.desc) {
      var deck = el("p", "deck with-money");
      deck.appendChild(document.createTextNode(vote.desc));
      addMoneyChip(deck, vote.legis);
      box.appendChild(deck);
    }
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
    box.appendChild(el("p", "sub", "A green state cast more yes votes than no votes. A rose state cast more no votes. A darker color is a larger share of that state's yes and no votes. Plum is a tie. The land color means no yes or no was recorded there."));
    paintMap(vote);

    if (pinned) {
      var person = memberById(pinned);
      if (person) {
        var card = contactBlock(person);
        card.classList.add("pinned-card");
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
    sideSwitch.setAttribute("aria-label", "Who voted");
    [["all", "All"], ["Y", "Yes"], ["N", "No"], ["X", "Did not vote"]].forEach(function (choice) {
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
    if (side === "X") box.appendChild(el("p", "sub", "These members were on this roll call and did not vote. A person who was not in office for this vote is not listed."));
    var groups = peopleOnVote(vote);
    var states = Object.keys(groups).sort(function (a, b) { return stateName(a).localeCompare(stateName(b)); });
    if (!states.length) {
      var empty = "No member matches this party, state, or search on the open roll call.";
      if (side === "Y") empty = "No member who voted yes matches this party, state, or search.";
      if (side === "N") empty = "No member who voted no matches this party, state, or search.";
      if (side === "X") empty = "No member who did not vote matches this party, state, or search.";
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

  var mapVote = null;
  function mapHex() {
    var raw = getComputedStyle(document.documentElement).getPropertyValue("--map").trim();
    return raw.charAt(0) === "#" ? raw.slice(0, 7) : "#ebe4d6";
  }

  function paintMap(vote) {
    mapVote = vote;
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
      var fill = mapHex();
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

  function presidentNumbers(person) {
    var numbers = person.numbers || [];
    var words = numbers.map(ordinal);
    if (words.length < 2) return (words[0] || "") + " President";
    if (words.length === 2) return words[0] + " and " + words[1] + " President";
    return words.slice(0, -1).join(", ") + ", and " + words[words.length - 1] + " President";
  }

  function presidentBlob(person) {
    return [person.name, partyWord(person.party), "president", person.current ? "white house" : "", presidentNumbers(person), person.line || ""].join(" ");
  }

  function matchedPresidents() {
    var q = interpretedQuery();
    return presidents.filter(function (person) {
      if (!passesParty([null, null, person.party])) return false;
      if (!q) return true;
      return textMatches(presidentBlob(person), q);
    });
  }

  function presidentFace(person, large) {
    var letter = (person.name || "?").trim().charAt(0).toUpperCase() || "?";
    var steps = [];
    if (person.photo) steps.push(person.photo);
    if (person.bioguide) {
      steps.push("https://unitedstates.github.io/images/congress/225x275/" + person.bioguide + ".jpg");
      steps.push("https://bioguide.congress.gov/bioguide/photo/" + person.bioguide.charAt(0) + "/" + person.bioguide + ".jpg");
    }
    var klass = large ? "portrait portrait-lg" : "portrait";
    if (!steps.length) return el("span", klass.replace("portrait", "portrait-letter"), letter);
    var img = document.createElement("img");
    img.className = klass;
    img.alt = "Portrait of " + person.name;
    img.loading = "lazy";
    img.decoding = "async";
    var step = 0;
    img.src = steps[0];
    img.addEventListener("error", function () {
      step += 1;
      if (step < steps.length) img.src = steps[step];
      else img.replaceWith(el("span", klass.replace("portrait", "portrait-letter"), letter));
    });
    return img;
  }

  function presidentByHash(hash) {
    var token = hash || "";
    if (token.indexOf("president-") === 0) token = token.slice("president-".length);
    for (var i = 0; i < presidents.length; i++) {
      if (presidents[i].id === token) return presidents[i];
    }
    return null;
  }

  function presidentsNamed(query) {
    return presidents.filter(function (person) {
      if (!passesParty([null, null, person.party])) return false;
      return textMatches(person.name, query);
    });
  }

  function showPresident(id, scroll) {
    openPresident = id || "";
    if (history.replaceState) history.replaceState(null, "", openPresident ? "#president-" + openPresident : "#presidents");
    renderPresidents();
    if (document.getElementById("search-results") && !document.getElementById("search-results").hidden) renderSearchPanel();
    if (!scroll || !openPresident) return;
    var card = document.querySelector("#search-list [data-president-card='" + openPresident + "']")
      || document.querySelector("#president-list [data-president-card='" + openPresident + "']");
    if (card) showPersonCard(card);
  }

  function presidentCard(person) {
    var card = el("div", "person-card");
    card.setAttribute("data-president-card", person.id);
    card.appendChild(presidentFace(person, true));
    var copy = el("div", "person-copy");
    var name = el("h3", "");
    name.appendChild(el("span", partyClass(person.party), person.name));
    copy.appendChild(name);
    if (person.line) copy.appendChild(el("p", "", person.line));
    if (person.url && person.url.indexOf("https://") === 0) {
      var sites = el("p", "");
      sites.appendChild(link(person.url, host(person.url)));
      copy.appendChild(sites);
    } else {
      copy.appendChild(el("p", "note", "No office website is in the executive file for this name."));
    }
    card.appendChild(copy);
    return card;
  }

  function presidentRow(person) {
    var row = el("button", "person-row" + (person.id === openPresident ? " is-on" : ""));
    row.type = "button";
    row.setAttribute("data-president", person.id);
    row.appendChild(presidentFace(person, false));
    var copy = el("div", "");
    copy.appendChild(el("strong", partyClass(person.party), person.name));
    var meta = [partyWord(person.party), presidentNumbers(person)];
    if (person.current) meta.push("In office");
    copy.appendChild(el("p", "person-meta", meta.join(" · ")));
    row.appendChild(copy);
    return row;
  }

  function renderPresidents() {
    var list = document.getElementById("president-list");
    if (!list) return;
    list.innerHTML = "";
    var people = matchedPresidents();
    if (!people.length) {
      list.appendChild(el("p", "note", presidents.length ? "No president matches this party or search." : "The president file did not load."));
      return;
    }
    people.forEach(function (person) {
      list.appendChild(presidentRow(person));
      if (person.id === openPresident) list.appendChild(presidentCard(person));
    });
  }

  function renderSenators() {
    var list = document.getElementById("senator-list");
    list.innerHTML = "";
    var q = interpretedQuery();
    var people = data.members.filter(function (member) {
      if (member[5] !== "senate") return false;
      if (!passesParty(member) || !passesState(member)) return false;
      if (!q) return true;
      return textMatches(memberBlob(member), q);
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
    var heading = el("h2", "with-money");
    heading.appendChild(document.createTextNode(vote.question || "Senate roll call " + vote.n));
    if (!vote.desc) addMoneyChip(heading, vote.legis);
    box.appendChild(heading);
    var when = formatDate(vote.date) + " · Senate roll call " + vote.n;
    box.appendChild(el("p", "vote-meta", when));
    if (vote.desc) {
      var deck = el("p", "deck with-money");
      deck.appendChild(document.createTextNode(vote.desc));
      addMoneyChip(deck, vote.legis);
      box.appendChild(deck);
    }
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
        card.classList.add("pinned-card");
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

  function showPersonCard(card) {
    if (!card) return;
    var root = document.documentElement;
    var previous = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    var header = document.querySelector("header");
    var bar = header ? header.getBoundingClientRect().height : 0;
    var top = card.getBoundingClientRect().top + window.scrollY - bar - 12;
    window.scrollTo(0, Math.max(0, top));
    root.style.scrollBehavior = previous;
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

  function slipSenators(item) {
    if (!item || item.slip === "none") return [];
    return data.members.filter(function (member) {
      return member[5] === "senate" && member[3] === item.state && member[11] !== "Former senator";
    }).sort(function (a, b) { return a[1].localeCompare(b[1]); });
  }

  function slipKind(item) {
    if (item.kind === "circuit") return "Circuit court";
    if (item.kind === "national") return "National court";
    if (item.kind === "territory") return "Territorial court";
    return "District court";
  }

  function slipSentence(item) {
    if (item.slip === "back") return "Both home-state senators returned the blue slip. The committee does not hear a district-court nomination unless both slips come back.";
    if (item.slip === "note") return "A blue slip goes to each home-state senator. The committee can hear a circuit nomination without those slips. This record does not say whether the slips came back.";
    if (item.slip === "none") return "This court has no home-state senators. The committee does not send a blue slip for this nomination.";
    if (/returned to the president/i.test(item.action || "")) return "The Senate returned this nomination to the President. This record does not say whether the blue slips came back.";
    return "A blue slip goes to each home-state senator. The committee has not published a returned slip, and it has not set a hearing.";
  }

  function slipBlob(item) {
    var people = slipSenators(item).map(function (member) { return member[1]; }).join(" ");
    return [item.name, item.court, item.action, item.id, stateName(item.state), slipKind(item), slipSentence(item), people, "blue slip judge"].join(" ");
  }

  function slipPasses(item) {
    var year = yearValue();
    if (year !== "all") {
      var acted = String(item.date || "").slice(0, 4);
      var received = String(item.received || "").slice(0, 4);
      if (acted !== year && received !== year) return false;
    }
    var result = resultValue();
    var action = item.action || "";
    if (result === "Passed" && !/confirmed/i.test(action)) return false;
    if (result === "Failed" && !/returned to the president|rejected/i.test(action)) return false;
    if (result === "Agreed to") return false;
    if (result === "other" && /confirmed|returned to the president|rejected/i.test(action)) return false;
    if (stateCode !== "all" && item.state !== stateCode) return false;
    if (party !== "all" && !slipSenators(item).some(function (member) { return passesParty(member); })) return false;
    var q = interpretedQuery();
    if (!q) return true;
    return textMatches(slipBlob(item), q);
  }

  function slipVote(item) {
    if (!/confirmed/i.test(item.action || "")) return null;
    var name = (item.name || "").toLowerCase();
    if (!name) return null;
    var hits = (data.senateVotes || []).filter(function (vote) {
      return (vote.desc || "").toLowerCase().indexOf(name) >= 0 && /confirmed/i.test(vote.result || "");
    });
    if (!hits.length) return null;
    var dated = hits.filter(function (vote) { return vote.date === item.date; });
    return dated[0] || hits[0];
  }

  function slipWho(node, item) {
    var people = slipSenators(item);
    if (!people.length) return;
    node.appendChild(document.createTextNode(item.slip === "back" ? "Both slips came back. They went to " : "The slips go to "));
    people.forEach(function (member, index) {
      if (index) node.appendChild(document.createTextNode(index === people.length - 1 ? " and " : ", "));
      node.appendChild(document.createTextNode("Senator "));
      node.appendChild(el("span", partyClass(member[2]), member[1]));
    });
    node.appendChild(document.createTextNode("."));
  }

  function nomineeFace(item, large) {
    var letter = (item.name || "?").trim().charAt(0).toUpperCase() || "?";
    var className = large ? "portrait portrait-lg" : "portrait";
    if (!item.photo) return el("span", className.replace("portrait", "portrait-letter"), letter);
    var img = document.createElement("img");
    img.className = className;
    img.alt = "Portrait of " + (item.name || "the nominee");
    img.loading = "lazy";
    img.decoding = "async";
    img.addEventListener("error", function () {
      img.replaceWith(el("span", className.replace("portrait", "portrait-letter"), letter));
    });
    img.src = item.photo;
    return img;
  }

  function slipButton(item) {
    var shell = el("div", "slip-row slip-" + (item.slip || "out") + (item.id === selectedSlip ? " is-on" : ""));
    var row = el("button", "vote-row");
    row.type = "button";
    row.setAttribute("data-slip", item.id);
    row.appendChild(nomineeFace(item, false));
    var when = formatDate(item.date || item.received) + " · " + slipKind(item);
    if (item.state) when += " · " + stateName(item.state);
    row.appendChild(el("p", "vote-meta", when));
    row.appendChild(el("strong", "", item.name || "Judicial nomination"));
    if (item.court) row.appendChild(el("p", "", item.court));
    row.appendChild(el("p", "act-line", slipSentence(item)));
    var people = slipSenators(item);
    if (people.length) {
      var whoRow = el("div", "intro-who");
      var faces = el("div", "intro-faces");
      people.forEach(function (member) { faces.appendChild(portrait(member[0], member[1], false)); });
      whoRow.appendChild(faces);
      var who = el("p", "act-line");
      slipWho(who, item);
      whoRow.appendChild(who);
      row.appendChild(whoRow);
    }
    if (item.action) row.appendChild(el("p", "vote-meta", item.action));
    shell.appendChild(row);
    return shell;
  }

  function renderSlipDetail() {
    var box = document.getElementById("open-slip");
    if (!box) return;
    box.innerHTML = "";
    var item = null;
    slips.forEach(function (row) { if (row.id === selectedSlip) item = row; });
    if (!item) return;
    var wrap = el("div", "act-note");
    var card = el("div", "person-card");
    card.appendChild(nomineeFace(item, true));
    var copy = el("div", "person-copy");
    copy.appendChild(el("h3", "", item.name || "Judicial nomination"));
    copy.appendChild(el("p", "vote-meta", [slipKind(item), item.state ? stateName(item.state) : "", formatDate(item.date || item.received)].filter(Boolean).join(" · ")));
    if (item.court) copy.appendChild(el("p", "", item.court + "."));
    copy.appendChild(el("p", "", slipSentence(item)));
    card.appendChild(copy);
    wrap.appendChild(card);
    if (item.received) wrap.appendChild(el("p", "", "Received " + formatDate(item.received) + "."));
    if (item.action) wrap.appendChild(el("p", "", "Latest action, " + formatDate(item.date) + ": " + item.action));
    if (item.url) {
      var links = el("p", "");
      links.appendChild(link(item.url, item.id || "Nomination"));
      wrap.appendChild(links);
    }
    var vote = slipVote(item);
    if (vote) {
      var button = el("button", "linkish", "Senate roll call " + vote.n + " · " + formatDate(vote.date) + " · " + (vote.result || ""));
      button.type = "button";
      button.setAttribute("data-vote", vote.id);
      button.setAttribute("data-chamber", "senate");
      var holder = el("p", "");
      holder.appendChild(button);
      wrap.appendChild(holder);
    }
    var people = slipSenators(item);
    if (people.length) {
      wrap.appendChild(el("h3", "", people.length === 1 ? "Home-state senator" : "Home-state senators"));
      people.forEach(function (member) {
        var row = el("button", "person-row" + (member[0] === pinned ? " is-on" : ""));
        row.type = "button";
        row.setAttribute("data-person", member[0]);
        row.appendChild(portrait(member[0], member[1], false));
        var copy = el("div", "");
        copy.appendChild(el("strong", partyClass(member[2]), member[1]));
        var meta = ["Senator", partyWord(member[2]), stateName(member[3])];
        if (member[11]) meta.push(member[11]);
        if (member[6]) meta.push(member[6]);
        copy.appendChild(el("p", "person-meta", meta.join(" · ")));
        row.appendChild(copy);
        wrap.appendChild(row);
      });
    }
    var person = pinned ? memberById(pinned) : null;
    if (person && people.some(function (member) { return member[0] === person[0]; })) {
      var card = contactBlock(person);
      card.classList.add("pinned-card");
      var clear = el("p", "");
      var close = el("button", "linkish", "Close this member");
      close.type = "button";
      close.addEventListener("click", function () {
        pinned = "";
        renderSlipDetail();
      });
      clear.appendChild(close);
      card.querySelector(".person-copy").appendChild(clear);
      wrap.appendChild(card);
    }
    box.appendChild(wrap);
  }

  function renderSlips() {
    var list = document.getElementById("slip-list");
    var countEl = document.getElementById("slip-count");
    if (!list || !countEl) return;
    var rows = slips.filter(slipPasses);
    countEl.textContent = slipCountText();
    list.innerHTML = "";
    if (!slips.length) {
      list.appendChild(el("p", "note", "The blue slip file did not load."));
      var missing = document.getElementById("open-slip");
      if (missing) missing.innerHTML = "";
      return;
    }
    if (!rows.length) {
      list.appendChild(el("p", "note", "No blue slip matches these choices."));
      renderSlipDetail();
      return;
    }
    rows.forEach(function (item) { list.appendChild(slipButton(item)); });
    renderSlipDetail();
  }

  function slipCountText() {
    var rows = slips.filter(slipPasses);
    var count = "Showing " + rows.length + " of " + slips.length + " judicial nominations.";
    if (spellNote) count = spellNote + " " + count;
    if (slipNote) count += " " + slipNote;
    return count;
  }

  function stateCodeFromName(name) {
    var text = String(name || "").replace(/\s+/g, " ").trim().replace(/\.+$/, "").toLowerCase();
    if (STATE_CODE[text]) return STATE_CODE[text];
    if (text.indexOf("the ") === 0 && STATE_CODE[text.slice(4)]) return STATE_CODE[text.slice(4)];
    return "";
  }

  function courtState(court) {
    var match = /(?:Northern|Southern|Eastern|Western|Middle|Central) District of (.+)$|District Court of (?:the )?(.+)$|District of (.+)$/.exec(court || "");
    if (!match) return "";
    var name = (match[1] || match[2] || match[3]).split(/\bfor\b|,/)[0];
    return stateCodeFromName(name);
  }

  function slipKindCode(court) {
    var text = court || "";
    if (text.indexOf("Circuit Judge") >= 0) return "circuit";
    if (/International Trade|Federal Claims|Federal Circuit|Supreme Court/.test(text)) return "national";
    if (/Virgin Islands|Guam|Northern Mariana|Puerto Rico/.test(text)) return "territory";
    if (text.indexOf("District Judge") >= 0 || text.indexOf("District Court") >= 0) return "district";
    return "other";
  }

  function slipMark(kind, state, action) {
    var moved = /hearings held|executive calendar|confirmed by the senate|ordered to be reported|cloture/i.test(action || "");
    if (NO_SENATE[state]) return "none";
    if (kind === "circuit") return "note";
    if (kind === "district" && moved) return "back";
    if (kind === "district") return "out";
    return "none";
  }

  function slipRank(action) {
    var text = (action || "").toLowerCase();
    if (text.indexOf("confirmed") >= 0) return 4;
    if (/executive calendar|ordered to be reported|cloture/.test(text)) return 3;
    if (/hearings held|returned to the president|rejected/.test(text)) return 2;
    return 1;
  }

  function latestAction(row) {
    var action = row.latestAction;
    if (!action) return null;
    if (action.length) action = action[0];
    if (!action || !action.text) return null;
    return {
      date: String(action.actionDate || "").slice(0, 10),
      text: String(action.text).replace(/\s+/g, " ").trim()
    };
  }

  function slipId(row) {
    if (row.citation) return String(row.citation).replace(/\s+/g, "");
    var part = String(row.partNumber || "00");
    var suffix = part !== "00" && part !== "0" ? "-" + String(+part || part) : "";
    return "PN" + row.number + suffix;
  }

  function slipPage(row) {
    var citation = /PN(\d+)(?:-(\d+))?/.exec(String(row.citation || ""));
    var number = (citation && citation[1]) || row.number;
    var part = (citation && citation[2]) || "";
    if (!part) {
      var raw = String(row.partNumber || "00");
      if (raw !== "00" && raw !== "0") part = String(+raw || raw);
    }
    var base = "https://www.congress.gov/nomination/119th-congress/" + number;
    return part ? base + "/" + part : base;
  }

  function slipFromApi(row) {
    var desc = String(row.description || "").replace(/\s+/g, " ").trim();
    var match = /^(.+), of ([^,]+), to be (.+?)(?:, vice .*)?\.?$/.exec(desc);
    if (!match || !/Judge|Justice/.test(match[3])) return null;
    var action = latestAction(row);
    if (!action || !action.date) return null;
    var court = match[3].replace(/\.\s*$/, "").trim();
    var kind = slipKindCode(court);
    var home = stateCodeFromName(match[2]);
    var state = kind === "district" || kind === "territory" ? courtState(court) : home;
    if (!state) state = home;
    var vote = /Record Vote Number:\s*(\d+)/.exec(action.text);
    var item = {
      id: slipId(row),
      name: match[1].replace(/\s+/g, " ").trim(),
      state: state,
      court: court,
      kind: kind,
      slip: slipMark(kind, state, action.text),
      received: String(row.receivedDate || "").slice(0, 10),
      date: action.date,
      action: action.text,
      vote: vote ? +vote[1] : null,
      url: slipPage(row),
      live: true
    };
    if (home && home !== state) item.home = home;
    return item;
  }

  function slipPhoto(name) {
    var photo = "";
    slips.forEach(function (row) {
      if (row.name === name && row.photo) photo = row.photo;
    });
    return photo;
  }

  function applySlip(item) {
    if (!item || !item.id) return "";
    var index = -1;
    slips.forEach(function (row, i) { if (row.id === item.id) index = i; });
    if (index < 0) {
      if (!item.photo) item.photo = slipPhoto(item.name);
      if (!item.photo) delete item.photo;
      slips.push(item);
      return "added";
    }
    var current = slips[index];
    var newer = item.date > current.date || (item.date === current.date && slipRank(item.action) > slipRank(current.action));
    if (!newer) return "";
    if (current.photo) item.photo = current.photo;
    else if (!item.photo) delete item.photo;
    slips[index] = item;
    return "updated";
  }

  function sortSlips() {
    slips.sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      if (a.name === b.name) return 0;
      return a.name < b.name ? 1 : -1;
    });
  }

  function slipSince() {
    var newest = "";
    slips.forEach(function (item) {
      if (item.date && item.date > newest) newest = item.date;
    });
    return (newest || "2025-01-03") + "T00:00:00Z";
  }

  function listNominations(offset, rows, since) {
    var path = "/nomination/119?limit=250&offset=" + offset;
    if (since) path += "&fromDateTime=" + encodeURIComponent(since);
    return api(path).then(function (response) {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    }).then(function (body) {
      var page = body.nominations || [];
      var all = rows.concat(page);
      if (body.pagination && body.pagination.next && page.length && all.length < 1000) {
        return listNominations(offset + page.length, all, since);
      }
      return all;
    });
  }

  function storeLiveSlips() {
    try {
      var extra = slips.filter(function (item) { return item.live; });
      sessionStorage.setItem("lv-slips-live", JSON.stringify({ at: Date.now(), slips: extra }));
    } catch (error) { /* A full storage box still leaves the page usable. */ }
  }

  function restoreLiveSlips() {
    try {
      var saved = JSON.parse(sessionStorage.getItem("lv-slips-live") || "null");
      if (!saved || !saved.slips) return;
      saved.slips.forEach(applySlip);
      sortSlips();
    } catch (error) { /* Ignore a broken saved check. */ }
  }

  function finishSlips(note, changed) {
    slipChecking = false;
    slipNote = note;
    if (!changed) {
      var countEl = document.getElementById("slip-count");
      if (countEl) countEl.textContent = slipCountText();
      return;
    }
    var list = document.getElementById("slip-list");
    var top = list ? list.scrollTop : 0;
    indexWords();
    renderSlips();
    if (list) list.scrollTop = top;
  }

  function checkSlips() {
    if (slipChecking) return;
    var last = 0;
    try { last = +sessionStorage.getItem("lv-slips-checked") || 0; } catch (error) { last = 0; }
    if (Date.now() - last < 19 * 60 * 1000) return;
    slipChecking = true;
    slipNote = "Checking Congress.gov for blue slips.";
    var countEl = document.getElementById("slip-count");
    if (countEl) countEl.textContent = slipCountText();
    listNominations(0, [], slipSince()).catch(function (error) {
      if (String(error && error.message || "") !== "400") throw error;
      return listNominations(0, [], "");
    }).then(function (rows) {
      var added = 0;
      var updated = 0;
      rows.forEach(function (row) {
        var change = applySlip(slipFromApi(row));
        if (change === "added") added += 1;
        if (change === "updated") updated += 1;
      });
      if (added || updated) sortSlips();
      try { sessionStorage.setItem("lv-slips-checked", String(Date.now())); } catch (error) { /* ignore */ }
      if (added || updated) storeLiveSlips();
      var note = "Congress.gov lists no judicial nomination newer than this copy.";
      if (added || updated) {
        var parts = [];
        if (added) parts.push(added + (added === 1 ? " new judicial nomination" : " new judicial nominations"));
        if (updated) parts.push("updated " + updated);
        note = "Congress.gov " + parts.join(" and ") + ".";
      }
      finishSlips(note, added + updated > 0);
    }).catch(function (error) {
      var message = String(error && error.message || "");
      finishSlips(message === "429" || message === "403"
        ? "Congress.gov asked this browser to wait. The saved copy is on the page."
        : "Congress.gov did not answer. The saved copy is on the page.", false);
    });
  }

  function chooseSlip(id, scroll) {
    selectedSlip = id;
    if (history.replaceState) history.replaceState(null, "", "#slip-" + id);
    renderSlips();
    if (scroll) {
      var open = document.getElementById("open-slip");
      if (open) open.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function render() {
    queryCacheRaw = null;
    renderFloor();
    renderSearchPanel();
    renderTaxpayer();
    renderIntroduced();
    renderPending();
    renderVotes();
    renderDetail();
    renderSenateVotes();
    renderSenateDetail();
    renderSlips();
    renderPresidents();
    renderSenators();
    loadMap();
  }

  function renderMatches() {
    queryCacheRaw = null;
    renderSearchPanel();
    renderTaxpayer();
    renderIntroduced();
    renderPending();
    renderVotes();
    renderDetail();
    renderSenateVotes();
    renderSenateDetail();
    renderSlips();
    renderPresidents();
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
    indexIntroduced();
    indexTaxpayer();
    indexWords();
    indexMembers();
    indexBills();
    restoreLive();
    restoreLiveSlips();
    fillStates();
    var votes = sortedVotes();
    var hash = location.hash.replace(/^#/, "");
    selected = votes.some(function (vote) { return vote.id === hash; }) ? hash : (votes[0] ? votes[0].id : "");
    selectedSenate = data.senateVotes.some(function (vote) { return vote.id === hash; }) ? hash : (data.senateVotes[0] ? data.senateVotes[0].id : "");
    if (hash.indexOf("i-") === 0 && introduced[hash.slice(2)]) selectedIntro = hash.slice(2);
    if (hash.indexOf("slip-") === 0 && slips.some(function (item) { return item.id === hash.slice(5); })) selectedSlip = hash.slice(5);
    if (hash.indexOf("p-") === 0 && memberById(hash.slice(2))) searchPerson = hash.slice(2);
    var hashedPresident = presidentByHash(hash);
    if (hashedPresident) openPresident = hashedPresident.id;
    renderStatus("");
    render();
    if (openPresident) {
      var presidentCardNode = document.querySelector("[data-president-card='" + openPresident + "']");
      if (presidentCardNode) showPersonCard(presidentCardNode);
    } else if (searchPerson) {
      var foundPerson = document.getElementById("search-results");
      if (foundPerson) foundPerson.scrollIntoView({ block: "start" });
    } else if (hash.indexOf("i-") === 0 && selectedIntro) {
      var openIntro = document.getElementById("open-intro");
      if (openIntro && openIntro.firstChild) openIntro.scrollIntoView({ block: "start" });
    } else if (hash && hash === selected) {
      var openVote = document.getElementById("open-vote");
      if (openVote && openVote.firstChild) openVote.scrollIntoView({ block: "start" });
    } else if (hash.indexOf("slip-") === 0 && selectedSlip) {
      var openSlip = document.getElementById("open-slip");
      if (openSlip && openSlip.firstChild) openSlip.scrollIntoView({ block: "start" });
    } else if (hash && hash === selectedSenate) {
      var openSenate = document.getElementById("open-senate");
      if (openSenate && openSenate.firstChild) openSenate.scrollIntoView({ block: "start" });
    }
    function clearSearch() {
      appliedQuery = "";
      searchPerson = "";
      searchIntroLimit = 100;
      searchPeopleLimit = 80;
      queryCacheRaw = null;
      var input = document.getElementById("congress-q");
      if (input) input.value = "";
      renderMatches();
    }
    document.getElementById("congress-find").addEventListener("submit", function (event) {
      event.preventDefault();
      appliedQuery = (document.getElementById("congress-q").value || "").trim().toLowerCase();
      searchPerson = "";
      searchIntroLimit = 100;
      searchPeopleLimit = 80;
      queryCacheRaw = null;
      var named = presidentsNamed(interpretedQuery());
      if (named.length === 1) openPresident = named[0].id;
      renderMatches();
      var landed = openPresident && document.querySelector("#search-list [data-president-card='" + openPresident + "']");
      if (landed) {
        showPersonCard(landed);
        if (history.replaceState) history.replaceState(null, "", "#president-" + openPresident);
      } else {
        var section = document.getElementById("search-results");
        if (appliedQuery && section && !section.hidden) section.scrollIntoView({ block: "nearest" });
      }
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
    document.getElementById("taxpayer").addEventListener("click", function (event) {
      var button = event.target.closest("button[data-money]");
      if (!button) return;
      var key = button.getAttribute("data-money");
      if (introduced[key]) {
        selectedIntro = key;
        if (history.replaceState) history.replaceState(null, "", "#i-" + key);
        renderIntroduced();
        showPersonCard(document.getElementById("open-intro"));
        return;
      }
      var votes = (billsVoted[key] || []).slice().sort(function (a, b) {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return b.n - a.n;
      });
      if (!votes.length) return;
      if (votes[0].chamber === "senate") chooseSenate(votes[0].id, true);
      else choose(votes[0].id, true);
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
      var more = event.target.closest("button[data-more]");
      if (more) {
        if (more.getAttribute("data-more") === "intro") searchIntroLimit += 100;
        if (more.getAttribute("data-more") === "people") searchPeopleLimit += 80;
        renderSearchPanel();
        return;
      }
      var president = event.target.closest("button[data-president]");
      if (president) {
        showPresident(president.getAttribute("data-president"), true);
        return;
      }
      var person = event.target.closest("button[data-person]");
      if (person) {
        searchPerson = person.getAttribute("data-person");
        renderSearchPanel();
        showPersonCard(document.querySelector("#search-list .pinned-card"));
        return;
      }
      var slip = event.target.closest("button[data-slip]");
      if (slip) {
        chooseSlip(slip.getAttribute("data-slip"), true);
        return;
      }
      var intro = event.target.closest("button[data-intro]");
      if (intro) {
        selectedIntro = intro.getAttribute("data-intro");
        if (history.replaceState) history.replaceState(null, "", "#i-" + selectedIntro);
        renderIntroduced();
        showPersonCard(document.getElementById("open-intro"));
        return;
      }
      var button = event.target.closest("button[data-vote]");
      if (!button) return;
      if (button.getAttribute("data-chamber") === "senate") chooseSenate(button.getAttribute("data-vote"), true);
      else choose(button.getAttribute("data-vote"), true);
    });
    document.getElementById("introduced").addEventListener("click", function (event) {
      var vote = event.target.closest("button[data-vote]");
      if (vote) {
        if (vote.getAttribute("data-chamber") === "senate") chooseSenate(vote.getAttribute("data-vote"), true);
        else choose(vote.getAttribute("data-vote"), true);
        return;
      }
      if (event.target.closest("#introduced-more")) {
        introLimit += 80;
        renderIntroduced();
        return;
      }
      var button = event.target.closest("button[data-intro]");
      if (!button) return;
      selectedIntro = button.getAttribute("data-intro");
      if (history.replaceState) history.replaceState(null, "", "#i-" + selectedIntro);
      renderIntroduced();
      showPersonCard(document.getElementById("open-intro"));
    });
    var slipList = document.getElementById("blue-slips");
    if (slipList) slipList.addEventListener("click", function (event) {
      var vote = event.target.closest("button[data-vote]");
      if (vote) {
        chooseSenate(vote.getAttribute("data-vote"), true);
        return;
      }
      var button = event.target.closest("button[data-slip]");
      if (button) chooseSlip(button.getAttribute("data-slip"), true);
    });
    document.getElementById("president-list").addEventListener("click", function (event) {
      var button = event.target.closest("button[data-president]");
      if (!button) return;
      var id = button.getAttribute("data-president");
      showPresident(openPresident === id ? "" : id, openPresident !== id);
    });
    document.getElementById("senate-list").addEventListener("click", function (event) {
      var button = event.target.closest("button[data-vote]");
      if (button) chooseSenate(button.getAttribute("data-vote"), true);
    });
    document.body.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-person]");
      if (!button || event.target.closest("#search-list")) return;
      pinned = button.getAttribute("data-person");
      if (event.target.closest("#open-senate")) {
        renderSenateDetail();
        showPersonCard(document.querySelector("#open-senate .pinned-card"));
        return;
      }
      if (event.target.closest("#open-slip")) {
        renderSlipDetail();
        showPersonCard(document.querySelector("#open-slip .pinned-card"));
        return;
      }
      renderDetail();
      renderSenators();
      showPersonCard(document.querySelector("#open-vote .pinned-card"));
    });
    document.getElementById("congress-check").addEventListener("click", function () { checkLive(true); });
    checkLive(false);
    setInterval(function () { checkLive(false); }, 20 * 60 * 1000);
    setTimeout(checkSlips, 8000);
    setInterval(checkSlips, 20 * 60 * 1000);
  }

  function published(path) {
    return path + (path.indexOf("?") < 0 ? "?" : "&") + "t=" + Math.floor(Date.now() / 3600000);
  }
  fetch(published("congress/votes.json?v=1")).then(function (response) {
    if (!response.ok) throw new Error(String(response.status));
    return response.json();
  }).then(function (payload) {
    return fetch(published("congress/summaries.json?v=4")).then(function (response) {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    }).then(function (extra) {
      summaries = extra || {};
        return fetch(published("congress/money.json?v=1")).then(function (response) {
        if (!response.ok) return {};
        return response.json();
      }).catch(function () {
        return {};
      }).then(function (extraMoney) {
        money = extraMoney || {};
        return fetch(published("congress/introduced.json?v=1")).then(function (response) {
          if (!response.ok) return {};
          return response.json();
        }).catch(function () {
          return {};
        }).then(function (extraIntro) {
          introduced = extraIntro || {};
          return fetch(published("congress/senate.json?v=1")).then(function (response) {
            if (!response.ok) throw new Error(String(response.status));
            return response.json();
          }).then(function (senate) {
            payload.senate = senate;
            return payload;
          }).catch(function () {
            payload.senate = null;
            return payload;
          }).then(function (ready) {
            return fetch(published("congress/slips.json?v=3")).then(function (response) {
              if (!response.ok) return { slips: [] };
              return response.json();
            }).catch(function () {
              return { slips: [] };
            }).then(function (extraSlips) {
              slips = (extraSlips && extraSlips.slips) || [];
              return fetch(published("congress/presidents.json?v=1")).then(function (response) {
                if (!response.ok) return { people: [] };
                return response.json();
              }).catch(function () {
                return { people: [] };
              }).then(function (extraPresidents) {
                presidents = (extraPresidents && extraPresidents.people) || [];
                return ready;
              });
            });
          });
        });
      });
    }).catch(function () {
      summaries = {};
      return payload;
    });
  }).then(boot).catch(function () {
    document.getElementById("congress-status").textContent = "The roll call file did not load.";
  });

  var jumpLinks = document.querySelectorAll(".jump a");
  Array.prototype.forEach.call(jumpLinks, function (anchor) {
    anchor.addEventListener("click", function (event) {
      var id = (anchor.getAttribute("href") || "").slice(1);
      var target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      if (id !== "congress-find" && document.activeElement && document.activeElement.blur) document.activeElement.blur();
      var root = document.documentElement;
      var previous = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      target.scrollIntoView();
      root.style.scrollBehavior = previous;
      if (id === "congress-find") {
        var box = document.getElementById("congress-q");
        if (box) box.focus({ preventScroll: true });
      }
      if (history.pushState) history.pushState(null, "", "#" + id);
    });
  });
  new MutationObserver(function () {
    if (mapVote) paintMap(mapVote);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
})();
