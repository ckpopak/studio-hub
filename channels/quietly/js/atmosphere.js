(function () {
  var visualsEl = document.getElementById("visuals");
  var gate = document.getElementById("gate");
  var btnBegin = document.getElementById("btn-begin");
  var btnToggle = document.getElementById("btn-toggle");
  var btnNext = document.getElementById("btn-next");
  var btnPrev = document.getElementById("btn-prev");
  var btnShuffle = document.getElementById("btn-shuffle");
  var episodeSelect = document.getElementById("episode-select");
  var worldTitle = document.getElementById("world-title");
  var worldSub = document.getElementById("world-sub");
  var trackKicker = document.getElementById("track-kicker");
  var trackTitle = document.getElementById("track-title");
  var trackZh = document.getElementById("track-zh");
  var sceneLine = document.getElementById("scene-line");
  var sceneZh = document.getElementById("scene-zh");
  var lyricsBody = document.getElementById("lyrics-body");
  var progressBar = document.getElementById("progress-bar");
  var timeLabel = document.getElementById("time-label");
  var playerShell = document.getElementById("player-shell");

  var index = [];
  var episode = null;
  var player = null;
  var started = false;
  var visualNodes = [];
  var visualIndex = -1;
  var trackIndex = -1;
  var tickTimer = null;
  var visualTimer = null;
  var fitTimer = null;
  var shuffleOn = false;
  var playHistory = [];
  var SHUFFLE_KEY = "quietly-atmosphere-shuffle";

  try {
    shuffleOn = window.localStorage.getItem(SHUFFLE_KEY) === "1";
  } catch (e) {}

  function setShuffleUi() {
    if (!btnShuffle) return;
    btnShuffle.classList.toggle("is-on", shuffleOn);
    btnShuffle.setAttribute("aria-pressed", shuffleOn ? "true" : "false");
    btnShuffle.textContent = shuffleOn ? "Shuffle on" : "Shuffle";
  }

  function persistShuffle() {
    try {
      window.localStorage.setItem(SHUFFLE_KEY, shuffleOn ? "1" : "0");
    } catch (e) {}
  }

  function rememberWorld(meta) {
    if (!meta) return;
    var last = playHistory[playHistory.length - 1];
    if (last && last.episode === meta.episode) return;
    playHistory.push(meta);
    if (playHistory.length > 40) playHistory.shift();
  }

  function pickRandomWorld(excludeEp) {
    var pool = index.filter(function (x) {
      return x.episode !== excludeEp && x.videoId;
    });
    if (!pool.length) {
      pool = index.filter(function (x) {
        return x.episode !== excludeEp;
      });
    }
    if (!pool.length) return index[0];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function pickNextWorld() {
    if (shuffleOn) return pickRandomWorld(episode && episode.episode);
    return index[(currentIndex() + 1) % index.length];
  }

  function pickPrevWorld() {
    if (playHistory.length > 1) {
      playHistory.pop();
      return playHistory[playHistory.length - 1];
    }
    if (shuffleOn) return pickRandomWorld(episode && episode.episode);
    return index[(currentIndex() - 1 + index.length) % index.length];
  }

  function qsEp() {
    var m = /[?&]ep=(\d+)/.exec(window.location.search);
    return m ? Number(m[1]) : null;
  }

  function formatTime(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ":" + String(s).padStart(2, "0");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function indexFromTime(t) {
    var i = 0;
    var tracks = episode.tracks;
    for (var n = 0; n < tracks.length; n += 1) {
      if (t + 0.35 >= tracks[n].start) i = n;
    }
    return i;
  }

  // Listener-facing lyric page: keep words + poetry; drop instrumental stage directions.
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

      var tag = line.match(/^\[([^\]]+)\]$/);
      if (tag) {
        var label = tag[1];
        var lower = label.toLowerCase();
        if (lower.indexOf("instrumental") === 0) return;
        var kind = "section";
        if (lower.indexOf("poetry") === 0) kind = "poetry";
        else if (lower.indexOf("english") === 0) kind = "english";
        else if (lower.indexOf("bridge") === 0) kind = "bridge";
        else if (lower.indexOf("chorus") === 0 || lower.indexOf("final") === 0) {
          kind = "chorus";
        } else if (lower.indexOf("verse") === 0) {
          kind = "verse";
        }
        html.push(
          '<span class="atm-lyric-tag atm-lyric-tag--' +
            kind +
            '">' +
            escapeHtml(label.replace(/\s*—.*$/, "").trim()) +
            "</span>"
        );
        lastWasGap = false;
        return;
      }

      html.push('<span class="atm-lyric-line">' + escapeHtml(line) + "</span>");
      lastWasGap = false;
    });

    lyricsBody.innerHTML = html.join("") || '<span class="atm-lyric-line">—</span>';
    scheduleFitLyrics();
  }

  function fitLyricsToBox() {
    if (!lyricsBody) return;
    var min = 11;
    var max = 22;
    var size = max;
    lyricsBody.style.fontSize = size + "px";
    // Shrink until the whole song fits with no scrolling.
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
    var slides = [];
    if (episode.hero) slides.push({ src: episode.hero, kind: "hero" });
    (episode.comicImages || []).forEach(function (src) {
      slides.push({ src: src, kind: "comic" });
    });
    if (!slides.length) slides.push({ src: "", kind: "blank" });

    slides.forEach(function (slide, i) {
      var node = document.createElement("div");
      node.className =
        "stage__visual" + (slide.kind === "blank" ? " stage__visual--blank" : "");
      if (slide.src) node.style.backgroundImage = 'url("' + slide.src + '")';
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

  function sceneForProgress(p) {
    var comics = episode.comics || [];
    if (!comics.length) return { en: episode.logline || "", zh: "" };
    var idx = Math.min(comics.length - 1, Math.floor(p * comics.length));
    return comics[idx];
  }

  function showTrack(i, force) {
    if (!episode || !episode.tracks.length) return;
    i = Math.max(0, Math.min(episode.tracks.length - 1, i));
    var changed = i !== trackIndex;
    trackIndex = i;
    var t = episode.tracks[i];
    trackKicker.textContent =
      "Ep " +
      String(episode.episode).padStart(2, "0") +
      " · Track " +
      t.n +
      " · " +
      (t.time || formatTime(t.start));
    trackTitle.textContent = t.en;
    trackZh.textContent = t.zh;
    if (changed || force) renderFullLyrics(t.lyrics);
  }

  function updateAtmosphere(absSec, duration) {
    if (!episode) return;
    showTrack(indexFromTime(absSec));

    var total = duration || episode.tracks[episode.tracks.length - 1].start + 180;
    var p = total ? Math.min(1, absSec / total) : 0;
    var scene = sceneForProgress(p);
    sceneLine.textContent = scene.en || episode.logline || "";
    sceneZh.textContent = scene.zh || "";

    if (visualNodes.length > 1) {
      setVisual(Math.floor(p * visualNodes.length) % visualNodes.length);
    }

    progressBar.style.width = (p * 100).toFixed(2) + "%";
    timeLabel.textContent = formatTime(absSec);
  }

  function onTick() {
    if (!player || typeof player.getCurrentTime !== "function") return;
    try {
      updateAtmosphere(player.getCurrentTime() || 0, player.getDuration && player.getDuration());
      if (player.getPlayerState() === YT.PlayerState.ENDED) {
        btnToggle.textContent = "Replay";
      }
    } catch (e) {}
  }

  function loadEpisode(meta, autoplay) {
    return fetch(
      "data/episode-" +
        String(meta.episode).padStart(2, "0") +
        ".json?v=20260817a"
    )
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        episode = data;
        trackIndex = -1;
        worldTitle.textContent = data.title.en;
        worldSub.textContent = data.title.zh;
        document.title = data.title.en + " · Atmosphere — Cafe QuietLY 靜";
        rememberWorld(
          index.find(function (x) {
            return x.episode === data.episode;
          }) || {
            episode: data.episode,
            title: data.title,
            videoId: data.videoId,
          }
        );
        buildVisuals();
        showTrack(0, true);
        updateAtmosphere(0, data.tracks[data.tracks.length - 1].start + 180);

        if (!data.videoId) {
          lyricsBody.innerHTML =
            '<span class="atm-lyric-line">This world has lyrics, but no video id yet.</span>';
          return;
        }

        if (!player) {
          player = new YT.Player("yt-player", {
            host: "https://www.youtube-nocookie.com",
            videoId: data.videoId,
            playerVars: {
              rel: 0,
              modestbranding: 1,
              playsinline: 1,
              autoplay: autoplay ? 1 : 0,
            },
            events: {
              onReady: function () {
                if (autoplay) player.playVideo();
                if (!tickTimer) tickTimer = window.setInterval(onTick, 500);
                scheduleFitLyrics();
              },
              onStateChange: function (ev) {
                if (ev.data === YT.PlayerState.PLAYING) btnToggle.textContent = "Pause";
                else if (ev.data === YT.PlayerState.PAUSED) btnToggle.textContent = "Play";
                else if (ev.data === YT.PlayerState.ENDED) {
                  btnToggle.textContent = "Replay";
                  maybeAdvanceWorld();
                }
              },
            },
          });
        } else {
          player.loadVideoById({ videoId: data.videoId, startSeconds: 0 });
          if (autoplay) player.playVideo();
        }
      });
  }

  function currentIndex() {
    if (!episode) return 0;
    for (var i = 0; i < index.length; i += 1) {
      if (index[i].episode === episode.episode) return i;
    }
    return 0;
  }

  function maybeAdvanceWorld() {
    if (!index.length) return;
    window.setTimeout(function () {
      var next = pickNextWorld();
      episodeSelect.value = String(next.episode);
      loadEpisode(next, true);
    }, 2400);
  }

  function fillSelect() {
    episodeSelect.innerHTML = index
      .slice()
      .sort(function (a, b) {
        return a.episode - b.episode;
      })
      .map(function (item) {
        return (
          '<option value="' +
          item.episode +
          '">Ep ' +
          String(item.episode).padStart(2, "0") +
          " · " +
          item.title.zh +
          "</option>"
        );
      })
      .join("");
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
    else if (episode) loadEpisode(episode, true);
  }

  btnBegin.addEventListener("click", begin);
  btnToggle.addEventListener("click", function () {
    if (!player) return begin();
    if (player.getPlayerState() === YT.PlayerState.PLAYING) player.pauseVideo();
    else player.playVideo();
  });
  btnNext.addEventListener("click", function () {
    var next = pickNextWorld();
    episodeSelect.value = String(next.episode);
    loadEpisode(next, started);
  });
  btnPrev.addEventListener("click", function () {
    var prev = pickPrevWorld();
    episodeSelect.value = String(prev.episode);
    loadEpisode(prev, started);
  });
  if (btnShuffle) {
    setShuffleUi();
    btnShuffle.addEventListener("click", function () {
      shuffleOn = !shuffleOn;
      setShuffleUi();
      persistShuffle();
    });
  }
  episodeSelect.addEventListener("change", function () {
    var ep = Number(episodeSelect.value);
    var meta = index.find(function (x) {
      return x.episode === ep;
    });
    if (meta) loadEpisode(meta, started);
  });

  window.addEventListener("resize", scheduleFitLyrics);

  visualTimer = window.setInterval(function () {
    if (
      visualNodes.length > 1 &&
      (!player || player.getPlayerState() !== YT.PlayerState.PLAYING)
    ) {
      setVisual(visualIndex + 1);
    }
  }, 9000);

  btnNext.hidden = false;
  btnPrev.hidden = false;

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

  fetch("data/episodes-index.json?v=20260817a")
    .then(function (r) {
      return r.json();
    })
    .then(function (items) {
      index = items;
      fillSelect();
      var want = qsEp();
      var meta =
        index.find(function (x) {
          return x.episode === want;
        }) ||
        (shuffleOn && !want ? pickRandomWorld(null) : null) ||
        index.find(function (x) {
          return x.episode === 11;
        }) ||
        index[index.length - 1];
      episodeSelect.value = String(meta.episode);
      bootPlayerApi(function () {
        loadEpisode(meta, false);
      });
    })
    .catch(function (err) {
      console.error(err);
      trackTitle.textContent = "Could not load worlds";
    });
})();
