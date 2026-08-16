/**
 * Game engine: scoring, question flow, optional audio sync.
 * Timing model (ms) comes from lyrics JSON: startTime / endTime / beatTime.
 */
const GameEngine = (() => {
  const BASE_SCORE = 100;
  const AUTO_NEXT_MS = 1000;

  /** Combo multiplier per product spec */
  function comboMultiplier(combo) {
    if (combo >= 21) return 2.0;
    if (combo >= 11) return 1.5;
    if (combo >= 6) return 1.2;
    return 1.0;
  }

  /**
   * Beat judgment vs beatTime (advanced scoring).
   * Perfect ≤100ms → 1.2x, Good ≤300ms → 1.0x, else Miss.
   */
  function beatFactor(deltaMs) {
    const abs = Math.abs(deltaMs);
    if (abs <= 100) return { label: "Perfect", factor: 1.2 };
    if (abs <= 300) return { label: "Good", factor: 1.0 };
    return { label: "Miss", factor: 0 };
  }

  function createState(songMeta, lyricsData) {
    return {
      songMeta,
      lyricsData,
      questions: lyricsData.questions || [],
      index: 0,
      score: 0,
      combo: 0,
      maxCombo: 0,
      correctCount: 0,
      answered: false,
      waitingNext: false,
      // clock: audio currentTime * 1000, or demoElapsed when no audio
      mode: "demo", // "audio" | "demo"
      demoStartPerf: 0,
      timers: [],
      autoNextTimer: null,
    };
  }

  function clearTimers(state) {
    state.timers.forEach((id) => clearTimeout(id));
    state.timers = [];
    if (state.autoNextTimer) {
      clearTimeout(state.autoNextTimer);
      state.autoNextTimer = null;
    }
  }

  function currentQuestion(state) {
    return state.questions[state.index] || null;
  }

  function progressPercent(state) {
    const total = state.questions.length || 1;
    return Math.min(100, Math.round((state.index / total) * 100));
  }

  function accuracy(state) {
    const total = state.questions.length || 1;
    return Math.round((state.correctCount / total) * 100);
  }

  /**
   * Score an answer. Returns feedback payload for UI.
   */
  function submitAnswer(state, selected, answerAtMs) {
    if (state.answered) return null;
    const q = currentQuestion(state);
    if (!q) return null;

    state.answered = true;
    const isCorrect = selected === q.correctAnswer;
    const delta = answerAtMs - q.beatTime;
    let beat = { label: "Miss", factor: 0 };

    if (isCorrect) {
      beat = beatFactor(delta);
      // Prototype UX: correct answer inside the lyric window still counts as Good
      // even if slightly off the ideal beat (keeps learning flow friendly).
      const inWindow =
        answerAtMs >= q.startTime && answerAtMs <= q.endTime + 500;
      if (beat.factor === 0 && inWindow) {
        beat = { label: "Good", factor: 1.0 };
      }
    }

    let gained = 0;
    if (isCorrect && beat.factor > 0) {
      state.combo += 1;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
      state.correctCount += 1;
      gained = Math.round(
        BASE_SCORE * comboMultiplier(state.combo) * beat.factor
      );
      state.score += gained;
    } else {
      state.combo = 0;
    }

    return {
      isCorrect,
      correctAnswer: q.correctAnswer,
      selected,
      gained,
      beatLabel: beat.label,
      explanation: q.explanation || "",
      combo: state.combo,
      score: state.score,
    };
  }

  function advance(state) {
    state.index += 1;
    state.answered = false;
    state.waitingNext = false;
    return state.index < state.questions.length;
  }

  function isFinished(state) {
    return state.index >= state.questions.length;
  }

  function results(state) {
    return {
      score: state.score,
      correctCount: state.correctCount,
      total: state.questions.length,
      maxCombo: state.maxCombo,
      accuracy: accuracy(state),
      title: state.songMeta.title,
      titleEn: state.songMeta.titleEn,
    };
  }

  return {
    createState,
    clearTimers,
    currentQuestion,
    progressPercent,
    accuracy,
    submitAnswer,
    advance,
    isFinished,
    results,
    AUTO_NEXT_MS,
    comboMultiplier,
    beatFactor,
  };
})();

window.GameEngine = GameEngine;
