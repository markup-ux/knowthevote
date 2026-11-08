(function () {
  var PREFIX = "lv-7f3c9e";
  var ORIGIN = "https://countapi.mileshilliard.com/api/v1/";
  var SECTIONS = [
    ["home", "Home"],
    ["state", "State pages"],
    ["illinois", "Illinois"],
    ["house", "House and Congress"],
    ["census", "Census"],
    ["search", "Search"],
    ["world", "Other countries"],
    ["news", "News"],
    ["chat", "Group Chat"],
    ["play", "Trivia"],
    ["gallery", "Gallery"],
    ["other", "News, Group Chat, Trivia, and Gallery before each had a line"],
    ["rest", "Not listed above"]
  ];

  function chicagoDate(offsetDays) {
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());
    function part(type) {
      var i;
      for (i = 0; i < parts.length; i++) if (parts[i].type === type) return parts[i].value;
      return "0";
    }
    var utc = Date.UTC(+part("year"), +part("month") - 1, +part("day") + (offsetDays || 0));
    var dt = new Date(utc);
    var month = String(dt.getUTCMonth() + 1);
    var day = String(dt.getUTCDate());
    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;
    return dt.getUTCFullYear() + "-" + month + "-" + day;
  }

  function sectionOf(pathname) {
    var path = String(pathname || "/");
    var bits;
    try { path = decodeURIComponent(path); } catch (error) {}
    path = path.split("?")[0].split("#")[0];
    path = path.replace(/\/index\.html$/i, "");
    path = path.replace(/\.html$/i, "");
    path = path.replace(/\/+$/, "") || "/";
    path = path.toLowerCase();
    if (path === "/visits") return "";
    if (path === "/" || path === "/index") return "home";
    if (path === "/illinois" || path.indexOf("/illinois-") === 0) return "illinois";
    if (/^\/[a-z]{2}$/.test(path)) return "state";
    if (path === "/house" || path.indexOf("/house/") === 0 || path === "/congress" || path.indexOf("/congress/") === 0) return "house";
    if (path === "/census" || path.indexOf("/census/") === 0 || path.indexOf("/social/census") === 0) return "census";
    if (path === "/search") return "search";
    if (path === "/countries" || path.indexOf("/countries/") === 0) return "world";
    if (path === "/news" || path.indexOf("/news/") === 0 || path.indexOf("/social/news") === 0) return "news";
    if (path === "/chat" || path.indexOf("/chat/") === 0 || path.indexOf("/social/chat") === 0) return "chat";
    if (path === "/play" || path.indexOf("/play/") === 0) return "play";
    if (path === "/gallery" || path.indexOf("/gallery/") === 0) return "gallery";
    bits = path.split("/");
    if (bits.length > 2 && /^[a-z]{2}$/.test(bits[1])) return "world";
    return "rest";
  }

  function key(name) {
    return PREFIX + "-" + name;
  }

  if (window.leadersVisits) return;
  window.leadersVisits = {
    prefix: PREFIX,
    origin: ORIGIN,
    sections: SECTIONS,
    key: key,
    day: chicagoDate,
    sectionOf: sectionOf
  };

  var host = String(location.hostname || "").replace(/\.$/, "").toLowerCase();
  var section = sectionOf(location.pathname || "/");
  var agent = navigator.userAgent || "";
  if (host !== "leaders.vote" && host !== "www.leaders.vote") return;
  if (!section || navigator.webdriver) return;
  if (/bot|crawl|spider|slurp|headless|facebookexternalhit/i.test(agent)) return;

  function send(name) {
    fetch(ORIGIN + "hit/" + encodeURIComponent(key(name)), {
      method: "GET",
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      keepalive: true
    }).catch(function () {});
  }

  send("total");
  send("day-" + chicagoDate(0));
  send(section);
})();
