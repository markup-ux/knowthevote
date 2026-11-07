(function () {
  if (window.__leadersTheme) return;
  window.__leadersTheme = true;
  var KEY = "leaders-theme";

  var style = document.createElement("style");
  style.textContent = [
    "header .lang { display: flex; align-items: center; gap: 8px; }",
    ".theme-button { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 40px; padding: 0; border: 0; background: transparent; cursor: pointer; flex: none; color: inherit; }",
    ".theme-switch { position: relative; display: block; width: 56px; height: 28px; border-radius: 999px; background: linear-gradient(90deg, #ffe566 0 50%, #15244a 50% 100%); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.9); }",
    ".theme-sun, .theme-moon { position: absolute; top: 6px; width: 16px; height: 16px; display: block; }",
    ".theme-sun { left: 6px; color: #7a2e0e; }",
    ".theme-moon { right: 6px; color: #e8eefc; }",
    ".theme-knob { position: absolute; top: 2px; left: 2px; width: 24px; height: 24px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(28, 25, 21, 0.35); transition: transform 180ms ease; }",
    "html[data-theme='dark'] .theme-knob { transform: translateX(28px); }",
    "html:not([data-theme='dark']) .theme-moon, html[data-theme='dark'] .theme-sun { opacity: 0.55; }",
    ".theme-button:hover .theme-switch { filter: brightness(1.08); }",
    ".theme-button:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }",
    "header .bar:not(:has(.bar-top)) { position: relative; }",
    "header .bar:not(:has(.bar-top)) > .theme-button { position: absolute; top: 7px; right: 0; }",
    ".theme-button-fixed { position: fixed; top: 10px; right: 10px; z-index: 5; background: rgba(28, 25, 21, 0.35); border-radius: 999px; }",
    "@media (prefers-reduced-motion: reduce) { .theme-knob { transition: none; } }"
  ].join("\n");
  document.head.appendChild(style);

  var sun = '<svg class="theme-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor"></circle><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2.2v2.3M12 19.5v2.3M2.2 12h2.3M19.5 12h2.3M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2L5.2 18.8"></path></g></svg>';
  var moon = '<svg class="theme-moon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';

  function darkNow() {
    return document.documentElement.getAttribute("data-theme") === "dark";
  }

  function apply(theme) {
    if (theme === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    var button = document.querySelector(".theme-button");
    if (!button) return;
    var dark = theme === "dark";
    button.setAttribute("aria-pressed", dark ? "true" : "false");
    button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  }

  function saved() {
    try {
      return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
    } catch (error) {
      return "light";
    }
  }

  function mount() {
    var button = document.querySelector(".theme-button");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "theme-button notranslate";
      button.setAttribute("translate", "no");
      button.innerHTML = '<span class="theme-switch" aria-hidden="true">' + sun + moon + '<span class="theme-knob"></span></span>';
      button.addEventListener("click", function () {
        var next = darkNow() ? "light" : "dark";
        try { localStorage.setItem(KEY, next); } catch (error) {}
        apply(next);
      });
      var lang = document.querySelector("header .bar-top .lang");
      if (lang) {
        var langButton = lang.querySelector(".lang-button");
        if (langButton) lang.insertBefore(button, langButton);
        else lang.appendChild(button);
      } else {
        var bar = document.querySelector("header .bar") || document.querySelector("header");
        if (bar) bar.appendChild(button);
        else if (document.body) {
          button.classList.add("theme-button-fixed");
          document.body.appendChild(button);
        } else return;
      }
    }
    apply(saved());
  }

  apply(saved());
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();

  window.addEventListener("storage", function (event) {
    if (event.key === KEY) apply(event.newValue === "dark" ? "dark" : "light");
  });
})();
