(function () {
  const grid = document.getElementById("song-grid");
  const empty = document.getElementById("empty");
  const countEl = document.getElementById("result-count");
  const qEl = document.getElementById("q");
  const diffChips = document.getElementById("diff-chips");
  const catChips = document.getElementById("cat-chips");
  const lyrChips = document.getElementById("lyr-chips");
  const clearBtn = document.getElementById("clear-filters");

  const state = {
    q: "",
    difficulty: "all",
    category: "all",
    lyrics: "with-lyrics",
  };

  let allSongs = [];
  let taxonomy = null;

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function chip(id, label, group, current) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip" + (current === id ? " is-on" : "");
    btn.textContent = label;
    btn.dataset.id = id;
    btn.addEventListener("click", function () {
      state[group] = id;
      renderChips();
      render();
    });
    return btn;
  }

  function renderChips() {
    diffChips.innerHTML = "";
    catChips.innerHTML = "";
    lyrChips.innerHTML = "";

    diffChips.appendChild(chip("all", "All depths", "difficulty", state.difficulty));
    (taxonomy.facets.difficulty || []).forEach(function (f) {
      diffChips.appendChild(chip(f.id, f.label, "difficulty", state.difficulty));
    });

    catChips.appendChild(chip("all", "All topics", "category", state.category));
    (taxonomy.facets.category || []).forEach(function (f) {
      catChips.appendChild(chip(f.id, f.label, "category", state.category));
    });

    lyrChips.appendChild(chip("all", "All songs", "lyrics", state.lyrics));
    (taxonomy.facets.lyrics || []).forEach(function (f) {
      lyrChips.appendChild(chip(f.id, f.label, "lyrics", state.lyrics));
    });
  }

  function matches(song) {
    if (state.difficulty !== "all" && song.difficulty !== state.difficulty) {
      return false;
    }
    if (state.category !== "all") {
      const ids = (song.categories || []).map(function (c) {
        return c.id;
      });
      if (ids.indexOf(state.category) < 0) return false;
    }
    if (state.lyrics === "with-lyrics" && !song.has_lyrics) return false;
    if (state.lyrics === "with-roman" && !song.has_romanization) return false;
    if (state.lyrics === "pending" && song.has_lyrics) return false;

    if (!state.q) return true;
    const hay = [
      song.title,
      song.title_core,
      song.title_en,
      song.title_thai,
      song.title_jp,
      song.title_th,
      song.lyrics,
      JSON.stringify(song.lines || []),
    ]
      .join("\n")
      .toLowerCase();
    return hay.indexOf(state.q) >= 0;
  }

  function render() {
    const list = allSongs.filter(matches);
    countEl.textContent = list.length + " songs";
    grid.innerHTML = "";
    if (!list.length) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    const frag = document.createDocumentFragment();
    list.forEach(function (song, i) {
      const en = song.title_en || song.title_jp || song.title_core || song.title;
      const th = song.title_thai || song.title_th || "";
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "song-card";
      btn.innerHTML =
        '<span class="song-card__idx">' +
        String(i + 1).padStart(3, "0") +
        "</span><span><p class=\"song-card__en\">" +
        esc(en) +
        '</p><p class="song-card__th">' +
        esc(th) +
        '</p><div class="song-card__tags">' +
        (song.difficulty
          ? '<span class="tag">' + esc(song.difficulty) + "</span>"
          : "") +
        (song.categories || [])
          .map(function (c) {
            return '<span class="tag">' + esc(c.label) + "</span>";
          })
          .join("") +
        (song.has_romanization
          ? '<span class="tag tag--ok">romanized</span>'
          : "") +
        (song.has_lyrics ? "" : '<span class="tag">lyrics pending</span>') +
        '</div></span><span class="song-card__go">Open →</span>';
      btn.addEventListener("click", function () {
        location.href = "song.html?id=" + encodeURIComponent(song.id);
      });
      li.appendChild(btn);
      frag.appendChild(li);
    });
    grid.appendChild(frag);
  }

  clearBtn.addEventListener("click", function () {
    state.q = "";
    state.difficulty = "all";
    state.category = "all";
    state.lyrics = "with-lyrics";
    qEl.value = "";
    renderChips();
    render();
  });

  qEl.addEventListener("input", function () {
    state.q = qEl.value.trim().toLowerCase();
    render();
  });

  Promise.all([
    fetch("data/songs.json").then(function (r) {
      return r.json();
    }),
    fetch("data/taxonomy.json").then(function (r) {
      return r.json();
    }),
  ])
    .then(function (pair) {
      allSongs = pair[0].songs || [];
      taxonomy = pair[1];
      renderChips();
      render();
    })
    .catch(function (err) {
      empty.hidden = false;
      empty.textContent = "Could not load catalog.";
      console.error(err);
    });
})();
