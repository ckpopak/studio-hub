(function (global) {
  "use strict";

  const STORAGE_KEY = "n20dle-resonance";

  const CHARACTERS = {
    mo: {
      id: "mo",
      name: "Mò",
      title: "The Quiet One",
      mark: "默",
      blurb:
        "Soft-spoken, observational. Hears the space between notes.",
      startRoom: "mist-river",
      wing: "quietly",
    },
    lin: {
      id: "lin",
      name: "Lin",
      title: "The Bilingual Wanderer",
      mark: "林",
      blurb:
        "Moves easily between languages. Finds resonance where meanings diverge.",
      startRoom: "rain-on-teak",
      wing: "siam",
    },
    sai: {
      id: "sai",
      name: "Sai",
      title: "The Echo Keeper",
      mark: "賽",
      blurb:
        "Collects faint sounds and words. Leaves echoes that wait for return.",
      startRoom: "hub-corridor",
      wing: "hub",
    },
  };

  function defaultState() {
    return {
      character: null,
      resonances: [],
      echoes: {},
      visited: [],
      choices: {},
      posture: { depth: 0, span: 0, memory: 0 },
      ledger: [],
      endings: [],
      betweenNotesUsed: {},
      unlockedCharacters: ["mo", "lin"],
      createdAt: Date.now(),
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return { ...defaultState(), ...JSON.parse(raw) };
    } catch {
      return defaultState();
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getState() {
    return loadState();
  }

  function resetState() {
    localStorage.removeItem(STORAGE_KEY);
    return defaultState();
  }

  function setCharacter(id) {
    const state = loadState();
    state.character = id;
    const char = CHARACTERS[id];
    if (char && !state.visited.includes(char.startRoom)) {
      /* first visit handled when entering room */
    }
    saveState(state);
    return state;
  }

  function addResonance(type, value, roomId) {
    const state = loadState();
    const exists = state.resonances.some(
      (r) => r.type === type && r.value === value
    );
    if (!exists) {
      state.resonances.push({ type, value, room: roomId, at: Date.now() });
    }
    if (type === "tone") {
      if (["patience", "stillness"].includes(value)) state.posture.depth += 1;
      if (["curiosity", "bridge", "hospitality"].includes(value))
        state.posture.span += 1;
      if (["echo", "memory", "almost"].includes(value))
        state.posture.memory += 1;
    }
    saveState(state);
    return state;
  }

  function hasResonance(type, value) {
    const state = loadState();
    return state.resonances.some(
      (r) => r.type === type && (!value || r.value === value)
    );
  }

  function countResonances() {
    return loadState().resonances.length;
  }

  function addLedgerLine(roomId, line) {
    const state = loadState();
    state.ledger.push({ room: roomId, line, at: Date.now() });
    saveState(state);
  }

  function markVisited(roomId) {
    const state = loadState();
    if (!state.visited.includes(roomId)) {
      state.visited.push(roomId);
    }
    saveState(state);
    return state;
  }

  function recordChoice(roomId, choiceId) {
    const state = loadState();
    state.choices[roomId] = choiceId;
    saveState(state);
  }

  function leaveEcho(roomId, text) {
    const state = loadState();
    state.echoes[roomId] = { text, at: Date.now() };
    saveState(state);
  }

  function getEcho(roomId) {
    return loadState().echoes[roomId] || null;
  }

  function useBetweenNotes(roomId) {
    const state = loadState();
    if (state.betweenNotesUsed[roomId]) return false;
    state.betweenNotesUsed[roomId] = true;
    saveState(state);
    return true;
  }

  function unlockCharacter(id) {
    const state = loadState();
    if (!state.unlockedCharacters.includes(id)) {
      state.unlockedCharacters.push(id);
      saveState(state);
    }
  }

  function checkUnlock(room, state, rooms) {
    const u = room.unlock;
    if (!u) return true;
    if (u.always) return true;

    if (u.startFor && !u.visited && !u.resonances && !u.minResonances && !u.minPosture) {
      return (
        u.startFor.includes(state.character) ||
        state.visited.includes(room.id)
      );
    }

    if (u.character && state.character === u.character) return true;
    if (u.startFor && u.startFor.includes(state.character)) return true;

    if (u.visited) {
      const ok = u.visited.every((id) => state.visited.includes(id));
      if (!ok) return false;
    }
    if (u.resonances) {
      const ok = u.resonances.every((req) =>
        state.resonances.some(
          (r) => r.type === req.type && r.value === req.value
        )
      );
      if (!ok) return false;
    }
    if (u.minResonances && countResonances() < u.minResonances) return false;
    if (u.minPosture) {
      const p = state.posture;
      if (u.minPosture.depth && p.depth < u.minPosture.depth) return false;
      if (u.minPosture.span && p.span < u.minPosture.span) return false;
      if (u.minPosture.memory && p.memory < u.minPosture.memory) return false;
    }
    if (u.echoIn && !state.echoes[u.echoIn]) return false;
    return u.visited || u.resonances || u.minResonances || u.minPosture
      ? true
      : false;
  }

  function getUnlockedRooms(rooms) {
    const state = loadState();
    return rooms.filter((r) => checkUnlock(r, state, rooms));
  }

  function exportLedger() {
    const state = loadState();
    const lines = state.ledger.map((e) => e.line);
    return lines.join("\n\n");
  }

  function maybeUnlockSai(state) {
    if (state.visited.length >= 4 && !state.unlockedCharacters.includes("sai")) {
      unlockCharacter("sai");
    }
  }

  function applyChoice(room, choice) {
    const state = loadState();
    markVisited(room.id);
    recordChoice(room.id, choice.id);

    if (choice.resonance) {
      addResonance(choice.resonance.type, choice.resonance.value, room.id);
    }
    if (choice.ledger) {
      addLedgerLine(room.id, choice.ledger);
    }
    if (choice.echo) {
      leaveEcho(room.id, choice.echo);
      addResonance("echo", choice.echoLabel || "echo", room.id);
    }
    if (choice.posture) {
      const s = loadState();
      s.posture[choice.posture] = (s.posture[choice.posture] || 0) + 1;
      saveState(s);
    }

    maybeUnlockSai(loadState());
    return loadState();
  }

  global.Resonance = {
    CHARACTERS,
    loadState,
    saveState,
    getState,
    resetState,
    setCharacter,
    addResonance,
    hasResonance,
    countResonances,
    addLedgerLine,
    markVisited,
    recordChoice,
    leaveEcho,
    getEcho,
    useBetweenNotes,
    unlockCharacter,
    checkUnlock,
    getUnlockedRooms,
    exportLedger,
    applyChoice,
  };
})(typeof window !== "undefined" ? window : globalThis);
