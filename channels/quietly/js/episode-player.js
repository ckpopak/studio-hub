(function () {
  function formatTime(sec) {
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ":" + String(s).padStart(2, "0");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderLyricsHtml(lyrics) {
    var lines = String(lyrics).split(/\r?\n/);
    var html = [];
    lines.forEach(function (raw) {
      var line = raw.trimEnd();
      if (!line.trim()) {
        html.push('<span class="lyric-gap"></span>');
        return;
      }
      var tag = line.match(/^\[([^\]]+)\]\s*$/);
      if (tag) {
        var label = tag[1];
        var lower = label.toLowerCase();
        var kind = "section";
        if (lower.indexOf("instrumental") === 0) kind = "instrumental";
        else if (lower.indexOf("poetry") === 0) kind = "poetry";
        else if (lower.indexOf("english") === 0) kind = "english";
        else if (lower.indexOf("bridge") === 0) kind = "bridge";
        html.push(
          '<span class="lyric-tag lyric-tag--' +
            kind +
            '">' +
            escapeHtml(label) +
            "</span>"
        );
        return;
      }
      html.push('<span class="lyric-line">' + escapeHtml(line) + "</span>");
    });
    return html.join("");
  }

  function fillChrome(data) {
    var heroImg = document.getElementById("hero-image");
    var atmosphere = document.getElementById("hero-atmosphere");
    if (heroImg) {
      if (data.hero) {
        heroImg.hidden = false;
        heroImg.src = "../" + data.hero.replace(/^assets\//, "assets/");
        if (data.hero.indexOf("assets/") === 0) heroImg.src = "../" + data.hero;
        document.body.classList.add("has-hero-image");
      } else {
        heroImg.hidden = true;
        document.body.classList.add("has-hero-atmosphere");
      }
    }
    if (atmosphere) {
      atmosphere.dataset.episode = String(data.episode || "");
    }

    var comicsRoot = document.getElementById("comics-root");
    if (comicsRoot && Array.isArray(data.comics)) {
      var images = data.comicImages || [];
      comicsRoot.innerHTML = data.comics
        .map(function (c, i) {
          var img = images[i]
            ? '<div class="comic__media"><img src="../' +
              escapeHtml(images[i]) +
              '" alt="" width="1200" height="900" /></div>'
            : '<div class="comic__media comic__media--blank" aria-hidden="true"><span>' +
              String(i + 1).padStart(2, "0") +
              "</span></div>";
          return (
            '<article class="comic reveal">' +
            img +
            '<div class="comic__cap">' +
            '<span class="comic__num">' +
            String(i + 1).padStart(2, "0") +
            "</span>" +
            '<p class="comic__text serif">' +
            escapeHtml(c.en) +
            '<span class="zh">' +
            escapeHtml(c.zh) +
            "</span></p></div></article>"
          );
        })
        .join("");
    }

    var ytLink = document.getElementById("yt-link");
    if (ytLink && data.videoId) {
      ytLink.href = "https://www.youtube.com/watch?v=" + data.videoId;
    }

    var missing = document.getElementById("video-missing");
    if (missing) missing.hidden = Boolean(data.videoId);

    if (data.title) {
      document.title =
        data.title.en + " · " + data.title.zh + " — Cafe QuietLY 靜";
    }
  }

  function boot(data) {
    if (!data || !data.tracks || !data.tracks.length) return;
    fillChrome(data);

    var tracks = data.tracks;
    var player = null;
    var activeIndex = 0;
    var userSeeking = false;

    var tracklistA = document.getElementById("tracklist-a");
    var tracklistB = document.getElementById("tracklist-b");
    var tracklistLegacy = document.getElementById("tracklist");
    var songs = document.getElementById("songs");
    var nowTrack = document.getElementById("now-track");
    var dock = document.getElementById("dock");
    var dockTrack = document.getElementById("dock-track");
    var dockJump = document.getElementById("dock-jump");
    var session = document.getElementById("session");
    var splitAt = Math.ceil(tracks.length / 2);

    function label(track) {
      return track.en + " · " + track.zh;
    }

    function trackRow(t, i) {
      return (
        '<li><button type="button" data-index="' +
        i +
        '">' +
        '<span class="tracklist__n">' +
        t.n +
        "</span>" +
        '<span class="tracklist__t">' +
        escapeHtml(t.en) +
        ' <span class="zh">' +
        escapeHtml(t.zh) +
        "</span></span>" +
        '<span class="tracklist__time">' +
        (t.time || formatTime(t.start)) +
        "</span>" +
        "</button></li>"
      );
    }

    function render() {
      if (tracklistA && tracklistB) {
        tracklistA.innerHTML = tracks
          .slice(0, splitAt)
          .map(function (t, i) {
            return trackRow(t, i);
          })
          .join("");
        tracklistB.innerHTML = tracks
          .slice(splitAt)
          .map(function (t, i) {
            return trackRow(t, i + splitAt);
          })
          .join("");
      } else if (tracklistLegacy) {
        tracklistLegacy.innerHTML = tracks
          .map(function (t, i) {
            return trackRow(t, i);
          })
          .join("");
      }

      songs.innerHTML = tracks
        .map(function (t, i) {
          var voice = t.voice
            ? '<span class="song__voice">' + escapeHtml(t.voice) + "</span>"
            : "";
          var side = i < splitAt ? "A" : "B";
          return (
            '<article class="song reveal" id="song-' +
            t.n +
            '" data-index="' +
            i +
            '">' +
            '<div class="song__meta">' +
            '<h3 class="song__title serif">' +
            escapeHtml(t.en) +
            ' · <span class="zh">' +
            escapeHtml(t.zh) +
            "</span></h3>" +
            '<div class="song__actions">' +
            '<span class="song__index">Side ' +
            side +
            " · Track " +
            t.n +
            " · " +
            (t.time || formatTime(t.start)) +
            "</span>" +
            voice +
            '<button class="song__play" type="button" data-index="' +
            i +
            '">Drop needle</button>' +
            "</div></div>" +
            '<div class="song__body zh">' +
            renderLyricsHtml(t.lyrics) +
            "</div>" +
            (t.source
              ? '<p class="song__source">Source · ' +
                escapeHtml(t.source) +
                "</p>"
              : "") +
            "</article>"
          );
        })
        .join("");

      if (window.refreshQuietlyReveal) window.refreshQuietlyReveal();
    }

    function setActive(index, opts) {
      opts = opts || {};
      activeIndex = index;
      var track = tracks[index];
      var text = label(track);
      if (nowTrack) nowTrack.textContent = text;
      if (dockTrack) dockTrack.textContent = text;

      Array.prototype.forEach.call(
        document.querySelectorAll(
          "#tracklist button, #tracklist-a button, #tracklist-b button"
        ),
        function (btn) {
          btn.classList.toggle(
            "is-active",
            Number(btn.getAttribute("data-index")) === index
          );
        }
      );
      Array.prototype.forEach.call(
        songs.querySelectorAll(".song"),
        function (el, i) {
          el.classList.toggle("is-active", i === index);
        }
      );

      if (opts.scrollSong) {
        var songEl = document.getElementById("song-" + track.n);
        if (songEl) songEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    function playIndex(index, opts) {
      setActive(index, opts);
      if (!player || typeof player.seekTo !== "function") return;
      userSeeking = true;
      player.seekTo(tracks[index].start, true);
      player.playVideo();
      window.setTimeout(function () {
        userSeeking = false;
      }, 800);
    }

    function indexFromTime(t) {
      var i = 0;
      for (var n = 0; n < tracks.length; n += 1) {
        if (t >= tracks[n].start) i = n;
      }
      return i;
    }

    function onTick() {
      if (!player || userSeeking || typeof player.getCurrentTime !== "function") {
        return;
      }
      try {
        if (player.getPlayerState() !== YT.PlayerState.PLAYING) return;
        var idx = indexFromTime(player.getCurrentTime());
        if (idx !== activeIndex) setActive(idx);
      } catch (e) {}
    }

    function bindClicks() {
      document.addEventListener("click", function (ev) {
        var btn = ev.target.closest("[data-index]");
        if (
          !btn ||
          !btn.closest("#tracklist, #tracklist-a, #tracklist-b, #songs")
        )
          return;
        var index = Number(btn.getAttribute("data-index"));
        if (Number.isNaN(index)) return;
        var fromList = Boolean(btn.closest("#tracklist"));
        playIndex(index, { scrollSong: fromList });
        if (!fromList) {
          session.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    }

    function setupDock() {
      if (!dock || !session || !("IntersectionObserver" in window)) {
        if (dock) {
          dock.classList.add("is-on");
          dock.setAttribute("aria-hidden", "false");
        }
        return;
      }
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            var show = !entry.isIntersecting && entry.boundingClientRect.top < 0;
            dock.classList.toggle("is-on", show);
            dock.setAttribute("aria-hidden", show ? "false" : "true");
          });
        },
        { threshold: 0 }
      );
      io.observe(session);
      if (dockJump) {
        dockJump.addEventListener("click", function () {
          session.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      }
    }

    function onYouTubeIframeAPIReady() {
      if (!data.videoId) {
        setActive(0);
        return;
      }
      player = new YT.Player("yt-player", {
        host: "https://www.youtube-nocookie.com",
        videoId: data.videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: function () {
            setActive(0);
            window.setInterval(onTick, 1000);
          },
        },
      });
    }

    render();
    setActive(0);
    bindClicks();
    setupDock();

    window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
    if (!data.videoId) return;
    if (window.YT && window.YT.Player) {
      onYouTubeIframeAPIReady();
    } else {
      var tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  }

  var node = document.getElementById("episode-data");
  if (window.QUIETLY_EPISODE) {
    boot(window.QUIETLY_EPISODE);
    return;
  }
  if (node && node.textContent.trim()) {
    boot(JSON.parse(node.textContent));
    return;
  }
  var src = document.body.getAttribute("data-episode");
  if (!src) return;
  var bust = src.indexOf("?") >= 0 ? "&" : "?";
  fetch(src + bust + "v=20260815c")
    .then(function (r) {
      return r.json();
    })
    .then(boot)
    .catch(function (err) {
      console.error("Failed to load episode data", err);
    });
})();
