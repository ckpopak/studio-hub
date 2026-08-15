(function () {
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  var root = document.getElementById("world-list");
  if (!root) return;

  fetch("data/episodes-index.json")
    .then(function (r) {
      return r.json();
    })
    .then(function (items) {
      var rows = items
        .slice()
        .sort(function (a, b) {
          return b.episode - a.episode;
        })
        .map(function (item) {
          return (
            '<li class="reveal">' +
            '<a href="' +
            escapeHtml(item.href) +
            '">' +
            '<span class="world-ep">Ep ' +
            String(item.episode).padStart(2, "0") +
            "</span>" +
            '<h3 class="world-name serif">' +
            escapeHtml(item.title.en) +
            ' <span class="zh">' +
            escapeHtml(item.title.zh) +
            "</span></h3>" +
            '<span class="world-state">Sleeve · Lyrics · Play</span>' +
            "</a></li>"
          );
        });

      rows.push(
        '<li class="reveal"><a href="worlds/low-tide-signal-room.html">' +
          '<span class="world-ep">Sandbox</span>' +
          '<h3 class="world-name serif">Low Tide Signal Room <span class="zh">退潮信號室</span></h3>' +
          '<span class="world-state">Layout only</span>' +
          "</a></li>"
      );

      root.innerHTML = rows.join("");
      if (window.refreshQuietlyReveal) window.refreshQuietlyReveal();
    })
    .catch(function (err) {
      root.innerHTML =
        '<li class="reveal"><div class="world-row is-quiet">' +
        '<span class="world-ep">Err</span>' +
        '<h3 class="world-name serif">Could not load episode index</h3>' +
        '<span class="world-state">Retry</span></div></li>';
      console.error(err);
    });
})();
