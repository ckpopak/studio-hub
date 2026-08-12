(function () {
  const listEl = document.getElementById("song-list");
  const countEl = document.getElementById("song-count");
  const searchEl = document.getElementById("song-search");
  const emptyEl = document.getElementById("song-empty");

  function formatDate(yyyymmdd) {
    if (!yyyymmdd || String(yyyymmdd).length !== 8) return "";
    const s = String(yyyymmdd);
    return s.slice(0, 4) + "." + s.slice(4, 6) + "." + s.slice(6, 8);
  }

  function formatDuration(sec) {
    const n = Number(sec) || 0;
    const m = Math.floor(n / 60);
    const r = n % 60;
    return m + ":" + String(r).padStart(2, "0");
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatLyrics(text) {
    return escapeHtml(text).replace(
      /^(\[[^\]]+\])/gm,
      '<span class="tag">$1</span>'
    );
  }

  function matchesQuery(song, q) {
    if (!q) return true;
    const hay = [
      song.title,
      song.title_jp,
      song.title_th,
      song.lyrics,
      song.id,
    ]
      .join("\n")
      .toLowerCase();
    return hay.includes(q);
  }

  function render(songs) {
    listEl.innerHTML = "";
    if (!songs.length) {
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;

    const frag = document.createDocumentFragment();
    songs.forEach(function (song, i) {
      const li = document.createElement("li");
      li.className = "song-item";
      li.dataset.id = song.id;

      const idx = String(i + 1).padStart(3, "0");
      const jp = escapeHtml(song.title_jp || song.title_core || song.title);
      const th = escapeHtml(song.title_th || "");
      const meta =
        formatDate(song.upload_date) +
        (song.duration_sec ? " · " + formatDuration(song.duration_sec) : "");

      li.innerHTML =
        '<button type="button" class="song-item__btn" aria-expanded="false">' +
        '<span class="song-item__idx">' +
        idx +
        "</span>" +
        '<span class="song-item__titles">' +
        '<p class="song-item__jp">' +
        jp +
        "</p>" +
        (th ? '<p class="song-item__th">' + th + "</p>" : "") +
        "</span>" +
        '<span class="song-item__meta">' +
        escapeHtml(meta) +
        "</span>" +
        "</button>" +
        '<div class="song-panel" hidden>' +
        '<div class="song-panel__actions">' +
        '<a href="' +
        escapeHtml(song.url) +
        '" target="_blank" rel="noopener noreferrer">Watch on YouTube</a>' +
        "</div>" +
        (song.lyrics
          ? '<pre class="lyrics">' + formatLyrics(song.lyrics) + "</pre>"
          : '<p class="empty">No lyrics block in catalog for this upload.</p>') +
        "</div>";

      const btn = li.querySelector(".song-item__btn");
      const panel = li.querySelector(".song-panel");
      btn.addEventListener("click", function () {
        const open = li.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        panel.hidden = !open;
        if (open) {
          history.replaceState(null, "", "#" + song.id);
        }
      });

      frag.appendChild(li);
    });
    listEl.appendChild(frag);

    const hash = (location.hash || "").replace(/^#/, "");
    if (hash) {
      const target = listEl.querySelector('[data-id="' + CSS.escape(hash) + '"]');
      if (target) {
        target.querySelector(".song-item__btn").click();
        target.scrollIntoView({ block: "center" });
      }
    }
  }

  let allSongs = [];

  fetch("data/songs.json")
    .then(function (res) {
      if (!res.ok) throw new Error("Failed to load songs.json");
      return res.json();
    })
    .then(function (data) {
      allSongs = data.songs || [];
      if (countEl) {
        countEl.textContent = String(data.count || allSongs.length);
      }
      render(allSongs);
    })
    .catch(function (err) {
      emptyEl.hidden = false;
      emptyEl.textContent = "Could not load song catalog.";
      console.error(err);
    });

  if (searchEl) {
    searchEl.addEventListener("input", function () {
      const q = searchEl.value.trim().toLowerCase();
      render(allSongs.filter(function (s) {
        return matchesQuery(s, q);
      }));
    });
  }
})();
