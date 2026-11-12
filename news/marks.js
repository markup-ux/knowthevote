(function () {
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
    spotify: "<circle cx='16' cy='16' r='14' fill='var(--c-brown)'/><circle cx='16' cy='16' r='11' fill='none' stroke='var(--c-red)' stroke-width='1.7'/><circle cx='16' cy='16' r='8.2' fill='none' stroke='var(--c-orange)' stroke-width='1.7'/><circle cx='16' cy='16' r='5.5' fill='var(--c-yellow)'/><circle cx='16' cy='16' r='3.3' fill='var(--c-green)'/><circle cx='16' cy='16' r='1.5' fill='var(--c-blue)'/><circle cx='23' cy='7.5' r='1.6' fill='var(--c-purple)'/><circle cx='9' cy='24.5' r='1.6' fill='var(--c-pink)'/>",
    youtube: "<rect x='2' y='7' width='28' height='16' rx='4' fill='var(--c-red)'/><rect x='4' y='9' width='24' height='10' rx='2' fill='var(--c-brown)'/><path d='M13 11.2 L21 14 L13 16.8 Z' fill='var(--c-yellow)'/><rect x='5' y='24' width='4' height='2' fill='var(--c-orange)'/><rect x='10' y='24' width='4' height='2' fill='var(--c-green)'/><rect x='15' y='24' width='4' height='2' fill='var(--c-blue)'/><rect x='20' y='24' width='4' height='2' fill='var(--c-purple)'/><circle cx='27' cy='10' r='1.4' fill='var(--c-pink)'/>",
    pieces: "<rect x='3' y='4' width='22' height='26' rx='1' fill='var(--c-brown)'/><rect x='5' y='6' width='18' height='22' fill='var(--c-yellow)'/><rect x='5' y='6' width='18' height='5' fill='var(--c-red)'/><rect x='8' y='14' width='12' height='2' fill='var(--c-blue)'/><rect x='8' y='18' width='9' height='2' fill='var(--c-green)'/><rect x='8' y='22' width='6' height='2' fill='var(--c-purple)'/><path d='M18 17 L26 8 L28.2 10.2 L20.2 19.2 Z' fill='var(--c-orange)'/><circle cx='26.6' cy='8.4' r='1.5' fill='var(--c-pink)'/>",
    web: "<circle cx='16' cy='16' r='13.3' fill='var(--c-blue)'/><circle cx='16' cy='16' r='13.3' fill='none' stroke='var(--c-brown)' stroke-width='2'/><path d='M16 2.7 a19.3 19.3 0 0 0 0 26.6 a19.3 19.3 0 0 0 0-26.6' fill='none' stroke='var(--c-yellow)' stroke-width='2'/><path d='M2.7 16 h26.6' fill='none' stroke='var(--c-red)' stroke-width='2' stroke-linecap='round'/><path d='M5.2 11.2 h21.6' fill='none' stroke='var(--c-orange)' stroke-width='1.6' stroke-linecap='round'/><path d='M5.2 20.8 h21.6' fill='none' stroke='var(--c-green)' stroke-width='1.6' stroke-linecap='round'/><circle cx='10.6' cy='13.2' r='1.5' fill='var(--c-purple)'/><circle cx='21' cy='18.8' r='1.5' fill='var(--c-pink)'/>"
  };


  function markIcon(kind) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 32 32");
    svg.setAttribute("width", "28");
    svg.setAttribute("height", "28");
    svg.setAttribute("class", "mark");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = marks[kind];
    return svg;
  }

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
    if (/youtube\.com|youtu\.be/i.test(href)) return "youtube";
    if (/github\.com/i.test(href)) return "github";
    if (/peopleofcolorintech\.com\/author\//i.test(href)) return "pieces";
    var asked = link.getAttribute("data-kind");
    if (asked && asked !== "web" && marks[asked]) return asked;
    if (/^https?:/i.test(href)) {
      var path = href.replace(/^https?:\/\/[^/]+/i, "").split(/[?#]/)[0];
      if (!path || path === "/") return "web";
      return "page";
    }
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

  markLinks(document);
})();
