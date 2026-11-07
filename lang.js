(function () {
  var searchScript = document.currentScript;
  if (searchScript && !document.querySelector("script[data-site-search]")) {
    var searchSrc = searchScript.getAttribute("src") || "";
    var searchBase = searchSrc.replace(/[^/]*$/, "");
    var searchTag = document.createElement("script");
    searchTag.src = searchBase + "search.js?v=8";
    searchTag.setAttribute("data-site-search", "1");
    document.head.appendChild(searchTag);
    if (!document.querySelector("script[data-site-visits]")) {
      var visitTag = document.createElement("script");
      visitTag.src = searchBase + "visit.js?v=1";
      visitTag.async = true;
      visitTag.setAttribute("data-site-visits", "1");
      document.head.appendChild(visitTag);
    }
  }
  var select = document.getElementById("lang");
  var note = document.getElementById("lang-note");
  var langButton = document.querySelector(".lang-button");
  var langMenu = document.getElementById("lang-list");

  function syncLangMenu() {
    var code = select.value || "en";
    var current = select.options[select.selectedIndex];
    if (langButton && current) langButton.textContent = current.text;
    if (!langMenu) return;
    Array.prototype.forEach.call(langMenu.querySelectorAll("[data-lang]"), function (item) {
      item.setAttribute("aria-selected", item.getAttribute("data-lang") === code ? "true" : "false");
    });
  }

  function closeLangMenu() {
    if (!langMenu || !langButton) return;
    langMenu.hidden = true;
    langButton.setAttribute("aria-expanded", "false");
  }

  if (langButton && langMenu) {
    langButton.addEventListener("click", function () {
      var open = langMenu.hidden;
      langMenu.hidden = !open;
      langButton.setAttribute("aria-expanded", open ? "true" : "false");
    });
    langMenu.addEventListener("click", function (event) {
      var item = event.target.closest("[data-lang]");
      if (!item) return;
      select.value = item.getAttribute("data-lang");
      syncLangMenu();
      closeLangMenu();
      select.dispatchEvent(new Event("change"));
    });
    document.addEventListener("click", function (event) {
      if (!event.target.closest(".lang")) closeLangMenu();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeLangMenu();
    });
  }
  var KEY = "leaders-lang";
  var pending = null;
  var ready = false;
  var waiters = [];

  document.querySelectorAll(".who h3, .links a").forEach(function (node) {
    if (node.tagName === "A" && node.textContent.indexOf(".") === -1) return;
    node.classList.add("notranslate");
    node.setAttribute("translate", "no");
  });

  function readCookie() {
    var match = document.cookie.match(/(?:^|; )googtrans=([^;]+)/);
    if (!match) return "";
    var parts = decodeURIComponent(match[1]).split("/");
    return parts[2] || "";
  }

  function writeCookie(code) {
    var host = location.hostname;
    var domains = [""];
    if (host && host !== "localhost" && host !== "127.0.0.1") domains.push(host, "." + host);
    domains.forEach(function (domain) {
      if (code && code !== "en") {
        document.cookie = "googtrans=/en/" + code + ";path=/" + (domain ? ";domain=" + domain : "");
        return;
      }
      document.cookie = "googtrans=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/" + (domain ? ";domain=" + domain : "");
    });
  }

  function savedLang() {
    var fromCookie = readCookie();
    if (fromCookie && select.querySelector('option[value="' + fromCookie + '"]')) return fromCookie;
    try {
      var stored = localStorage.getItem(KEY) || "en";
      if (select.querySelector('option[value="' + stored + '"]')) return stored;
    } catch (error) {}
    return "en";
  }

  var PHRASES = {
    en: { green: "Green retention ballot", writein: "Write-in", writeins: "Write-ins", writeName: "Write a name", writeLabel: "Write-in name", back: "Back", next: "Next" },
    es: { green: "Papeleta verde de retención", writein: "Voto por escrito", writeins: "Votos por escrito", writeName: "Escriba un nombre", writeLabel: "Nombre del voto por escrito", back: "Atrás", next: "Siguiente" },
    "zh-CN": { green: "绿色留任选票", writein: "另填候选人", writeins: "另填候选人", writeName: "填写姓名", writeLabel: "另填姓名", back: "返回", next: "下一步" },
    pl: { green: "Zielona karta utrzymania sędziego", writein: "Głos dopisany", writeins: "Głosy dopisane", writeName: "Wpisz nazwisko", writeLabel: "Nazwisko dopisane", back: "Wstecz", next: "Dalej" },
    hi: { green: "Green retention ballot", writein: "Write-in", writeins: "Write-ins", writeName: "Write a name", writeLabel: "Write-in name", back: "पीछे", next: "आगे" },
    ko: { green: "녹색 유임 투표용지", writein: "기표 외 후보", writeins: "기표 외 투표", writeName: "이름을 쓰세요", writeLabel: "기표 외 이름", back: "뒤로", next: "다음" },
    tl: { green: "Green retention ballot", writein: "Write-in", writeins: "Write-ins", writeName: "Isulat ang pangalan", writeLabel: "Pangalan sa write-in", back: "Bumalik", next: "Susunod" },
    ar: { green: "Green retention ballot", writein: "Write-in", writeins: "Write-ins", writeName: "Write a name", writeLabel: "Write-in name", back: "رجوع", next: "التالي" },
    ur: { green: "Green retention ballot", writein: "Write-in", writeins: "Write-ins", writeName: "Write a name", writeLabel: "Write-in name", back: "واپس", next: "آگے" },
    uk: { green: "Зелений бюлетень щодо залишення", writein: "Вписаний кандидат", writeins: "Вписані голоси", writeName: "Впишіть ім’я", writeLabel: "Вписане ім’я", back: "Назад", next: "Далі" },
    vi: { green: "Phiếu xanh giữ chức thẩm phán", writein: "Bỏ phiếu ghi tên", writeins: "Bỏ phiếu ghi tên", writeName: "Viết tên", writeLabel: "Tên ghi thêm", back: "Quay lại", next: "Tiếp" },
    fr: { green: "Bulletin vert de maintien", writein: "Vote par écrit", writeins: "Votes par écrit", writeName: "Écrire un nom", writeLabel: "Nom du vote par écrit", back: "Retour", next: "Suivant" }
  };

  function fixOfficeNames(code) {
    if (code !== "es") return;
    var nodes = [];
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach(function (text) {
      var parent = text.parentElement;
      if (!parent || parent.closest(".notranslate, .lang, #google_translate_element")) return;
      if (text.nodeValue.indexOf("Ministro de justicia") === -1 && text.nodeValue.indexOf("ministro de justicia") === -1) return;
      text.nodeValue = text.nodeValue.replace(/Ministro de justicia/g, "Procurador general").replace(/ministro de justicia/g, "procurador general");
    });
  }

  function showNote(on) {
    if (!note) return;
    note.hidden = !on;
  }

  window.leadersApplyPhrases = function (code) {
    var pack = PHRASES[code] || PHRASES.en;
    document.querySelectorAll("[data-phrase]").forEach(function (node) {
      var key = node.getAttribute("data-phrase");
      if (key === "writefield") {
        node.placeholder = pack.writeName;
        node.setAttribute("aria-label", pack.writeLabel);
        return;
      }
      if (pack[key]) node.textContent = pack[key];
    });
  };

  function combo() {
    return document.querySelector(".goog-te-combo");
  }

  function apply(code) {
    var box = combo();
    if (!box) return false;
    document.documentElement.lang = code === "en" ? "en" : code;
    box.value = code === "en" ? "" : code;
    box.dispatchEvent(new Event("change"));
    window.leadersApplyPhrases(code);
    setTimeout(function () { fixOfficeNames(code); }, 700);
    setTimeout(function () { fixOfficeNames(code); }, 2200);
    return true;
  }

  window.leadersRefreshLang = function () {
    var code = select.value || "en";
    if (code === "en" || !combo()) return;
    clearTimeout(pending);
    pending = setTimeout(function () {
      var box = combo();
      if (!box) return;
      box.value = "";
      box.dispatchEvent(new Event("change"));
      setTimeout(function () { apply(code); }, 280);
    }, 40);
  };

  function finishWaiters() {
    var queued = waiters.splice(0);
    queued.forEach(function (done) { done(); });
  }

  function loadWidget(done) {
    if (ready && combo()) {
      done();
      return;
    }
    waiters.push(done);
    if (document.getElementById("google-translate-script")) return;
    window.googleTranslateElementInit = function () {
      new google.translate.TranslateElement({
        pageLanguage: "en",
        autoDisplay: false,
        includedLanguages: "es,zh-CN,pl,hi,ko,tl,ar,ur,uk,vi,fr"
      }, "google_translate_element");
      var waits = 0;
      var timer = setInterval(function () {
        waits += 1;
        if (combo() || waits > 40) {
          clearInterval(timer);
          ready = !!combo();
          finishWaiters();
        }
      }, 50);
    };
    var script = document.createElement("script");
    script.id = "google-translate-script";
    script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.onerror = function () {
      select.value = "en";
      showNote(false);
      waiters = [];
    };
    document.body.appendChild(script);
  }

  var initial = savedLang();
  select.value = initial;
  syncLangMenu();
  showNote(initial !== "en");
  if (initial !== "en") writeCookie(initial);

  select.addEventListener("change", function () {
    var code = select.value || "en";
    try { localStorage.setItem(KEY, code); } catch (error) {}
    writeCookie(code);
    if (code === "en") {
      location.reload();
      return;
    }
    showNote(true);
    window.leadersApplyPhrases(code);
    loadWidget(function () { apply(code); });
  });

  window.leadersApplyPhrases(initial);
  if (initial !== "en") loadWidget(function () { apply(initial); });
  var fixTimer = 0;
  window.addEventListener("scroll", function () {
    if ((select.value || "en") === "en") return;
    clearTimeout(fixTimer);
    fixTimer = setTimeout(function () { fixOfficeNames(select.value); }, 500);
  }, { passive: true });
})();

(function () {
  if (!document.body || document.body.classList.contains("wall")) return;
  var header = document.querySelector("header");
  if (!header) return;
  var jump = document.querySelector("nav.jump");
  var mq = window.matchMedia("(max-width: 800px)");
  var idleMs = 1200;
  var timer = 0;
  var held = false;
  var hideToken = 0;
  var lastY = window.scrollY || 0;
  var lastMove = Date.now();

  var style = document.createElement("style");
  style.id = "chrome-idle-style";
  style.textContent = [
    "@media (max-width: 800px) {",
    "header { transition: top 0.28s ease, max-height 0.28s ease, border-bottom-width 0.28s ease; }",
    "nav.jump { transition: transform 0.28s ease; }",
    "body.chrome-away header { top: calc(-1 * var(--header-open, 240px) - 12px); pointer-events: none; }",
    "body.chrome-at-top, body.chrome-at-top * { overflow-anchor: none; }",
    "body.chrome-at-top header { border-bottom-width: 0; pointer-events: none; }",
    "body.chrome-at-top header::after { height: 0; }",
    "body.chrome-idle nav.jump { transform: translateY(calc(100% + 16px)); pointer-events: none; }",
    "}",
    "@media (max-width: 800px) and (prefers-reduced-motion: reduce) {",
    "header, nav.jump { transition: none; }",
    "}"
  ].join("\n");
  document.head.appendChild(style);

  function mobile() { return mq.matches; }

  function motionOk() {
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function busy() {
    var active = document.activeElement;
    if (active && active !== document.body && header.contains(active)) return true;
    if (jump && active && jump.contains(active)) return true;
    var menu = document.getElementById("lang-list");
    if (menu && !menu.hidden) return true;
    var list = document.getElementById("site-search-list");
    if (list && !list.hidden) return true;
    return false;
  }

  function show() {
    hideToken += 1;
    document.body.classList.remove("chrome-idle", "chrome-away", "chrome-at-top");
    header.style.maxHeight = "";
    header.style.overflow = "";
    header.inert = false;
    if (jump) jump.inert = false;
  }

  function hide() {
    if (!mobile()) return;
    if (busy() || held || Date.now() - lastMove < 160) {
      arm();
      return;
    }
    var y = window.scrollY || 0;
    var extra = document.documentElement.scrollHeight - window.innerHeight;
    if (y <= 4 && extra <= 8) return;
    var headerH = Math.ceil(header.getBoundingClientRect().height);
    var collapse = y <= 4 && extra > headerH + 16;
    var away = y > 4 && headerH > 0;
    if (!collapse && !away && !jump) return;
    var token = ++hideToken;
    if (away) {
      document.documentElement.style.setProperty("--header-open", headerH + "px");
      document.body.classList.remove("chrome-at-top");
      document.body.classList.add("chrome-away");
      header.style.maxHeight = "";
      header.style.overflow = "";
      header.inert = true;
    } else if (collapse) {
      header.style.overflow = "hidden";
      header.style.maxHeight = headerH + "px";
      document.body.classList.remove("chrome-away");
      document.body.classList.add("chrome-at-top");
      header.inert = true;
      var finish = function () {
        if (token !== hideToken || !document.body.classList.contains("chrome-at-top")) return;
        header.style.maxHeight = "0px";
        setTimeout(function () { lastY = window.scrollY || 0; }, 0);
      };
      if (motionOk()) requestAnimationFrame(function () { requestAnimationFrame(finish); });
      else finish();
    }
    document.body.classList.add("chrome-idle");
    if (jump) jump.inert = true;
  }

  function arm() {
    clearTimeout(timer);
    if (!mobile()) {
      show();
      return;
    }
    timer = setTimeout(hide, idleMs);
  }

  function revealFromUser() {
    if (!mobile()) return;
    lastMove = Date.now();
    show();
    arm();
  }

  window.addEventListener("scroll", function () {
    var y = window.scrollY || 0;
    var delta = Math.abs(y - lastY);
    lastY = y;
    if (!mobile() || delta < 1) return;
    revealFromUser();
  }, { passive: true });

  document.addEventListener("scroll", function (event) {
    var target = event.target;
    if (!target || target === document || target === document.documentElement || target === document.body) return;
    revealFromUser();
  }, true);

  window.addEventListener("wheel", revealFromUser, { passive: true });
  window.addEventListener("touchmove", revealFromUser, { passive: true });
  window.addEventListener("keydown", function (event) {
    var key = event.key;
    if (key !== "ArrowDown" && key !== "ArrowUp" && key !== "PageDown" && key !== "PageUp" && key !== "Home" && key !== "End" && key !== " ") return;
    var tag = event.target && event.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (event.target && event.target.isContentEditable)) return;
    revealFromUser();
  });

  if (mq.addEventListener) mq.addEventListener("change", function () { show(); arm(); });
  else if (mq.addListener) mq.addListener(function () { show(); arm(); });

  document.addEventListener("focusin", function () {
    if (busy()) {
      clearTimeout(timer);
      show();
    }
  });
  document.addEventListener("focusout", function () { arm(); });

  header.addEventListener("pointerdown", function () {
    held = true;
    clearTimeout(timer);
    show();
  });
  if (jump) {
    jump.addEventListener("pointerdown", function () {
      held = true;
      clearTimeout(timer);
      show();
    });
  }
  function release() {
    if (!held) return;
    held = false;
    arm();
  }
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);

  arm();
})();
