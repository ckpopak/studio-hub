/**
 * App shell: screen routing, song list, gameplay UI wiring.
 */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const screens = {
    select: $("#screen-select"),
    game: $("#screen-game"),
    results: $("#screen-results"),
  };

  const els = {
    songList: $("#song-list"),
    score: $("#score-value"),
    combo: $("#combo-value"),
    progress: $("#progress-fill"),
    lyricLine: $("#lyric-line"),
    lyricSub: $("#lyric-sub"),
    beatCircle: $("#beat-circle"),
    beatHint: $("#beat-hint"),
    options: $("#options-grid"),
    qCounter: $("#q-counter"),
    btnNext: $("#btn-next"),
    audioNote: $("#audio-note"),
    audio: $("#song-audio"),
    accuracy: $("#accuracy-value"),
    resultSong: $("#result-song"),
    resultScore: $("#result-score"),
    resultCorrect: $("#result-correct"),
    resultCombo: $("#result-combo"),
    btnReplay: $("#btn-replay"),
    btnBack: $("#btn-back"),
  };

  let songsCatalog = [];
  let activeSong = null;
  let state = null;
  let clockRaf = null;

  function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => {
      el.classList.toggle("hidden", key !== name);
    });
  }

  function stars(n) {
    const filled = Math.max(1, Math.min(5, Number(n) || 1));
    return "⭐".repeat(filled) + "☆".repeat(5 - filled);
  }

  function langLabel(languages) {
    return (languages || []).join(" × ");
  }

  async function loadSongs() {
    els.songList.innerHTML = `<p class="loading">載入歌曲中…</p>`;
    try {
      const res = await fetch("data/songs.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      songsCatalog = data.songs || [];
      renderSongList();
    } catch (err) {
      els.songList.innerHTML = `<p class="error-banner">無法載入歌曲列表：${err.message}</p>`;
    }
  }

  function renderSongList() {
    if (!songsCatalog.length) {
      els.songList.innerHTML = `<p class="error-banner">目前沒有可用歌曲</p>`;
      return;
    }

    els.songList.innerHTML = "";
    songsCatalog.forEach((song) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "song-card";
      btn.setAttribute("data-song-id", song.id);
      btn.innerHTML = `
        <h2 class="song-card__title">${escapeHtml(song.title)}</h2>
        <p class="song-card__title-en">${escapeHtml(song.titleEn || "")}</p>
        <div class="song-card__meta">
          <span class="tag tag--lang">${escapeHtml(langLabel(song.language))}</span>
          <span class="tag tag--theme">${escapeHtml(song.theme || "")}</span>
        </div>
        <div class="song-card__stats">
          <span class="stars" aria-label="難度 ${song.difficulty}">${stars(song.difficulty)}</span>
          <span>${song.totalBlanks} 填空</span>
        </div>
      `;
      btn.addEventListener("click", () => startGame(song));
      els.songList.appendChild(btn);
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  async function startGame(songMeta) {
    Sfx.unlock();
    activeSong = songMeta;
    showScreen("game");
    els.options.innerHTML = `<p class="loading">載入題目…</p>`;
    els.btnNext.classList.remove("is-visible");

    try {
      const res = await fetch(songMeta.lyricsData, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const lyricsData = await res.json();
      state = GameEngine.createState(songMeta, lyricsData);
      resetHud();
      await prepareAudio(songMeta);
      showQuestion();
      startClockLoop();
    } catch (err) {
      els.options.innerHTML = `<p class="error-banner">題目載入失敗：${err.message}</p>`;
    }
  }

  async function prepareAudio(songMeta) {
    const audio = els.audio;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();

    // Prototype: audio files may be missing — fall back to demo clock.
    if (!songMeta.audioUrl) {
      state.mode = "demo";
      state.demoStartPerf = performance.now();
      els.audioNote.textContent = "示範模式：依題目時間軸推進（尚未提供音檔）";
      return;
    }

    audio.src = songMeta.audioUrl;
    try {
      await new Promise((resolve, reject) => {
        const onReady = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error("audio missing"));
        };
        const cleanup = () => {
          audio.removeEventListener("canplaythrough", onReady);
          audio.removeEventListener("error", onError);
        };
        audio.addEventListener("canplaythrough", onReady, { once: true });
        audio.addEventListener("error", onError, { once: true });
        audio.load();
        // Timeout if file never arrives
        setTimeout(() => {
          cleanup();
          reject(new Error("audio timeout"));
        }, 1200);
      });
      state.mode = "audio";
      await audio.play();
      els.audioNote.textContent = "正在播放歌曲音訊…";
    } catch {
      state.mode = "demo";
      state.demoStartPerf = performance.now();
      els.audioNote.textContent = "示範模式：尚未找到音檔，改用題目時間軸練習";
    }
  }

  function nowMs() {
    if (!state) return 0;
    if (state.mode === "audio") {
      return (els.audio.currentTime || 0) * 1000;
    }
    return performance.now() - state.demoStartPerf;
  }

  function resetHud() {
    els.score.textContent = "0";
    els.combo.textContent = "";
    els.progress.style.width = "0%";
    els.beatHint.textContent = "準備在節拍作答！";
    els.beatCircle.classList.remove("is-pulse", "is-armed");
  }

  function renderBlankLine(lyricLine) {
    // Replace ______ with styled blank span
    const parts = String(lyricLine).split("______");
    if (parts.length === 1) return escapeHtml(lyricLine);
    return parts
      .map((p) => escapeHtml(p))
      .join('<span class="lyric-blank">______</span>');
  }

  function showQuestion() {
    GameEngine.clearTimers(state);
    const q = GameEngine.currentQuestion(state);
    if (!q) {
      finishGame();
      return;
    }

    state.answered = false;
    state.waitingNext = false;
    els.btnNext.classList.remove("is-visible");
    els.lyricLine.innerHTML = renderBlankLine(q.lyricLine);
    els.lyricSub.textContent =
      q.lyricLineRomanization || q.translation || "";
    els.qCounter.textContent = `第 ${state.index + 1} / ${state.questions.length} 題`;
    els.progress.style.width = `${GameEngine.progressPercent(state)}%`;
    els.beatHint.textContent = "準備在節拍作答！";
    els.beatCircle.classList.remove("is-armed");

    // Shuffle options copy so correct answer isn't always first
    const options = shuffle([...q.options]);
    els.options.innerHTML = "";
    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option-btn";
      btn.textContent = opt;
      btn.addEventListener("click", () => onAnswer(opt, btn));
      els.options.appendChild(btn);
    });

    scheduleBeatCue(q);
  }

  function scheduleBeatCue(q) {
    const delay = Math.max(0, q.beatTime - nowMs());
    const armDelay = Math.max(0, delay - 400);
    const armId = setTimeout(() => {
      els.beatCircle.classList.add("is-armed");
      els.beatHint.textContent = "節拍將近 — 選出答案！";
    }, armDelay);
    const beatId = setTimeout(() => {
      els.beatCircle.classList.remove("is-armed");
      els.beatCircle.classList.remove("is-pulse");
      // Retrigger animation
      void els.beatCircle.offsetWidth;
      els.beatCircle.classList.add("is-pulse");
      Sfx.beat();
      els.beatHint.textContent = "就是現在！";
    }, delay);
    state.timers.push(armId, beatId);
  }

  function onAnswer(selected, btn) {
    if (!state || state.answered) return;
    const feedback = GameEngine.submitAnswer(state, selected, nowMs());
    if (!feedback) return;

    // Disable all options + paint correct/wrong
    $$(".option-btn", els.options).forEach((b) => {
      b.disabled = true;
      if (b.textContent === feedback.correctAnswer) {
        b.classList.add("is-correct");
      }
    });
    if (!feedback.isCorrect) {
      btn.classList.add("is-wrong");
      Sfx.wrong();
    } else {
      Sfx.correct();
    }

    els.score.textContent = String(feedback.score);
    updateCombo(feedback.combo);
    if (feedback.beatLabel && feedback.isCorrect) {
      els.beatHint.textContent = `${feedback.beatLabel}  +${feedback.gained}`;
    } else if (!feedback.isCorrect) {
      els.beatHint.textContent = feedback.explanation || "再接再厲！";
    } else {
      els.beatHint.textContent = "Miss（偏離節拍）— 連擊中斷";
    }

    state.waitingNext = true;
    els.btnNext.classList.add("is-visible");
    state.autoNextTimer = setTimeout(() => {
      goNext();
    }, GameEngine.AUTO_NEXT_MS);
  }

  function updateCombo(combo) {
    if (combo > 0) {
      els.combo.textContent = `🔥 ${combo} COMBO`;
      els.combo.classList.remove("is-pop");
      void els.combo.offsetWidth;
      els.combo.classList.add("is-pop");
    } else {
      els.combo.textContent = "";
    }
  }

  function goNext() {
    if (!state || !state.waitingNext) return;
    GameEngine.clearTimers(state);
    const hasMore = GameEngine.advance(state);
    if (!hasMore) {
      finishGame();
      return;
    }
    // In demo mode, align clock so next question's startTime ≈ now
    if (state.mode === "demo") {
      const q = GameEngine.currentQuestion(state);
      if (q) {
        state.demoStartPerf = performance.now() - q.startTime;
      }
    }
    showQuestion();
  }

  function finishGame() {
    stopClockLoop();
    GameEngine.clearTimers(state);
    els.audio.pause();
    const r = GameEngine.results(state);
    els.accuracy.textContent = `${r.accuracy}%`;
    els.resultSong.textContent = r.title;
    els.resultScore.textContent = String(r.score);
    els.resultCorrect.textContent = `${r.correctCount}/${r.total}`;
    els.resultCombo.textContent = `🔥 ${r.maxCombo}`;
    els.progress.style.width = "100%";
    showScreen("results");
  }

  function startClockLoop() {
    stopClockLoop();
    const tick = () => {
      if (!state || screens.game.classList.contains("hidden")) return;
      // Soft progress within current question window
      const q = GameEngine.currentQuestion(state);
      if (q && state.questions.length) {
        const base = (state.index / state.questions.length) * 100;
        const span = Math.max(1, q.endTime - q.startTime);
        const local = Math.min(1, Math.max(0, (nowMs() - q.startTime) / span));
        const pct = base + local * (100 / state.questions.length);
        els.progress.style.width = `${Math.min(100, pct)}%`;
      }
      clockRaf = requestAnimationFrame(tick);
    };
    clockRaf = requestAnimationFrame(tick);
  }

  function stopClockLoop() {
    if (clockRaf) {
      cancelAnimationFrame(clockRaf);
      clockRaf = null;
    }
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // --- Controls ---
  els.btnNext.addEventListener("click", () => goNext());
  els.btnReplay.addEventListener("click", () => {
    if (activeSong) startGame(activeSong);
  });
  els.btnBack.addEventListener("click", () => {
    stopClockLoop();
    if (state) GameEngine.clearTimers(state);
    els.audio.pause();
    state = null;
    showScreen("select");
  });

  // Boot
  showScreen("select");
  loadSongs();
})();
