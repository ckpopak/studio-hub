(function () {
  var visualsEl = document.getElementById("visuals");
  var gate = document.getElementById("gate");
  var btnBegin = document.getElementById("btn-begin");
  var btnToggle = document.getElementById("btn-toggle");
  var btnNext = document.getElementById("btn-next");
  var btnPrev = document.getElementById("btn-prev");
  var episodeSelect = document.getElementById("episode-select");
  var worldTitle = document.getElementById("world-title");
  var worldSub = document.getElementById("world-sub");
  var trackKicker = document.getElementById("track-kicker");
  var trackTitle = document.getElementById("track-title");
  var trackZh = document.getElementById("track-zh");
  var sceneLine = document.getElementById("scene-line");
  var sceneZh = document.getElementById("scene-zh");
  var lyricsLine = document.getElementById("lyrics-line");
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
  var lyricIndex = -1;
  var tickTimer = null;
  var visualTimer = null;

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

  function vocalLines(lyrics) {
    return String(lyrics || "")
      .split(/\r?\n/)
      .map(function (l) {
        return l.trim();
      })
      .filter(function (l) {
        if (!l) return false;
        if (/^\[[^\]]+\]$/.test(l)) return false;
        return true;
      });
  }

  function trackDuration(i) {
    var tracks = episode.tracks;
    var start = tracks[i].start;
    if (i + 1 < tracks.length) return Math.max(20, tracks[i + 1].start - start);
    return 180;
  }

  function indexFromTime(t) {
    var i = 0;
    for (var n = 0; n < episode.tracks.length; n += 1) {
      if (t >= episode.tracks[n].start) i = n;
    }
    return i;
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
      if (slide.src) {
        node.style.backgroundImage = 'url("' + slide.src + '")';
      }
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
    if (!comics.length) {
      return { en: episode.logline || "", zh: "" };
    }
    var idx = Math.min(comics.length - 1, Math.floor(p * comics.length));
    return comics[idx];
  }

  function showTrack(i, forceLyricReset) {
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
    if (changed || forceLyricReset) {
      lyricIndex = -1;
      lyricsLine.classList.remove("is-on");
      lyricsLine.textContent = "";
    }
  }

  function showLyricForTime(absSec) {
    var t = episode.tracks[trackIndex];
    if (!t) return;
    var lines = vocalLines(t.lyrics);
    if (!lines.length) {
      lyricsLine.classList.remove("is-on");
      lyricsLine.textContent = "";
      return;
    }
    var local = Math.max(0, absSec - t.start);
    var dur = trackDuration(trackIndex);
    // Soft lead-in: hold first line after a short instrumental breath
    var usable = Math.max(12, dur - 18);
    var offset = Math.min(local, usable);
    var idx = Math.min(
      lines.length - 1,
      Math.floor((offset / usable) * lines.length)
    );
    if (idx === lyricIndex) return;
    lyricIndex = idx;
    lyricsLine.classList.remove("is-on");
    window.setTimeout(function () {
      lyricsLine.textContent = lines[idx];
      lyricsLine.classList.add("is-on");
    }, 180);
  }

  function updateAtmosphere(absSec, duration) {
    if (!episode) return;
    var i = indexFromTime(absSec);
    showTrack(i);
    showLyricForTime(absSec);

    var total = duration || episode.tracks[episode.tracks.length - 1].start + 180;
    var p = total ? Math.min(1, absSec / total) : 0;
    var scene = sceneForProgress(p);
    sceneLine.textContent = scene.en || episode.logline || "";
    sceneZh.textContent = scene.zh || "";

    // Map whole-session progress across visuals with a slow drift
    if (visualNodes.length > 1) {
      var v = Math.floor(p * visualNodes.length) % visualNodes.length;
      setVisual(v);
    }

    progressBar.style.width = (p * 100).toFixed(2) + "%";
    timeLabel.textContent = formatTime(absSec);
  }

  function onTick() {
    if (!player || typeof player.getCurrentTime !== "function") return;
    try {
      var t = player.getCurrentTime() || 0;
      var d = player.getDuration && player.getDuration();
      updateAtmosphere(t, d);
      var state = player.getPlayerState();
      if (state === YT.PlayerState.ENDED) {
        btnToggle.textContent = "Replay";
      }
    } catch (e) {}
  }

  function loadEpisode(meta, autoplay) {
    return fetch("data/episode-" + String(meta.episode).padStart(2, "0") + ".json")
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        episode = data;
        worldTitle.textContent = data.title.en;
        worldSub.textContent = data.title.zh;
        document.title = data.title.en + " · Atmosphere — Cafe QuietLY 靜";
        buildVisuals();
        showTrack(0, true);
        updateAtmosphere(0, data.tracks[data.tracks.length - 1].start + 180);

        if (!data.videoId) {
          lyricsLine.textContent = "This world has lyrics, but no video id yet.";
          lyricsLine.classList.add("is-on");
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
              },
              onStateChange: function (ev) {
                if (ev.data === YT.PlayerState.PLAYING) {
                  btnToggle.textContent = "Pause";
                } else if (ev.data === YT.PlayerState.PAUSED) {
                  btnToggle.textContent = "Play";
                } else if (ev.data === YT.PlayerState.ENDED) {
                  btnToggle.textContent = "Replay";
                  maybeAdvanceWorld();
                }
              },
            },
          });
        } else {
          player.loadVideoById(data.videoId);
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
    // Soft auto-continue into the next published world.
    var i = currentIndex();
    if (i + 1 >= index.length) return;
    window.setTimeout(function () {
      episodeSelect.value = String(index[i + 1].episode);
      loadEpisode(index[i + 1], true);
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
    var st = player.getPlayerState();
    if (st === YT.PlayerState.PLAYING) player.pauseVideo();
    else player.playVideo();
  });
  btnNext.addEventListener("click", function () {
    var i = currentIndex();
    var next = index[(i + 1) % index.length];
    episodeSelect.value = String(next.episode);
    loadEpisode(next, started);
  });
  btnPrev.addEventListener("click", function () {
    var i = currentIndex();
    var prev = index[(i - 1 + index.length) % index.length];
    episodeSelect.value = String(prev.episode);
    loadEpisode(prev, started);
  });
  episodeSelect.addEventListener("change", function () {
    var ep = Number(episodeSelect.value);
    var meta = index.find(function (x) {
      return x.episode === ep;
    });
    if (meta) loadEpisode(meta, started);
  });

  // Gentle visual breathing even while waiting at the gate
  visualTimer = window.setInterval(function () {
    if (visualNodes.length > 1 && (!player || player.getPlayerState() !== YT.PlayerState.PLAYING)) {
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

  fetch("data/episodes-index.json")
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
