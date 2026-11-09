(function () {
  if (window.__leadersTheme) return;
  window.__leadersTheme = true;
  var KEY = "leaders-theme";
  var SHADE_KEY = "leaders-shade";

  var MODES = [
    { id: "day", label: "Default", light: "light", dark: "dark", lightFill: "#f4f0e6", darkFill: "#12141c", lightInk: "#1c1915", darkInk: "#f3efe6", accent: "#bf0a30", mark: "sun" },
    { id: "spring", label: "Spring", light: "spring", dark: "spring-dark", lightFill: "#eef6e4", darkFill: "#121a14", lightInk: "#1a2a14", darkInk: "#e8f6df", accent: "#e6c84a", mark: "sprout" },
    { id: "summer", label: "Summer", light: "summer", dark: "summer-dark", lightFill: "#e7f3fb", darkFill: "#101820", lightInk: "#1a2838", darkInk: "#f4efe2", accent: "#e07060", mark: "sun" },
    { id: "fall", label: "Fall", light: "fall", dark: "fall-dark", lightFill: "#fff3c4", darkFill: "#1a100c", lightInk: "#3d160e", darkInk: "#fff1e4", accent: "#e07020", mark: "leaf" },
    { id: "winter", label: "Winter", light: "winter", dark: "winter-dark", lightFill: "#f5f8fc", darkFill: "#10161c", lightInk: "#172433", darkInk: "#e7eef6", accent: "#7eb0d4", mark: "flake" },
    { id: "holiday", label: "Holiday", light: "holiday", dark: "holiday-dark", lightFill: "#f4f7fb", darkFill: "#10161c", lightInk: "#172433", darkInk: "#e7eef6", accent: "#c23b45", mark: "gift" },
    { id: "tropical", label: "Tropical", light: "tropical", dark: "tropical-dark", lightFill: "#fff6df", darkFill: "#14100c", lightInk: "#1a2410", darkInk: "#fff6e8", accent: "#e83e78", mark: "flower" },
    { id: "birthday", label: "Birthday", light: "birthday", dark: "birthday-dark", lightFill: "#fff4f7", darkFill: "#1a1016", lightInk: "#2a1620", darkInk: "#fceef3", accent: "#6a8ee0", mark: "candle" },
    { id: "rainbow", label: "Rainbow", light: "rainbow", dark: "rainbow-dark", lightFill: "#fff6f8", darkFill: "#1a1218", lightInk: "#1c1915", darkInk: "#f6f1ea", accent: "#7a6ad6", mark: "arc" },
    { id: "bw", label: "Black and White", light: "bw", dark: "bw-dark", lightFill: "#f4f4f2", darkFill: "#161616", lightInk: "#111111", darkInk: "#f4f4f2", accent: "#111111", mark: "split" },
    { id: "typewriter", label: "Typewriter", light: "typewriter", dark: "typewriter-dark", lightFill: "#f4ecd8", darkFill: "#1a1714", lightInk: "#1c1a17", darkInk: "#f0e6d2", accent: "#9c2b2b", mark: "keys" },
    { id: "newsroom", label: "Newsroom", light: "newsroom", dark: "newsroom-dark", lightFill: "#f7f4ee", darkFill: "#14181c", lightInk: "#121212", darkInk: "#f4f1ea", accent: "#c81e1e", mark: "paper" },
    { id: "office", label: "Office", light: "office", dark: "office-dark", lightFill: "#f4f6f8", darkFill: "#12181e", lightInk: "#1b2836", darkInk: "#e7eef4", accent: "#1f4e79", mark: "case" },
    { id: "arcade", label: "Arcade", light: "arcade", dark: "arcade-dark", lightFill: "#ff4fa3", darkFill: "#1a1030", lightInk: "#fff6ea", darkInk: "#2ce6d0", accent: "#ffe14a", mark: "joy" },
    { id: "verdant", label: "Verdant", light: "verdant", dark: "verdant-dark", lightFill: "#d7ecc4", darkFill: "#0e1a12", lightInk: "#102418", darkInk: "#e5f6e4", accent: "#1d6b3a", mark: "grove" },
    { id: "fantasy", label: "Fantasy", light: "fantasy", dark: "fantasy-dark", lightFill: "#f6efe0", darkFill: "#1c1230", lightInk: "#3a2068", darkInk: "#e6b422", accent: "#6b3fa0", mark: "spark" },
    { id: "cyberpunk", label: "Cyberpunk", light: "cyberpunk", dark: "cyberpunk-dark", lightFill: "#ff2bd6", darkFill: "#07060e", lightInk: "#140818", darkInk: "#00f0ff", accent: "#00e5ff", mark: "visor" },
    { id: "medieval", label: "Medieval", light: "medieval", dark: "medieval-dark", lightFill: "#f3e6c8", darkFill: "#2a100c", lightInk: "#6b1d1d", darkInk: "#e6c15a", accent: "#c9a227", mark: "shield" },
    { id: "school", label: "School", light: "school", dark: "school-dark", lightFill: "#fffdf6", darkFill: "#121820", lightInk: "#1a3a7a", darkInk: "#f2c14e", accent: "#c23b45", mark: "apple" },
    { id: "farmhouse", label: "Farmhouse", light: "farmhouse", dark: "farmhouse-dark", lightFill: "#f7f1e6", darkFill: "#1c1612", lightInk: "#7a2e24", darkInk: "#f6efe4", accent: "#7a2e24", mark: "barn" },
    { id: "treehouse", label: "Treehouse", light: "treehouse", dark: "treehouse-dark", lightFill: "#e7f0d4", darkFill: "#1a140e", lightInk: "#3d6b24", darkInk: "#8fd46a", accent: "#6b4423", mark: "perch" },
    { id: "alien", label: "Alien", light: "alien", dark: "alien-dark", lightFill: "#d4ff6a", darkFill: "#070d08", lightInk: "#102018", darkInk: "#b6ff3c", accent: "#7a5cff", mark: "saucer" },
    { id: "zodiac", label: "Zodiac", light: "zodiac", dark: "zodiac-dark", lightFill: "#f7f3ea", darkFill: "#0c0a18", lightInk: "#1e1a4a", darkInk: "#e6c15a", accent: "#e6c15a", mark: "stars" },
    { id: "sportsball", label: "Sportsball", light: "sportsball", dark: "sportsball-dark", lightFill: "#ff6a1a", darkFill: "#0c140e", lightInk: "#102018", darkInk: "#ffb000", accent: "#ff6a1a", mark: "ball" }
  ];

  var ALLOWED = {};
  MODES.forEach(function (mode) {
    ALLOWED[mode.light] = true;
    ALLOWED[mode.dark] = true;
  });

  var MARKS = {
    sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke-linecap="round"><g stroke="#e25822" stroke-width="2.2"><path d="M12 1.6v3.1M12 19.3v3.1M1.6 12h3.1M19.3 12h3.1"></path></g><g stroke="#f0a020" stroke-width="2.2"><path d="M4.5 4.5l2.2 2.2M17.3 17.3l2.2 2.2M19.5 4.5l-2.2 2.2M6.7 17.3l-2.2 2.2"></path></g></g><circle cx="12" cy="12" r="4.3" fill="#ffe14a"></circle><circle cx="12" cy="12" r="2.2" fill="#fff6c2"></circle><circle cx="10.7" cy="10.8" r=".75" fill="#fff"></circle></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#f4efe4" d="M14.8 3.1A8.1 8.1 0 1 0 20.6 16 6.3 6.3 0 0 1 14.8 3.1z"></path><path fill="#d9cba8" d="M14.2 6.4a3.8 3.8 0 0 0 .8 6.2 6.4 6.4 0 0 1-.8-6.2z"></path><circle cx="6.6" cy="6.2" r="1.2" fill="#ffe14a"></circle><circle cx="4.6" cy="9.1" r=".7" fill="#fff"></circle><circle cx="8.2" cy="4.4" r=".55" fill="#7eb0d4"></circle></svg>',
    sprout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#c4a06a" d="M6.6 18.4h10.8v2.4H6.6z"></path><path fill="#246b3a" d="M11 18.6V11h2v7.6z"></path><path fill="#3d9a4a" d="M12 12c0-3.8 3-6.6 7-7-.4 4-3.2 6.4-7 7z"></path><path fill="#8fd46a" d="M12 13.2C8.8 12.8 6.2 10.8 5.2 7.6 8.6 7.8 11 10 12 13.2z"></path><circle cx="12" cy="8" r="1.45" fill="#f4b8cc"></circle></svg>',
    leaf: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#e07020" d="M17.4 3.2C12 4.4 8 8.2 6.8 14.4c2.8-1 5.6-.8 7.6 1.4-2 1.2-4 3.2-5 5.6 3.8-1 7.6-4 9.8-9 1-2.4 0-5.8-1.8-9.2z"></path><path fill="#c2410c" d="M16 5.2c-2 2.2-3.8 5-4.4 8 1.8 0 3.4.6 4.8 1.6.2-3.2 0-6.6-.4-9.6z"></path><path fill="#6b3a1a" d="M7 16.6c1.2 1.4 2.4 2.8 3.2 4.6-2-.4-3.4-1.8-4.4-3.4.2-.6.8-1 1.2-1.2z"></path><path fill="none" stroke="#f6c431" stroke-width="1.5" stroke-linecap="round" d="M8.2 17.2C11 14 14 10.2 17 6.4"></path><circle cx="13.4" cy="10" r="1" fill="#ffe7a8"></circle></svg>',
    flake: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="#7eb0d4"><rect x="10.9" y="2" width="2.2" height="20" rx="1"></rect><rect x="2" y="10.9" width="20" height="2.2" rx="1"></rect><rect x="4.2" y="10.9" width="15.6" height="2.2" rx="1" transform="rotate(45 12 12)"></rect><rect x="4.2" y="10.9" width="15.6" height="2.2" rx="1" transform="rotate(-45 12 12)"></rect></g><circle cx="12" cy="12" r="2.3" fill="#fff"></circle><circle cx="12" cy="12" r="1" fill="#3aa8c4"></circle><circle cx="12" cy="3.2" r="1.2" fill="#1c4e7a"></circle><circle cx="12" cy="20.8" r="1.2" fill="#1c4e7a"></circle><circle cx="3.2" cy="12" r="1.2" fill="#c5d8ea"></circle><circle cx="20.8" cy="12" r="1.2" fill="#c5d8ea"></circle></svg>',
    gift: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10.2" width="16" height="9.4" rx=".6" fill="#c23b45"></rect><rect x="3.2" y="7.2" width="17.6" height="3.4" rx=".4" fill="#e07080"></rect><rect x="10.8" y="7.2" width="2.4" height="12.4" fill="#1e5c45"></rect><rect x="3.2" y="11.2" width="17.6" height="1.8" fill="#1e5c45"></rect><path fill="#e6c85a" d="M12 7.6C10.4 5.2 7.8 5 7.8 6.8S10.4 7.6 12 7.6z"></path><path fill="#fff6c2" d="M12 7.6c1.6-2.4 4.2-2.6 4.2-.8S13.6 7.6 12 7.6z"></path></svg>',
    flower: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="6" rx="3.1" ry="4.2" fill="#e83e78"></ellipse><ellipse cx="17.4" cy="10" rx="3.1" ry="4.2" transform="rotate(72 17.4 10)" fill="#ff8ab0"></ellipse><ellipse cx="15.2" cy="16.4" rx="3.1" ry="4.2" transform="rotate(144 15.2 16.4)" fill="#fff"></ellipse><ellipse cx="8.8" cy="16.4" rx="3.1" ry="4.2" transform="rotate(216 8.8 16.4)" fill="#ffb703"></ellipse><ellipse cx="6.6" cy="10" rx="3.1" ry="4.2" transform="rotate(288 6.6 10)" fill="#ff8ab0"></ellipse><circle cx="12" cy="12" r="2.5" fill="#ffe14a"></circle><circle cx="12" cy="12" r="1.05" fill="#0e8f4a"></circle></svg>',
    candle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#e85d2b" d="M12 1.2c1.6 2 2.4 3.4 1.2 5-.6.8-2.2.3-1.4-.7.2 1.6-1.8 2.2-2.8.4C7.4 4 9 2.2 12 1.2z"></path><path fill="#ffe14a" d="M12 2.8c.7 1 .9 1.6.4 2.4-.5 1-1.4.2-.5-.8.1.7-.7.9-1.1.2.3-.8.6-1.4 1.2-1.8z"></path><rect x="11.4" y="6.8" width="1.2" height="1.5" fill="#2a1620"></rect><rect x="8.6" y="8" width="6.8" height="9.2" rx=".4" fill="#fff4f7"></rect><rect x="8.6" y="11.2" width="6.8" height="1.6" fill="#e07098"></rect><rect x="6.4" y="17" width="11.2" height="3" rx=".5" fill="#6a8ee0"></rect></svg>',
    arc: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke-width="1.7" stroke-linecap="round"><path stroke="#e85d6a" d="M3.2 17.2a8.8 8.8 0 0 1 17.6 0"></path><path stroke="#f0b429" d="M5 17.2a7 7 0 0 1 14 0"></path><path stroke="#ffe14a" d="M6.7 17.2a5.3 5.3 0 0 1 10.6 0"></path><path stroke="#3cba55" d="M8.3 17.2a3.7 3.7 0 0 1 7.4 0"></path><path stroke="#178fd0" d="M9.8 17.2a2.2 2.2 0 0 1 4.4 0"></path></g><circle cx="12" cy="17.2" r="1.15" fill="#7a6ad6"></circle></svg>',
    split: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.2" fill="#f4f4f2"></circle><path fill="#111111" d="M12 3.8a8.2 8.2 0 0 1 0 16.4z"></path><circle cx="12" cy="12" r="8.2" fill="none" stroke="#6e6e6e" stroke-width="1.4"></circle><circle cx="12" cy="8.1" r="1.55" fill="#d4d4d4"></circle><circle cx="12" cy="15.9" r="1.55" fill="#2a2a2a"></circle></svg>',
    keys: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.2" y="15.8" width="17.6" height="4.2" rx="1" fill="#2a2622"></rect><rect x="4.4" y="16.8" width="15.2" height="1.2" rx=".4" fill="#8a8175"></rect><rect x="4.6" y="8.8" width="3.3" height="3.3" rx=".4" fill="#f4ecd8"></rect><rect x="10.35" y="8.8" width="3.3" height="3.3" rx=".4" fill="#9c2b2b"></rect><rect x="16.1" y="8.8" width="3.3" height="3.3" rx=".4" fill="#f4ecd8"></rect><rect x="7.4" y="4.2" width="3.3" height="3.3" rx=".4" fill="#fff"></rect><rect x="13.2" y="4.2" width="3.3" height="3.3" rx=".4" fill="#e6d7b8"></rect></svg>',
    paper: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.2" y="2.2" width="15.6" height="19.6" rx="1" fill="#f7f4ee" stroke="#121212" stroke-width="1.3"></rect><rect x="6.2" y="4.2" width="11.6" height="2.3" fill="#121212"></rect><rect x="6.2" y="7.1" width="11.6" height="1.15" fill="#c81e1e"></rect><path fill="none" stroke="#5a564e" stroke-width="1.15" stroke-linecap="round" d="M6.4 10.1h5M6.4 12.3h5M6.4 14.5h5M6.4 16.7h3.6"></path><rect x="12.6" y="9.7" width="5" height="6.8" fill="#d9d3c7"></rect></svg>',
    case: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="#16324e" stroke-width="1.8" d="M9.2 8V6.5A1.3 1.3 0 0 1 10.5 5.2h3A1.3 1.3 0 0 1 14.8 6.5V8"></path><rect x="3.2" y="8" width="17.6" height="11.2" rx="1.3" fill="#1f4e79"></rect><rect x="3.2" y="12.1" width="17.6" height="2" fill="#7eb0d4"></rect><rect x="10.3" y="11.4" width="3.4" height="3.3" rx=".4" fill="#e6b422"></rect><rect x="5" y="9.3" width="4.2" height=".9" rx=".3" fill="#f4f7fb"></rect></svg>',
    joy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.4" y="15" width="17.2" height="5.2" rx="1.4" fill="#24144a"></rect><circle cx="6.4" cy="17.5" r="1.2" fill="#ffe14a"></circle><circle cx="9.6" cy="17.5" r="1.2" fill="#ff3d8a"></circle><rect x="14.4" y="16.6" width="3.8" height="1.7" rx=".4" fill="#2ce6d0"></rect><rect x="11" y="9" width="2.3" height="6.4" fill="#2ce6d0"></rect><circle cx="12.15" cy="7" r="3.1" fill="#ff4fa3"></circle><circle cx="11.2" cy="6.2" r=".8" fill="#fff"></circle></svg>',
    grove: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#1d6b3a" d="M12 1.8 18.4 16.6H5.6z"></path><path fill="#3d9a4a" d="M12 6 16.8 16.6H7.2z"></path><path fill="#8fbf3f" d="M12 10 15 16.6H9z"></path><rect x="10.6" y="16.4" width="2.8" height="5.2" rx=".3" fill="#6b4423"></rect><circle cx="12" cy="5" r=".95" fill="#e7f6c8"></circle></svg>',
    spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#e6b422" d="M12 1.2 13.9 8.2 21 9.8 13.9 11.4 12 18.4 10.1 11.4 3 9.8l7.1-1.6z"></path><path fill="#fff6c2" d="M12 5 13.1 8.6 16.6 9.6 13.1 10.6 12 14.2 10.9 10.6 7.4 9.6 10.9 8.6z"></path><path fill="#c9a0e0" d="M18.2 2.8 19 5.1 21.3 5.8 19 6.5 18.2 8.8 17.4 6.5 15.1 5.8 17.4 5.1z"></path><circle cx="5.2" cy="16.8" r="1.4" fill="#6b3fa0"></circle><circle cx="19.4" cy="15.4" r=".85" fill="#fff"></circle></svg>',
    visor: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#12081c" d="M3.2 14.4C3.8 9.6 7.2 6.4 12 6.4s8.2 3.2 8.8 8z"></path><rect x="2.2" y="13.2" width="19.6" height="2.5" rx=".4" fill="#7a5cff"></rect><rect x="5.2" y="13.6" width="4.8" height="3" rx=".4" fill="#00f0ff"></rect><rect x="14" y="13.6" width="4.8" height="3" rx=".4" fill="#ff2bd6"></rect><path fill="none" stroke="#ffe14a" stroke-width="1.5" stroke-linecap="round" d="M7.6 9.2h8.8"></path><circle cx="12" cy="17.2" r=".75" fill="#fff"></circle></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#3a1010" d="M12 1.6 20 4.8v6.8c0 4.6-3.1 8-8 10.4-4.9-2.4-8-5.8-8-10.4V4.8z"></path><path fill="#6b1d1d" d="M12 3.6 17.8 5.8v5.6c0 3.6-2.3 6.2-5.8 8.2-3.5-2-5.8-4.6-5.8-8.2V5.8z"></path><rect x="10.8" y="6.4" width="2.4" height="9.4" fill="#e6c15a"></rect><rect x="7.4" y="9.4" width="9.2" height="2.3" fill="#e6c15a"></rect><circle cx="12" cy="10.5" r="1.2" fill="#f8f0dc"></circle><path fill="#a33d45" d="M12 16.6c1.8-.8 3-2.2 3.6-3.6-1.2.2-2.4.8-3.6 1.8-1.2-1-2.4-1.6-3.6-1.8.6 1.4 1.8 2.8 3.6 3.6z"></path></svg>',
    apple: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="#6b4423" stroke-width="1.4" stroke-linecap="round" d="M12.4 6.6c.3-1.6 1.3-2.8 2.8-3.2"></path><path fill="#3d9a4a" d="M13.6 5.4c1.7-.1 3 .7 3.4 1.8-1.5.2-2.8-.3-3.4-1.8z"></path><path fill="#c23b45" d="M12 7.2c-3.3.2-5.8 2.6-5.8 6.2 0 3.3 2.1 6 5 6.6h1.6c2.9-.6 5-3.3 5-6.6 0-3.6-2.5-6-5.8-6.2z"></path><path fill="#e07080" d="M9 9.2c.9-1.3 2.2-1.9 3.4-1.6-.7 1.5-1.8 2.3-3.4 1.6z"></path><circle cx="9.2" cy="11.4" r=".75" fill="#fff"></circle></svg>',
    barn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#6b3a1a" d="M2.2 11.6 12 3.4l9.8 8.2v1.6H2.2z"></path><rect x="3.8" y="12.4" width="16.4" height="6.6" fill="#7a2e24"></rect><rect x="10.2" y="14.2" width="3.6" height="4.8" fill="#f7f1e6"></rect><rect x="5.8" y="14.2" width="2.5" height="2.2" fill="#e6c15a"></rect><rect x="15.7" y="14.2" width="2.5" height="2.2" fill="#e6c15a"></rect><path fill="#8fa37a" d="M2.4 19h19.2v2H2.4z"></path></svg>',
    perch: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#3d8a3a" d="M3.2 2.6 8.2 9H6.2l2.4 3.6H6.2L8.8 16.2H2.2L4.8 12.6H2.4L4.8 9H2.8z"></path><path fill="#8fd46a" d="M4.2 5.6 6.6 9H5.4l1.4 2.2H5.6L7.2 13.6H3.6L5 11.4H3.8L5.2 9H4z"></path><rect x="4.6" y="15.8" width="2.1" height="5.2" fill="#6b4423"></rect><path fill="#5a3418" d="M9.2 12.8 14.6 8.2 20 12.8z"></path><rect x="10.2" y="12.6" width="8.8" height="5.6" rx=".4" fill="#c4a06a"></rect><rect x="13.2" y="14" width="2.6" height="2.3" fill="#7eb6d6"></rect></svg>',
    saucer: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#7a5cff" d="M8.6 12c.6-3.1 2-5.2 3.4-5.2s2.8 2.1 3.4 5.2z"></path><ellipse cx="12" cy="12.6" rx="8.8" ry="2.9" fill="#e8ffe4"></ellipse><ellipse cx="12" cy="13.5" rx="6.2" ry="1.25" fill="#14301c"></ellipse><circle cx="5.2" cy="12.6" r="1.05" fill="#b6ff3c"></circle><circle cx="18.8" cy="12.6" r="1.05" fill="#ff4fa3"></circle><ellipse cx="12" cy="8.8" rx="1.35" ry=".85" fill="#fff"></ellipse></svg>',
    stars: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="#7a6ad6" stroke-width="1.5" stroke-linecap="round" d="M5.4 17 12 5.4 18.8 13.2"></path><circle cx="5.4" cy="17" r="2" fill="#e6c15a"></circle><circle cx="12" cy="5.4" r="2.25" fill="#ffe14a"></circle><circle cx="11.3" cy="4.8" r=".55" fill="#fff"></circle><circle cx="18.8" cy="13.2" r="1.7" fill="#a898e0"></circle><path fill="#c9a0e0" d="M16.4 3.6a2.1 2.1 0 1 0 2.1 3.1 1.65 1.65 0 1 1-2.1-3.1z"></path></svg>',
    ball: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="11.4" r="7.5" fill="#ff6a1a"></circle><path fill="#e24400" d="M12 3.9c2.1 2.2 3.3 4.8 3.3 7.5s-1.2 5.3-3.3 7.5c-2.1-2.2-3.3-4.8-3.3-7.5s1.2-5.3 3.3-7.5z"></path><path fill="none" stroke="#142033" stroke-width="1.45" d="M12 4.2v14.4M5 11.4h14M6.6 6.8c1.6 1.3 3.4 2 5.4 2s3.8-.7 5.4-2M6.6 16c1.6-1.3 3.4-2 5.4-2s3.8.7 5.4 2"></path><circle cx="9" cy="8.6" r="1.25" fill="#fff6ea"></circle><path fill="#145c32" d="M3.2 19.4h17.6V21H3.2z"></path></svg>'
  };

  var MARK = '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="leaders-theme-rainbow" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#e85d6a"></stop><stop offset="0.28" stop-color="#f0b429"></stop><stop offset="0.52" stop-color="#3cba55"></stop><stop offset="0.76" stop-color="#178fd0"></stop><stop offset="1" stop-color="#7a6ad6"></stop></linearGradient><clipPath id="leaders-theme-core"><circle cx="12" cy="12" r="3.15"></circle></clipPath></defs><g stroke="#fff" stroke-width="0.85" stroke-linejoin="round"><path fill="#ffe14a" d="M12.00 7.40L12.00 1.60A10.4 10.4 0 0 1 18.68 4.03L14.96 8.48A4.6 4.6 0 0 0 12.00 7.40Z"></path><path fill="#3cba55" d="M14.96 8.48L18.68 4.03A10.4 10.4 0 0 1 22.24 10.19L16.53 11.20A4.6 4.6 0 0 0 14.96 8.48Z"></path><path fill="#178fd0" d="M16.53 11.20L22.24 10.19A10.4 10.4 0 0 1 21.01 17.20L15.98 14.30A4.6 4.6 0 0 0 16.53 11.20Z"></path><path fill="#e25822" d="M15.98 14.30L21.01 17.20A10.4 10.4 0 0 1 15.56 21.77L13.57 16.32A4.6 4.6 0 0 0 15.98 14.30Z"></path><path fill="#7eb0d4" d="M13.57 16.32L15.56 21.77A10.4 10.4 0 0 1 8.44 21.77L10.43 16.32A4.6 4.6 0 0 0 13.57 16.32Z"></path><path fill="#c23b45" d="M10.43 16.32L8.44 21.77A10.4 10.4 0 0 1 2.99 17.20L8.02 14.30A4.6 4.6 0 0 0 10.43 16.32Z"></path><path fill="#14c4c0" d="M8.02 14.30L2.99 17.20A10.4 10.4 0 0 1 1.76 10.19L7.47 11.20A4.6 4.6 0 0 0 8.02 14.30Z"></path><path fill="#e25688" d="M7.47 11.20L1.76 10.19A10.4 10.4 0 0 1 5.32 4.03L9.04 8.48A4.6 4.6 0 0 0 7.47 11.20Z"></path><path fill="url(#leaders-theme-rainbow)" d="M9.04 8.48L5.32 4.03A10.4 10.4 0 0 1 12.00 1.60L12.00 7.40A4.6 4.6 0 0 0 9.04 8.48Z"></path></g><circle class="theme-mark-now" cx="12" cy="12" r="3.45" fill="#f4f0e6" stroke="#fff" stroke-width="0.9"></circle><g clip-path="url(#leaders-theme-core)"><g class="theme-mark-sun" fill="none" stroke="#1c1915" stroke-width="0.9" stroke-linecap="round"><circle cx="12" cy="12" r="1.05" fill="#1c1915" stroke="none"></circle><path d="M12 9.2v.85M12 13.95v.85M9.2 12h.85M13.95 12h.85M10.05 10.05l.6.6M13.35 13.35l.6.6M13.95 10.05l-.6.6M10.65 13.35l-.6.6"></path></g><g class="theme-mark-moon"><path fill="#fff" d="M13.35 9.85a2.2 2.2 0 1 0 1.7 3.9 1.75 1.75 0 1 1-1.7-3.9z"></path></g></g></svg>';

  var FONT_LEGACY = {
    "Segoe UI": '"Segoe UI", "Helvetica Neue", sans-serif',
    "Arial": "Arial, Helvetica, sans-serif",
    "Verdana": "Verdana, Geneva, sans-serif",
    "Calibri": "Calibri, Candara, sans-serif",
    "Georgia": "Georgia, Palatino, serif",
    "Palatino Linotype": '"Palatino Linotype", Palatino, serif',
    "Cambria": "Cambria, Georgia, serif",
    "Times New Roman": '"Times New Roman", Times, serif'
  };
  var SERIF_DISPLAY = { "Algerian": 1, "Broadway": 1, "Castellar": 1, "Colonna MT": 1, "Cooper Black": 1, "Elephant": 1, "Engravers MT": 1, "Felix Titling": 1, "Goudy Stout": 1, "Old English Text MT": 1, "Onyx": 1, "Papyrus": 1, "Perpetua Titling MT": 1, "Playbill": 1, "Wide Latin": 1 };
  var FONT_LINES = [
    "Sans:Agency FB:Arial Narrow", "Sans:Alef", "Sans:Arial", "Sans:Arial Black:Impact", "Sans:Arial Narrow:Arial", "Sans:Arial Rounded MT Bold:Arial",
    "Sans:Bahnschrift:Arial", "Sans:Bahnschrift Condensed", "Sans:Bahnschrift Light", "Sans:Bahnschrift SemiBold", "Sans:Bahnschrift SemiCondensed",
    "Sans:Berlin Sans FB", "Sans:Calibri", "Sans:Calibri Light", "Sans:Candara:Calibri", "Sans:Candara Light", "Sans:Carlito", "Sans:Century Gothic:Trebuchet MS", "Sans:Corbel:Calibri", "Sans:Corbel Light",
    "Sans:DejaVu Sans", "Sans:DejaVu Sans Condensed", "Sans:DejaVu Sans Light", "Sans:Dubai", "Sans:Dubai Light", "Sans:Dubai Medium", "Sans:Ebrima",
    "Sans:Eras ITC",
    "Sans:Franklin Gothic", "Sans:Franklin Gothic Book", "Sans:Franklin Gothic Heavy", "Sans:Franklin Gothic Medium",
    "Sans:Gadugi", "Sans:Gill Sans MT", "Sans:Gill Sans MT Condensed", "Sans:Leelawadee UI", "Sans:Liberation Sans", "Sans:Liberation Sans Narrow:Arial Narrow",
    "Sans:Lucida Sans", "Sans:Lucida Sans Unicode:Lucida Grande", "Sans:Maiandra GD:Trebuchet MS", "Sans:Microsoft Sans Serif:Arial", "Sans:MS Reference Sans Serif", "Sans:Nirmala UI", "Sans:Noto Sans", "Sans:Rubik",
    "Sans:Segoe UI", "Sans:Segoe UI Black", "Sans:Segoe UI Light", "Sans:Segoe UI Semibold", "Sans:Tahoma:Arial", "Sans:Tempus Sans ITC", "Sans:Trebuchet MS:Arial", "Sans:Tw Cen MT", "Sans:Tw Cen MT Condensed", "Sans:Verdana",
    "Sans:Avenir", "Sans:Avenir Next", "Sans:Avenir Next Condensed", "Sans:Cantarell", "Sans:Chalkboard SE", "Sans:DIN Alternate", "Sans:DIN Condensed", "Sans:Droid Sans", "Sans:FreeSans", "Sans:Futura", "Sans:Geneva", "Sans:Gill Sans", "Sans:Helvetica", "Sans:Helvetica Neue", "Sans:Lucida Grande", "Sans:Nimbus Sans", "Sans:Noteworthy", "Sans:Optima", "Sans:Roboto", "Sans:Roboto Condensed", "Sans:SF Pro Display", "Sans:SF Pro Text", "Sans:Ubuntu", "Sans:Ubuntu Condensed",
    "Serif:Baskerville Old Face:Georgia", "Serif:Bell MT", "Serif:Bodoni MT", "Serif:Bodoni MT Black", "Serif:Bodoni MT Condensed", "Serif:Book Antiqua:Palatino", "Serif:Bookman Old Style:Georgia", "Serif:Caladea", "Serif:Californian FB", "Serif:Calisto MT:Georgia", "Serif:Cambria", "Serif:Centaur", "Serif:Century", "Serif:Century Schoolbook:Georgia", "Serif:Constantia:Georgia",
    "Serif:DejaVu Serif", "Serif:DejaVu Serif Condensed", "Serif:Footlight MT Light", "Serif:Garamond:Georgia", "Serif:Gentium Basic", "Serif:Gentium Book Basic", "Serif:Georgia", "Serif:Goudy Old Style:Palatino", "Serif:High Tower Text", "Serif:Liberation Serif", "Serif:Linux Biolinum G", "Serif:Linux Libertine Display G", "Serif:Linux Libertine G",
    "Serif:Lucida Bright", "Serif:Lucida Fax", "Serif:Modern No. 20", "Serif:Noto Serif", "Serif:Palatino Linotype", "Serif:Perpetua:Georgia", "Serif:Poor Richard", "Serif:Rockwell:Georgia", "Serif:Rockwell Condensed", "Serif:Sitka Banner", "Serif:Sitka Display", "Serif:Sitka Heading", "Serif:Sitka Small", "Serif:Sitka Subheading", "Serif:Sitka Text:Cambria", "Serif:Sylfaen", "Serif:Times New Roman",
    "Serif:American Typewriter", "Serif:Baskerville", "Serif:Big Caslon", "Serif:Charter", "Serif:Cochin", "Serif:Didot", "Serif:Droid Serif", "Serif:FreeSerif", "Serif:Hoefler Text", "Serif:Iowan Old Style", "Serif:New York", "Serif:Nimbus Roman", "Serif:Palatino", "Serif:Roboto Slab", "Serif:Superclarendon",
    "Mono:Cascadia Code", "Mono:Cascadia Code ExtraLight", "Mono:Cascadia Code Light", "Mono:Cascadia Code SemiBold", "Mono:Cascadia Mono", "Mono:Cascadia Mono ExtraLight", "Mono:Cascadia Mono Light", "Mono:Cascadia Mono SemiBold",
    "Mono:Consolas:Courier New", "Mono:Courier New:Courier", "Mono:DejaVu Sans Mono", "Mono:Liberation Mono", "Mono:Lucida Console:Courier New", "Mono:Lucida Sans Typewriter", "Mono:Miriam Mono CLM", "Mono:OCR A:Consolas",
    "Mono:Andale Mono", "Mono:Courier", "Mono:Droid Sans Mono", "Mono:FreeMono", "Mono:Menlo", "Mono:Monaco", "Mono:Noto Sans Mono", "Mono:Roboto Mono", "Mono:SF Mono", "Mono:Ubuntu Mono",
    "Script:Blackadder ITC", "Script:Bradley Hand ITC", "Script:Brush Script MT", "Script:Comic Sans MS:Marker Felt", "Script:Curlz MT", "Script:Edwardian Script ITC", "Script:Freestyle Script", "Script:French Script MT", "Script:Gabriola:Georgia", "Script:Gigi", "Script:Harlow Solid", "Script:Informal Roman", "Script:Ink Free", "Script:Juice ITC", "Script:Kristen ITC:Comic Sans MS", "Script:Kunstler Script", "Script:Lucida Calligraphy", "Script:Lucida Handwriting", "Script:Magneto", "Script:Matura MT Script Capitals", "Script:Mistral", "Script:Monotype Corsiva", "Script:Palace Script MT", "Script:Parchment", "Script:Pristina", "Script:Rage", "Script:Script MT", "Script:Segoe Print:Comic Sans MS", "Script:Segoe Script:Brush Script MT", "Script:Viner Hand ITC", "Script:Vivaldi", "Script:Vladimir Script",
    "Script:Apple Chancery", "Script:Bradley Hand", "Script:Marker Felt", "Script:Savoye LET", "Script:SignPainter", "Script:Snell Roundhand", "Script:Zapfino",
    "Display:Algerian", "Display:Bauhaus 93", "Display:Bernard MT Condensed", "Display:Broadway", "Display:Castellar", "Display:Chiller", "Display:Colonna MT", "Display:Cooper Black:Georgia", "Display:Copperplate Gothic", "Display:Copperplate Gothic Light", "Display:Elephant", "Display:Engravers MT", "Display:Felix Titling", "Display:Forte", "Display:Goudy Stout", "Display:Haettenschweiler", "Display:Harrington", "Display:Impact:Arial Black", "Display:Imprint MT Shadow", "Display:Jokerman", "Display:MV Boli", "Display:Niagara Engraved", "Display:Niagara Solid", "Display:Old English Text MT:Georgia", "Display:Onyx", "Display:Papyrus:Georgia", "Display:Perpetua Titling MT", "Display:Playbill", "Display:Ravie", "Display:Showcard Gothic", "Display:Snap ITC", "Display:Stencil", "Display:Wide Latin",
    "Display:Chalkduster", "Display:Copperplate", "Display:Herculanum", "Display:Luminari", "Display:Phosphate"
  ];
  var FONT_META = {};
  function quoteFace(name) {
    return /[^A-Za-z0-9-]/.test(name) ? '"' + name + '"' : name;
  }
  function fontStack(name, group, alt) {
    if (FONT_LEGACY[name]) return FONT_LEGACY[name];
    var tail = group === "Mono" ? "monospace" : group === "Script" ? "cursive" : (group === "Serif" || SERIF_DISPLAY[name]) ? "serif" : "sans-serif";
    var parts = [quoteFace(name)];
    if (alt) parts.push(quoteFace(alt));
    parts.push(tail);
    var value = parts.join(", ");
    if (value.length >= 80) value = quoteFace(name) + ", " + tail;
    return value;
  }
  FONT_LINES.forEach(function (line) {
    var parts = line.split(":");
    if (!parts[1] || FONT_META[parts[1]]) return;
    FONT_META[parts[1]] = { group: parts[0], alt: parts[2] || "" };
  });
  function stackOf(name) {
    var meta = FONT_META[name];
    if (!meta) return "sans-serif";
    return fontStack(name, meta.group, meta.alt);
  }
  var MOBILE_FACE = {
    "Candara": "Nunito",
    "Constantia": "Source Serif 4",
    "Century Gothic": "Montserrat",
    "Trebuchet MS": "Fira Sans",
    "Bookman Old Style": "Neuton",
    "Calisto MT": "Libre Caslon Text",
    "Corbel": "Source Sans 3",
    "Sitka Text": "Source Serif 4",
    "Palatino Linotype": "Libre Baskerville",
    "Segoe Script": "Caveat",
    "Maiandra GD": "Quicksand",
    "Comic Sans MS": "Comic Neue",
    "Segoe Print": "Patrick Hand",
    "Verdana": "Nunito Sans",
    "Arial Black": "Archivo Black",
    "Arial": "Arimo",
    "Courier New": "Courier Prime",
    "Times New Roman": "Tinos",
    "Rockwell": "Zilla Slab",
    "Calibri": "Carlito",
    "Cambria": "Caladea",
    "Lucida Console": "Share Tech Mono",
    "Goudy Old Style": "EB Garamond",
    "Baskerville Old Face": "Libre Baskerville",
    "Gabriola": "Great Vibes",
    "Consolas": "Inconsolata",
    "OCR A": "Share Tech Mono",
    "Garamond": "EB Garamond",
    "Old English Text MT": "UnifrakturCook",
    "Century Schoolbook": "Literata",
    "Book Antiqua": "Libre Baskerville",
    "Cooper Black": "Lilita One",
    "Lucida Sans Unicode": "Nunito Sans",
    "Kristen ITC": "Sniglet",
    "Bahnschrift": "Barlow",
    "Agency FB": "Oswald",
    "Perpetua": "Cormorant Garamond",
    "Arial Narrow": "Archivo Narrow",
    "Impact": "Anton"
  };
  var MOBILE_WEIGHT = { "UnifrakturCook": "700" };
  function mobileFile(family) {
    return "/fonts/" + family.toLowerCase().replace(/ /g, "-") + ".woff2";
  }
  function themeStack(name) {
    var meta = FONT_META[name] || { group: "Sans", alt: "" };
    var group = meta.group;
    var tail = group === "Mono" ? "monospace" : group === "Script" ? "cursive" : (group === "Serif" || SERIF_DISPLAY[name]) ? "serif" : "sans-serif";
    var parts = [quoteFace(name)];
    var mobile = MOBILE_FACE[name];
    if (mobile) parts.push(quoteFace(mobile));
    if (meta.alt && meta.alt !== mobile) parts.push(quoteFace(meta.alt));
    parts.push(tail);
    return parts.join(", ");
  }
  var THEME_TYPE = [
    ["spring", "Candara", "Constantia"],
    ["summer", "Century Gothic", "Trebuchet MS"],
    ["fall", "Bookman Old Style", "Calisto MT"],
    ["winter", "Corbel", "Sitka Text"],
    ["holiday", "Palatino Linotype", "Segoe Script"],
    ["tropical", "Maiandra GD", "Maiandra GD"],
    ["birthday", "Comic Sans MS", "Segoe Print"],
    ["rainbow", "Verdana", "Arial Black"],
    ["bw", "Arial", "Arial"],
    ["typewriter", "Courier New", "Courier New"],
    ["newsroom", "Times New Roman", "Rockwell"],
    ["office", "Calibri", "Cambria"],
    ["arcade", "Lucida Console", "Lucida Console"],
    ["verdant", "Goudy Old Style", "Goudy Old Style"],
    ["fantasy", "Baskerville Old Face", "Gabriola"],
    ["cyberpunk", "Consolas", "OCR A"],
    ["medieval", "Garamond", "Old English Text MT", "Garamond"],
    ["school", "Century Schoolbook", "Century Schoolbook"],
    ["farmhouse", "Book Antiqua", "Cooper Black"],
    ["treehouse", "Lucida Sans Unicode", "Kristen ITC"],
    ["alien", "Bahnschrift", "Agency FB"],
    ["zodiac", "Perpetua", "Perpetua"],
    ["sportsball", "Arial Narrow", "Impact"]
  ];
  function themeFaceCss() {
    var rules = [];
    THEME_TYPE.forEach(function (row) {
      var id = row[0];
      var body = themeStack(row[1]);
      var display = themeStack(row[2]);
      var sub = row[3] ? themeStack(row[3]) : display;
      var b = 'html[data-theme="' + id + '"] body, html[data-theme="' + id + '-dark"] body';
      var title = 'html[data-theme="' + id + '"] h1, html[data-theme="' + id + '"] h2, html[data-theme="' + id + '"] .brand, html[data-theme="' + id + '-dark"] h1, html[data-theme="' + id + '-dark"] h2, html[data-theme="' + id + '-dark"] .brand';
      var h3 = 'html[data-theme="' + id + '"] h3, html[data-theme="' + id + '-dark"] h3, html[data-theme="' + id + '"] .nr .piece-title, html[data-theme="' + id + '-dark"] .nr .piece-title, html[data-theme="' + id + '"] .nr .card-name, html[data-theme="' + id + '-dark"] .nr .card-name, html[data-theme="' + id + '"] .nr .issue-date, html[data-theme="' + id + '-dark"] .nr .issue-date';
      if (body === display && sub === display) rules.push(b + ", " + title + ", " + h3 + " { font-family: " + body + "; }");
      else {
        rules.push(b + " { font-family: " + body + "; }");
        if (display === sub) rules.push(title + ", " + h3 + " { font-family: " + display + "; }");
        else {
          rules.push(title + " { font-family: " + display + "; }");
          rules.push(h3 + " { font-family: " + sub + "; }");
        }
      }
    });
    return rules.join("\n");
  }
  var faceStyle = null;
  var facesOn = "";
  function ensureThemeFaces(theme) {
    var id = String(theme || "light").replace(/-dark$/, "");
    var row = null;
    var i;
    for (i = 0; i < THEME_TYPE.length; i++) {
      if (THEME_TYPE[i][0] === id) { row = THEME_TYPE[i]; break; }
    }
    var wanted = [];
    var seen = {};
    if (row) {
      var picks = [row[1], row[2]];
      if (row[3]) picks.push(row[3]);
      for (i = 0; i < picks.length; i++) {
        var family = MOBILE_FACE[picks[i]];
        if (!family || seen[family]) continue;
        seen[family] = 1;
        wanted.push(family);
      }
    }
    var css = "";
    for (i = 0; i < wanted.length; i++) {
      var family = wanted[i];
      var weight = MOBILE_WEIGHT[family] || "400";
      css += "@font-face{font-family:" + quoteFace(family) + ";font-style:normal;font-weight:" + weight + ";font-display:swap;src:url(\"" + mobileFile(family) + "\") format(\"woff2\");}";
    }
    if (css === facesOn) return;
    facesOn = css;
    if (!faceStyle) {
      faceStyle = document.createElement("style");
      document.head.appendChild(faceStyle);
    }
    faceStyle.textContent = css;
  }
  function faceInstalled(name) {
    try {
      var canvas = faceInstalled.canvas || (faceInstalled.canvas = document.createElement("canvas"));
      var ctx = canvas.getContext && canvas.getContext("2d");
      if (!ctx) return true;
      var sample = "mmmmmmmmmmlliWW";
      function width(spec) {
        ctx.font = "72px " + spec;
        return ctx.measureText(sample).width;
      }
      var quoted = quoteFace(name);
      var mono = width("monospace");
      var sans = width("sans-serif");
      return width(quoted + ", monospace") !== mono || width(quoted + ", sans-serif") !== sans;
    } catch (e) {
      return true;
    }
  }
  var FONT_IDS = { "": true, "sans-serif": true, "serif": true, "monospace": true, "cursive": true, "fantasy": true };
  var FONT_READY = [];
  Object.keys(FONT_META).forEach(function (name) {
    if (!faceInstalled(name)) return;
    var meta = FONT_META[name];
    var id = fontStack(name, meta.group, meta.alt);
    if (FONT_IDS[id]) return;
    FONT_IDS[id] = true;
    FONT_READY.push({ id: id, label: name, group: meta.group });
  });
  FONT_READY.sort(function (a, b) { return a.label < b.label ? -1 : a.label > b.label ? 1 : 0; });

  var BASE_NAMES = ["red", "orange", "yellow", "green", "blue", "purple", "pink", "brown"];
  var BASE_HUE = { red: 25, orange: 50, yellow: 97, green: 150, blue: 255, purple: 308, pink: 352, brown: 78 };
  var BASE_L = { red: 0.62, orange: 0.74, yellow: 0.86, green: 0.62, blue: 0.62, purple: 0.64, pink: 0.72, brown: 0.48 };
  var BASE_C = { red: 0.17, orange: 0.15, yellow: 0.16, green: 0.15, blue: 0.14, purple: 0.16, pink: 0.15, brown: 0.11 };
  var BASE_TUNE = {
    light: {},
    spring: { lead: ["green", "pink", "yellow"], hue: { green: -8, pink: 4 } },
    summer: { lead: ["blue", "yellow", "orange"], hue: { blue: -12, orange: 4 } },
    fall: { lead: ["orange", "red", "yellow", "brown"], hue: { orange: 5, red: 3, brown: -4 } },
    winter: { lead: ["blue", "purple"], mute: 0.88, lift: 0.04, hue: { blue: 6 } },
    holiday: { lead: ["red", "green", "yellow"] },
    tropical: { lead: ["green", "pink", "yellow"], hue: { green: 10, pink: -6, yellow: 2 } },
    birthday: { lead: ["pink", "yellow", "blue", "purple"], hue: { pink: 4 } },
    rainbow: { chroma: 1.22 },
    bw: { chroma: 0.85 },
    typewriter: { lead: ["red", "brown", "yellow"], mute: 0.88 },
    newsroom: { lead: ["red", "yellow", "blue"], mute: 0.9 },
    office: { lead: ["blue", "green"], mute: 0.88 },
    arcade: { lead: ["pink", "yellow", "blue", "purple", "green"], chroma: 1.32, hue: { pink: -10, blue: -18, green: 6 } },
    verdant: { lead: ["green", "yellow"], mute: 0.9, hue: { green: -12 } },
    fantasy: { lead: ["purple", "yellow", "pink"], hue: { purple: -6, yellow: -6 } },
    cyberpunk: { lead: ["pink", "blue", "purple", "yellow"], chroma: 1.35, hue: { pink: -14, blue: -22 } },
    medieval: { lead: ["red", "yellow", "brown"], mute: 0.9, hue: { yellow: -8, red: 2 } },
    school: { lead: ["blue", "yellow", "red"] },
    farmhouse: { lead: ["red", "green", "brown", "yellow"], mute: 0.88, hue: { red: 4, green: -6, brown: -6, yellow: -4 } },
    treehouse: { lead: ["brown", "green", "yellow"], hue: { green: -8, brown: -8 } },
    alien: { lead: ["green", "purple", "yellow"], chroma: 1.28, hue: { green: -16, yellow: 14, purple: -8 } },
    zodiac: { lead: ["yellow", "purple", "blue"], hue: { yellow: -10, blue: 10, purple: 4 } },
    sportsball: { lead: ["orange", "green", "yellow", "blue"], hue: { orange: -4, green: -6, yellow: -8 } }
  };

  function oklchHex(L, C, H) {
    var rad = H * Math.PI / 180;
    var a = C * Math.cos(rad);
    var b = C * Math.sin(rad);
    var l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    var m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    var s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    var l = l_ * l_ * l_;
    var m = m_ * m_ * m_;
    var s = s_ * s_ * s_;
    var r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    var g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    var bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
    function gam(c) {
      if (c < 0) c = 0;
      if (c > 1) c = 1;
      return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    }
    function byte(c) {
      var v = Math.round(gam(c) * 255);
      var hex = v.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }
    return "#" + byte(r) + byte(g) + byte(bl);
  }

  function baseVars(id) {
    var family = id === "dark" ? "light" : id.replace(/-dark$/, "");
    var spec = BASE_TUNE[family] || {};
    var dark = id === "dark" || /-dark$/.test(id);
    var lift = (spec.lift || 0) + (dark ? 0.08 : 0);
    var gain = spec.chroma || 1;
    if (dark) gain *= 0.94;
    var out = {};
    for (var i = 0; i < BASE_NAMES.length; i++) {
      var name = BASE_NAMES[i];
      var hue = BASE_HUE[name] + ((spec.hue && spec.hue[name]) || 0);
      var l = BASE_L[name] + lift;
      var c = BASE_C[name] * gain;
      if (spec.lead && spec.lead.indexOf(name) !== -1) c *= 1.28;
      else if (spec.mute) c *= spec.mute;
      if (l > 0.92) l = 0.92;
      if (c > 0.22) c = 0.22;
      if (c < 0.045) c = 0.045;
      hue = ((hue % 360) + 360) % 360;
      out["--c-" + name] = oklchHex(l, c, hue);
      out["--on-" + name] = l >= 0.68 ? "#1c1915" : "#fff";
    }
    return out;
  }

  function baseDecl(id) {
    var vars = baseVars(id);
    var parts = [];
    for (var key in vars) parts.push(key + ": " + vars[key]);
    return parts.join("; ");
  }

  function baseColorCss() {
    var rules = ["html { " + baseDecl("light") + " }"];
    for (var i = 0; i < MODES.length; i++) {
      var mode = MODES[i];
      if (mode.light !== "light") rules.push('html[data-theme="' + mode.light + '"] { ' + baseDecl(mode.light) + " }");
      rules.push('html[data-theme="' + mode.dark + '"] { ' + baseDecl(mode.dark) + " }");
    }
    return rules.join("\n");
  }
  var FONTS = [
    { id: "", label: "Site", group: "" },
    { id: "sans-serif", label: "Sans", group: "Sans" },
    { id: "serif", label: "Serif", group: "Serif" },
    { id: "monospace", label: "Mono", group: "Mono" },
    { id: "cursive", label: "Script", group: "Script" },
    { id: "fantasy", label: "Display", group: "Display" }
  ].concat(FONT_READY);

  var style = document.createElement("style");
  style.textContent = [
    "header .lang { display: flex; align-items: center; gap: 8px; }",
    "header .now { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin: 0; color: var(--bar-ink, #f4f7fb); font-size: 13px; font-weight: 650; letter-spacing: 0.08em; text-transform: uppercase; }",
    ":root { --clock-face: #f4f0e6; --clock-rim: #bf0a30; --clock-mark: #1c1915; --clock-hour: #0a3161; --clock-minute: #c4922a; --clock-pin: #1e4d7b; }",
    ".clock { width: 1.45em; height: 1.45em; display: inline-block; vertical-align: -0.28em; margin-right: 0.4em; flex: none; }",
    "header .now .clock { width: 22px; height: 22px; margin: 0; }",
    ".clock-rim { fill: var(--clock-rim); } .clock-face { fill: var(--clock-face); }",
    ".clock-marks { fill: none; stroke: var(--clock-mark); stroke-width: 1.35; stroke-linecap: round; }",
    ".clock-hour { fill: none; stroke: var(--clock-hour); stroke-width: 2.2; stroke-linecap: round; }",
    ".clock-minute { fill: none; stroke: var(--clock-minute); stroke-width: 1.5; stroke-linecap: round; }",
    ".clock-second { fill: none; stroke: var(--clock-rim); stroke-width: 1; stroke-linecap: round; }",
    ".clock-pin { fill: var(--clock-pin); }",
    ".clock-hour, .clock-minute, .clock-second { transform-box: view-box; transform-origin: 16px 16px; }",
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
    ".theme-wheel { position: fixed; z-index: 8; width: 420px; height: 420px; }",
    ".theme-wheel[hidden] { display: none; }",
    ".theme-wheel-face { position: relative; width: 420px; height: 420px; border-radius: 50%; background: radial-gradient(circle at 50% 50%, #2a261f 0 70px, #1c1915 71px); box-shadow: 0 16px 40px rgba(0,0,0,.4), inset 0 0 0 2px rgba(255,255,255,.45); }",
    ".theme-choice { position: absolute; left: 50%; top: 50%; width: 28px; height: 28px; margin: -14px 0 0 -14px; border-radius: 50%; border: 2px solid rgba(255,255,255,.9); padding: 0; display: grid; place-items: center; cursor: pointer; overflow: hidden; }",
    ".theme-choice svg { width: 20px; height: 20px; display: block; }",
    ".theme-choice[aria-pressed='true'] { box-shadow: 0 0 0 3px #fff, 0 0 0 6px var(--accent, #c4b8a4); }",
    ".theme-choice:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }",
    ".theme-wheel-name { position: absolute; left: 0; right: 0; top: 33%; width: 176px; margin: 0 auto; transform: translateY(-50%); text-align: center; color: #f4f0e6; font: 650 20px/1.15 'Segoe UI', 'Helvetica Neue', sans-serif; pointer-events: none; }",
    ".theme-shade { position: absolute; left: 0; right: 0; top: 50%; z-index: 2; width: 176px; margin: 0 auto; transform: translateY(-50%); display: flex; align-items: center; gap: 8px; }",
    ".theme-shade span { flex: none; color: #f4f0e6; font: 650 12px/1 'Segoe UI', 'Helvetica Neue', sans-serif; letter-spacing: 0.06em; text-transform: uppercase; }",
    ".theme-shade input { -webkit-appearance: none; appearance: none; flex: 1; min-width: 0; width: 100%; height: 8px; margin: 0; border: 0; border-radius: 999px; background: linear-gradient(90deg, var(--shade-from, #f4f0e6), var(--shade-to, #12141c)); cursor: pointer; }",
    ".theme-shade input::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #fff; border: 2px solid #1c1915; box-shadow: 0 0 0 1px rgba(255,255,255,.8); }",
    ".theme-shade input::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: #fff; border: 2px solid #1c1915; }",
    ".theme-shade input::-moz-range-track { background: transparent; border: 0; }",
    ".theme-shade input:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }",
    ".theme-wheel-exit { position: absolute; left: 50%; top: 64%; z-index: 2; transform: translate(-50%, -50%); min-width: 64px; height: 28px; padding: 0 10px; border: 1px solid rgba(255,255,255,.85); border-radius: 999px; background: #1c1915; color: #f4f0e6; font: 650 12px/1 'Segoe UI', 'Helvetica Neue', sans-serif; letter-spacing: 0.04em; cursor: pointer; }",
    ".theme-wheel-exit:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }",
    "@media (max-width: 800px) { html.theme-open header { z-index: 9; } }",
    "@media (prefers-reduced-motion: no-preference) { .theme-wheel.is-open .theme-wheel-face { animation: theme-wheel-in 160ms ease; } }",
    "@keyframes theme-wheel-in { from { opacity: .2; } to { opacity: 1; } }",
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
    'html[data-theme="rainbow-dark"] header::after, html[data-theme="rainbow-dark"] footer::before { background: transparent; }',
    ".look-button { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; padding: 0; border: 0; background: transparent; cursor: pointer; flex: none; color: var(--bar-ink, #f4f7fb); font: 650 16px/1 Georgia, 'Palatino Linotype', serif; letter-spacing: -0.03em; }",
    ".look-button:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }",
    ".look-button-fixed { position: fixed; top: 10px; right: 56px; z-index: 6; }",
    ".look-menu { position: fixed; z-index: 8; width: min(420px, calc(100vw - 16px)); }",
    ".look-menu[hidden] { display: none; }",
    ".look-panel { max-height: calc(100vh - 16px); overflow: auto; padding: 14px 14px 12px; border-radius: 16px; background: #1c1915; color: #f4f0e6; box-shadow: 0 16px 40px rgba(0,0,0,.4), inset 0 0 0 2px rgba(255,255,255,.45); }",
    ".look-panel, .look-panel button, .look-panel select, .look-panel label { font-family: 'Segoe UI', 'Helvetica Neue', sans-serif; }",
    ".look-kicker { margin: 10px 0 4px; font-size: 12px; font-weight: 650; letter-spacing: 0.08em; text-transform: uppercase; color: #d9d0c3; }",
    ".look-kicker:first-child { margin-top: 0; }",
    ".look-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 6px 0; font-size: 15px; font-weight: 650; }",
    ".look-row select { font: inherit; color: #1c1915; background: #f4f0e6; border: 0; border-radius: 6px; padding: 5px 8px; flex: 1; min-width: 0; max-width: 16.5rem; }",
    ".look-row select optgroup { font-family: 'Segoe UI', 'Helvetica Neue', sans-serif; font-size: 12px; }",
    ".look-row select option { font-size: 16px; }",
    ".look-row input[type='color'] { width: 44px; height: 30px; padding: 0; border: 2px solid #fff; border-radius: 6px; background: transparent; cursor: pointer; }",
    ".look-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }",
    ".look-actions button { min-width: 64px; height: 28px; padding: 0 10px; border: 1px solid rgba(255,255,255,.85); border-radius: 999px; background: #1c1915; color: #f4f0e6; font: 650 12px/1 'Segoe UI', 'Helvetica Neue', sans-serif; letter-spacing: 0.04em; cursor: pointer; }",
    ".look-actions button:focus-visible, .look-row select:focus-visible, .look-row input:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }",
    "header .bar:not(:has(.bar-top)) > .look-button { position: absolute; top: 7px; right: 40px; }",
    'html[data-theme="bw"] { color-scheme: light; --paper: #f7f7f5; --ink: #111111; --muted: #5c5c5c; --line: #d4d4d4; --chip: #ececec; --map: #e8e8e8; --map-ink: #111111; --map-on: #111111; --map-tint: #9a9a9a; --clock-face: #f7f7f5; --clock-rim: #111111; --clock-mark: #111111; --clock-hour: #111111; --clock-minute: #6e6e6e; --clock-pin: #111111; }',
    'html[data-theme="bw"] body { --bar: #111111; --bar-stripe: #f7f7f5; --bar-line: #ffffff; --bar-ink: #f7f7f5; --bar-hover: #ffffff; --bar-hover-ink: #111111; }',
    'html[data-theme="bw-dark"] { --paper: #0e0e0e; --ink: #f5f5f5; --muted: #bdbdbd; --line: #2e2e2e; --chip: #1c1c1c; --map: #1a1a1a; --map-ink: #f5f5f5; --map-on: #f5f5f5; --map-tint: #6e6e6e; --clock-face: #161616; --clock-rim: #f5f5f5; --clock-mark: #f5f5f5; --clock-hour: #f5f5f5; --clock-minute: #9a9a9a; --clock-pin: #f5f5f5; }',
    'html[data-theme="bw-dark"] body { --bar: #000000; --bar-stripe: #f5f5f5; --bar-line: #6e6e6e; --bar-ink: #f5f5f5; --bar-hover: #f5f5f5; --bar-hover-ink: #111111; }',
    'html[data-theme="typewriter"] { color-scheme: light; --paper: #f4ecd8; --ink: #1c1a17; --muted: #6e6256; --line: #e0d3b8; --chip: #e7dcc4; --map: #e6dcc4; --map-ink: #1c1a17; --map-on: #9c2b2b; --map-tint: #8a8175; --clock-face: #f4ecd8; --clock-rim: #2a2622; --clock-mark: #1c1a17; --clock-hour: #9c2b2b; --clock-minute: #6e6256; --clock-pin: #9c2b2b; }',
    'html[data-theme="typewriter"] body { --bar: #2a2622; --bar-stripe: #9c2b2b; --bar-line: #e6d7b8; --bar-ink: #f4ecd8; --bar-hover: #9c2b2b; --bar-hover-ink: #f4ecd8; }',
    'html[data-theme="typewriter-dark"] { --paper: #1a1714; --ink: #f0e6d2; --muted: #c4b49a; --line: #3a332c; --chip: #2a241c; --map: #241e18; --map-ink: #f0e6d2; --map-on: #e07070; --map-tint: #6a5344; --clock-face: #1a1714; --clock-rim: #e6d7b8; --clock-mark: #f0e6d2; --clock-hour: #c44b4b; --clock-minute: #c4b49a; --clock-pin: #e6d7b8; }',
    'html[data-theme="typewriter-dark"] body { --bar: #100e0c; --bar-stripe: #c44b4b; --bar-line: #8a7356; --bar-ink: #f0e6d2; --bar-hover: #c44b4b; --bar-hover-ink: #1c1a17; }',
    'html[data-theme="newsroom"] { color-scheme: light; --paper: #f7f4ee; --ink: #121212; --muted: #5a564e; --line: #d9d3c7; --chip: #eeeae2; --map: #e7e2d8; --map-ink: #121212; --map-on: #c81e1e; --map-tint: #8d8980; --clock-face: #f7f4ee; --clock-rim: #121212; --clock-mark: #121212; --clock-hour: #c81e1e; --clock-minute: #5a564e; --clock-pin: #c81e1e; }',
    'html[data-theme="newsroom"] body { --bar: #121212; --bar-stripe: #c81e1e; --bar-line: #f7f4ee; --bar-ink: #f7f4ee; --bar-hover: #c81e1e; --bar-hover-ink: #ffffff; }',
    'html[data-theme="newsroom-dark"] { --paper: #14181c; --ink: #f4f1ea; --muted: #b7b1a6; --line: #2c3238; --chip: #1e242c; --map: #1c242c; --map-ink: #f4f1ea; --map-on: #e23b3b; --map-tint: #3d4c5c; --clock-face: #14181c; --clock-rim: #f4f1ea; --clock-mark: #f4f1ea; --clock-hour: #e23b3b; --clock-minute: #b7b1a6; --clock-pin: #f4f1ea; }',
    'html[data-theme="newsroom-dark"] body { --bar: #0c0e10; --bar-stripe: #e23b3b; --bar-line: #8a9096; --bar-ink: #f4f1ea; --bar-hover: #e23b3b; --bar-hover-ink: #121212; }',
    'html[data-theme="office"] { color-scheme: light; --paper: #f4f6f8; --ink: #1b2836; --muted: #5c6b7a; --line: #d5dee6; --chip: #e4eaf1; --map: #e6eef4; --map-ink: #1b2836; --map-on: #1f4e79; --map-tint: #8eb4d4; --clock-face: #f4f7fb; --clock-rim: #1f4e79; --clock-mark: #1b2836; --clock-hour: #1f4e79; --clock-minute: #7eb0d4; --clock-pin: #1f4e79; }',
    'html[data-theme="office"] body { --bar: #1f4e79; --bar-stripe: #d0d7de; --bar-line: #7eb0d4; --bar-ink: #f4f7fb; --bar-hover: #d0d7de; --bar-hover-ink: #1b2836; }',
    'html[data-theme="office-dark"] { --paper: #12181e; --ink: #e7eef4; --muted: #a9b6c2; --line: #24303a; --chip: #1a242e; --map: #182430; --map-ink: #e7eef4; --map-on: #8eb4d4; --map-tint: #2a4a66; --clock-face: #12181e; --clock-rim: #7aa0c4; --clock-mark: #e7eef4; --clock-hour: #d0d7de; --clock-minute: #7eb0d4; --clock-pin: #7aa0c4; }',
    'html[data-theme="office-dark"] body { --bar: #16324e; --bar-stripe: #7aa0c4; --bar-line: #3d5a73; --bar-ink: #e7eef4; --bar-hover: #7aa0c4; --bar-hover-ink: #12181e; }',
    'html[data-theme="arcade"] { color-scheme: light; --paper: #fff6ea; --ink: #1a1030; --muted: #6a5080; --line: #f0d0ea; --chip: #ffe08a; --map: #ffe9c4; --map-ink: #1a1030; --map-on: #ff3d8a; --map-tint: #7a5cff; --clock-face: #fff6ea; --clock-rim: #24144a; --clock-mark: #1a1030; --clock-hour: #ff3d8a; --clock-minute: #7a5cff; --clock-pin: #ffe14a; }',
    'html[data-theme="arcade"] body { --bar: #24144a; --bar-stripe: #ff3d8a; --bar-line: #3dffe8; --bar-ink: #fff6ea; --bar-hover: #ffe14a; --bar-hover-ink: #1a1030; }',
    'html[data-theme="arcade-dark"] { --paper: #0c0618; --ink: #f6f0ff; --muted: #c4b0e0; --line: #2a1848; --chip: #241448; --map: #1a0c30; --map-ink: #f6f0ff; --map-on: #2ce6d0; --map-tint: #ff4fa3; --clock-face: #0c0618; --clock-rim: #ff4fa3; --clock-mark: #f6f0ff; --clock-hour: #2ce6d0; --clock-minute: #ffe14a; --clock-pin: #ff4fa3; }',
    'html[data-theme="arcade-dark"] body { --bar: #07030f; --bar-stripe: #ff4fa3; --bar-line: #2ce6d0; --bar-ink: #f6f0ff; --bar-hover: #ffe14a; --bar-hover-ink: #1a1030; }',
    'html[data-theme="verdant"] { color-scheme: light; --paper: #e7f2e4; --ink: #102418; --muted: #3e6248; --line: #c5dcc0; --chip: #d5ebc8; --map: #d5e6c4; --map-ink: #102418; --map-on: #1d6b3a; --map-tint: #6aaa4a; --clock-face: #f3faf0; --clock-rim: #1d6b3a; --clock-mark: #102418; --clock-hour: #1d6b3a; --clock-minute: #6aaa4a; --clock-pin: #8fbf3f; }',
    'html[data-theme="verdant"] body { --bar: #1d6b3a; --bar-stripe: #8fbf3f; --bar-line: #d7ecc4; --bar-ink: #f3faf0; --bar-hover: #8fbf3f; --bar-hover-ink: #102418; }',
    'html[data-theme="verdant-dark"] { --paper: #0e1a12; --ink: #e5f6e4; --muted: #a9c8a4; --line: #243828; --chip: #163022; --map: #163022; --map-ink: #e5f6e4; --map-on: #b6e06a; --map-tint: #3d8a48; --clock-face: #0e1a12; --clock-rim: #8fbf3f; --clock-mark: #e5f6e4; --clock-hour: #d7ecc4; --clock-minute: #6aaa4a; --clock-pin: #8fbf3f; }',
    'html[data-theme="verdant-dark"] body { --bar: #0f3d22; --bar-stripe: #8fbf3f; --bar-line: #2f6a40; --bar-ink: #e5f6e4; --bar-hover: #8fbf3f; --bar-hover-ink: #102418; }',
    'html[data-theme="fantasy"] { color-scheme: light; --paper: #f6efe0; --ink: #2a1848; --muted: #6a5878; --line: #e4d6c4; --chip: #efe4c8; --map: #efe6d4; --map-ink: #2a1848; --map-on: #6b3fa0; --map-tint: #c9a227; --clock-face: #f6efe0; --clock-rim: #3a2068; --clock-mark: #2a1848; --clock-hour: #6b3fa0; --clock-minute: #c9a227; --clock-pin: #6b3fa0; }',
    'html[data-theme="fantasy"] body { --bar: #3a2068; --bar-stripe: #e6b422; --bar-line: #c9a0e0; --bar-ink: #f6efe0; --bar-hover: #e6b422; --bar-hover-ink: #2a1848; }',
    'html[data-theme="fantasy-dark"] { --paper: #140e22; --ink: #f6efe4; --muted: #c4b4d4; --line: #2e2444; --chip: #221838; --map: #1c1430; --map-ink: #f6efe4; --map-on: #e6b422; --map-tint: #6b3fa0; --clock-face: #140e22; --clock-rim: #e6b422; --clock-mark: #f6efe4; --clock-hour: #c9a0e0; --clock-minute: #e6b422; --clock-pin: #e6b422; }',
    'html[data-theme="fantasy-dark"] body { --bar: #1c1230; --bar-stripe: #c9a227; --bar-line: #6b3fa0; --bar-ink: #f6efe4; --bar-hover: #e6b422; --bar-hover-ink: #2a1848; }',
    'html[data-theme="cyberpunk"] { color-scheme: light; --paper: #f4f0ff; --ink: #140818; --muted: #6a5080; --line: #e4d0f0; --chip: #ffe0f6; --map: #ffe4f4; --map-ink: #140818; --map-on: #ff2bd6; --map-tint: #00c4d4; --clock-face: #f4f0ff; --clock-rim: #12081c; --clock-mark: #140818; --clock-hour: #ff2bd6; --clock-minute: #00b8c8; --clock-pin: #00e5ff; }',
    'html[data-theme="cyberpunk"] body { --bar: #12081c; --bar-stripe: #ff2bd6; --bar-line: #00e5ff; --bar-ink: #f4f0ff; --bar-hover: #00e5ff; --bar-hover-ink: #140818; }',
    'html[data-theme="cyberpunk-dark"] { --paper: #07060e; --ink: #f2f6ff; --muted: #b0a8c8; --line: #241838; --chip: #160e24; --map: #120818; --map-ink: #f2f6ff; --map-on: #00f0ff; --map-tint: #ff2bd6; --clock-face: #07060e; --clock-rim: #ff2bd6; --clock-mark: #f2f6ff; --clock-hour: #00f0ff; --clock-minute: #ff2bd6; --clock-pin: #00e5ff; }',
    'html[data-theme="cyberpunk-dark"] body { --bar: #05040a; --bar-stripe: #ff2bd6; --bar-line: #00e5ff; --bar-ink: #f2f6ff; --bar-hover: #00f0ff; --bar-hover-ink: #07060e; }',
    'html[data-theme="medieval"] { color-scheme: light; --paper: #f3e6c8; --ink: #2a160e; --muted: #7a5a3a; --line: #e0cba0; --chip: #ead8b0; --map: #e6d4ae; --map-ink: #2a160e; --map-on: #6b1d1d; --map-tint: #c9a227; --clock-face: #f3e6c8; --clock-rim: #6b1d1d; --clock-mark: #2a160e; --clock-hour: #6b1d1d; --clock-minute: #c9a227; --clock-pin: #c9a227; }',
    'html[data-theme="medieval"] body { --bar: #6b1d1d; --bar-stripe: #c9a227; --bar-line: #e6d3a4; --bar-ink: #f8f0dc; --bar-hover: #c9a227; --bar-hover-ink: #2a160e; }',
    'html[data-theme="medieval-dark"] { --paper: #1a100c; --ink: #f3e6c8; --muted: #d4c0a0; --line: #3a2820; --chip: #2a1c14; --map: #241810; --map-ink: #f3e6c8; --map-on: #e6c15a; --map-tint: #8a3030; --clock-face: #1a100c; --clock-rim: #e6c15a; --clock-mark: #f3e6c8; --clock-hour: #e6c15a; --clock-minute: #d4c0a0; --clock-pin: #c9a227; }',
    'html[data-theme="medieval-dark"] body { --bar: #3a1010; --bar-stripe: #d4af37; --bar-line: #8a3030; --bar-ink: #f3e6c8; --bar-hover: #d4af37; --bar-hover-ink: #2a160e; }',
    'html[data-theme="school"] { color-scheme: light; --paper: #fffdf6; --ink: #1a2744; --muted: #5a6880; --line: #e4e0d0; --chip: #fff3c4; --map: #f4f0e4; --map-ink: #1a2744; --map-on: #1a3a7a; --map-tint: #c23b45; --clock-face: #fffdf6; --clock-rim: #1a3a7a; --clock-mark: #1a2744; --clock-hour: #1a3a7a; --clock-minute: #c23b45; --clock-pin: #f2c14e; }',
    'html[data-theme="school"] body { --bar: #1a3a7a; --bar-stripe: #f2c14e; --bar-line: #c23b45; --bar-ink: #fffdf6; --bar-hover: #f2c14e; --bar-hover-ink: #1a2744; }',
    'html[data-theme="school-dark"] { --paper: #101620; --ink: #f4f7fb; --muted: #b0bcc8; --line: #243044; --chip: #1a2840; --map: #182030; --map-ink: #f4f7fb; --map-on: #f2c14e; --map-tint: #c45a62; --clock-face: #101620; --clock-rim: #f2c14e; --clock-mark: #f4f7fb; --clock-hour: #f2c14e; --clock-minute: #c45a62; --clock-pin: #e6b422; }',
    'html[data-theme="school-dark"] body { --bar: #0e2448; --bar-stripe: #e6b422; --bar-line: #c45a62; --bar-ink: #f4f7fb; --bar-hover: #e6b422; --bar-hover-ink: #1a2744; }',
    'html[data-theme="farmhouse"] { color-scheme: light; --paper: #f7f1e6; --ink: #2c241c; --muted: #6e6256; --line: #e4d8c8; --chip: #efe4d4; --map: #efe4d2; --map-ink: #2c241c; --map-on: #7a2e24; --map-tint: #8fa37a; --clock-face: #f7f1e6; --clock-rim: #7a2e24; --clock-mark: #2c241c; --clock-hour: #7a2e24; --clock-minute: #6e8a52; --clock-pin: #c4a574; }',
    'html[data-theme="farmhouse"] body { --bar: #7a2e24; --bar-stripe: #8fa37a; --bar-line: #e7d3b0; --bar-ink: #f7f1e6; --bar-hover: #8fa37a; --bar-hover-ink: #2c241c; }',
    'html[data-theme="farmhouse-dark"] { --paper: #1c1612; --ink: #f6efe4; --muted: #cbbba8; --line: #3a3028; --chip: #2a221c; --map: #261e18; --map-ink: #f6efe4; --map-on: #e7d3b0; --map-tint: #6e8a52; --clock-face: #1c1612; --clock-rim: #e7d3b0; --clock-mark: #f6efe4; --clock-hour: #e7d3b0; --clock-minute: #a3b48a; --clock-pin: #c4a574; }',
    'html[data-theme="farmhouse-dark"] body { --bar: #4a1c16; --bar-stripe: #a3b48a; --bar-line: #8a7356; --bar-ink: #f6efe4; --bar-hover: #a3b48a; --bar-hover-ink: #1c1612; }',
    'html[data-theme="treehouse"] { color-scheme: light; --paper: #f3f7ea; --ink: #1c2a14; --muted: #4e6240; --line: #d5e2c4; --chip: #e4f0d4; --map: #e4edd4; --map-ink: #1c2a14; --map-on: #3d8a3a; --map-tint: #c4a06a; --clock-face: #f6f3ea; --clock-rim: #6b4423; --clock-mark: #1c2a14; --clock-hour: #3d8a3a; --clock-minute: #c4a06a; --clock-pin: #6b4423; }',
    'html[data-theme="treehouse"] body { --bar: #6b4423; --bar-stripe: #3d8a3a; --bar-line: #c4a06a; --bar-ink: #f6f3ea; --bar-hover: #8fd46a; --bar-hover-ink: #1c2a14; }',
    'html[data-theme="treehouse-dark"] { --paper: #12180e; --ink: #e8f3dc; --muted: #b4c4a4; --line: #2a3424; --chip: #1c2818; --map: #1a2414; --map-ink: #e8f3dc; --map-on: #8fd46a; --map-tint: #c4a06a; --clock-face: #12180e; --clock-rim: #c4a06a; --clock-mark: #e8f3dc; --clock-hour: #8fd46a; --clock-minute: #c4a06a; --clock-pin: #8fd46a; }',
    'html[data-theme="treehouse-dark"] body { --bar: #3a2614; --bar-stripe: #6aaa4a; --bar-line: #c4a06a; --bar-ink: #e8f3dc; --bar-hover: #8fd46a; --bar-hover-ink: #1c2a14; }',
    'html[data-theme="alien"] { color-scheme: light; --paper: #f2ffe4; --ink: #102018; --muted: #3e6248; --line: #d0e8c4; --chip: #e4f8d4; --map: #e4f6d0; --map-ink: #102018; --map-on: #5a8a18; --map-tint: #7a5cff; --clock-face: #f2ffe4; --clock-rim: #14301c; --clock-mark: #102018; --clock-hour: #3d6a14; --clock-minute: #7a5cff; --clock-pin: #8fd41a; }',
    'html[data-theme="alien"] body { --bar: #14301c; --bar-stripe: #b6ff3c; --bar-line: #7a5cff; --bar-ink: #f2ffe4; --bar-hover: #b6ff3c; --bar-hover-ink: #102018; }',
    'html[data-theme="alien-dark"] { --paper: #070d08; --ink: #e4ffd4; --muted: #9ec49a; --line: #1c3020; --chip: #122018; --map: #101c12; --map-ink: #e4ffd4; --map-on: #b6ff3c; --map-tint: #7a5cff; --clock-face: #070d08; --clock-rim: #b6ff3c; --clock-mark: #e4ffd4; --clock-hour: #b6ff3c; --clock-minute: #9a7cff; --clock-pin: #7dff3a; }',
    'html[data-theme="alien-dark"] body { --bar: #050a06; --bar-stripe: #7dff3a; --bar-line: #7a5cff; --bar-ink: #e4ffd4; --bar-hover: #c6ff4a; --bar-hover-ink: #070d08; }',
    'html[data-theme="zodiac"] { color-scheme: light; --paper: #f7f3ea; --ink: #1a1430; --muted: #5c5678; --line: #e4dcc8; --chip: #efe6c8; --map: #ece4d4; --map-ink: #1a1430; --map-on: #1e1a4a; --map-tint: #7a6ad6; --clock-face: #f7f3ea; --clock-rim: #1e1a4a; --clock-mark: #1a1430; --clock-hour: #1e1a4a; --clock-minute: #c9a24a; --clock-pin: #e6c15a; }',
    'html[data-theme="zodiac"] body { --bar: #1e1a4a; --bar-stripe: #e6c15a; --bar-line: #7a6ad6; --bar-ink: #f7f3ea; --bar-hover: #e6c15a; --bar-hover-ink: #1a1430; }',
    'html[data-theme="zodiac-dark"] { --paper: #0c0a18; --ink: #f4efe4; --muted: #c4bdd4; --line: #262038; --chip: #1a1630; --map: #161228; --map-ink: #f4efe4; --map-on: #e6c15a; --map-tint: #7a6ad6; --clock-face: #0c0a18; --clock-rim: #e6c15a; --clock-mark: #f4efe4; --clock-hour: #e6c15a; --clock-minute: #a898e0; --clock-pin: #e6c15a; }',
    'html[data-theme="zodiac-dark"] body { --bar: #090818; --bar-stripe: #e6c15a; --bar-line: #7a6ad6; --bar-ink: #f4efe4; --bar-hover: #e6c15a; --bar-hover-ink: #1a1430; }',
    'html[data-theme="sportsball"] { color-scheme: light; --paper: #f4f7f2; --ink: #142033; --muted: #5c6a78; --line: #d5dde4; --chip: #e7f3dc; --map: #e4f0dc; --map-ink: #142033; --map-on: #ff6a1a; --map-tint: #1f7a3a; --clock-face: #f7f8f4; --clock-rim: #145c32; --clock-mark: #142033; --clock-hour: #ff6a1a; --clock-minute: #1f7a3a; --clock-pin: #ffb000; }',
    'html[data-theme="sportsball"] body { --bar: #145c32; --bar-stripe: #ff6a1a; --bar-line: #f7f4ea; --bar-ink: #f7f8f4; --bar-hover: #ff6a1a; --bar-hover-ink: #102018; }',
    'html[data-theme="sportsball-dark"] { --paper: #0c1210; --ink: #f3f6f1; --muted: #b7c4b4; --line: #243028; --chip: #162018; --map: #142018; --map-ink: #f3f6f1; --map-on: #ffb000; --map-tint: #1f7a3a; --clock-face: #0c1210; --clock-rim: #ffb000; --clock-mark: #f3f6f1; --clock-hour: #ff6a1a; --clock-minute: #7dffb0; --clock-pin: #ffb000; }',
    'html[data-theme="sportsball-dark"] body { --bar: #07110c; --bar-stripe: #ffb000; --bar-line: #ff6a1a; --bar-ink: #f3f6f1; --bar-hover: #ffb000; --bar-hover-ink: #102018; }',
    baseColorCss(),
    themeFaceCss(),
    "html.theme-mix { --paper: var(--mix-paper); --ink: var(--mix-ink); --muted: var(--mix-muted); --line: var(--mix-line); --chip: var(--mix-chip); --map: var(--mix-map); --map-ink: var(--mix-map-ink); --map-on: var(--mix-map-on); --map-tint: var(--mix-map-tint); --clock-face: var(--mix-clock-face); --clock-rim: var(--mix-clock-rim); --clock-mark: var(--mix-clock-mark); --clock-hour: var(--mix-clock-hour); --clock-minute: var(--mix-clock-minute); --clock-pin: var(--mix-clock-pin); --c-red: var(--mix-c-red); --c-orange: var(--mix-c-orange); --c-yellow: var(--mix-c-yellow); --c-green: var(--mix-c-green); --c-blue: var(--mix-c-blue); --c-purple: var(--mix-c-purple); --c-pink: var(--mix-c-pink); --c-brown: var(--mix-c-brown); --on-red: var(--mix-on-red); --on-orange: var(--mix-on-orange); --on-yellow: var(--mix-on-yellow); --on-green: var(--mix-on-green); --on-blue: var(--mix-on-blue); --on-purple: var(--mix-on-purple); --on-pink: var(--mix-on-pink); --on-brown: var(--mix-on-brown); color-scheme: light; }",
    "html.theme-mix.theme-mix-dark { color-scheme: dark; }",
    "html.theme-mix body { --bar: var(--mix-bar); --bar-stripe: var(--mix-bar-stripe); --bar-line: var(--mix-bar-line); --bar-ink: var(--mix-bar-ink); --bar-hover: var(--mix-bar-hover); --bar-hover-ink: var(--mix-bar-hover-ink); background: var(--mix-bg); }",
    "html.theme-mix header, html.theme-mix footer, html.theme-mix .lang-menu { background: var(--mix-header); color: var(--bar-ink); }",
    "html.look-body body, html.look-body button, html.look-body input, html.look-body select, html.look-body textarea { font-family: var(--look-body); }",
    "html.look-display h1, html.look-display h2, html.look-display h3, html.look-display .brand { font-family: var(--look-display); }",
    "html.look-paper { --paper: var(--look-paper); --chip: var(--look-chip); }",
    "html.look-ink { --ink: var(--look-ink); --muted: var(--look-muted); --line: var(--look-line); }",
    "html.look-bar body { --bar: var(--look-bar); --bar-ink: var(--look-bar-ink); --bar-line: var(--look-bar-line); }",
    "html.look-stripe body { --bar-stripe: var(--look-stripe); --bar-hover: var(--look-stripe); --bar-hover-ink: var(--look-on-stripe); }",
    ".look-panel, .look-panel button, .look-panel select, .look-panel label, .look-panel p { font-family: 'Segoe UI', 'Helvetica Neue', sans-serif; }",
    "html.theme-mix.look-paper body { background: var(--paper); }",
    "html.theme-mix.look-bar header, html.theme-mix.look-bar footer, html.theme-mix.look-bar .lang-menu { background: var(--bar); }"
  ].join("\n");
  document.head.appendChild(style);
  try {
    ensureThemeFaces(localStorage.getItem(KEY) || "light");
  } catch (error) {
    ensureThemeFaces("light");
  }

  var button = null;
  var wheel = null;
  var nameEl = null;
  var shadeInput = null;
  var open = false;
  var shade = 0;
  var snapping = false;

  function nightName(value) {
    return value === "dark" || /-dark$/.test(value);
  }

  function modeOf(value) {
    for (var i = 0; i < MODES.length; i++) {
      if (MODES[i].light === value || MODES[i].dark === value) return MODES[i];
    }
    return MODES[0];
  }

  var DAY_LIGHT = {
    "--paper": "#f4f0e6",
    "--ink": "#1c1915",
    "--muted": "#5c564c",
    "--line": "#d8d0c2",
    "--chip": "#d9e7f5",
    "--map": "#f6d56a",
    "--map-ink": "#1c1915",
    "--map-on": "#8eafd4",
    "--map-tint": "#8eb4dc",
    "--bar": "#0a3161",
    "--bar-stripe": "#bf0a30",
    "--bar-line": "#fff",
    "--bar-ink": "#f4f7fb",
    "--bar-hover": "#bf0a30",
    "--bar-hover-ink": "#fff",
    "--clock-face": "#f4f0e6",
    "--clock-rim": "#bf0a30",
    "--clock-mark": "#1c1915",
    "--clock-hour": "#0a3161",
    "--clock-minute": "#c4922a",
    "--clock-pin": "#1e4d7b"
  };
  var dayBase = baseVars("light");
  for (var dayKey in dayBase) DAY_LIGHT[dayKey] = dayBase[dayKey];
  var MIX_NAMES = ["paper", "ink", "muted", "line", "chip", "map", "map-ink", "map-on", "map-tint", "clock-face", "clock-rim", "clock-mark", "clock-hour", "clock-minute", "clock-pin", "bar", "bar-stripe", "bar-line", "bar-ink", "bar-hover", "bar-hover-ink", "c-red", "c-orange", "c-yellow", "c-green", "c-blue", "c-purple", "c-pink", "c-brown", "on-red", "on-orange", "on-yellow", "on-green", "on-blue", "on-purple", "on-pink", "on-brown"];
  var RAINBOW_HEADER = {
    light: "linear-gradient(90deg, #c43b4a, #d4920a, #2f7a40, #1a7aaa, #4a3aad, #c45080)",
    dark: "linear-gradient(90deg, #6a2430, #6a4a14, #245028, #145060, #2a2460, #5a2040)"
  };
  var packs = null;

  function parseColor(text) {
    var hex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(text);
    if (hex) {
      var h = hex[1];
      if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
      var n = parseInt(h, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
    }
    var rgba = /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/.exec(text);
    if (!rgba) return null;
    return [+rgba[1], +rgba[2], +rgba[3], rgba[4] == null ? 1 : +rgba[4]];
  }

  function formatColor(c) {
    var r = Math.round(c[0]);
    var g = Math.round(c[1]);
    var b = Math.round(c[2]);
    function hex(n) { var s = n.toString(16); return s.length === 1 ? "0" + s : s; }
    if (c[3] >= 0.999) return "#" + hex(r) + hex(g) + hex(b);
    var a = Math.round(c[3] * 1000) / 1000;
    return "rgba(" + r + ", " + g + ", " + b + ", " + a + ")";
  }

  function mixColor(a, b, t) {
    var A = parseColor(a);
    var B = parseColor(b);
    if (!A || !B) return t < 0.5 ? a : b;
    return formatColor([
      A[0] + (B[0] - A[0]) * t,
      A[1] + (B[1] - A[1]) * t,
      A[2] + (B[2] - A[2]) * t,
      A[3] + (B[3] - A[3]) * t
    ]);
  }

  function colorParts(text) {
    return {
      colors: text.match(/#[0-9a-fA-F]{3,6}\b|rgba?\([^)]+\)/g) || [],
      skeleton: text.replace(/#[0-9a-fA-F]{3,6}\b|rgba?\([^)]+\)/g, "@")
    };
  }

  function mixValue(a, b, t) {
    if (!a) return b || "";
    if (!b || a === b) return a;
    var left = colorParts(a);
    var right = colorParts(b);
    if (left.colors.length > 1 && left.colors.length === right.colors.length && left.skeleton === right.skeleton) {
      var i = 0;
      return a.replace(/#[0-9a-fA-F]{3,6}\b|rgba?\([^)]+\)/g, function () {
        var mixed = mixColor(left.colors[i], right.colors[i], t);
        i += 1;
        return mixed;
      });
    }
    return mixColor(a, b, t);
  }

  function ensurePacks() {
    if (packs) return;
    packs = { light: { vars: {}, bodyBg: "" } };
    var key;
    for (key in DAY_LIGHT) packs.light.vars[key] = DAY_LIGHT[key];
    var css = style.textContent;
    var re = /html\[data-theme="([^"]+)"\]( body)? \{([^}]*)\}/g;
    var match;
    while ((match = re.exec(css))) {
      var id = match[1];
      if (!packs[id]) packs[id] = { vars: {}, bodyBg: "" };
      var body = match[3];
      var decl = /(--[a-z0-9-]+)\s*:\s*([^;]+)/gi;
      var found;
      while ((found = decl.exec(body))) packs[id].vars[found[1]] = found[2].trim();
      var bg = /(?:^|;)\s*background\s*:\s*([^;]+)/i.exec(body);
      if (bg) packs[id].bodyBg = bg[1].trim();
    }
  }

  function tone(pack, key, other) {
    if (pack && pack.vars[key]) return pack.vars[key];
    if (other && other.vars[key]) return other.vars[key];
    return DAY_LIGHT[key] || "";
  }

  function headerTone(mode, side) {
    if (mode.id === "rainbow") return RAINBOW_HEADER[side];
    var pack = packs[side === "dark" ? mode.dark : mode.light];
    var other = packs[side === "dark" ? mode.light : mode.dark];
    var bar = tone(pack, "--bar", other);
    if (mode.id === "day" && side === "dark") return mixValue(bar, "#100e0c", 0.62);
    return bar;
  }

  function savedShade() {
    try {
      var raw = localStorage.getItem(SHADE_KEY);
      if (raw == null || raw === "") return nightName(saved()) ? 100 : 0;
      var n = parseInt(raw, 10);
      if (isNaN(n)) return nightName(saved()) ? 100 : 0;
      return Math.max(0, Math.min(100, n));
    } catch (error) {
      return 0;
    }
  }

  function saveShade() {
    try { localStorage.setItem(SHADE_KEY, String(shade)); } catch (error) {}
  }

  function syncControls(mode) {
    var t = shade / 100;
    var dark = shade >= 50;
    if (shadeInput) {
      shadeInput.value = String(shade);
      shadeInput.style.setProperty("--shade-from", mode.lightFill);
      shadeInput.style.setProperty("--shade-to", mode.darkFill);
      shadeInput.setAttribute("aria-valuetext", shade <= 0 ? "Light" : shade >= 100 ? "Dark" : shade + " percent toward dark");
    }
    if (button) {
      button.classList.toggle("is-night", dark);
      var now = button.querySelector(".theme-mark-now");
      if (now) now.setAttribute("fill", mixValue(mode.lightFill, mode.darkFill, t));
      var ink = dark ? "#fff" : "#1c1915";
      var sun = button.querySelector(".theme-mark-sun");
      if (sun) {
        sun.setAttribute("stroke", ink);
        var sunCore = sun.querySelector("circle");
        if (sunCore) sunCore.setAttribute("fill", ink);
      }
      var moon = button.querySelector(".theme-mark-moon path");
      if (moon) moon.setAttribute("fill", ink);
      var words = shade <= 0 ? ", light is on." : shade >= 100 ? ", dark is on." : ", " + shade + " percent toward dark.";
      button.setAttribute("aria-label", "Themes. " + mode.label + words + " Open the theme wheel.");
    }
    if (wheel) {
      var want = shade <= 0 ? mode.light : shade >= 100 ? mode.dark : "";
      var choices = wheel.querySelectorAll(".theme-choice");
      for (var i = 0; i < choices.length; i++) {
        choices[i].setAttribute("aria-pressed", want && choices[i].getAttribute("data-value") === want ? "true" : "false");
      }
    }
  }

  function paintShade() {
    if (snapping) {
      syncControls(modeOf(document.documentElement.getAttribute("data-theme") || "light"));
      return;
    }
    ensurePacks();
    var theme = document.documentElement.getAttribute("data-theme") || "light";
    var mode = modeOf(theme);
    var t = shade / 100;
    var root = document.documentElement;
    if (shade <= 0 || shade >= 100) {
      root.classList.remove("theme-mix");
      root.classList.remove("theme-mix-dark");
      var want = shade >= 100 ? mode.dark : mode.light;
      if (theme !== want) {
        snapping = true;
        try { localStorage.setItem(KEY, want); } catch (error) {}
        apply(want);
        snapping = false;
        return;
      }
      syncControls(mode);
      return;
    }
    if (theme !== mode.light) {
      if (mode.light === "light") root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", mode.light);
    }
    var lightPack = packs[mode.light] || packs.light;
    var darkPack = packs[mode.dark] || packs.light;
    for (var i = 0; i < MIX_NAMES.length; i++) {
      var name = MIX_NAMES[i];
      var key = "--" + name;
      root.style.setProperty("--mix-" + name, mixValue(tone(lightPack, key, darkPack), tone(darkPack, key, lightPack), t));
    }
    var lightBg = (lightPack && lightPack.bodyBg) || tone(lightPack, "--paper", darkPack);
    var darkBg = (darkPack && darkPack.bodyBg) || tone(darkPack, "--paper", lightPack);
    root.style.setProperty("--mix-bg", mixValue(lightBg, darkBg, t));
    root.style.setProperty("--mix-header", mixValue(headerTone(mode, "light"), headerTone(mode, "dark"), t));
    root.classList.add("theme-mix");
    root.classList.toggle("theme-mix-dark", shade >= 50);
    syncControls(mode);
  }

  function onShade() {
    var next = parseInt(shadeInput.value, 10);
    if (isNaN(next)) next = 0;
    shade = Math.max(0, Math.min(100, next));
    saveShade();
    var theme = document.documentElement.getAttribute("data-theme") || "light";
    var mode = modeOf(theme);
    var value = shade >= 100 ? mode.dark : mode.light;
    try { localStorage.setItem(KEY, value); } catch (error) {}
    apply(value);
  }

  function apply(theme) {
    if (!ALLOWED[theme]) theme = "light";
    ensureThemeFaces(theme);
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
    if (typeof applyLook === "function") applyLook();
    if (lookOpen && lookMenu) fillLookControls();
    paintShade();
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
    shade = nightName(value) ? 100 : 0;
    saveShade();
    try { localStorage.setItem(KEY, value); } catch (error) {}
    apply(value);
  }

  function place() {
    if (!button || !wheel) return;
    var narrow = window.matchMedia("(max-width: 800px)").matches;
    var header = document.querySelector("header");
    var headerBottom = 0;
    if (header) {
      var hr = header.getBoundingClientRect();
      if (hr.height > 0 && hr.bottom > 0) headerBottom = hr.bottom;
    }
    var rect = button.getBoundingClientRect();
    var below = Math.max(rect.bottom + 8, headerBottom + 8);
    var faceSize = 420;
    var size = window.innerWidth < 420 ? 300 : faceSize;
    if (narrow) {
      var room = window.innerHeight - below - 8;
      size = Math.min(faceSize, window.innerWidth - 16, Math.max(220, room));
    }
    wheel.style.width = size + "px";
    wheel.style.height = size + "px";
    var face = wheel.querySelector(".theme-wheel-face");
    if (face) {
      face.style.transform = size < faceSize ? "scale(" + (size / faceSize) + ")" : "";
      face.style.transformOrigin = "top left";
    }
    var left = narrow ? Math.max(8, (window.innerWidth - size) / 2) : rect.right - size;
    if (left < 8) left = 8;
    if (left + size > window.innerWidth - 8) left = Math.max(8, window.innerWidth - size - 8);
    var top = narrow ? below : rect.bottom + 8;
    if (!narrow && top + size > window.innerHeight - 8) top = Math.max(8, rect.top - size - 8);
    if (narrow && headerBottom > 0) top = Math.max(top, headerBottom + 8);
    wheel.style.left = left + "px";
    wheel.style.top = top + "px";
  }

  function closeWheel() {
    if (!wheel || !open) return;
    open = false;
    wheel.hidden = true;
    wheel.classList.remove("is-open");
    document.documentElement.classList.remove("theme-open");
    if (button) {
      button.setAttribute("aria-expanded", "false");
      button.focus();
    }
  }

  function showHeader() {
    var header = document.querySelector("header");
    if (!header) return;
    document.body.classList.remove("chrome-idle", "chrome-away", "chrome-at-top");
    header.style.maxHeight = "";
    header.style.overflow = "";
    header.inert = false;
  }

  function openWheel() {
    if (!wheel) return;
    if (lookOpen) closeLook(false);
    open = true;
    wheel.hidden = false;
    wheel.classList.add("is-open");
    document.documentElement.classList.add("theme-open");
    showHeader();
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
      [["light", mode.light, mode.lightFill, mode.lightInk, 172], ["dark", mode.dark, mode.darkFill, mode.darkInk, 136]].forEach(function (part) {
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
    var shadeWrap = document.createElement("label");
    shadeWrap.className = "theme-shade";
    var lightWord = document.createElement("span");
    lightWord.textContent = "Light";
    var darkWord = document.createElement("span");
    darkWord.textContent = "Dark";
    shadeInput = document.createElement("input");
    shadeInput.type = "range";
    shadeInput.className = "theme-shade-range";
    shadeInput.min = "0";
    shadeInput.max = "100";
    shadeInput.step = "1";
    shadeInput.value = String(shade);
    shadeInput.setAttribute("aria-label", "Light to dark");
    shadeWrap.appendChild(lightWord);
    shadeWrap.appendChild(shadeInput);
    shadeWrap.appendChild(darkWord);
    shadeWrap.addEventListener("click", function (event) { event.stopPropagation(); });
    shadeInput.addEventListener("input", onShade);
    shadeInput.addEventListener("change", onShade);
    face.appendChild(shadeWrap);
    var exit = document.createElement("button");
    exit.type = "button";
    exit.className = "theme-wheel-exit";
    exit.textContent = "Exit";
    exit.addEventListener("click", function (event) {
      event.stopPropagation();
      closeWheel();
    });
    face.appendChild(exit);
    wheel.appendChild(face);
    document.body.appendChild(wheel);
    wheel.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeWheel();
        return;
      }
      if (event.target === shadeInput) return;
      var step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
      if (!step) return;
      var choices = Array.prototype.slice.call(wheel.querySelectorAll(".theme-choice"));
      var index = choices.indexOf(document.activeElement);
      if (index < 0) index = 0;
      event.preventDefault();
      choices[(index + step + choices.length) % choices.length].focus();
    });
  }

  var LOOK_KEY = "leaders-look";
  var lookButton = null;
  var lookMenu = null;
  var lookOpen = false;
  var look = { body: "", display: "", paper: "", ink: "", bar: "", stripe: "" };

  function hexOf(value) {
    value = String(value || "").trim();
    var short = value.match(/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/);
    if (short) return ("#" + short[1] + short[1] + short[2] + short[2] + short[3] + short[3]).toLowerCase();
    if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toLowerCase();
    var rgb = value.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    if (!rgb) return "";
    function h(n) { var s = Math.max(0, Math.min(255, Number(n))).toString(16); return s.length < 2 ? "0" + s : s; }
    return "#" + h(rgb[1]) + h(rgb[2]) + h(rgb[3]);
  }

  function channels(hex) {
    hex = hexOf(hex) || "#000000";
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  }

  function mixHex(a, b, t) {
    var A = channels(a);
    var B = channels(b);
    function h(n) { var s = Math.round(n).toString(16); return s.length < 2 ? "0" + s : s; }
    return "#" + h(A[0] + (B[0] - A[0]) * t) + h(A[1] + (B[1] - A[1]) * t) + h(A[2] + (B[2] - A[2]) * t);
  }

  function luma(hex) {
    var c = channels(hex);
    function f(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  }

  function inkOn(bg) { return luma(bg) > 0.45 ? "#1c1915" : "#f4f7fb"; }

  function readVar(name, fromBody) {
    var node = fromBody && document.body ? document.body : document.documentElement;
    return hexOf(getComputedStyle(node).getPropertyValue(name));
  }

  function savedLook() {
    var next = { body: "", display: "", paper: "", ink: "", bar: "", stripe: "" };
    try {
      var raw = JSON.parse(localStorage.getItem(LOOK_KEY) || "");
      if (!raw || typeof raw !== "object") return next;
      if (FONT_IDS[raw.body]) next.body = raw.body;
      if (FONT_IDS[raw.display]) next.display = raw.display;
      ["paper", "ink", "bar", "stripe"].forEach(function (key) {
        var hex = hexOf(raw[key]);
        if (hex) next[key] = hex;
      });
    } catch (e) {}
    return next;
  }

  function storeLook() {
    var empty = !look.body && !look.display && !look.paper && !look.ink && !look.bar && !look.stripe;
    try {
      if (empty) localStorage.removeItem(LOOK_KEY);
      else localStorage.setItem(LOOK_KEY, JSON.stringify(look));
    } catch (e) {}
  }

  function applyLook() {
    var root = document.documentElement;
    root.classList.toggle("look-body", !!look.body);
    root.classList.toggle("look-display", !!look.display);
    root.classList.toggle("look-paper", !!look.paper);
    root.classList.toggle("look-ink", !!look.ink);
    root.classList.toggle("look-bar", !!look.bar);
    root.classList.toggle("look-stripe", !!look.stripe);
    if (look.body) root.style.setProperty("--look-body", look.body);
    else root.style.removeProperty("--look-body");
    if (look.display) root.style.setProperty("--look-display", look.display);
    else root.style.removeProperty("--look-display");
    var paper = look.paper || readVar("--paper", false) || "#f4f0e6";
    var ink = look.ink || readVar("--ink", false) || "#1c1915";
    var bar = look.bar || readVar("--bar", true) || "#0a3161";
    if (look.paper) {
      root.style.setProperty("--look-paper", look.paper);
      root.style.setProperty("--look-chip", mixHex(look.paper, bar, 0.16));
    } else {
      root.style.removeProperty("--look-paper");
      root.style.removeProperty("--look-chip");
    }
    if (look.ink) {
      root.style.setProperty("--look-ink", look.ink);
      root.style.setProperty("--look-muted", mixHex(look.ink, paper, 0.42));
      root.style.setProperty("--look-line", mixHex(paper, look.ink, 0.22));
    } else {
      root.style.removeProperty("--look-ink");
      root.style.removeProperty("--look-muted");
      root.style.removeProperty("--look-line");
    }
    if (look.bar) {
      var onBar = inkOn(look.bar);
      root.style.setProperty("--look-bar", look.bar);
      root.style.setProperty("--look-bar-ink", onBar);
      root.style.setProperty("--look-bar-line", mixHex(onBar, look.bar, 0.35));
    } else {
      root.style.removeProperty("--look-bar");
      root.style.removeProperty("--look-bar-ink");
      root.style.removeProperty("--look-bar-line");
    }
    if (look.stripe) {
      root.style.setProperty("--look-stripe", look.stripe);
      root.style.setProperty("--look-on-stripe", inkOn(look.stripe));
    } else {
      root.style.removeProperty("--look-stripe");
      root.style.removeProperty("--look-on-stripe");
    }
  }

  function fillLookControls() {
    if (!lookMenu) return;
    var bodySelect = lookMenu.querySelector("[data-look='body']");
    var displaySelect = lookMenu.querySelector("[data-look='display']");
    if (bodySelect) {
      bodySelect.value = look.body;
      bodySelect.style.fontFamily = look.body || "";
    }
    if (displaySelect) {
      displaySelect.value = look.display;
      displaySelect.style.fontFamily = look.display || "";
    }
    [["paper", false], ["ink", false], ["bar", true], ["stripe", true]].forEach(function (part) {
      var input = lookMenu.querySelector("[data-look='" + part[0] + "']");
      if (!input) return;
      input.value = look[part[0]] || readVar("--" + (part[0] === "stripe" ? "bar-stripe" : part[0]), part[1]) || "#000000";
    });
  }

  function placeLook() {
    if (!lookButton || !lookMenu) return;
    var narrow = window.matchMedia("(max-width: 800px)").matches;
    var header = document.querySelector("header");
    var headerBottom = 0;
    if (header) {
      var hr = header.getBoundingClientRect();
      if (hr.height > 0 && hr.bottom > 0) headerBottom = hr.bottom;
    }
    var rect = lookButton.getBoundingClientRect();
    var width = lookMenu.offsetWidth || 320;
    var height = lookMenu.offsetHeight || 280;
    var below = Math.max(rect.bottom + 8, headerBottom + 8);
    var left = narrow ? Math.max(8, (window.innerWidth - width) / 2) : rect.right - width;
    if (left < 8) left = 8;
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
    var top = below;
    if (!narrow && top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 8);
    if (narrow && headerBottom > 0) top = Math.max(top, headerBottom + 8);
    lookMenu.style.left = left + "px";
    lookMenu.style.top = top + "px";
  }

  function closeLook(focusButton) {
    if (!lookMenu || !lookOpen) return;
    lookOpen = false;
    lookMenu.hidden = true;
    if (lookButton) lookButton.setAttribute("aria-expanded", "false");
    if (focusButton && lookButton) lookButton.focus();
  }

  function openLook() {
    if (!lookMenu) return;
    if (open) closeWheel();
    lookOpen = true;
    lookMenu.hidden = false;
    showHeader();
    fillLookControls();
    placeLook();
    if (lookButton) lookButton.setAttribute("aria-expanded", "true");
    var first = lookMenu.querySelector("select, input, button");
    if (first) first.focus();
  }

  function mountLook() {
    lookButton = document.createElement("button");
    lookButton.type = "button";
    lookButton.className = "look-button notranslate";
    lookButton.setAttribute("translate", "no");
    lookButton.setAttribute("aria-label", "Type and colors");
    lookButton.setAttribute("aria-haspopup", "dialog");
    lookButton.setAttribute("aria-controls", "look-menu");
    lookButton.setAttribute("aria-expanded", "false");
    lookButton.innerHTML = '<span class="look-mark" aria-hidden="true">Aa</span>';
    if (button && button.parentNode) button.parentNode.insertBefore(lookButton, button);
    else if (document.body) {
      lookButton.classList.add("look-button-fixed");
      document.body.appendChild(lookButton);
    } else return;
    if (button && button.classList.contains("theme-button-fixed")) lookButton.classList.add("look-button-fixed");

    lookMenu = document.createElement("div");
    lookMenu.className = "look-menu notranslate";
    lookMenu.setAttribute("translate", "no");
    lookMenu.hidden = true;
    lookMenu.setAttribute("role", "dialog");
    lookMenu.id = "look-menu";
    var panel = document.createElement("div");
    panel.className = "look-panel";
    function kicker(text) {
      var p = document.createElement("p");
      p.className = "look-kicker";
      p.textContent = text;
      return p;
    }
    function fontRow(name, label) {
      var row = document.createElement("label");
      row.className = "look-row";
      row.appendChild(document.createTextNode(label));
      var select = document.createElement("select");
      select.setAttribute("data-look", name);
      select.setAttribute("aria-label", label + " font");
      function addOption(parent, font) {
        var option = document.createElement("option");
        option.value = font.id;
        option.textContent = font.label;
        if (font.id) option.style.fontFamily = font.id;
        parent.appendChild(option);
      }
      FONTS.forEach(function (font) {
        if (!font.group) addOption(select, font);
      });
      ["Sans", "Serif", "Mono", "Script", "Display"].forEach(function (group) {
        var faces = FONTS.filter(function (font) { return font.group === group; });
        if (!faces.length) return;
        var box = document.createElement("optgroup");
        box.label = group;
        faces.forEach(function (font) { addOption(box, font); });
        select.appendChild(box);
      });
      select.addEventListener("change", function () {
        look[name] = FONT_IDS[select.value] ? select.value : "";
        storeLook();
        applyLook();
        select.style.fontFamily = select.value || "";
      });
      row.appendChild(select);
      return row;
    }
    function colorRow(name, label, cssName, fromBody) {
      var row = document.createElement("label");
      row.className = "look-row";
      row.appendChild(document.createTextNode(label));
      var input = document.createElement("input");
      input.type = "color";
      input.setAttribute("data-look", name);
      input.setAttribute("aria-label", label + " color");
      input.addEventListener("input", function () {
        var hex = hexOf(input.value);
        if (!hex) return;
        look[name] = hex;
        storeLook();
        applyLook();
      });
      row.appendChild(input);
      return row;
    }
    panel.appendChild(kicker("Type"));
    panel.appendChild(fontRow("body", "Text"));
    panel.appendChild(fontRow("display", "Headings"));
    panel.appendChild(kicker("Colors"));
    panel.appendChild(colorRow("paper", "Page"));
    panel.appendChild(colorRow("ink", "Text"));
    panel.appendChild(colorRow("bar", "Header"));
    panel.appendChild(colorRow("stripe", "Stripe"));
    var actions = document.createElement("div");
    actions.className = "look-actions";
    var reset = document.createElement("button");
    reset.type = "button";
    reset.textContent = "Reset";
    reset.addEventListener("click", function () {
      look = { body: "", display: "", paper: "", ink: "", bar: "", stripe: "" };
      storeLook();
      applyLook();
      fillLookControls();
    });
    var exit = document.createElement("button");
    exit.type = "button";
    exit.textContent = "Close";
    exit.addEventListener("click", function () { closeLook(true); });
    actions.appendChild(reset);
    actions.appendChild(exit);
    panel.appendChild(actions);
    lookMenu.appendChild(panel);
    document.body.appendChild(lookMenu);
    lookButton.addEventListener("click", function (event) {
      event.stopPropagation();
      if (lookOpen) closeLook(false);
      else openLook();
    });
    lookMenu.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLook(true);
      }
    });
    document.addEventListener("click", function (event) {
      if (!lookOpen) return;
      if (lookMenu.contains(event.target) || lookButton.contains(event.target)) return;
      closeLook(false);
    });
    window.addEventListener("resize", function () { if (lookOpen) placeLook(); });
    window.addEventListener("scroll", function () { if (lookOpen) placeLook(); }, { passive: true });
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
    mountLook();
    window.addEventListener("resize", function () { if (open) place(); });
    window.addEventListener("scroll", function () { if (open) place(); }, { passive: true });
    apply(saved());
  }

  shade = savedShade();
  look = savedLook();
  apply(saved());
  applyLook();
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
    return '<svg class="clock" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><circle class="clock-rim" cx="16" cy="16" r="15"/><circle class="clock-face" cx="16" cy="16" r="12.15"/><g class="clock-marks">' + marks + '</g><line class="clock-hour" x1="16" y1="16.8" x2="16" y2="9.1"/><line class="clock-minute" x1="16" y1="17.2" x2="16" y2="6.3"/><line class="clock-second" x1="16" y1="18.4" x2="16" y2="5.2"/><circle class="clock-pin" cx="16" cy="16" r="1.55"/></svg>';
  }

  function setClockHands(d) {
    var clocks = document.querySelectorAll(".clock");
    var seconds = d.getSeconds() + d.getMilliseconds() / 1000;
    var minute = d.getMinutes() + seconds / 60;
    var hour = (d.getHours() % 12) + minute / 60;
    for (var i = 0; i < clocks.length; i++) {
      var hourHand = clocks[i].querySelector(".clock-hour");
      var minuteHand = clocks[i].querySelector(".clock-minute");
      var secondHand = clocks[i].querySelector(".clock-second");
      if (hourHand) hourHand.style.transform = "rotate(" + (hour * 30) + "deg)";
      if (minuteHand) minuteHand.style.transform = "rotate(" + (minute * 6) + "deg)";
      if (secondHand) secondHand.style.transform = "rotate(" + (seconds * 6) + "deg)";
    }
  }

  function showLocalNow() {
    var bar = document.querySelector("header .bar") || document.querySelector("header");
    var line = bar ? bar.querySelector(".now") : null;
    if (bar && !line) {
      line = document.createElement("p");
      line.className = "now";
      line.insertAdjacentHTML("afterbegin", clockMarkup());
      var time = document.createElement("time");
      line.appendChild(time);
      var here = bar.querySelector(".here");
      var top = bar.querySelector(".bar-top");
      var after = here || top;
      if (after && after.parentNode === bar) bar.insertBefore(line, after.nextSibling);
      else bar.appendChild(line);
    }
    var el = line ? line.querySelector("time") : null;
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
    var shownMinute = "";
    function show() {
      var d = new Date();
      setClockHands(d);
      if (!el) return;
      var y = d.getFullYear();
      var m = d.getMonth();
      var day = d.getDate();
      var hour = d.getHours();
      var minute = d.getMinutes();
      var compact = window.matchMedia("(max-width: 640px)").matches;
      var stamp = y + "-" + m + "-" + day + "-" + hour + "-" + minute + (compact ? "-s" : "-l");
      if (stamp === shownMinute) return;
      shownMinute = stamp;
      var h12 = hour % 12 || 12;
      var ap = hour < 12 ? "a.m." : "p.m.";
      var off = -d.getTimezoneOffset();
      var sign = off >= 0 ? "+" : "-";
      var abs = Math.abs(off);
      var zone = zoneName(d);
      el.dateTime = y + "-" + pad(m + 1) + "-" + pad(day) + "T" + pad(hour) + ":" + pad(minute) + ":" + pad(d.getSeconds()) + sign + pad(Math.floor(abs / 60)) + ":" + pad(abs % 60);
      var when = h12 + ":" + pad(minute) + " " + ap + (zone ? " " + zone : "");
      el.textContent = compact
        ? months[m].slice(0, 3) + " " + day + " · " + when
        : days[d.getDay()] + ", " + months[m] + " " + day + ", " + y + " · " + when;
    }
    function keepTime() {
      show();
      setTimeout(keepTime, 100);
    }
    keepTime();
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") show();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", showLocalNow);
  else showLocalNow();

  window.addEventListener("storage", function (event) {
    if (event.key === KEY || event.key === SHADE_KEY) {
      shade = savedShade();
      apply(saved());
    }
    if (event.key === LOOK_KEY) {
      look = savedLook();
      applyLook();
      if (lookOpen) fillLookControls();
    }
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

  function loadScoreboard() {
    if (document.getElementById("score-open")) return;
    var root = "";
    var nodes = document.getElementsByTagName("script");
    for (var i = nodes.length - 1; i >= 0; i--) {
      var src = nodes[i].getAttribute("src") || "";
      var at = src.indexOf("theme.js");
      if (at >= 0) {
        root = src.slice(0, at);
        break;
      }
    }
    var css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = root + "news/preview/scoreboard.css?v=6";
    document.head.appendChild(css);
    var board = document.createElement("script");
    board.src = root + "news/preview/scoreboard.js?v=11";
    board.onload = function () {
      var live = document.createElement("script");
      live.src = root + "news/preview/score-live.js?v=4";
      document.body.appendChild(live);
    };
    document.body.appendChild(board);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", loadScoreboard);
  else loadScoreboard();

})();
