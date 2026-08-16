(function () {
  const params = new URLSearchParams(location.search);
  const id = params.get("id") || (location.hash || "").replace(/^#/, "");

  const enEl = document.getElementById("song-en");
  const thEl = document.getElementById("song-th");
  const tagsEl = document.getElementById("song-tags");
  const bodyEl = document.getElementById("lyric-body");
  const emptyEl = document.getElementById("empty");
  const sheetEl = document.getElementById("lyric-sheet");
  const btnListen = document.getElementById("btn-listen");
  const btnYt = document.getElementById("btn-yt");
  const sourceNote = document.getElementById("source-note");
  const kicker = document.getElementById("song-kicker");

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderSong(song) {
    const en = song.title_en || song.title_jp || song.title_core || song.title;
    const th = song.title_thai || song.title_th || "";
    document.title = en + " — Cafe' Siam EN×TH";
    enEl.textContent = en;
    thEl.textContent = th;
    kicker.textContent = (song.difficulty || "song") + " · lyric sheet";

    tagsEl.innerHTML = "";
    if (song.difficulty) {
      tagsEl.innerHTML += '<span class="tag">' + esc(song.difficulty) + "</span>";
    }
    (song.categories || []).forEach(function (c) {
      tagsEl.innerHTML += '<span class="tag">' + esc(c.label) + "</span>";
    });
    if (song.has_romanization) {
      tagsEl.innerHTML += '<span class="tag tag--ok">romanized Thai</span>';
    }

    btnListen.href = "listen.html?id=" + encodeURIComponent(song.id);
    btnYt.href = song.url || "https://www.youtube.com/watch?v=" + song.id;

    sourceNote.textContent = song.lyrics_source
      ? "Lyrics source: " + song.lyrics_source
      : "";

    const lines = song.lines || [];
    if (!lines.length) {
      sheetEl.hidden = true;
      emptyEl.hidden = false;
      return;
    }
    sheetEl.hidden = false;
    emptyEl.hidden = true;

    let html = "";
    let delay = 0;
    lines.forEach(function (row) {
      if (row.type === "section") {
        html +=
          '<p class="lyric-section">' + esc(row.label) + "</p>";
        return;
      }
      if (row.type !== "line") return;
      delay += 1;
      html +=
        '<div class="lyric-line" style="animation-delay:' +
        Math.min(delay * 0.03, 0.6) +
        's">';
      if (row.voice) {
        html +=
          '<span class="lyric-line__voice">' + esc(row.voice) + "</span>";
      }
      if (row.en) {
        html += '<div class="lyric-line__en">' + esc(row.en) + "</div>";
      }
      if (row.thai) {
        html += '<div class="lyric-line__thai">' + esc(row.thai) + "</div>";
      }
      if (row.roman) {
        html +=
          '<div class="lyric-line__roman">' + esc(row.roman) + "</div>";
      }
      html += "</div>";
    });
    bodyEl.innerHTML = html;
  }

  fetch("data/songs.json")
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      const songs = data.songs || [];
      const song = songs.find(function (s) {
        return s.id === id;
      });
      if (!song) {
        enEl.textContent = "Song not found";
        sheetEl.hidden = true;
        emptyEl.hidden = false;
        emptyEl.textContent = "Open a song from Browse.";
        return;
      }
      renderSong(song);
    })
    .catch(function (err) {
      emptyEl.hidden = false;
      emptyEl.textContent = "Could not load song.";
      console.error(err);
    });
})();
