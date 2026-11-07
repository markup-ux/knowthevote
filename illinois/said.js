(function () {
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var SIDE = { Y: "Yes", N: "No", P: "Present", X: "Did not vote" };
  var SKIP = /^(On Ordering the Previous Question|On Motion to Recommit|On Motion to Table)\b/;
  var root = document.getElementById("record");
  var status = document.getElementById("record-status");

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function formatDate(iso) {
    var match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    if (!match) return iso || "";
    return MONTHS[+match[2] - 1] + " " + (+match[3]) + ", " + match[1];
  }

  function hit(blob, words) {
    return words.some(function (word) {
      var pattern = new RegExp("\\b" + word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
      return pattern.test(blob);
    });
  }

  function matches(person, votes, index) {
    var found = [];
    votes.forEach(function (vote) {
      if (SKIP.test(vote.question || "")) return;
      var code = (vote.cast || "").charAt(index);
      if (code !== "Y" && code !== "N" && code !== "P") return;
      var blob = (vote.question || "") + " " + (vote.desc || "");
      if (!hit(blob, person.words || [])) return;
      found.push({ vote: vote, code: code });
    });
    found.sort(function (a, b) {
      return (b.vote.date || "").localeCompare(a.vote.date || "");
    });
    return found.slice(0, 6);
  }

  function render(said, votes) {
    var index = {};
    votes.members.forEach(function (member, i) { index[member[0]] = i; });
    said.people.forEach(function (person) {
      var section = el("section", "state-block");
      section.id = person.id;
      var title = el("h2", "", person.name);
      section.appendChild(title);
      var meta = "Illinois " + person.district;
      meta += person.party === "D" ? " · Democratic" : person.party === "R" ? " · Republican" : "";
      section.appendChild(el("p", "vote-meta", meta));
      person.lines.forEach(function (line) {
        var quote = el("blockquote");
        quote.appendChild(el("p", "", line.text));
        var cite = el("p", "vote-meta");
        cite.appendChild(document.createTextNode("Copied November 6, 2026 from "));
        var link = el("a", "", line.url.replace(/^https?:\/\/(www\.)?/, ""));
        link.href = line.url;
        cite.appendChild(link);
        quote.appendChild(cite);
        section.appendChild(quote);
      });
      var rows = matches(person, votes.votes, index[person.id]);
      if (!rows.length) {
        section.appendChild(el("p", "", "No roll call in this file uses those words in the question or the description."));
      } else {
        section.appendChild(el("h3", "", "Roll calls with the same words"));
        rows.forEach(function (row) {
          var vote = row.vote;
          var block = el("p");
          var when = el("a", "", formatDate(vote.date));
          when.href = "house.html#" + vote.id;
          block.appendChild(when);
          block.appendChild(document.createTextNode(" · " + SIDE[row.code] + " · " + (vote.question || "")));
          if (vote.desc) block.appendChild(el("span", "vote-meta", " " + vote.desc));
          section.appendChild(block);
        });
      }
      root.appendChild(section);
    });
    status.textContent = "Roll calls are the copy updated " + (votes.updated || "in the House file") + ". The sentences were copied November 6, 2026.";
  }

  Promise.all([
    fetch("illinois/said.json").then(function (response) { return response.json(); }),
    fetch("congress/votes.json").then(function (response) { return response.json(); })
  ]).then(function (files) {
    render(files[0], files[1]);
  }).catch(function () {
    status.textContent = "The saved sentences or the House roll-call file did not load.";
  });
})();
