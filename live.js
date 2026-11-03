var LIVE_EVERY = 15000;
var LIVE_LAG = 20000;
var LIVE_LOOKBACK = 12;

function leadersLive(path) {
  var step = 15;
  var start = Math.floor((Date.now() - LIVE_LAG) / 1000 / step) * step;
  var urls = [];
  var i;
  for (i = 0; i < LIVE_LOOKBACK; i++) {
    urls.push("https://raw.githubusercontent.com/markup-ux/knowthevote/t" + (start - i * step) + "/" + path);
  }
  urls.push("https://raw.githubusercontent.com/markup-ux/knowthevote/results/" + path);
  urls.push(path);

  function attempt(index) {
    if (index >= urls.length) return Promise.reject(new Error("live"));
    var url = urls[index];
    var local = url.indexOf("https://") !== 0;
    return fetch(local ? url + "?t=" + Date.now() : url, {cache: "no-store"}).then(function (response) {
      if (!response.ok) throw new Error("miss");
      return response.json();
    }).catch(function () {
      return attempt(index + 1);
    });
  }
  return attempt(0);
}
