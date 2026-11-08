(function () {
  var ns = "http://www.w3.org/2000/svg";
  var seq = 0;

  function h(tag, attr, kids) {
    var node = document.createElementNS(ns, tag);
    Object.keys(attr || {}).forEach(function (key) { node.setAttribute(key, attr[key]); });
    (kids || []).forEach(function (kid) { node.appendChild(kid); });
    return node;
  }

  function mark(kids) {
    return h("svg", { viewBox: "0 0 24 24", class: "card-mark", "aria-hidden": "true" }, kids);
  }

  function clip(kids) {
    seq += 1;
    var id = "card-mark-" + seq;
    return [
      h("defs", {}, [h("clipPath", { id: id }, kids)]),
      id
    ];
  }

  function phone() {
    var c = ["#0c5c64", "#d7f6f8", "#f4e2c4", "#f7f4ee", "#e2b48a", "#246b3a", "#0e5f96", "#8d3048"];
    return mark([
      h("rect", { x: "7", y: "1.5", width: "10", height: "21", rx: "3", fill: c[0] }),
      h("rect", { x: "9", y: "4", width: "6", height: "11", rx: "1", fill: c[1] }),
      h("rect", { x: "10", y: "2.6", width: "4", height: "1.1", rx: "0.5", fill: c[2] }),
      h("circle", { cx: "12", cy: "19.2", r: "1.15", fill: c[3] }),
      h("rect", { x: "16.6", y: "6.5", width: "1.3", height: "3", rx: "0.4", fill: c[4] }),
      h("circle", { cx: "10.4", cy: "8.2", r: "0.7", fill: c[5] }),
      h("circle", { cx: "12", cy: "8.2", r: "0.7", fill: c[6] }),
      h("circle", { cx: "13.6", cy: "8.2", r: "0.7", fill: c[7] })
    ]);
  }

  function house() {
    var c = ["#c4844a", "#5c3a16", "#6a3478", "#6ec8f5", "#f7f4ee", "#9dcaa8", "#f0b4c2", "#1c1915", "#8d3232"];
    return mark([
      h("polygon", { points: "2,9 12,2.5 22,9", fill: c[1] }),
      h("rect", { x: "4", y: "8.5", width: "16", height: "13", rx: "1", fill: c[0] }),
      h("rect", { x: "6", y: "11", width: "3.2", height: "3", rx: "0.3", fill: c[3] }),
      h("rect", { x: "14.8", y: "11", width: "3.2", height: "3", rx: "0.3", fill: c[4] }),
      h("rect", { x: "6", y: "15.4", width: "3.2", height: "3", rx: "0.3", fill: c[5] }),
      h("rect", { x: "14.8", y: "15.4", width: "3.2", height: "3", rx: "0.3", fill: c[6] }),
      h("rect", { x: "10.2", y: "14.2", width: "3.6", height: "7.3", fill: c[2] }),
      h("rect", { x: "11.6", y: "1.2", width: "0.8", height: "3.2", fill: c[7] }),
      h("polygon", { points: "12.4,1.2 17,2.2 12.4,3.5", fill: c[8] })
    ]);
  }

  function office() {
    var c = ["#d8c4a2", "#1e3f66", "#5eb7e8", "#f4f7fb", "#6aaa78", "#e0a15a", "#b5523a", "#e6b422", "#6b5344"];
    return mark([
      h("rect", { x: "2", y: "21.4", width: "20", height: "1.5", rx: "0.3", fill: c[8] }),
      h("rect", { x: "6.4", y: "2.4", width: "11.2", height: "19.2", fill: c[0] }),
      h("rect", { x: "5.5", y: "1.2", width: "13", height: "1.8", fill: c[1] }),
      h("rect", { x: "7.6", y: "4", width: "2.5", height: "2.3", fill: c[2] }),
      h("rect", { x: "10.75", y: "4", width: "2.5", height: "2.3", fill: c[3] }),
      h("rect", { x: "13.9", y: "4", width: "2.5", height: "2.3", fill: c[4] }),
      h("rect", { x: "7.6", y: "7.4", width: "2.5", height: "2.3", fill: c[5] }),
      h("rect", { x: "10.75", y: "7.4", width: "2.5", height: "2.3", fill: c[2] }),
      h("rect", { x: "13.9", y: "7.4", width: "2.5", height: "2.3", fill: c[3] }),
      h("rect", { x: "7.6", y: "10.8", width: "2.5", height: "2.3", fill: c[4] }),
      h("rect", { x: "10.75", y: "10.8", width: "2.5", height: "2.3", fill: c[5] }),
      h("rect", { x: "13.9", y: "10.8", width: "2.5", height: "2.3", fill: c[2] }),
      h("rect", { x: "7.6", y: "14.2", width: "2.5", height: "2.3", fill: c[3] }),
      h("rect", { x: "13.9", y: "14.2", width: "2.5", height: "2.3", fill: c[4] }),
      h("rect", { x: "9.3", y: "16.6", width: "5.4", height: "1", fill: c[7] }),
      h("rect", { x: "10.1", y: "17.6", width: "3.8", height: "4", fill: c[6] })
    ]);
  }

  function workplace(place) {
    return /\b(office|building|bldg|suite|plaza|tower|center|centre|floor|capitol|headquarters|company|business|store|shop|bureau|agency|department|inc|llc|corp)\b|\bste\.?\b/i.test(place || "");
  }

  function gov() {
    var c = ["#d7eef8", "#243e6b", "#8a4e1a", "#f7f4ee", "#0e5f96", "#9ec0e8", "#e2b48a", "#bf0a30"];
    return mark([
      h("circle", { cx: "12", cy: "12", r: "10.5", fill: c[0] }),
      h("rect", { x: "2", y: "17.2", width: "20", height: "4", rx: "1", fill: c[1] }),
      h("rect", { x: "4.5", y: "15.6", width: "15", height: "2", fill: c[2] }),
      h("rect", { x: "6", y: "10", width: "2.1", height: "6", fill: c[3] }),
      h("rect", { x: "10.9", y: "10", width: "2.2", height: "6", fill: c[3] }),
      h("rect", { x: "15.8", y: "10", width: "2.1", height: "6", fill: c[3] }),
      h("ellipse", { cx: "12", cy: "10.2", rx: "5.2", ry: "4", fill: c[4] }),
      h("ellipse", { cx: "10.4", cy: "9.2", rx: "2", ry: "1.3", fill: c[5] }),
      h("rect", { x: "11", y: "4.2", width: "2", height: "2.8", fill: c[6] }),
      h("polygon", { points: "13,4.2 17.2,5.2 13,6.4", fill: c[7] })
    ]);
  }

  function campaign() {
    var c = ["#6a3478", "#e2b4e6", "#f7f4ee", "#8a4e1a", "#0e5f96", "#8d3048", "#e2b48a"];
    return mark([
      h("polygon", { points: "2,9 13,5.5 13,16.5 2,13", fill: c[0] }),
      h("polygon", { points: "13,4.2 22,2.2 22,19.8 13,17.8", fill: c[1] }),
      h("polygon", { points: "15.2,6.4 20,5 20,17 15.2,15.6", fill: c[2] }),
      h("rect", { x: "5.2", y: "13", width: "2.6", height: "7", rx: "1", fill: c[3] }),
      h("path", { d: "M20.6 7.2 Q23 11 20.6 14.8", fill: "none", stroke: c[4], "stroke-width": "1.4", "stroke-linecap": "round" }),
      h("path", { d: "M18.8 8.4 Q20.4 11 18.8 13.6", fill: "none", stroke: c[5], "stroke-width": "1.3", "stroke-linecap": "round" }),
      h("polygon", { points: "7,9.2 7.7,10.6 9.2,10.8 8.1,11.8 8.4,13.3 7,12.5 5.6,13.3 5.9,11.8 4.8,10.8 6.3,10.6", fill: c[6] })
    ]);
  }

  function form() {
    var c = ["#f7f4ee", "#9ec0e8", "#0e5f96", "#0c5c64", "#243e6b", "#8d3232", "#e2b48a", "#6a3478"];
    return mark([
      h("rect", { x: "3.5", y: "3", width: "14", height: "18", rx: "1.4", fill: c[0] }),
      h("polygon", { points: "13,3 17.5,7.4 13,7.4", fill: c[1] }),
      h("rect", { x: "6", y: "9.2", width: "8", height: "1.3", rx: "0.4", fill: c[2] }),
      h("rect", { x: "6", y: "12.2", width: "8", height: "1.3", rx: "0.4", fill: c[3] }),
      h("rect", { x: "6", y: "15.2", width: "5", height: "1.3", rx: "0.4", fill: c[4] }),
      h("rect", { x: "8", y: "1.6", width: "5", height: "2.2", rx: "0.6", fill: c[7] }),
      h("g", { transform: "rotate(-38 16 16)" }, [
        h("rect", { x: "13", y: "14.2", width: "8", height: "2", rx: "0.4", fill: c[5] }),
        h("polygon", { points: "21,14.2 23,15.2 21,16.2", fill: c[6] })
      ])
    ]);
  }

  function x() {
    var c = ["#1c2430", "#f4f7fb", "#8fd0d6", "#e2b48a", "#f0b4c2", "#9ec0e8", "#cbbdf5"];
    var made = clip([h("rect", { x: "1", y: "1", width: "22", height: "22", rx: "6" })]);
    var id = made[1];
    return mark([
      made[0],
      h("rect", { x: "1", y: "1", width: "22", height: "22", rx: "6", fill: c[0] }),
      h("g", { "clip-path": "url(#" + id + ")" }, [
        h("g", { transform: "rotate(45 12 12)" }, [
          h("rect", { x: "2", y: "10", width: "6.4", height: "4", rx: "0.6", fill: c[1] }),
          h("rect", { x: "8.8", y: "10", width: "6.4", height: "4", rx: "0.6", fill: c[2] }),
          h("rect", { x: "15.6", y: "10", width: "6.4", height: "4", rx: "0.6", fill: c[3] })
        ]),
        h("g", { transform: "rotate(-45 12 12)" }, [
          h("rect", { x: "2", y: "10", width: "6.4", height: "4", rx: "0.6", fill: c[4] }),
          h("rect", { x: "8.8", y: "10", width: "6.4", height: "4", rx: "0.6", fill: c[5] }),
          h("rect", { x: "15.6", y: "10", width: "6.4", height: "4", rx: "0.6", fill: c[6] })
        ])
      ])
    ]);
  }

  function facebook() {
    var c = ["#163e78", "#f7f4ee", "#8fd0d6", "#e2b48a", "#f0b4c2", "#9ec0e8", "#cbbdf5"];
    var made = clip([
      h("rect", { x: "7", y: "3", width: "3.4", height: "18", rx: "0.4" }),
      h("rect", { x: "7", y: "3", width: "10", height: "3.4", rx: "0.4" }),
      h("rect", { x: "7", y: "10.2", width: "8", height: "3.2", rx: "0.4" })
    ]);
    var id = made[1];
    return mark([
      made[0],
      h("rect", { x: "1", y: "1", width: "22", height: "22", rx: "6", fill: c[0] }),
      h("g", { "clip-path": "url(#" + id + ")" }, [
        h("rect", { x: "6", y: "3", width: "12", height: "3", fill: c[1] }),
        h("rect", { x: "6", y: "6", width: "12", height: "3", fill: c[2] }),
        h("rect", { x: "6", y: "9", width: "12", height: "3", fill: c[3] }),
        h("rect", { x: "6", y: "12", width: "12", height: "3", fill: c[4] }),
        h("rect", { x: "6", y: "15", width: "12", height: "3", fill: c[5] }),
        h("rect", { x: "6", y: "18", width: "12", height: "3", fill: c[6] })
      ])
    ]);
  }

  function instagram() {
    var c = ["#7b2fbe", "#c13584", "#e1306c", "#f77737", "#f5c518", "#f7f4ee", "#1c2430", "#6ec8f5"];
    var made = clip([h("rect", { x: "2", y: "2", width: "20", height: "20", rx: "6" })]);
    var id = made[1];
    return mark([
      made[0],
      h("g", { "clip-path": "url(#" + id + ")" }, [
        h("rect", { x: "2", y: "2", width: "4", height: "20", fill: c[0] }),
        h("rect", { x: "6", y: "2", width: "3.6", height: "20", fill: c[1] }),
        h("rect", { x: "9.6", y: "2", width: "3.6", height: "20", fill: c[2] }),
        h("rect", { x: "13.2", y: "2", width: "3.6", height: "20", fill: c[3] }),
        h("rect", { x: "16.8", y: "2", width: "3.6", height: "20", fill: c[4] }),
        h("rect", { x: "20.4", y: "2", width: "1.6", height: "20", fill: c[5] })
      ]),
      h("circle", { cx: "12", cy: "12", r: "4.3", fill: c[5] }),
      h("circle", { cx: "12", cy: "12", r: "2.2", fill: c[6] }),
      h("circle", { cx: "17.3", cy: "6.7", r: "1", fill: c[7] })
    ]);
  }

  function youtube() {
    var c = ["#c4302b", "#1c1915", "#f7f4ee", "#f5c518", "#6ec8f5", "#9dcaa8", "#e2b4e6", "#8a4e1a"];
    return mark([
      h("rect", { x: "1.5", y: "4", width: "21", height: "13", rx: "3", fill: c[0] }),
      h("rect", { x: "3.2", y: "5.6", width: "17.6", height: "8.4", rx: "1", fill: c[1] }),
      h("polygon", { points: "10,7.4 10,12.4 15.2,9.9", fill: c[2] }),
      h("rect", { x: "1.5", y: "17.4", width: "21", height: "3.4", rx: "1", fill: c[7] }),
      h("circle", { cx: "5", cy: "19.1", r: "0.85", fill: c[3] }),
      h("circle", { cx: "9", cy: "19.1", r: "0.85", fill: c[4] }),
      h("circle", { cx: "13", cy: "19.1", r: "0.85", fill: c[5] }),
      h("circle", { cx: "17", cy: "19.1", r: "0.85", fill: c[6] })
    ]);
  }

  function bluesky() {
    var c = ["#6ec8f5", "#9ec0e8", "#cbbdf5", "#8fd0d6", "#1e4d7b", "#f7f4ee", "#f0b4c2", "#e2b48a"];
    return mark([
      h("ellipse", { cx: "8", cy: "9", rx: "4.6", ry: "3.1", transform: "rotate(-28 8 9)", fill: c[0] }),
      h("ellipse", { cx: "16", cy: "9", rx: "4.6", ry: "3.1", transform: "rotate(28 16 9)", fill: c[1] }),
      h("ellipse", { cx: "8.2", cy: "15", rx: "3.6", ry: "2.5", transform: "rotate(24 8.2 15)", fill: c[2] }),
      h("ellipse", { cx: "15.8", cy: "15", rx: "3.6", ry: "2.5", transform: "rotate(-24 15.8 15)", fill: c[3] }),
      h("ellipse", { cx: "12", cy: "12.2", rx: "1.25", ry: "4.2", fill: c[4] }),
      h("circle", { cx: "7.6", cy: "8.6", r: "0.9", fill: c[5] }),
      h("circle", { cx: "16.4", cy: "8.6", r: "0.9", fill: c[6] }),
      h("path", { d: "M10.6 7.2 Q8.2 3.6 6.8 4.4", fill: "none", stroke: c[7], "stroke-width": "1.1", "stroke-linecap": "round" }),
      h("path", { d: "M13.4 7.2 Q15.8 3.6 17.2 4.4", fill: "none", stroke: c[7], "stroke-width": "1.1", "stroke-linecap": "round" })
    ]);
  }

  function mastodon() {
    var c = ["#9ec0e8", "#c4844a", "#e2b48a", "#5c3a16", "#1c1915", "#f7f4ee", "#f4f0e6", "#f0b4c2", "#6a3478"];
    return mark([
      h("circle", { cx: "12", cy: "12", r: "10.5", fill: c[0] }),
      h("circle", { cx: "6.2", cy: "8", r: "2.3", fill: c[2] }),
      h("circle", { cx: "12", cy: "12", r: "6.2", fill: c[1] }),
      h("ellipse", { cx: "12", cy: "8.2", rx: "4.2", ry: "2.4", fill: c[3] }),
      h("circle", { cx: "9.6", cy: "11.4", r: "0.8", fill: c[4] }),
      h("circle", { cx: "9.3", cy: "11.1", r: "0.28", fill: c[5] }),
      h("polygon", { points: "7.2,14 5,19 8.2,16.2", fill: c[6] }),
      h("polygon", { points: "11,14.4 10.2,19.2 13,16", fill: c[6] }),
      h("path", { d: "M13.5 14 Q17 16 15.5 19.5", fill: "none", stroke: c[8], "stroke-width": "1.6", "stroke-linecap": "round" }),
      h("circle", { cx: "14.2", cy: "13.2", r: "0.9", fill: c[7] })
    ]);
  }

  function truth() {
    var c = ["#f0b4c2", "#e25822", "#f5c518", "#f7f4ee", "#1e4d7b", "#243e6b", "#8fd0d6"];
    return mark([
      h("circle", { cx: "12", cy: "9", r: "7", fill: c[0] }),
      h("polygon", { points: "12,1.5 8,10 16,10", fill: c[1] }),
      h("polygon", { points: "12,3.4 9.4,10 14.6,10", fill: c[2] }),
      h("polygon", { points: "12,5.4 10.6,10 13.4,10", fill: c[3] }),
      h("path", { d: "M7 11.5 H17 L15.5 14.5 H8.5 Z", fill: c[4] }),
      h("rect", { x: "10.6", y: "14.5", width: "2.8", height: "4", fill: c[5] }),
      h("rect", { x: "8", y: "18.2", width: "8", height: "2.2", rx: "0.6", fill: c[5] }),
      h("circle", { cx: "17.6", cy: "5", r: "1", fill: c[6] })
    ]);
  }

  function site() {
    var c = ["#0e5f96", "#d7eef8", "#246b3a", "#9dcaa8", "#e2b48a", "#f7f4ee", "#cbbdf5"];
    return mark([
      h("circle", { cx: "12", cy: "12", r: "9.5", fill: c[0] }),
      h("ellipse", { cx: "8", cy: "10", rx: "2.4", ry: "3.2", fill: c[2] }),
      h("ellipse", { cx: "14.5", cy: "8.5", rx: "3", ry: "2", fill: c[3] }),
      h("ellipse", { cx: "15", cy: "15", rx: "3.2", ry: "2.2", fill: c[4] }),
      h("ellipse", { cx: "8.5", cy: "8", rx: "1.6", ry: "1", fill: c[1] }),
      h("path", { d: "M12 3.2 V20.8", fill: "none", stroke: c[5], "stroke-width": "1" }),
      h("path", { d: "M3.4 12 H20.6", fill: "none", stroke: c[6], "stroke-width": "1" }),
      h("path", { d: "M5 7.5 H19", fill: "none", stroke: c[5], "stroke-width": "0.8" }),
      h("path", { d: "M5 16.5 H19", fill: "none", stroke: c[5], "stroke-width": "0.8" })
    ]);
  }

  var draw = {
    phone: phone,
    house: house,
    office: office,
    gov: gov,
    campaign: campaign,
    form: form,
    x: x,
    facebook: facebook,
    instagram: instagram,
    youtube: youtube,
    mastodon: mastodon,
    bluesky: bluesky,
    truth: truth,
    site: site
  };

  window.leadersMark = function (name, place) {
    if ((name === "office" || name === "house") && place) name = workplace(place) ? "office" : "house";
    var fn = draw[name] || draw.site;
    return fn();
  };
})();
