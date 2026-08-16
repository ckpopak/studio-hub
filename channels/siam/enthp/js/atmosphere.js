(function () {
  var visualsEl = document.getElementById("visuals");
  var gate = document.getElementById("gate");
  var btnBegin = document.getElementById("btn-begin");
  var btnToggle = document.getElementById("btn-toggle");
  var btnNext = document.getElementById("btn-next");
  var btnPrev = document.getElementById("btn-prev");
  var btnShuffle = document.getElementById("btn-shuffle");
  var songSelect = document.getElementById("song-select");
  var worldTitle = document.getElementById("world-title");
  var trackKicker = document.getElementById("track-kicker");
  var trackJp = document.getElementById("track-jp");
  var trackTh = document.getElementById("track-th");
  var lyricsBody = document.getElementById("lyrics-body");
  var progressBar = document.getElementById("progress-bar");
  var timeLabel = document.getElementById("time-label");
  var playerShell = document.getElementById("player-shell");

  var songs = [];
  var order = [];
  var orderPos = 0;
  var current = null;
  var player = null;
  var started = false;
  var shuffleOn = true;
  var tickTimer = null;
  var visualTimer = null;
  var fitTimer = null;
  var visualNodes = [];
  var visualIndex = 0;
  var advancing = false;

  function qsId() {
    var m = /[?&]id=([^&]+)/.exec(window.location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function formatTime(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ":" + String(s).padStart(2, "0");
  }

  function formatDate(yyyymmdd) {
    if (!yyyymmdd || String(yyyymmdd).length !== 8) return "";
    var s = String(yyyymmdd);
    return s.slice(0, 4) + "." + s.slice(4, 6) + "." + s.slice(6, 8);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function rebuildOrder(preferId) {
    var ids = songs.map(function (s) {
      return s.id;
    });
    order = shuffleOn ? shuffle(ids) : ids.slice();
    orderPos = 0;
    if (preferId) {
      var idx = order.indexOf(preferId);
      if (idx >= 0) orderPos = idx;
    }
  }

  function songById(id) {
    return songs.find(function (s) {
      return s.id === id;
    });
  }

  function keepLyricTag(label) {
    var lower = String(label || "").toLowerCase().trim();
    if (/^(intro|outro|verse|chorus|bridge|pre-?chorus|final)/.test(lower)) {
      return true;
    }
    if (/^(female|male)/.test(lower)) return true;
    if (/male\s*&\s*female/.test(lower)) return true;
    return false;
  }

  function tagKind(label) {
    var lower = String(label || "").toLowerCase();
    if (/female|male/.test(lower)) return "voice";
    if (/chorus|final/.test(lower)) return "chorus";
    if (/verse/.test(lower)) return "verse";
    if (/bridge/.test(lower)) return "bridge";
    return "section";
  }

  function formatLyricLine(line) {
    // Highlight Thai (romanization) so JP — TH (roman) reads clearly.
    return escapeHtml(line).replace(
      /([\u0E00-\u0E7F]+(?:\s+[\u0E00-\u0E7F]+)*)\s*\(([^)]+)\)/g,
      function (_m, th, roman) {
        return (
          th +
          ' <span class="atm-lyric-roman">(' +
          roman +
          ")</span>"
        );
      }
    );
  }

  function renderStructuredLyrics(rows) {
    var html = [];
    (rows || []).forEach(function (row) {
      if (row.type === "section") {
        html.push(
          '<p class="lyric-section">' + escapeHtml(row.label || "") + "</p>"
        );
        return;
      }
      if (row.type !== "line") return;
      html.push('<div class="lyric-line">');
      if (row.voice) {
        html.push(
          '<span class="lyric-line__voice">' +
            escapeHtml(row.voice) +
            "</span>"
        );
      }
      if (row.en) {
        html.push(
          '<div class="lyric-line__en">' + escapeHtml(row.en) + "</div>"
        );
      }
      if (row.thai) {
        html.push(
          '<div class="lyric-line__thai">' + escapeHtml(row.thai) + "</div>"
        );
      }
      if (row.roman) {
        html.push(
          '<div class="lyric-line__roman">' + escapeHtml(row.roman) + "</div>"
        );
      }
      html.push("</div>");
    });
    lyricsBody.innerHTML =
      html.join("") || '<span class="atm-lyric-line">—</span>';
    scheduleFitLyrics();
  }

  function renderFullLyrics(lyrics) {
    var lines = String(lyrics || "").split(/\r?\n/);
    var html = [];
    var lastWasGap = true;

    lines.forEach(function (raw) {
      var line = raw.trim();
      if (!line) {
        if (!lastWasGap && html.length) {
          html.push('<span class="atm-lyric-gap"></span>');
          lastWasGap = true;
        }
        return;
      }
      if (/^#/.test(line)) return;

      var tag = line.match(/^\[([^\]]+)\]$/);
      if (tag) {
        if (!keepLyricTag(tag[1])) return;
        var kind = tagKind(tag[1]);
        html.push(
          '<span class="atm-lyric-tag atm-lyric-tag--' +
            kind +
            '">' +
            escapeHtml(tag[1].replace(/\s*—.*$/, "").trim()) +
            "</span>"
        );
        lastWasGap = false;
        return;
      }

      html.push(
        '<span class="atm-lyric-line">' + formatLyricLine(line) + "</span>"
      );
      lastWasGap = false;
    });

    lyricsBody.innerHTML =
      html.join("") || '<span class="atm-lyric-line">—</span>';
    scheduleFitLyrics();
  }

  function fitLyricsToBox() {
    if (!lyricsBody) return;
    // Prefer readable type; sheet scrolls when the song is long.
    var min = 13;
    var max = 18;
    var size = max;
    lyricsBody.style.fontSize = size + "px";
    while (size > min && lyricsBody.scrollHeight > lyricsBody.clientHeight + 1) {
      size -= 0.5;
      lyricsBody.style.fontSize = size + "px";
    }
  }

  function scheduleFitLyrics() {
    window.clearTimeout(fitTimer);
    fitTimer = window.setTimeout(fitLyricsToBox, 30);
  }

  function buildVisuals() {
    visualsEl.innerHTML = "";
    visualNodes = [];
    ["a", "b", "c"].forEach(function (kind, i) {
      var node = document.createElement("div");
      node.className = "stage__visual stage__visual--" + kind;
      visualsEl.appendChild(node);
      visualNodes.push(node);
      if (i === 0) {
        node.classList.add("is-on");
        visualIndex = 0;
      }
    });
  }

  function setVisual(i) {
    if (!visualNodes.length) return;
    i = ((i % visualNodes.length) + visualNodes.length) % visualNodes.length;
    if (i === visualIndex) return;
    visualNodes.forEach(function (n, idx) {
      n.classList.toggle("is-on", idx === i);
    });
    visualIndex = i;
  }

  function fillSelect() {
    songSelect.innerHTML = songs
      .map(function (song) {
        var label = (
          song.title_en ||
          song.title_jp ||
          song.title_core ||
          song.title
        ).slice(0, 28);
        return (
          '<option value="' +
          escapeHtml(song.id) +
          '">' +
          escapeHtml(label) +
          "</option>"
        );
      })
      .join("");
  }

  function showSong(song) {
    current = song;
    var n = songs.indexOf(song) + 1;
    trackKicker.textContent =
      "Song " +
      String(n).padStart(3, "0") +
      " / " +
      String(songs.length).padStart(3, "0") +
      (song.upload_date ? " · " + formatDate(song.upload_date) : "");
    trackJp.textContent =
      song.title_en || song.title_jp || song.title_core || song.title;
    trackTh.textContent = song.title_thai || song.title_th || "";
    worldTitle.textContent = song.title_en || song.title_jp || "EN × TH";
    document.title =
      (song.title_en || song.title_jp || "Cafe' Siam") +
      " · Listen · Cafe' Siam EN × TH";
    songSelect.value = song.id;
    var openSheet = document.getElementById("open-sheet");
    if (openSheet) {
      openSheet.href = "song.html?id=" + encodeURIComponent(song.id);
    }
    if (song.lines && song.lines.length) {
      renderStructuredLyrics(song.lines);
    } else {
      renderFullLyrics(song.lyrics);
    }
    setVisual(visualIndex + 1);
    if (history.replaceState) {
      history.replaceState(null, "", "?id=" + encodeURIComponent(song.id));
    }
  }

  function updateProgress() {
    if (!player || typeof player.getCurrentTime !== "function") return;
    try {
      var t = player.getCurrentTime() || 0;
      var d = (player.getDuration && player.getDuration()) || current.duration_sec || 1;
      var p = d ? Math.min(1, t / d) : 0;
      progressBar.style.width = (p * 100).toFixed(2) + "%";
      timeLabel.textContent = formatTime(t) + " / " + formatTime(d);
    } catch (e) {}
  }

  function loadSong(song, autoplay) {
    if (!song) return;
    showSong(song);
    advancing = false;

    if (!player) {
      player = new YT.Player("yt-player", {
        host: "https://www.youtube-nocookie.com",
        videoId: song.id,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          autoplay: autoplay ? 1 : 0,
        },
        events: {
          onReady: function () {
            if (autoplay) player.playVideo();
            if (!tickTimer) tickTimer = window.setInterval(updateProgress, 400);
            scheduleFitLyrics();
          },
          onStateChange: function (ev) {
            if (ev.data === YT.PlayerState.PLAYING) {
              btnToggle.textContent = "Pause";
            } else if (ev.data === YT.PlayerState.PAUSED) {
              btnToggle.textContent = "Play";
            } else if (ev.data === YT.PlayerState.ENDED) {
              btnToggle.textContent = "Next";
              advance(1, true);
            }
          },
          onError: function () {
            advance(1, true);
          },
        },
      });
    } else {
      player.loadVideoById({ videoId: song.id, startSeconds: 0 });
      if (autoplay) player.playVideo();
    }
  }

  function songAtOrder(pos) {
    return songById(order[pos]);
  }

  function syncOrderPosToCurrent() {
    if (!current) return;
    var idx = order.indexOf(current.id);
    if (idx >= 0) orderPos = idx;
  }

  function advance(delta, auto) {
    if (advancing) return;
    if (!order.length) return;
    advancing = true;
    syncOrderPosToCurrent();
    orderPos = (orderPos + delta + order.length) % order.length;
    var next = songAtOrder(orderPos);
    window.setTimeout(
      function () {
        loadSong(next, started || auto);
        advancing = false;
      },
      auto ? 900 : 0
    );
  }

  function begin() {
    if (started) return;
    started = true;
    gate.classList.add("is-gone");
    window.setTimeout(function () {
      gate.hidden = true;
    }, 850);
    playerShell.classList.add("is-focus");
    window.setTimeout(function () {
      playerShell.classList.remove("is-focus");
    }, 2600);
    if (player && player.playVideo) player.playVideo();
    else if (current) loadSong(current, true);
  }

  function bootPlayerApi(cb) {
    if (window.YT && window.YT.Player) {
      cb();
      return;
    }
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof prev === "function") prev();
      cb();
    };
    var tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  }

  btnBegin.addEventListener("click", begin);
  btnToggle.addEventListener("click", function () {
    if (!started) return begin();
    if (!player) return;
    if (player.getPlayerState() === YT.PlayerState.PLAYING) player.pauseVideo();
    else if (player.getPlayerState() === YT.PlayerState.ENDED) advance(1, true);
    else player.playVideo();
  });
  btnNext.addEventListener("click", function () {
    advance(1, started);
  });
  btnPrev.addEventListener("click", function () {
    advance(-1, started);
  });
  btnShuffle.addEventListener("click", function () {
    shuffleOn = !shuffleOn;
    btnShuffle.setAttribute("aria-pressed", shuffleOn ? "true" : "false");
    btnShuffle.textContent = shuffleOn ? "Shuffle on" : "Shuffle off";
    rebuildOrder(current && current.id);
  });
  songSelect.addEventListener("change", function () {
    var song = songById(songSelect.value);
    if (!song) return;
    rebuildOrder(song.id);
    loadSong(song, started);
  });

  window.addEventListener("resize", scheduleFitLyrics);

  visualTimer = window.setInterval(function () {
    if (
      visualNodes.length > 1 &&
      (!player ||
        !player.getPlayerState ||
        player.getPlayerState() !== YT.PlayerState.PLAYING)
    ) {
      setVisual(visualIndex + 1);
    }
  }, 10000);

  buildVisuals();

  fetch("data/songs.json")
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      songs = (data.songs || []).filter(function (s) {
        return s && s.id && s.has_lyrics;
      });
      if (!songs.length) {
        songs = (data.songs || []).filter(function (s) {
          return s && s.id;
        });
      }
      if (!songs.length) throw new Error("No songs");
      fillSelect();
      var want = qsId();
      var start =
        songById(want) ||
        songs[Math.floor(Math.random() * Math.min(12, songs.length))] ||
        songs[0];
      rebuildOrder(start.id);
      bootPlayerApi(function () {
        loadSong(start, false);
      });
    })
    .catch(function (err) {
      console.error(err);
      trackJp.textContent = "Could not load songs";
    });
})();
