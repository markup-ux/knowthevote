(function () {
  if (window.__leadersTheme) return;
  window.__leadersTheme = true;
  var KEY = "leaders-theme";

  var MODES = [
    { id: "day", label: "Day", light: "light", dark: "dark", lightFill: "#f4f0e6", darkFill: "#12141c", lightInk: "#1c1915", darkInk: "#f3efe6", accent: "#bf0a30", mark: "sun" },
    { id: "spring", label: "Spring", light: "spring", dark: "spring-dark", lightFill: "#eef6e4", darkFill: "#121a14", lightInk: "#1a2a14", darkInk: "#e8f6df", accent: "#e6c84a", mark: "sprout" },
    { id: "summer", label: "Summer", light: "summer", dark: "summer-dark", lightFill: "#e7f3fb", darkFill: "#101820", lightInk: "#1a2838", darkInk: "#f4efe2", accent: "#e07060", mark: "sun" },
    { id: "fall", label: "Fall", light: "fall", dark: "fall-dark", lightFill: "#fff3c4", darkFill: "#1a100c", lightInk: "#3d160e", darkInk: "#fff1e4", accent: "#e07020", mark: "leaf" },
    { id: "winter", label: "Winter", light: "winter", dark: "winter-dark", lightFill: "#f5f8fc", darkFill: "#10161c", lightInk: "#172433", darkInk: "#e7eef6", accent: "#7eb0d4", mark: "flake" },
    { id: "holiday", label: "Holiday", light: "holiday", dark: "holiday-dark", lightFill: "#f4f7fb", darkFill: "#10161c", lightInk: "#172433", darkInk: "#e7eef6", accent: "#c23b45", mark: "gift" },
    { id: "tropical", label: "Tropical", light: "tropical", dark: "tropical-dark", lightFill: "#fff6df", darkFill: "#14100c", lightInk: "#1a2410", darkInk: "#fff6e8", accent: "#e83e78", mark: "flower" },
    { id: "birthday", label: "Birthday", light: "birthday", dark: "birthday-dark", lightFill: "#fff4f7", darkFill: "#1a1016", lightInk: "#2a1620", darkInk: "#fceef3", accent: "#6a8ee0", mark: "candle" },
    { id: "rainbow", label: "Rainbow", light: "rainbow", dark: "rainbow-dark", lightFill: "#fff6f8", darkFill: "#1a1218", lightInk: "#1c1915", darkInk: "#f6f1ea", accent: "#7a6ad6", mark: "arc" }
  ];

  var ALLOWED = {};
  MODES.forEach(function (mode) {
    ALLOWED[mode.light] = true;
    ALLOWED[mode.dark] = true;
  });

  var MARKS = {
    sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.6" fill="currentColor"></circle><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"></path></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>',
    sprout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 21.4V12c0-.6.4-1 1-1s1 .4 1 1v9.4c0 .6-.4 1-1 1s-1-.4-1-1z"></path><path fill="currentColor" d="M12 12.4c0-4.4 3.4-7.6 8-8-.4 4.6-3.6 7.4-8 8z"></path><path fill="currentColor" d="M12 13.6C8.2 13.2 5.2 11 4.2 7.2 8.2 7.4 11 10 12 13.6z"></path></svg>',
    leaf: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.2 3.2C12.4 4.4 8 8.6 6.6 15.2c3.2-1.2 6.2-1 8.4 1.2-2.2 1.2-4.4 3.4-5.6 6.4 4.4-1.2 8.6-4.6 11-10.2 1.2-2.8.2-6.6-2.2-9.4z"></path><path fill="currentColor" d="M6.4 19.2c1.2-1.8 2.4-3 4.2-3.6-1.6 1.6-2.8 2.8-4.2 3.6z"></path></svg>',
    flake: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M12 3.2v17.6M4.8 7.4l14.4 9.2M19.2 7.4L4.8 16.6M8 5.2 12 8l4-2.8M8 18.8 12 16l4 2.8M5.2 10.2 8 12l-2.8 1.8M18.8 10.2 16 12l2.8 1.8"></path></svg>',
    gift: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4.2 10.2h15.6V20H4.2z"></path><path fill="currentColor" d="M3.2 7.2h17.6v3.6H3.2z"></path><path fill="#c23b45" d="M11 7.2h2V20h-2z"></path><path fill="#c23b45" d="M3.2 11.2h17.6v1.8H3.2z"></path><path fill="#1e5c45" d="M12 7.4c-1.8-2.6-4.6-2.8-4.6-.8S10.2 7.4 12 7.4z"></path><path fill="#1e5c45" d="M12 7.4c1.8-2.6 4.6-2.8 4.6-.8S13.8 7.4 12 7.4z"></path></svg>',
    flower: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor"><ellipse cx="12" cy="6.2" rx="3.6" ry="4.6"></ellipse><ellipse cx="17.6" cy="10.2" rx="3.6" ry="4.6" transform="rotate(72 17.6 10.2)"></ellipse><ellipse cx="15.4" cy="16.6" rx="3.6" ry="4.6" transform="rotate(144 15.4 16.6)"></ellipse><ellipse cx="8.6" cy="16.6" rx="3.6" ry="4.6" transform="rotate(216 8.6 16.6)"></ellipse><ellipse cx="6.4" cy="10.2" rx="3.6" ry="4.6" transform="rotate(288 6.4 10.2)"></ellipse></g><circle cx="12" cy="12" r="2.5" fill="#e6b422"></circle></svg>',
    candle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#e85d2b" d="M12 1c1.8 2.2 2.8 3.8 1.4 5.6-.8 1-2.6.4-1.6-.8.2 1.8-2 2.4-3.2.4C6.8 4.2 8.6 2.2 12 1z"></path><path fill="currentColor" d="M8.4 8h7.2v10.2H8.4z"></path><path fill="currentColor" d="M6.2 18.2h11.6V21H6.2z"></path></svg>',
    arc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="#e85d6a" stroke-width="2.1" stroke-linecap="round" d="M4 16.5a8 8 0 0 1 16 0"></path><path fill="none" stroke="#e6b422" stroke-width="2.1" stroke-linecap="round" d="M6.6 16.5a5.4 5.4 0 0 1 10.8 0"></path><path fill="none" stroke="#3d9a62" stroke-width="2.1" stroke-linecap="round" d="M9.2 16.5a2.8 2.8 0 0 1 5.6 0"></path></svg>'
  };

  var MARK = '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="leaders-theme-rainbow" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#e85d6a"></stop><stop offset="0.28" stop-color="#f0b429"></stop><stop offset="0.52" stop-color="#3cba55"></stop><stop offset="0.76" stop-color="#178fd0"></stop><stop offset="1" stop-color="#7a6ad6"></stop></linearGradient><clipPath id="leaders-theme-core"><circle cx="12" cy="12" r="3.15"></circle></clipPath></defs><g stroke="#fff" stroke-width="0.85" stroke-linejoin="round"><path fill="#ffe14a" d="M12.00 7.40L12.00 1.60A10.4 10.4 0 0 1 18.68 4.03L14.96 8.48A4.6 4.6 0 0 0 12.00 7.40Z"></path><path fill="#3cba55" d="M14.96 8.48L18.68 4.03A10.4 10.4 0 0 1 22.24 10.19L16.53 11.20A4.6 4.6 0 0 0 14.96 8.48Z"></path><path fill="#178fd0" d="M16.53 11.20L22.24 10.19A10.4 10.4 0 0 1 21.01 17.20L15.98 14.30A4.6 4.6 0 0 0 16.53 11.20Z"></path><path fill="#e25822" d="M15.98 14.30L21.01 17.20A10.4 10.4 0 0 1 15.56 21.77L13.57 16.32A4.6 4.6 0 0 0 15.98 14.30Z"></path><path fill="#7eb0d4" d="M13.57 16.32L15.56 21.77A10.4 10.4 0 0 1 8.44 21.77L10.43 16.32A4.6 4.6 0 0 0 13.57 16.32Z"></path><path fill="#c23b45" d="M10.43 16.32L8.44 21.77A10.4 10.4 0 0 1 2.99 17.20L8.02 14.30A4.6 4.6 0 0 0 10.43 16.32Z"></path><path fill="#14c4c0" d="M8.02 14.30L2.99 17.20A10.4 10.4 0 0 1 1.76 10.19L7.47 11.20A4.6 4.6 0 0 0 8.02 14.30Z"></path><path fill="#e25688" d="M7.47 11.20L1.76 10.19A10.4 10.4 0 0 1 5.32 4.03L9.04 8.48A4.6 4.6 0 0 0 7.47 11.20Z"></path><path fill="url(#leaders-theme-rainbow)" d="M9.04 8.48L5.32 4.03A10.4 10.4 0 0 1 12.00 1.60L12.00 7.40A4.6 4.6 0 0 0 9.04 8.48Z"></path></g><circle class="theme-mark-now" cx="12" cy="12" r="3.45" fill="#f4f0e6" stroke="#fff" stroke-width="0.9"></circle><g clip-path="url(#leaders-theme-core)"><g class="theme-mark-sun" fill="none" stroke="#1c1915" stroke-width="0.9" stroke-linecap="round"><circle cx="12" cy="12" r="1.05" fill="#1c1915" stroke="none"></circle><path d="M12 9.2v.85M12 13.95v.85M9.2 12h.85M13.95 12h.85M10.05 10.05l.6.6M13.35 13.35l.6.6M13.95 10.05l-.6.6M10.65 13.35l-.6.6"></path></g><g class="theme-mark-moon"><path fill="#fff" d="M13.35 9.85a2.2 2.2 0 1 0 1.7 3.9 1.75 1.75 0 1 1-1.7-3.9z"></path></g></g></svg>';

  var style = document.createElement("style");
  style.textContent = [
    "header .lang { display: flex; align-items: center; gap: 8px; }",
    "header .now { display: flex; align-items: center; gap: 8px; margin: 0; color: var(--bar-ink, #f4f7fb); font-size: 13px; font-weight: 650; letter-spacing: 0.08em; text-transform: uppercase; }",
    ":root { --clock-face: #f4f0e6; --clock-rim: #bf0a30; --clock-mark: #1c1915; --clock-hour: #0a3161; --clock-minute: #c4922a; --clock-pin: #1e4d7b; }",
    ".clock { width: 1.45em; height: 1.45em; display: inline-block; vertical-align: -0.28em; margin-right: 0.4em; flex: none; }",
    "header .now .clock { width: 22px; height: 22px; margin: 0; }",
    ".clock-rim { fill: var(--clock-rim); } .clock-face { fill: var(--clock-face); }",
    ".clock-marks { fill: none; stroke: var(--clock-mark); stroke-width: 1.35; stroke-linecap: round; }",
    ".clock-hour { fill: none; stroke: var(--clock-hour); stroke-width: 2.2; stroke-linecap: round; }",
    ".clock-minute { fill: none; stroke: var(--clock-minute); stroke-width: 1.5; stroke-linecap: round; }",
    ".clock-pin { fill: var(--clock-pin); }",
    ".clock-hour, .clock-minute { transform-box: view-box; transform-origin: 16px 16px; }",
    'html[data-theme="dark"] { --clock-face: #1c1915; --clock-rim: #f6d56a; --clock-mark: #f4f0e6; --clock-hour: #e7a3a3; --clock-minute: #9ec0e8; --clock-pin: #e6b422; }',
    'html[data-theme="spring"] { --clock-face: #f3fbea; --clock-rim: #246b3a; --clock-mark: #1a2a14; --clock-hour: #e07a9a; --clock-minute: #3a9ad4; --clock-pin: #e6c84a; }',
    'html[data-theme="spring-dark"] { --clock-face: #121a14; --clock-rim: #e6c84a; --clock-mark: #e8f6df; --clock-hour: #e07a9a; --clock-minute: #7eb6d6; --clock-pin: #f4b8cc; }',
    'html[data-theme="summer"] { --clock-face: #f4f8fc; --clock-rim: #0e6f9c; --clock-mark: #1a2838; --clock-hour: #e07060; --clock-minute: #f0b429; --clock-pin: #14b0b8; }',
    'html[data-theme="summer-dark"] { --clock-face: #101820; --clock-rim: #f0b429; --clock-mark: #f4efe2; --clock-hour: #e07060; --clock-minute: #2ec4c4; --clock-pin: #e0a030; }',
    'html[data-theme="fall"] { --clock-face: #fff8ef; --clock-rim: #c2410c; --clock-mark: #3d160e; --clock-hour: #6b3a8a; --clock-minute: #1f6b3a; --clock-pin: #f6c431; }',
    'html[data-theme="fall-dark"] { --clock-face: #1a100c; --clock-rim: #f6c431; --clock-mark: #fff1e4; --clock-hour: #e07020; --clock-minute: #7dcea0; --clock-pin: #e0a020; }',
    'html[data-theme="winter"] { --clock-face: #f4f8fb; --clock-rim: #1c4e7a; --clock-mark: #172433; --clock-hour: #c23b45; --clock-minute: #e6d3a1; --clock-pin: #7eb0d4; }',
    'html[data-theme="winter-dark"] { --clock-face: #10161c; --clock-rim: #e6d3a1; --clock-mark: #e7eef6; --clock-hour: #e07a80; --clock-minute: #7eb6d6; --clock-pin: #c4b48a; }',
    'html[data-theme="holiday"] { --clock-face: #f4f8fb; --clock-rim: #1e5c45; --clock-mark: #172433; --clock-hour: #c23b45; --clock-minute: #e6c85a; --clock-pin: #6aa8d0; }',
    'html[data-theme="holiday-dark"] { --clock-face: #10161c; --clock-rim: #e6d27a; --clock-mark: #e7eef6; --clock-hour: #c45a68; --clock-minute: #7eb6d6; --clock-pin: #c4a04a; }',
    'html[data-theme="tropical"] { --clock-face: #fffaf0; --clock-rim: #0e8f4a; --clock-mark: #1a2410; --clock-hour: #e83e78; --clock-minute: #14c4c0; --clock-pin: #ffe08a; }',
    'html[data-theme="tropical-dark"] { --clock-face: #14100c; --clock-rim: #14b8b0; --clock-mark: #fff6e8; --clock-hour: #e24b78; --clock-minute: #1ec8b8; --clock-pin: #ffe08a; }',
    'html[data-theme="birthday"] { --clock-face: #fff8fb; --clock-rim: #a33d68; --clock-mark: #2a1620; --clock-hour: #6a8ee0; --clock-minute: #6ec9a0; --clock-pin: #ffe7a8; }',
    'html[data-theme="birthday-dark"] { --clock-face: #1a1016; --clock-rim: #e0b04a; --clock-mark: #fceef3; --clock-hour: #7aa0e8; --clock-minute: #6ec9a0; --clock-pin: #ffe7a8; }',
    'html[data-theme="rainbow"] { --clock-face: #fff6f8; --clock-rim: #4a3aad; --clock-mark: #1c1915; --clock-hour: #c43b4a; --clock-minute: #2f7a40; --clock-pin: #f0b429; }',
    'html[data-theme="rainbow-dark"] { --clock-face: #1a1020; --clock-rim: #f6d0ee; --clock-mark: #f6f1ea; --clock-hour: #e85d6a; --clock-minute: #3cba55; --clock-pin: #f0b429; }',
    ".theme-button { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; padding: 0; border: 0; background: transparent; cursor: pointer; flex: none; color: var(--bar-ink, #f4f7fb); }",
    ".theme-mark svg { width: 26px; height: 26px; display: block; }",
    ".theme-button.is-night .theme-mark-sun { display: none; }",
    ".theme-button:not(.is-night) .theme-mark-moon { display: none; }",
    ".theme-button:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }",
    "header .bar:not(:has(.bar-top)) { position: relative; }",
    "header .bar:not(:has(.bar-top)) > .theme-button { position: absolute; top: 7px; right: 0; }",
    ".theme-button-fixed { position: fixed; top: 10px; right: 10px; z-index: 6; }",
    ".theme-wheel { position: fixed; z-index: 8; width: 300px; height: 300px; }",
    ".theme-wheel[hidden] { display: none; }",
    ".theme-wheel-face { position: relative; width: 300px; height: 300px; border-radius: 50%; background: radial-gradient(circle at 50% 50%, #2a261f 0 46px, #1c1915 47px); box-shadow: 0 16px 40px rgba(0,0,0,.4), inset 0 0 0 2px rgba(255,255,255,.45); }",
    ".theme-choice { position: absolute; left: 50%; top: 50%; width: 40px; height: 40px; margin: -20px 0 0 -20px; border-radius: 50%; border: 2px solid rgba(255,255,255,.9); padding: 0; display: grid; place-items: center; cursor: pointer; }",
    ".theme-choice svg { width: 20px; height: 20px; display: block; }",
    ".theme-choice[aria-pressed='true'] { box-shadow: 0 0 0 3px #fff, 0 0 0 6px var(--accent, #c4b8a4); }",
    ".theme-choice:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }",
    ".theme-wheel-name { position: absolute; left: 50%; top: 50%; width: 76px; margin: 0; transform: translate(-50%, -50%); text-align: center; color: #f4f0e6; font: 650 13px/1.2 'Segoe UI', 'Helvetica Neue', sans-serif; pointer-events: none; }",
    "@media (prefers-reduced-motion: no-preference) { .theme-wheel.is-open .theme-wheel-face { animation: theme-wheel-in 160ms ease; } }",
    "@keyframes theme-wheel-in { from { transform: scale(.55); opacity: .2; } to { transform: none; opacity: 1; } }",
    'html[data-theme="dark"] { --paper: #161410; --ink: #f3efe6; --muted: #c4b8a8; --line: #3a342c; --chip: #1a3348; --map: #3a3018; --map-ink: #f3efe6; --map-on: #f6d56a; --map-tint: #4a6ea0; }',
    'html[data-theme="spring"] { color-scheme: light; --paper: #eef6e4; --ink: #1a2a14; --muted: #4e6844; --line: #cfe0c0; --chip: #f3dc86; --map: #e7d2ae; --map-ink: #1a2a14; --map-on: #e7a0c4; --map-tint: #3a9ad4; }',
    'html[data-theme="spring"] body { --bar: #246b3a; --bar-stripe: #f4b8cc; --bar-line: #8ec8ea; --bar-ink: #f3fbea; --bar-hover: #f4b8cc; --bar-hover-ink: #1a2a14; }',
    'html[data-theme="spring-dark"] { --paper: #121a14; --ink: #e8f6df; --muted: #a9c79a; --line: #2a3a28; --chip: #3a3414; --map: #2c2418; --map-ink: #e8f6df; --map-on: #e7c84a; --map-tint: #3a8ec4; }',
    'html[data-theme="spring-dark"] body { --bar: #1a4a2c; --bar-stripe: #e07a9a; --bar-line: #7eb6d6; --bar-ink: #e8f6df; --bar-hover: #e07a9a; --bar-hover-ink: #1a2a14; }',
    'html[data-theme="summer"] { color-scheme: light; --paper: #e7f3fb; --ink: #1a2838; --muted: #4d6274; --line: #c5dff0; --chip: #ffc9b8; --map: #d3e7f6; --map-ink: #1a2838; --map-on: #f0b429; --map-tint: #14b0b8; }',
    'html[data-theme="summer"] body { --bar: #0e6f9c; --bar-stripe: #f0b429; --bar-line: #3d9a4a; --bar-ink: #f4f8fc; --bar-hover: #f0b429; --bar-hover-ink: #1a2838; }',
    'html[data-theme="summer-dark"] { --paper: #101820; --ink: #f4efe2; --muted: #b7c4ce; --line: #243444; --chip: #4a2830; --map: #163044; --map-ink: #f4efe2; --map-on: #f0b429; --map-tint: #2ec4c4; }',
    'html[data-theme="summer-dark"] body { --bar: #0e4a6c; --bar-stripe: #e0a030; --bar-line: #1e6b3c; --bar-ink: #f4efe2; --bar-hover: #e0a030; --bar-hover-ink: #1a2838; }',
    'html[data-theme="fall"] { color-scheme: light; --paper: #fff3c4; --ink: #3d160e; --muted: #8a4e32; --line: #ead48a; --chip: #ead6f4; --map: #f6c56b; --map-ink: #3d160e; --map-on: #c2410c; --map-tint: #e07020; }',
    'html[data-theme="fall"] body { --bar: #c2410c; --bar-stripe: #f6c431; --bar-line: #1f6b3a; --bar-ink: #fff8ef; --bar-hover: #f6c431; --bar-hover-ink: #3d160e; }',
    'html[data-theme="fall"] header::after, html[data-theme="fall"] footer::before { height: 6px; }',
    'html[data-theme="fall-dark"] { --paper: #1a100c; --ink: #fff1e4; --muted: #e0b09a; --line: #4a2820; --chip: #3c2848; --map: #2a1810; --map-ink: #fff1e4; --map-on: #f6c431; --map-tint: #e07020; }',
    'html[data-theme="fall-dark"] body { --bar: #8a3014; --bar-stripe: #e0a020; --bar-line: #1a4730; --bar-ink: #fff1e4; --bar-hover: #e0a020; --bar-hover-ink: #3d160e; }',
    'html[data-theme="fall-dark"] header::after, html[data-theme="fall-dark"] footer::before { height: 6px; }',
    'html[data-theme="winter"] { color-scheme: light; --paper: #f5f8fc; --ink: #172433; --muted: #5a6d80; --line: #d5e2ee; --chip: #e7d3b0; --map: #e6eef6; --map-ink: #172433; --map-on: #e6d3a1; --map-tint: #7eb0d4; }',
    'html[data-theme="winter"] body { --bar: #1c4e7a; --bar-stripe: #e6d3a1; --bar-line: #c5d8ea; --bar-ink: #f4f8fb; --bar-hover: #e6d3a1; --bar-hover-ink: #172433; }',
    'html[data-theme="winter-dark"] { --paper: #10161c; --ink: #e7eef6; --muted: #a9b8c6; --line: #28343e; --chip: #3a2c22; --map: #152433; --map-ink: #e7eef6; --map-on: #e6d3a1; --map-tint: #6aa0c8; }',
    'html[data-theme="winter-dark"] body { --bar: #163a5c; --bar-stripe: #c4b48a; --bar-line: #7eb6d6; --bar-ink: #e7eef6; --bar-hover: #c4b48a; --bar-hover-ink: #172433; }',
    'html[data-theme="holiday"] { color-scheme: light; --paper: #f4f7fb; --ink: #172433; --muted: #536678; --line: #d3e0ea; --chip: #d6e8f4; --map: #e7eef4; --map-ink: #172433; --map-on: #c23b45; --map-tint: #6aa8d0; }',
    'html[data-theme="holiday"] body { --bar: #1e5c45; --bar-stripe: #c23b45; --bar-line: #e6c85a; --bar-ink: #f4f8fb; --bar-hover: #c23b45; --bar-hover-ink: #fff; }',
    'html[data-theme="holiday-dark"] { --paper: #10161c; --ink: #e7eef6; --muted: #a9b8c6; --line: #28343e; --chip: #1e3348; --map: #1a2834; --map-ink: #e7eef6; --map-on: #e6d27a; --map-tint: #7eb6d6; }',
    'html[data-theme="holiday-dark"] body { --bar: #1a3d34; --bar-stripe: #c45a68; --bar-line: #c4a04a; --bar-ink: #e7eef6; --bar-hover: #c45a68; --bar-hover-ink: #fff; }',
    'html[data-theme="tropical"] { color-scheme: light; --paper: #fff6df; --ink: #1a2410; --muted: #6a5a3a; --line: #f0ddb0; --chip: #ffe08a; --map: #d8f6ea; --map-ink: #1a2410; --map-on: #e83e78; --map-tint: #00c2c7; }',
    'html[data-theme="tropical"] body { --bar: #0e8f4a; --bar-stripe: #e83e78; --bar-line: #14c4c0; --bar-ink: #fffaf0; --bar-hover: #e83e78; --bar-hover-ink: #fff; }',
    'html[data-theme="tropical-dark"] { --paper: #14100c; --ink: #fff6e8; --muted: #d4c4a8; --line: #3a3024; --chip: #4a3414; --map: #143028; --map-ink: #fff6e8; --map-on: #ff7aa0; --map-tint: #1ec8b8; }',
    'html[data-theme="tropical-dark"] body { --bar: #0c7a48; --bar-stripe: #e24b78; --bar-line: #14b8b0; --bar-ink: #fff6e8; --bar-hover: #e24b78; --bar-hover-ink: #fff; }',
    'html[data-theme="birthday"] { color-scheme: light; --paper: #fff4f7; --ink: #2a1620; --muted: #7a5564; --line: #f3d5de; --chip: #d7e4ff; --map: #f8e4ea; --map-ink: #2a1620; --map-on: #e07098; --map-tint: #6a8ee0; }',
    'html[data-theme="birthday"] body { --bar: #a33d68; --bar-stripe: #ffe7a8; --bar-line: #6ec9a0; --bar-ink: #fff8fb; --bar-hover: #ffe7a8; --bar-hover-ink: #2a1620; }',
    'html[data-theme="birthday-dark"] { --paper: #1a1016; --ink: #fceef3; --muted: #d4a8b6; --line: #3a242e; --chip: #243056; --map: #321824; --map-ink: #fceef3; --map-on: #ffe7a8; --map-tint: #7aa0e8; }',
    'html[data-theme="birthday-dark"] body { --bar: #6b2448; --bar-stripe: #e0b04a; --bar-line: #1f6b48; --bar-ink: #fceef3; --bar-hover: #e0b04a; --bar-hover-ink: #2a1620; }',
    'html[data-theme="rainbow"] { color-scheme: light; --paper: rgba(255,252,248,.86); --ink: #1c1915; --muted: #5c564c; --line: #e4d4cc; --chip: rgba(255,255,255,.74); --map: #fff6f2; --map-ink: #1c1915; --map-on: #7a6ad6; --map-tint: #e07098; }',
    'html[data-theme="rainbow"] body { --bar: #3a2a6a; --bar-stripe: #fff; --bar-line: transparent; --bar-ink: #fff; --bar-hover: #1c1915; --bar-hover-ink: #fff; background: linear-gradient(145deg, #ffd0d0, #ffe3a8, #d9f5b8, #bfeee4, #d4e2ff, #f6d0ee) fixed; }',
    'html[data-theme="rainbow-dark"] { --paper: rgba(18,14,16,.82); --ink: #f6f1ea; --muted: #c8beb2; --line: #3c342e; --chip: rgba(32,26,28,.78); --map: #2a2028; --map-ink: #f6f1ea; --map-on: #f6d0ee; --map-tint: #c47ad4; }',
    'html[data-theme="rainbow-dark"] body { --bar: #1a1020; --bar-stripe: #f6f1ea; --bar-line: transparent; --bar-ink: #f6f1ea; --bar-hover: #f6f1ea; --bar-hover-ink: #1c1915; background: linear-gradient(145deg, #3a1820, #3a2a10, #163018, #103038, #1a2048, #381830) fixed; }',
    'html:is([data-theme="spring"],[data-theme="spring-dark"],[data-theme="summer"],[data-theme="summer-dark"],[data-theme="fall"],[data-theme="fall-dark"],[data-theme="winter"],[data-theme="winter-dark"],[data-theme="holiday"],[data-theme="holiday-dark"],[data-theme="tropical"],[data-theme="tropical-dark"],[data-theme="birthday"],[data-theme="birthday-dark"]) header, html:is([data-theme="spring"],[data-theme="spring-dark"],[data-theme="summer"],[data-theme="summer-dark"],[data-theme="fall"],[data-theme="fall-dark"],[data-theme="winter"],[data-theme="winter-dark"],[data-theme="holiday"],[data-theme="holiday-dark"],[data-theme="tropical"],[data-theme="tropical-dark"],[data-theme="birthday"],[data-theme="birthday-dark"]) footer, html:is([data-theme="spring"],[data-theme="spring-dark"],[data-theme="summer"],[data-theme="summer-dark"],[data-theme="fall"],[data-theme="fall-dark"],[data-theme="winter"],[data-theme="winter-dark"],[data-theme="holiday"],[data-theme="holiday-dark"],[data-theme="tropical"],[data-theme="tropical-dark"],[data-theme="birthday"],[data-theme="birthday-dark"]) .lang-menu { background: var(--bar); color: var(--bar-ink); border-color: var(--bar-stripe); }',
    'html:is([data-theme="spring"],[data-theme="spring-dark"],[data-theme="summer"],[data-theme="summer-dark"],[data-theme="fall"],[data-theme="fall-dark"],[data-theme="winter"],[data-theme="winter-dark"],[data-theme="holiday"],[data-theme="holiday-dark"],[data-theme="tropical"],[data-theme="tropical-dark"],[data-theme="birthday"],[data-theme="birthday-dark"]) header::after, html:is([data-theme="spring"],[data-theme="spring-dark"],[data-theme="summer"],[data-theme="summer-dark"],[data-theme="fall"],[data-theme="fall-dark"],[data-theme="winter"],[data-theme="winter-dark"],[data-theme="holiday"],[data-theme="holiday-dark"],[data-theme="tropical"],[data-theme="tropical-dark"],[data-theme="birthday"],[data-theme="birthday-dark"]) footer::before { background: var(--bar-line); }',
    'html[data-theme="rainbow"] header, html[data-theme="rainbow"] footer, html[data-theme="rainbow"] .lang-menu { background: linear-gradient(90deg, #c43b4a, #d4920a, #2f7a40, #1a7aaa, #4a3aad, #c45080); color: #fff; border-color: #fff; }',
    'html[data-theme="rainbow"] header::after, html[data-theme="rainbow"] footer::before { background: transparent; }',
    'html[data-theme="rainbow-dark"] header, html[data-theme="rainbow-dark"] footer, html[data-theme="rainbow-dark"] .lang-menu { background: linear-gradient(90deg, #6a2430, #6a4a14, #245028, #145060, #2a2460, #5a2040); color: #f6f1ea; border-color: #f6f1ea; }',
    'html[data-theme="rainbow-dark"] header::after, html[data-theme="rainbow-dark"] footer::before { background: transparent; }'
  ].join("\n");
  document.head.appendChild(style);

  var button = null;
  var wheel = null;
  var nameEl = null;
  var open = false;

  function nightName(value) {
    return value === "dark" || /-dark$/.test(value);
  }

  function modeOf(value) {
    for (var i = 0; i < MODES.length; i++) {
      if (MODES[i].light === value || MODES[i].dark === value) return MODES[i];
    }
    return MODES[0];
  }

  function apply(theme) {
    if (!ALLOWED[theme]) theme = "light";
    if (theme === "light") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
    var mode = modeOf(theme);
    var dark = nightName(theme);
    if (button) {
      button.classList.toggle("is-night", dark);
      var now = button.querySelector(".theme-mark-now");
      if (now) now.setAttribute("fill", dark ? mode.darkFill : mode.lightFill);
      var ink = dark ? "#fff" : "#1c1915";
      var sun = button.querySelector(".theme-mark-sun");
      if (sun) {
        sun.setAttribute("stroke", ink);
        var sunCore = sun.querySelector("circle");
        if (sunCore) sunCore.setAttribute("fill", ink);
      }
      var moon = button.querySelector(".theme-mark-moon path");
      if (moon) moon.setAttribute("fill", ink);
      button.setAttribute("aria-expanded", open ? "true" : "false");
      button.setAttribute("aria-label", "Themes. " + mode.label + (dark ? ", dark" : ", light") + " is on. Open the theme wheel.");
    }
    if (wheel) {
      var choices = wheel.querySelectorAll(".theme-choice");
      for (var i = 0; i < choices.length; i++) {
        choices[i].setAttribute("aria-pressed", choices[i].getAttribute("data-value") === theme ? "true" : "false");
      }
    }
    if (nameEl) nameEl.textContent = mode.label;
  }

  function saved() {
    try {
      var value = localStorage.getItem(KEY);
      return ALLOWED[value] ? value : "light";
    } catch (error) {
      return "light";
    }
  }

  function choose(value) {
    try { localStorage.setItem(KEY, value); } catch (error) {}
    apply(value);
    closeWheel();
  }

  function place() {
    if (!button || !wheel) return;
    var rect = button.getBoundingClientRect();
    var size = window.innerWidth < 360 ? 260 : 300;
    wheel.style.width = size + "px";
    wheel.style.height = size + "px";
    var face = wheel.querySelector(".theme-wheel-face");
    if (face) {
      face.style.transform = size < 300 ? "scale(" + (size / 300) + ")" : "";
      face.style.transformOrigin = "top left";
    }
    var left = rect.right - size;
    if (left < 8) left = 8;
    if (left + size > window.innerWidth - 8) left = window.innerWidth - size - 8;
    var top = rect.bottom + 8;
    if (top + size > window.innerHeight - 8) top = Math.max(8, rect.top - size - 8);
    wheel.style.left = left + "px";
    wheel.style.top = top + "px";
  }

  function closeWheel() {
    if (!wheel || !open) return;
    open = false;
    wheel.hidden = true;
    wheel.classList.remove("is-open");
    if (button) {
      button.setAttribute("aria-expanded", "false");
      button.focus();
    }
  }

  function openWheel() {
    if (!wheel) return;
    open = true;
    wheel.hidden = false;
    wheel.classList.add("is-open");
    place();
    if (button) button.setAttribute("aria-expanded", "true");
    var current = wheel.querySelector(".theme-choice[aria-pressed='true']") || wheel.querySelector(".theme-choice");
    if (current) current.focus();
  }

  function mountWheel() {
    wheel = document.createElement("div");
    wheel.className = "theme-wheel notranslate";
    wheel.setAttribute("translate", "no");
    wheel.hidden = true;
    wheel.setAttribute("role", "dialog");
    wheel.setAttribute("aria-label", "Themes");
    var face = document.createElement("div");
    face.className = "theme-wheel-face";
    MODES.forEach(function (mode, index) {
      var angle = -Math.PI / 2 + index * (Math.PI * 2 / MODES.length);
      [["light", mode.light, mode.lightFill, mode.lightInk, 116], ["dark", mode.dark, mode.darkFill, mode.darkInk, 66]].forEach(function (part) {
        var choice = document.createElement("button");
        choice.type = "button";
        choice.className = "theme-choice";
        choice.setAttribute("data-value", part[1]);
        choice.setAttribute("aria-label", mode.label + ", " + part[0]);
        choice.setAttribute("aria-pressed", "false");
        choice.style.background = part[0] === "light" && mode.id === "rainbow"
          ? "conic-gradient(#e85d6a, #e6b422, #7cb342, #3aa8c4, #7a6ad6, #e07098, #e85d6a)"
          : part[0] === "dark" && mode.id === "rainbow"
            ? "conic-gradient(#6a2430, #6a4a14, #245028, #145060, #2a2460, #5a2040, #6a2430)"
            : part[2];
        choice.style.color = part[3];
        choice.style.setProperty("--accent", mode.accent);
        var mark = mode.mark;
        if (mode.id === "day" && part[0] === "dark") mark = "moon";
        choice.innerHTML = MARKS[mark];
        var x = Math.cos(angle) * part[4];
        var y = Math.sin(angle) * part[4];
        choice.style.transform = "translate(" + x.toFixed(1) + "px, " + y.toFixed(1) + "px)";
        choice.addEventListener("mouseenter", function () { if (nameEl) nameEl.textContent = mode.label; });
        choice.addEventListener("focus", function () { if (nameEl) nameEl.textContent = mode.label; });
        choice.addEventListener("click", function () { choose(part[1]); });
        face.appendChild(choice);
      });
    });
    nameEl = document.createElement("p");
    nameEl.className = "theme-wheel-name";
    nameEl.setAttribute("aria-hidden", "true");
    face.appendChild(nameEl);
    wheel.appendChild(face);
    document.body.appendChild(wheel);
    wheel.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeWheel();
        return;
      }
      var step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
      if (!step) return;
      var choices = Array.prototype.slice.call(wheel.querySelectorAll(".theme-choice"));
      var index = choices.indexOf(document.activeElement);
      if (index < 0) index = 0;
      event.preventDefault();
      choices[(index + step + choices.length) % choices.length].focus();
    });
  }

  function mount() {
    button = document.querySelector(".theme-button");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "theme-button notranslate";
      button.setAttribute("translate", "no");
      button.setAttribute("aria-haspopup", "dialog");
      button.setAttribute("aria-expanded", "false");
      button.innerHTML = '<span class="theme-mark" aria-hidden="true">' + MARK + '</span>';
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
    button.addEventListener("click", function (event) {
      event.stopPropagation();
      if (open) closeWheel();
      else openWheel();
    });
    mountWheel();
    document.addEventListener("click", function (event) {
      if (!open) return;
      if (wheel.contains(event.target) || button.contains(event.target)) return;
      closeWheel();
    });
    window.addEventListener("resize", function () { if (open) place(); });
    apply(saved());
  }

  apply(saved());
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();

  function clockMarkup() {
    var marks = "";
    for (var i = 0; i < 12; i++) {
      var a = i * Math.PI / 6;
      var inner = i % 3 === 0 ? 7.1 : 8.5;
      var outer = 11.15;
      marks += '<line x1="' + (16 + Math.sin(a) * inner).toFixed(2) + '" y1="' + (16 - Math.cos(a) * inner).toFixed(2) + '" x2="' + (16 + Math.sin(a) * outer).toFixed(2) + '" y2="' + (16 - Math.cos(a) * outer).toFixed(2) + '"/>';
    }
    return '<svg class="clock" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><circle class="clock-rim" cx="16" cy="16" r="15"/><circle class="clock-face" cx="16" cy="16" r="12.15"/><g class="clock-marks">' + marks + '</g><line class="clock-hour" x1="16" y1="16.8" x2="16" y2="9.1"/><line class="clock-minute" x1="16" y1="17.2" x2="16" y2="6.3"/><circle class="clock-pin" cx="16" cy="16" r="1.55"/></svg>';
  }

  function setClockHands(root, d) {
    if (!root) return;
    var clock = root.querySelector ? root.querySelector(".clock") : null;
    if (!clock && root.classList && root.classList.contains("clock")) clock = root;
    if (!clock) return;
    var minute = d.getMinutes();
    var hour = d.getHours() % 12;
    var hourHand = clock.querySelector(".clock-hour");
    var minuteHand = clock.querySelector(".clock-minute");
    if (hourHand) hourHand.style.transform = "rotate(" + (hour * 30 + minute * 0.5) + "deg)";
    if (minuteHand) minuteHand.style.transform = "rotate(" + (minute * 6) + "deg)";
  }

  function ensureClock(before) {
    var prev = before.previousElementSibling;
    if (prev && prev.classList.contains("clock")) return prev;
    before.insertAdjacentHTML("beforebegin", clockMarkup());
    return before.previousElementSibling;
  }

  function showLocalNow() {
    var today = document.getElementById("today");
    if (today) {
      ensureClock(today);
      setClockHands(today.parentNode, new Date());
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") setClockHands(today.parentNode, new Date());
      });
      return;
    }
    var bar = document.querySelector("header .bar");
    if (!bar || bar.querySelector(".now")) return;
    var line = document.createElement("p");
    line.className = "now";
    line.insertAdjacentHTML("afterbegin", clockMarkup());
    var el = document.createElement("time");
    line.appendChild(el);
    var here = bar.querySelector(".here");
    var top = bar.querySelector(".bar-top");
    var after = here || top;
    if (after && after.nextSibling) bar.insertBefore(line, after.nextSibling);
    else bar.appendChild(line);
    var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    function pad(n) { return n < 10 ? "0" + n : String(n); }
    function zoneName(d) {
      try {
        var parts = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" }).formatToParts(d);
        for (var i = 0; i < parts.length; i++) {
          if (parts[i].type === "timeZoneName") return parts[i].value;
        }
      } catch (e) {}
      return "";
    }
    function show() {
      var d = new Date();
      var y = d.getFullYear();
      var m = d.getMonth();
      var day = d.getDate();
      var hour = d.getHours();
      var minute = d.getMinutes();
      var h12 = hour % 12 || 12;
      var ap = hour < 12 ? "a.m." : "p.m.";
      var off = -d.getTimezoneOffset();
      var sign = off >= 0 ? "+" : "-";
      var abs = Math.abs(off);
      var zone = zoneName(d);
      el.dateTime = y + "-" + pad(m + 1) + "-" + pad(day) + "T" + pad(hour) + ":" + pad(minute) + ":00" + sign + pad(Math.floor(abs / 60)) + ":" + pad(abs % 60);
      el.textContent = days[d.getDay()] + ", " + months[m] + " " + day + ", " + y + " · " + h12 + ":" + pad(minute) + " " + ap + (zone ? " " + zone : "");
      setClockHands(line, d);
    }
    function waitForNextMinute() {
      var d = new Date();
      var next = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes() + 1, 0, 0);
      setTimeout(function () {
        show();
        waitForNextMinute();
      }, Math.max(250, next - d + 50));
    }
    show();
    waitForNextMinute();
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") show();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", showLocalNow);
  else showLocalNow();

  window.addEventListener("storage", function (event) {
    if (event.key === KEY) apply(ALLOWED[event.newValue] ? event.newValue : "light");
  });

  var watched = [];
  document.querySelectorAll("script[src]").forEach(function (script) {
    var src = script.getAttribute("src") || "";
    if (src.indexOf("census.js") >= 0) watched.push("census/us.json");
    if (src.indexOf("crime.js") >= 0) watched.push("census/crime.json");
    if (src.indexOf("health.js") >= 0) watched.push("census/health.json");
    if (src.indexOf("water.js") >= 0) watched.push("census/water.json");
    if (src.indexOf("gallery.js") >= 0) watched.push("gallery-photos.json");
  });
  if (watched.length) {
    var seen = {};
    function pullWatched() {
      watched.forEach(function (url) {
        fetch(url + "?t=" + Math.floor(Date.now() / 600000), { cache: "no-store" }).then(function (response) {
          return response.ok ? response.text() : "";
        }).then(function (text) {
          if (!text) return;
          if (seen[url] && seen[url] !== text) location.reload();
          seen[url] = text;
        }).catch(function () {});
      });
    }
    setTimeout(pullWatched, 4000);
    setInterval(pullWatched, 10 * 60 * 1000);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") pullWatched();
    });
  }
})();
