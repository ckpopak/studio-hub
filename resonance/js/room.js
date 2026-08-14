(function () {
  "use strict";

  const params = new URLSearchParams(location.search);
  const roomId = params.get("room");

  if (!roomId) {
    location.replace("index.html");
    return;
  }

  const room = ResonanceRooms.getRoom(roomId);
  if (!room) {
    document.body.innerHTML =
      '<p style="padding:4rem;text-align:center;color:#9aa6b8">This room does not exist yet.</p>';
    return;
  }

  const state = Resonance.getState();
  if (!state.character) {
    location.replace("index.html");
    return;
  }

  const unlocked = Resonance.checkUnlock(room, state, ResonanceRooms.ROOMS);
  if (!unlocked) {
    document.body.innerHTML =
      '<div class="page"><p class="eyebrow">Locked</p><h1 class="title">' +
      room.title +
      '</h1><p class="lead">This room has not opened yet. Listen elsewhere. Return when something shifts.</p><a class="cta" href="index.html">Back to Hub</a></div>';
    return;
  }

  Resonance.markVisited(room.id);

  const char = Resonance.CHARACTERS[state.character];
  const priorChoice = state.choices[room.id];
  const echo = Resonance.getEcho(room.id);

  document.title = room.title + " — Resonance";

  const sceneEl = document.getElementById("scene");
  room.scene.forEach((line) => {
    const p = document.createElement("p");
    p.className = "scene__line";
    p.textContent = line;
    sceneEl.appendChild(p);
  });

  if (echo) {
    const note = document.createElement("p");
    note.className = "echo-note";
    note.textContent =
      "An echo waits here: “" + echo.text + "” — left on a prior visit.";
    sceneEl.appendChild(note);
  }

  const choicesEl = document.getElementById("choices");
  const resultEl = document.getElementById("result");
  const endingEl = document.getElementById("ending");

  function showResult(text) {
    resultEl.textContent = text;
    resultEl.classList.remove("hidden");
  }

  if (priorChoice) {
    const choice = room.choices.find((c) => c.id === priorChoice);
    if (choice) showResult(choice.result);
    if (room.ending && room.ending.character === state.character) {
      endingEl.innerHTML =
        '<p class="ending__title">' +
        room.ending.title +
        "</p><p>" +
        room.ending.text +
        "</p>";
      endingEl.classList.remove("hidden");
    }
  }

  room.choices.forEach((choice) => {
    if (choice.characters && !choice.characters.includes(state.character)) {
      return;
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice-btn";
    if (priorChoice === choice.id) btn.classList.add("choice-btn--used");
    btn.textContent = choice.label;
    btn.disabled = !!priorChoice;

    btn.addEventListener("click", () => {
      Resonance.applyChoice(room, choice);
      btn.classList.add("choice-btn--used");
      [...choicesEl.querySelectorAll("button")].forEach((b) => {
        b.disabled = true;
      });
      showResult(choice.result);

      if (room.ending && room.ending.character === state.character) {
        endingEl.innerHTML =
          '<p class="ending__title">' +
          room.ending.title +
          "</p><p>" +
          room.ending.text +
          "</p>";
        endingEl.classList.remove("hidden");
      }
    });

    choicesEl.appendChild(btn);
  });

  if (
    state.character === "mo" &&
    room.betweenNotes &&
    !state.betweenNotesUsed[room.id]
  ) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice-btn";
    btn.textContent = "Listen between the notes…";
    btn.disabled = !!priorChoice;

    btn.addEventListener("click", () => {
      if (!Resonance.useBetweenNotes(room.id)) return;
      const note = document.createElement("p");
      note.className = "hidden-note";
      note.textContent = room.betweenNotes.text;
      sceneEl.appendChild(note);

      if (room.betweenNotes.resonance) {
        Resonance.addResonance(
          room.betweenNotes.resonance.type,
          room.betweenNotes.resonance.value,
          room.id
        );
      }
      btn.disabled = true;
      btn.classList.add("choice-btn--used");
    });

    choicesEl.appendChild(btn);
  }

  const linksEl = document.getElementById("links");
  if (room.atmosphere) {
    const a = document.createElement("a");
    a.className = "cta";
    a.href = room.atmosphere;
    a.textContent = "Open Atmosphere";
    linksEl.appendChild(a);
  }
  if (room.links) {
    room.links.forEach((link) => {
      const a = document.createElement("a");
      a.className = "cta";
      a.href = link.href;
      a.textContent = link.label;
      linksEl.appendChild(a);
    });
  }

  document.getElementById("room-title").textContent = room.title;
  document.getElementById("room-eyebrow").textContent = room.eyebrow;
  document.getElementById("char-badge").textContent =
    char.name + " " + char.mark;
})();
