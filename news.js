(function () {
  var source = "all";
  var showEarlier = false;
  var earlierBtn = document.getElementById("earlier");
  var empty = document.getElementById("news-empty");
  var reader = document.getElementById("reader");
  var frame = document.getElementById("reader-frame");
  var pageInput = document.getElementById("reader-page");
  var prev = document.getElementById("reader-prev");
  var next = document.getElementById("reader-next");
  var openLink = document.getElementById("reader-open");
  var pageTools = document.getElementById("page-tools");
  var issuePick = document.getElementById("issue-pick");
  var issueSelect = document.getElementById("reader-issue");
  var state = {
    url: "https://digital.emagazines.com/american_scientist/20261013/index.html?t=b982dc37-91a1-488d-a03e-b2309097ae6a&pne=1",
    turn: "hash",
    page: 1,
    label: issueSelect ? issueSelect.options[issueSelect.selectedIndex].textContent : "November–December 2026"
  };

  function frameSrc() {
    if (state.turn === "hash") return state.url + "#p" + state.page;
    if (state.turn === "path") return state.url.replace(/\/page\/\d+\/?/, "/page/" + state.page);
    return state.url;
  }

  function paintFrame() {
    var paging = state.turn !== "none";
    pageTools.hidden = !paging;
    prev.disabled = !paging || state.page <= 1;
    pageInput.value = String(state.page);
    if (issuePick) issuePick.hidden = state.turn !== "hash";
    openLink.href = state.turn === "hash" ? state.url + "#p" + state.page : frameSrc();
    frame.title = "American Scientist, " + state.label + ", page " + state.page;
    frame.src = frameSrc();
  }

  function load(url, turn, page) {
    state.url = url;
    state.turn = turn || "none";
    state.page = page || 1;
    paintFrame();
  }

  function chooseIssue(url, page) {
    if (issueSelect) {
      for (var i = 0; i < issueSelect.options.length; i++) {
        if (issueSelect.options[i].value === url) {
          issueSelect.selectedIndex = i;
          state.label = issueSelect.options[i].textContent;
          break;
        }
      }
    }
    load(url, "hash", page || 1);
    paintIssueMenu();
  }

  var paintIssueMenu = function () {};

  function buildIssueMenu() {
    if (!issueSelect || document.getElementById("issue-menu")) return;
    var meta = {};
    document.querySelectorAll("#journal .story").forEach(function (story) {
      var heading = story.querySelector("h3");
      if (!heading) return;
      var full = heading.textContent.trim();
      var date = full.split(".")[0].trim();
      var theme = full.slice(date.length).replace(/^\.\s*/, "").replace(/\.$/, "").trim();
      var piece = story.querySelector(".piece-title");
      var feature = piece ? piece.textContent.replace(/^[“"”]+|[“"”]+$/g, "").trim() : "";
      var image = story.querySelector(".shot img");
      meta[date] = { title: theme || feature, cover: image ? image.getAttribute("src") : "" };
    });
    function infoFor(label) {
      if (meta[label]) return meta[label];
      var year = (label.match(/\d{4}/) || [""])[0];
      var month = label.replace(/\d{4}/, "").split(/[–-]/)[0].trim();
      var keys = Object.keys(meta);
      for (var i = 0; i < keys.length; i++) {
        if (year && keys[i].indexOf(year) !== -1 && keys[i].indexOf(month) === 0) return meta[keys[i]];
      }
      return { title: "", cover: "" };
    }
    function coverNode(src, lazy) {
      var img = document.createElement("img");
      img.alt = "";
      if (src) {
        if (lazy) img.loading = "lazy";
        img.src = src;
      } else img.hidden = true;
      return img;
    }
    function fill(node, label, info, lazy) {
      node.textContent = "";
      node.appendChild(coverNode(info.cover, lazy));
      var text = document.createElement("span");
      var date = document.createElement("span");
      date.className = "issue-date";
      date.textContent = label;
      text.appendChild(date);
      if (info.title) {
        var title = document.createElement("span");
        title.className = "issue-title";
        title.textContent = info.title;
        text.appendChild(title);
      }
      node.appendChild(text);
    }
    var menu = document.createElement("div");
    menu.className = "issue-menu";
    menu.id = "issue-menu";
    var current = document.createElement("button");
    current.type = "button";
    current.id = "issue-button";
    current.className = "issue-current";
    current.setAttribute("aria-haspopup", "listbox");
    current.setAttribute("aria-expanded", "false");
    current.setAttribute("aria-controls", "issue-list");
    var list = document.createElement("div");
    list.id = "issue-list";
    list.className = "issue-list";
    list.hidden = true;
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", "Issue");
    var label = document.querySelector("label[for='reader-issue']");
    if (label) label.htmlFor = "issue-button";
    issueSelect.querySelectorAll("optgroup").forEach(function (group) {
      var year = document.createElement("p");
      year.className = "issue-year";
      year.textContent = group.label;
      list.appendChild(year);
      group.querySelectorAll("option").forEach(function (opt) {
        var row = document.createElement("button");
        row.type = "button";
        row.className = "issue-row";
        row.setAttribute("role", "option");
        fill(row, opt.textContent.trim(), infoFor(opt.textContent.trim()), true);
        row.addEventListener("click", function () {
          list.hidden = true;
          current.setAttribute("aria-expanded", "false");
          chooseIssue(opt.value);
        });
        list.appendChild(row);
      });
    });
    current.addEventListener("click", function () {
      var open = list.hidden;
      if (open) {
        var root = document.documentElement;
        var prev = root.style.scrollBehavior;
        root.style.scrollBehavior = "auto";
        current.scrollIntoView({block: "center"});
        root.style.scrollBehavior = prev;
        var rect = current.getBoundingClientRect();
        var below = window.innerHeight - rect.bottom;
        var above = rect.top;
        var up = below < 280 && above > below;
        list.classList.toggle("is-up", up);
        var room = (up ? above : below) - 12;
        list.style.maxHeight = Math.max(180, Math.min(440, room)) + "px";
      }
      list.hidden = !open;
      current.setAttribute("aria-expanded", open ? "true" : "false");
      if (!list.hidden) {
        var selected = list.querySelector("[aria-selected='true']");
        if (selected) selected.scrollIntoView({ block: "nearest" });
      }
    });
    document.addEventListener("click", function (event) {
      if (menu.contains(event.target)) return;
      list.hidden = true;
      current.setAttribute("aria-expanded", "false");
    });
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape" || list.hidden) return;
      list.hidden = true;
      current.setAttribute("aria-expanded", "false");
    });
    menu.appendChild(current);
    menu.appendChild(list);
    issueSelect.insertAdjacentElement("afterend", menu);
    issueSelect.classList.add("issue-native");
    issueSelect.setAttribute("aria-hidden", "true");
    issueSelect.tabIndex = -1;
    paintIssueMenu = function () {
      var opt = issueSelect.options[issueSelect.selectedIndex];
      if (!opt) return;
      var labelText = opt.textContent.trim();
      fill(current, labelText, infoFor(labelText));
      current.setAttribute("aria-label", "Issue, " + labelText + (infoFor(labelText).title ? ", " + infoFor(labelText).title : ""));
      list.querySelectorAll(".issue-row").forEach(function (row) {
        var date = row.querySelector(".issue-date");
        var on = date && date.textContent === labelText;
        row.setAttribute("aria-selected", on ? "true" : "false");
      });
    };
    paintIssueMenu();
  }

  function apply() {
    var shown = 0;
    document.querySelectorAll(".desk").forEach(function (section) {
      var any = false;
      section.querySelectorAll(".story").forEach(function (story) {
        var earlier = story.getAttribute("data-earlier") === "true";
        var picked = story.classList.contains("is-open");
        var show = (source === "all" || story.getAttribute("data-source") === source) && ((!earlier || showEarlier) || picked);
        story.hidden = !show;
        if (show) any = true;
      });
      section.hidden = !any;
      if (any) shown += 1;
    });
    if (reader) reader.hidden = source === "weekly" || source === "feed" || source === "note";
    if (empty) empty.hidden = shown > 0;
  }

  var sourceBar = document.querySelector(".sources");
  if (sourceBar) sourceBar.addEventListener("click", function (event) {
    var button = event.target.closest && event.target.closest("button[data-source]");
    if (!button || !sourceBar.contains(button)) return;
    source = button.getAttribute("data-source");
    sourceBar.querySelectorAll("button").forEach(function (other) {
      other.setAttribute("aria-pressed", other === button ? "true" : "false");
    });
    apply();
  });

  document.addEventListener("click", function (event) {
    var button = event.target.closest && event.target.closest(".read-here");
    if (!button) return;
    var turn = button.getAttribute("data-turn");
    var url = button.getAttribute("data-url");
    if (turn === "hash") chooseIssue(url);
    reader.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  if (issueSelect) {
    issueSelect.addEventListener("change", function () {
      var picked = issueSelect.options[issueSelect.selectedIndex];
      state.label = picked.textContent;
      chooseIssue(picked.value);
    });
    var byLabel = {};
    Array.prototype.forEach.call(issueSelect.options, function (opt) {
      byLabel[opt.textContent] = opt.value;
    });
    document.querySelectorAll("#journal .story").forEach(function (story) {
      var heading = story.querySelector("h3");
      if (!heading) return;
      var key = heading.textContent.split(".")[0].trim();
      var url = byLabel[key];
      if (!url || story.querySelector(".read-here")) return;
      var host = story.querySelector(".actions, .src");
      if (!host) return;
      var button = document.createElement("button");
      button.type = "button";
      button.className = "read-here";
      button.setAttribute("data-turn", "hash");
      button.setAttribute("data-url", url);
      button.textContent = "Read in the frame";
      host.insertBefore(button, host.firstChild);
    });
  }

  prev.addEventListener("click", function () {
    if (state.page <= 1) return;
    state.page -= 1;
    paintFrame();
  });
  next.addEventListener("click", function () {
    state.page += 1;
    paintFrame();
  });
  document.getElementById("reader-go").addEventListener("click", function () {
    var n = parseInt(pageInput.value, 10);
    if (!n || n < 1) n = 1;
    state.page = n;
    paintFrame();
  });
  pageInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      document.getElementById("reader-go").click();
    }
  });

  if (earlierBtn) {
    earlierBtn.addEventListener("click", function () {
      showEarlier = !showEarlier;
      earlierBtn.setAttribute("aria-pressed", showEarlier ? "true" : "false");
      earlierBtn.textContent = showEarlier ? "Hide previous posts" : "Previous posts";
      apply();
      var firstEarlier = document.querySelector("#feed [data-earlier='true']");
      if (showEarlier && firstEarlier) firstEarlier.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function activityId(url) {
    var match = String(url).match(/activity[:-](\d+)/);
    return match ? match[1] : String(url);
  }

  function knownIds() {
    var ids = {};
    document.querySelectorAll("#feed .src a").forEach(function (link) {
      ids[activityId(link.getAttribute("href"))] = true;
    });
    return ids;
  }

  function cardFrom(post) {
    var article = document.createElement("article");
    article.className = "story";
    article.setAttribute("data-source", "feed");
    article.setAttribute("data-color", post.color || "orange");
    article.setAttribute("data-posted", post.date || "");
    if (post.earlier) article.setAttribute("data-earlier", "true");
    var tag = document.createElement("p");
    tag.className = "tag";
    tag.textContent = "The Edge";
    var figure = document.createElement("figure");
    figure.className = "shot";
    var img = document.createElement("img");
    img.src = post.image || "";
    img.alt = "";
    figure.appendChild(img);
    var title = document.createElement("h3");
    title.textContent = post.title || "A new note.";
    var when = document.createElement("p");
    when.className = "when";
    var time = document.createElement("time");
    time.setAttribute("datetime", post.date || "");
    time.textContent = post.dateLabel || post.date || "";
    when.appendChild(time);
    if (post.meta) when.appendChild(document.createTextNode(" · " + post.meta));
    var body = document.createElement("p");
    body.textContent = post.text || "";
    var src = document.createElement("p");
    src.className = "src";
    var link = document.createElement("a");
    link.href = post.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Read her post on LinkedIn";
    src.appendChild(link);
    article.appendChild(tag);
    if (post.image) article.appendChild(figure);
    article.appendChild(title);
    article.appendChild(when);
    article.appendChild(body);
    article.appendChild(src);
    return article;
  }

  function takeNew(data) {
    var list = document.querySelector("#feed .desk-list");
    if (!list || !data || !data.posts) return;
    var known = knownIds();
    var fresh = data.posts.filter(function (post) {
      return post && post.url && !known[activityId(post.url)];
    });
    fresh.sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
    fresh.forEach(function (post) {
      var node = cardFrom(post);
      if (post.earlier) list.appendChild(node);
      else list.insertBefore(node, list.firstChild);
    });
    var first = list.querySelector(".story:not([data-earlier])");
    list.querySelectorAll(".story.lead").forEach(function (story) { story.classList.remove("lead"); });
    if (first) first.classList.add("lead");
    apply();
    mountItemPick(document.getElementById("feed"));
  }

  fetch("news/edge.json", { cache: "no-store" }).then(function (response) {
    if (!response.ok) return null;
    return response.json();
  }).then(takeNew).catch(function () {});

  function initials(name) {
    var parts = String(name).replace(/\./g, "").split(/\s+/).filter(Boolean);
    if (!parts.length) return "";
    var last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (parts[0][0] + last).toUpperCase();
  }

  function faceNode(person, big) {
    if (!person.image && person.sigma) {
      var key = document.createElement(big ? "div" : "span");
      key.className = (big ? "portrait-letter" : "mono") + " sigma";
      var logo = document.createElement("img");
      logo.className = "sigma-logo";
      logo.src = "news/sigma-xi-logo.jpg";
      logo.alt = "Sigma Xi";
      key.appendChild(logo);
      return key;
    }
    var mark = document.createElement(big ? "div" : "span");
    mark.className = big ? "portrait-letter" : "mono";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = initials(person.name);
    if (!person.image) return mark;
    var img = document.createElement("img");
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    img.className = big ? "portrait" : "face";
    img.src = person.image;
    img.addEventListener("error", function () { img.replaceWith(mark); });
    return img;
  }

  function openReader(url, page) {
    chooseIssue(url, page);
    reader.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  var marks = {
    mail: "<rect x='1' y='6' width='30' height='20' rx='2' fill='var(--c-brown)'/><rect x='3' y='9' width='26' height='15' fill='var(--c-blue)'/><path d='M3 9 L16 18 L29 9 Z' fill='var(--c-red)'/><rect x='6' y='15' width='12' height='7' fill='var(--c-yellow)'/><rect x='8' y='17' width='8' height='1.5' fill='var(--c-green)'/><rect x='8' y='19.5' width='6' height='1.5' fill='var(--c-orange)'/><rect x='21' y='15' width='6' height='6' rx='1' fill='var(--c-purple)'/><circle cx='24' cy='18' r='1.6' fill='var(--c-pink)'/>",
    page: "<rect x='5' y='2' width='22' height='28' rx='1' fill='var(--c-brown)'/><rect x='7' y='4' width='18' height='24' fill='var(--c-yellow)'/><rect x='7' y='4' width='18' height='5' fill='var(--c-red)'/><rect x='10' y='12' width='12' height='2' fill='var(--c-blue)'/><rect x='10' y='16' width='10' height='2' fill='var(--c-green)'/><rect x='10' y='20' width='8' height='2' fill='var(--c-purple)'/><path d='M19 22 H25 V28 Z' fill='var(--c-pink)'/><rect x='10' y='24' width='6' height='3' fill='var(--c-orange)'/>",
    issue: "<rect x='3' y='2' width='6' height='28' fill='var(--c-brown)'/><rect x='8' y='2' width='21' height='28' fill='var(--c-orange)'/><rect x='10' y='4' width='17' height='4' fill='var(--c-red)'/><rect x='10' y='10' width='17' height='10' fill='var(--c-blue)'/><rect x='12' y='12' width='6' height='6' fill='var(--c-yellow)'/><rect x='10' y='22' width='12' height='2' fill='var(--c-green)'/><rect x='10' y='25' width='8' height='2' fill='var(--c-purple)'/><circle cx='24' cy='26' r='2.2' fill='var(--c-pink)'/>",
    wiki: "<circle cx='16' cy='16' r='14' fill='var(--c-brown)'/><path d='M16 16 L16 4 A12 12 0 0 1 26.4 10 Z' fill='var(--c-red)'/><path d='M16 16 L26.4 10 A12 12 0 0 1 26.4 22 Z' fill='var(--c-orange)'/><path d='M16 16 L26.4 22 A12 12 0 0 1 16 28 Z' fill='var(--c-yellow)'/><path d='M16 16 L16 28 A12 12 0 0 1 5.6 22 Z' fill='var(--c-green)'/><path d='M16 16 L5.6 22 A12 12 0 0 1 5.6 10 Z' fill='var(--c-blue)'/><path d='M16 16 L5.6 10 A12 12 0 0 1 16 4 Z' fill='var(--c-purple)'/><circle cx='16' cy='16' r='5' fill='var(--c-pink)'/><path d='M12.2 18.2 L13.6 13.4 L16 16.6 L18.4 13.4 L19.8 18.2' fill='none' stroke='var(--c-brown)' stroke-width='1.4' stroke-linejoin='round' stroke-linecap='round'/>",
    info: "<rect x='3' y='3' width='26' height='26' rx='6' fill='var(--c-brown)'/><rect x='5' y='5' width='22' height='22' rx='5' fill='var(--c-yellow)'/><path d='M22 5 L27 10 L22 10 Z' fill='var(--c-orange)'/><rect x='8' y='8' width='5' height='2' fill='var(--c-purple)'/><circle cx='16' cy='11' r='2' fill='var(--c-red)'/><rect x='14.5' y='14' width='3' height='8' rx='1' fill='var(--c-blue)'/><rect x='11' y='23' width='10' height='2' fill='var(--c-green)'/><circle cx='24' cy='22' r='2' fill='var(--c-pink)'/>",
    linkedin: "<rect x='2' y='4' width='28' height='24' rx='2' fill='var(--c-brown)'/><rect x='4' y='6' width='24' height='20' fill='var(--c-blue)'/><circle cx='12' cy='14' r='4.2' fill='var(--c-yellow)'/><path d='M8.2 13.4 C9.2 9 14.8 9 15.8 13.4 Z' fill='var(--c-red)'/><rect x='8' y='19' width='8' height='5' rx='1' fill='var(--c-green)'/><rect x='18' y='10' width='8' height='2.2' fill='var(--c-orange)'/><rect x='18' y='14.2' width='6' height='2.2' fill='var(--c-purple)'/><rect x='18' y='18.4' width='7' height='2.2' fill='var(--c-pink)'/>",
    handle: "<rect x='2' y='2' width='28' height='28' rx='5' fill='var(--c-brown)'/><path d='M22 11 A 8 8 0 1 0 22 23' fill='none' stroke='var(--c-red)' stroke-width='3.2' stroke-linecap='round'/><path d='M22 8 V25' fill='none' stroke='var(--c-orange)' stroke-width='3.2' stroke-linecap='round'/><circle cx='14.5' cy='17' r='3.3' fill='none' stroke='var(--c-yellow)' stroke-width='2.5'/><circle cx='14.5' cy='17' r='1.45' fill='var(--c-blue)'/><circle cx='14.5' cy='9' r='2.15' fill='var(--c-green)'/><circle cx='6.6' cy='17' r='2.15' fill='var(--c-purple)'/><circle cx='14.5' cy='25' r='2.15' fill='var(--c-pink)'/>",
    team: "<rect x='5' y='2' width='22' height='28' rx='1' fill='var(--c-brown)'/><rect x='7' y='4' width='18' height='24' fill='var(--c-yellow)'/><rect x='7' y='4' width='18' height='5' fill='var(--c-red)'/><circle cx='11' cy='14.5' r='2.1' fill='var(--c-blue)'/><circle cx='16' cy='14.5' r='2.1' fill='var(--c-green)'/><circle cx='21' cy='14.5' r='2.1' fill='var(--c-purple)'/><rect x='9.2' y='17.4' width='3.6' height='5' fill='var(--c-orange)'/><rect x='14.2' y='17.4' width='3.6' height='5' fill='var(--c-pink)'/><rect x='19.2' y='17.4' width='3.6' height='5' fill='var(--c-blue)'/>",
    site: "<rect x='2' y='2' width='28' height='28' rx='4' fill='var(--c-brown)'/><rect x='8' y='6' width='5' height='5' fill='var(--c-red)'/><rect x='8' y='11' width='5' height='4' fill='var(--c-orange)'/><rect x='8' y='15' width='5' height='4' fill='var(--c-yellow)'/><rect x='8' y='19' width='5' height='4' fill='var(--c-green)'/><rect x='8' y='23' width='5' height='4' fill='var(--c-blue)'/><rect x='13' y='23' width='6' height='4' fill='var(--c-purple)'/><rect x='19' y='23' width='5' height='4' fill='var(--c-pink)'/>",
    github: "<rect x='2' y='2' width='28' height='28' rx='6' fill='var(--c-brown)'/><rect x='10' y='6' width='2.4' height='20' rx='1' fill='var(--c-blue)'/><path d='M12.2 10 C20 10 20 16 12.2 16' fill='none' stroke='var(--c-orange)' stroke-width='2.4' stroke-linecap='round'/><circle cx='11.2' cy='8' r='2.3' fill='var(--c-red)'/><circle cx='11.2' cy='16' r='2.3' fill='var(--c-yellow)'/><circle cx='11.2' cy='24' r='2.3' fill='var(--c-green)'/><circle cx='21' cy='10' r='2.2' fill='var(--c-purple)'/><circle cx='21' cy='16' r='2.2' fill='var(--c-pink)'/>",
    apple: "<rect x='2' y='2' width='28' height='28' rx='7' fill='var(--c-brown)'/><ellipse cx='12.5' cy='22' rx='5' ry='3.3' transform='rotate(-22 12.5 22)' fill='var(--c-purple)'/><rect x='16.6' y='8' width='2.4' height='14.2' fill='var(--c-pink)'/><path d='M19 8.2 C25 8.6 25.2 14.8 19 14.2' fill='none' stroke='var(--c-red)' stroke-width='2.3' stroke-linecap='round'/><rect x='22.2' y='17.5' width='3.2' height='2' fill='var(--c-orange)'/><rect x='22.2' y='20.4' width='3.2' height='2' fill='var(--c-yellow)'/><rect x='22.2' y='23.3' width='3.2' height='2' fill='var(--c-green)'/><circle cx='7.4' cy='10' r='1.7' fill='var(--c-blue)'/>",
    amazon: "<rect x='2' y='2' width='28' height='28' rx='6' fill='var(--c-brown)'/><path d='M11 9 L23 16 L11 23 Z' fill='var(--c-red)'/><path d='M13.2 12.2 L19.4 16 L13.2 19.8 Z' fill='var(--c-orange)'/><circle cx='8' cy='26.2' r='1.45' fill='var(--c-yellow)'/><circle cx='12' cy='27.3' r='1.45' fill='var(--c-green)'/><circle cx='16' cy='27.7' r='1.45' fill='var(--c-blue)'/><circle cx='20' cy='27.3' r='1.45' fill='var(--c-purple)'/><circle cx='24' cy='26.2' r='1.45' fill='var(--c-pink)'/>",
    deezer: "<circle cx='16' cy='16' r='14' fill='var(--c-brown)'/><rect x='8' y='7' width='16' height='2.4' rx='1.2' fill='var(--c-red)'/><rect x='6' y='11' width='20' height='2.4' rx='1.2' fill='var(--c-orange)'/><rect x='9' y='15' width='14' height='2.4' rx='1.2' fill='var(--c-yellow)'/><rect x='7' y='19' width='18' height='2.4' rx='1.2' fill='var(--c-green)'/><rect x='10' y='23' width='12' height='2.4' rx='1.2' fill='var(--c-blue)'/><circle cx='24.2' cy='8' r='1.5' fill='var(--c-purple)'/><circle cx='7.6' cy='24' r='1.5' fill='var(--c-pink)'/>",
    spotify: "<circle cx='16' cy='16' r='14' fill='var(--c-brown)'/><circle cx='16' cy='16' r='11' fill='none' stroke='var(--c-red)' stroke-width='1.7'/><circle cx='16' cy='16' r='8.2' fill='none' stroke='var(--c-orange)' stroke-width='1.7'/><circle cx='16' cy='16' r='5.5' fill='var(--c-yellow)'/><circle cx='16' cy='16' r='3.3' fill='var(--c-green)'/><circle cx='16' cy='16' r='1.5' fill='var(--c-blue)'/><circle cx='23' cy='7.5' r='1.6' fill='var(--c-purple)'/><circle cx='9' cy='24.5' r='1.6' fill='var(--c-pink)'/>"
  };

  function markIcon(kind) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 32 32");
    svg.setAttribute("class", "mark");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = marks[kind];
    return svg;
  }

  function withMark(node, kind) {
    node.classList.add("with-mark");
    node.insertBefore(markIcon(kind), node.firstChild);
    return node;
  }

  function personCard(person, piece, issue, issueName, id) {
    var card = document.createElement("article");
    card.className = "card person";
    card.id = id;
    card.appendChild(faceNode(person, true));
    var name = document.createElement("p");
    name.className = "card-name";
    name.textContent = person.name;
    var bio = document.createElement("p");
    bio.className = "card-bio";
    bio.textContent = person.bio || "";
    var where = document.createElement("p");
    where.className = "card-seat with-mark";
    where.appendChild(markIcon("issue"));
    where.appendChild(document.createTextNode(issueName));
    var src = document.createElement("div");
    src.className = "src";
    if (piece.page && issue.reader) {
      var open = document.createElement("button");
      open.type = "button";
      open.className = "open-page";
      open.appendChild(document.createTextNode("Page " + piece.page));
      open.addEventListener("click", function () {
        openReader(issue.reader, piece.page);
      });
      src.appendChild(withMark(open, "page"));
    } else {
      var missing = document.createElement("p");
      missing.className = "card-note";
      missing.textContent = issue.reader
        ? "This edition’s reader does not name the article’s page in text."
        : "Sigma Xi’s digital reader starts in 2009, so this issue has no reader page.";
      src.appendChild(withMark(missing, "info"));
    }
    if (person.email) {
      var mail = document.createElement("a");
      mail.href = "mailto:" + person.email;
      mail.appendChild(document.createTextNode(person.email));
      src.appendChild(withMark(mail, "mail"));
    }
    if (person.wiki) {
      var wiki = document.createElement("a");
      wiki.href = "https://en.wikipedia.org/wiki/" + encodeURIComponent(person.wiki.replace(/ /g, "_"));
      wiki.target = "_blank";
      wiki.rel = "noopener noreferrer";
      wiki.appendChild(document.createTextNode("Wikipedia"));
      src.appendChild(withMark(wiki, "wiki"));
    }
    var fine = document.createElement("p");
    fine.className = "fine with-mark";
    fine.appendChild(markIcon("info"));
    var note = person.image
      ? "The portrait is the lead image on that Wikipedia page."
      : person.sigma
        ? "The mark is Sigma Xi’s logo. " + person.sigma
        : "Sigma Xi does not publish a separate portrait with this article.";
    if (piece.page) note += " The page number is the one in the reader.";
    else if (issue.reader) note += " This edition’s reader does not name the article’s page in text.";
    if (person.email) note += " The address is printed in the issue.";
    fine.appendChild(document.createTextNode(note));
    var head = document.createElement("div");
    head.className = "person-head";
    head.appendChild(card.firstChild);
    head.appendChild(name);
    card.appendChild(head);
    card.appendChild(bio);
    src.insertBefore(where, src.firstChild);
    if (src.childNodes.length) card.appendChild(src);
    card.appendChild(fine);
    return card;
  }

  function mountResearchers() {
    var data = window.RESEARCHERS;
    if (!data) return;
    var seq = 0;
    document.querySelectorAll("#journal .story").forEach(function (story) {
      var heading = story.querySelector("h3");
      if (!heading) return;
      var key = heading.textContent.split(".")[0].trim();
      var issue = data[key];
      if (!issue || !issue.pieces || !issue.pieces.length) return;
      var list = document.createElement("div");
      list.className = "pieces";
      issue.pieces.forEach(function (piece) {
        var block = document.createElement("div");
        block.className = "piece";
        var title = document.createElement("p");
        title.className = "piece-title";
        title.textContent = "\u201c" + piece.title + "\u201d";
        var row = document.createElement("p");
        row.className = "byline-row";
        (piece.authors || []).forEach(function (person) {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "researcher";
          button.setAttribute("aria-expanded", "false");
          var id = "person-" + (++seq);
          button.setAttribute("aria-controls", id);
          button.appendChild(faceNode(person, false));
          button.appendChild(document.createTextNode(person.name));
          button.addEventListener("click", function () {
            var open = button.getAttribute("aria-expanded") === "true";
            document.querySelectorAll("#journal .researcher").forEach(function (other) {
              other.setAttribute("aria-expanded", "false");
            });
            var prior = document.querySelector("#journal .card.person");
            if (prior) prior.remove();
            if (open) return;
            button.setAttribute("aria-expanded", "true");
            var card = personCard(person, piece, issue, key, id);
            block.appendChild(card);
            focusCard(card);
          });
          row.appendChild(button);
        });
        if (piece.page && issue.reader) {
          var page = document.createElement("button");
          page.type = "button";
          page.className = "pg";
          page.textContent = "Page " + piece.page;
          page.addEventListener("click", function () {
            openReader(issue.reader, piece.page);
          });
          row.appendChild(page);
        } else if (piece.page) {
          var pageNote = document.createElement("span");
          pageNote.className = "pg";
          pageNote.textContent = "Page " + piece.page;
          row.appendChild(pageNote);
        }
        block.appendChild(title);
        block.appendChild(row);
        list.appendChild(block);
      });
      var quote = null;
      story.querySelectorAll("p").forEach(function (para) {
        if (quote) return;
        if (para.classList.contains("tag") || para.classList.contains("when") || para.classList.contains("src")) return;
        if (/[“"]/.test(para.textContent)) quote = para;
      });
      if (quote) quote.replaceWith(list);
      else {
        var actions = story.querySelector(".actions, .src");
        if (actions) actions.before(list);
        else story.appendChild(list);
      }
    });
  }

  function focusCard(card) {
    card.tabIndex = -1;
    requestAnimationFrame(function () {
      card.scrollIntoView({ block: "start" });
      card.focus({ preventScroll: true });
    });
  }

  function revealHash() {
    var id = decodeURIComponent((location.hash || "").slice(1));
    if (!id) return;
    var node = document.getElementById(id);
    if (!node) return;
    var story = node.classList.contains("story") ? node : (node.closest && node.closest(".story"));
    var section = story && story.closest(".desk");
    if (story && section && section.classList.contains("picking")) openItem(section, story.id, false);
    var details = node.closest && node.closest("details");
    if (details) details.open = true;
    node.scrollIntoView({ block: "start" });
  }

  function itemDetail(story) {
    var node = story.querySelector(".standfirst");
    if (!node) {
      var paras = story.querySelectorAll(":scope > p");
      for (var i = 0; i < paras.length; i++) {
        var p = paras[i];
        if (p.classList.contains("tag") || p.classList.contains("when") || p.classList.contains("src") || p.classList.contains("actions") || p.classList.contains("letter-by")) continue;
        node = p;
        break;
      }
    }
    if (!node) return "";
    var text = node.textContent.replace(/\s+/g, " ").trim();
    if (text.length <= 160) return text;
    var cut = text.slice(0, 160);
    var space = cut.lastIndexOf(" ");
    return (space > 90 ? cut.slice(0, space) : cut) + "…";
  }

  function openItem(section, id, scroll) {
    var opened = null;
    section.querySelectorAll(".desk-list > .story").forEach(function (story) {
      var on = story.id === id;
      story.classList.toggle("is-open", on);
      if (on) {
        story.hidden = false;
        opened = story;
      }
    });
    section.querySelectorAll(".item-pick button").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-item") === id ? "true" : "false");
    });
    if (scroll && opened) {
      document.documentElement.style.scrollBehavior = "auto";
      opened.scrollIntoView({ block: "start" });
    }
  }

  function mountItemPick(section) {
    if (!section) return;
    var old = section.querySelector(".item-pick");
    if (old) old.remove();
    var stories = [].slice.call(section.querySelectorAll(".desk-list > .story"));
    if (stories.length < 2) return;
    var heading = section.querySelector("h2");
    var nav = document.createElement("nav");
    nav.className = "item-pick";
    nav.setAttribute("aria-label", heading ? heading.textContent.replace(/\s+/g, " ").trim() : "Items");
    var hash = decodeURIComponent((location.hash || "").slice(1));
    var hashed = hash ? document.getElementById(hash) : null;
    var hashedStory = hashed && (hashed.classList.contains("story") ? hashed : hashed.closest && hashed.closest(".story"));
    if (hashedStory && !section.contains(hashedStory)) hashedStory = null;
    var fallback = null;
    stories.forEach(function (story) {
      if (!fallback && story.getAttribute("data-earlier") !== "true") fallback = story;
      var imgs = [].slice.call(story.querySelectorAll(":scope > .essay-fig img, :scope > .cover-pair img, :scope > .shot img"));
      if (!imgs.length) {
        var one = story.querySelector(":scope > figure img");
        if (one) imgs = [one];
      }
      var title = story.querySelector("h3");
      var when = story.querySelector(":scope > .when") || story.querySelector("time");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("data-item", story.id);
      btn.setAttribute("aria-pressed", "false");
      var color = story.getAttribute("data-color");
      if (color) btn.setAttribute("data-color", color);
      if (imgs.length) {
        var row = document.createElement("span");
        row.className = imgs.length > 1 ? "pick-covers" : "pick-shot";
        imgs.forEach(function (img) {
          var thumb = document.createElement("img");
          thumb.src = img.getAttribute("src");
          thumb.alt = "";
          row.appendChild(thumb);
        });
        btn.appendChild(row);
      }
      var titleEl = document.createElement("span");
      titleEl.className = "pick-title";
      titleEl.textContent = title ? title.textContent.trim() : "Untitled";
      btn.appendChild(titleEl);
      if (when && when.textContent.trim()) {
        var whenEl = document.createElement("span");
        whenEl.className = "pick-when";
        whenEl.textContent = when.textContent.trim();
        btn.appendChild(whenEl);
      }
      var detail = itemDetail(story);
      if (detail) {
        var detailEl = document.createElement("span");
        detailEl.className = "pick-detail";
        detailEl.textContent = detail;
        btn.appendChild(detailEl);
      }
      btn.addEventListener("click", function () {
        openItem(section, story.id, true);
        if (story.id && history.replaceState) history.replaceState(null, "", "#" + story.id);
      });
      nav.appendChild(btn);
    });
    var deck = section.querySelector(".deck");
    if (deck) deck.after(nav);
    else section.insertBefore(nav, section.firstChild);
    section.classList.add("picking");
    if (section.id === "feed") {
      var earlier = document.getElementById("earlier");
      if (earlier && earlier.parentElement) earlier.parentElement.hidden = true;
    }
    var openId = (hashedStory && hashedStory.id) || (fallback && fallback.id) || stories[0].id;
    openItem(section, openId, false);
  }

  window.mountItemPick = mountItemPick;

  function contactKind(link) {
    var href = link.getAttribute("href") || "";
    if (href.indexOf("mailto:") === 0) return "mail";
    if (/linkedin\.com/i.test(href)) return "linkedin";
    if (/twitter\.com|x\.com/i.test(href)) return "handle";
    if (/\/team\/?($|\?)/i.test(href)) return "team";
    if (/music\.apple\.com/i.test(href)) return "apple";
    if (/music\.amazon\./i.test(href)) return "amazon";
    if (/deezer\.com/i.test(href)) return "deezer";
    if (/spotify\.com/i.test(href)) return "spotify";
    if (/github\.com/i.test(href)) return "github";
    if (/leaders\.vote/i.test(href)) return "site";
    return "";
  }

  function markLinks(root) {
    root.querySelectorAll(".src a").forEach(function (link) {
      if (link.querySelector(".mark")) return;
      var kind = contactKind(link);
      if (!kind) return;
      link.classList.add("with-mark");
      link.insertBefore(markIcon(kind), link.firstChild);
    });
  }

  markLinks(document.querySelector(".contacts") || document);

  paintFrame();
  apply();
  mountResearchers();
  buildIssueMenu();
  revealHash();
  window.addEventListener("hashchange", revealHash);

  var preview = document.createElement("script");
  preview.src = "news/preview/note.js?v=38";
  preview.onload = function () {
    var card = document.getElementById("card-mark");
    if (card) markLinks(card);
    mountItemPick(document.getElementById("note"));
    mountItemPick(document.getElementById("weekly"));
    mountItemPick(document.getElementById("feed"));
    revealHash();
  };
  document.body.appendChild(preview);

  document.querySelectorAll(".who").forEach(function (button) {
    button.addEventListener("click", function () {
      var id = button.getAttribute("aria-controls");
      var card = document.getElementById(id);
      var open = button.getAttribute("aria-expanded") === "true";
      document.querySelectorAll(".who").forEach(function (other) {
        other.setAttribute("aria-expanded", "false");
      });
      document.querySelectorAll(".contacts .card").forEach(function (other) {
        other.hidden = true;
      });
      if (!open && card) {
        document.querySelectorAll('.who[aria-controls="' + id + '"]').forEach(function (other) {
          other.setAttribute("aria-expanded", "true");
        });
        card.hidden = false;
        focusCard(card);
      }
    });
  });
})();
