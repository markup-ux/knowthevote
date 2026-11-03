var LIVE_EVERY = 15000;

function leadersLive(path) {
  var remote = "https://raw.githubusercontent.com/markup-ux/knowthevote/results/" + path + "?t=" + Date.now();
  return fetch(remote, {cache: "no-store"}).then(function (response) {
    if (!response.ok) throw new Error("live");
    return response.json();
  }).catch(function () {
    return fetch(path + "?t=" + Date.now(), {cache: "no-store"}).then(function (response) {
      if (!response.ok) throw new Error("local");
      return response.json();
    });
  });
}
