(function () {
  "use strict";

  const WINGS = [
    { id: "hub", title: "Studio Hub", sub: "Corridors & echoes" },
    { id: "quietly", title: "Café QuietLY", sub: "靜 · mist & ink" },
    { id: "siam", title: "Café Siam", sub: "ไทย · teak & rain" },
    { id: "between", title: "The Between", sub: "Where languages meet" },
  ];

  const selectEl = document.getElementById("character-select");
  const mapEl = document.getElementById("map");
  const hubEl = document.getElementById("hub-view");
  const introEl = document.getElementById("intro");

  function renderCharacters() {
    const state = Resonance.getState();
    selectEl.innerHTML = "";

    Object.values(Resonance.CHARACTERS).forEach((char) => {
      const locked = !state.unlockedCharacters.includes(char.id);
      const card = document.createElement("button");
      card.type = "button";
      card.className = "char-card" + (locked ? " char-card--locked" : "");
      card.innerHTML =
        '<p class="char-card__name">' +
        char.name +
        '<span class="char-card__mark">' +
        char.mark +
        "</span></p>" +
        '<p class="char-card__role">' +
        char.title +
        "</p>" +
        '<p class="char-card__blurb">' +
        (locked ? "Listen in four rooms to unlock." : char.blurb) +
        "</p>";

      if (!locked) {
        card.addEventListener("click", () => {
          Resonance.setCharacter(char.id);
          location.reload();
        });
      }

      selectEl.appendChild(card);
    });
  }

  function renderMap() {
    const state = Resonance.getState();
    const char = Resonance.CHARACTERS[state.character];

    introEl.classList.add("hidden");
    selectEl.classList.add("hidden");
    hubEl.classList.remove("hidden");

    document.getElementById("active-char").textContent =
      char.name + " " + char.mark + " — " + char.title;

    const stats = state.posture;
    document.getElementById("posture").textContent =
      "Depth " +
      stats.depth +
      " · Span " +
      stats.span +
      " · Memory " +
      stats.memory;

    mapEl.innerHTML = "";

    WINGS.forEach((wing) => {
      const rooms = ResonanceRooms.getRoomsByWing(wing.id);
      if (!rooms.length) return;

      const section = document.createElement("section");
      section.className = "wing";
      section.innerHTML =
        '<h2 class="wing__title">' +
        wing.title +
        '</h2><p class="wing__sub">' +
        wing.sub +
        "</p>";

      const list = document.createElement("ul");
      list.className = "room-list";

      rooms.forEach((room) => {
        const unlocked = Resonance.checkUnlock(
          room,
          state,
          ResonanceRooms.ROOMS
        );
        const visited = state.visited.includes(room.id);
        const li = document.createElement("li");

        if (unlocked) {
          const a = document.createElement("a");
          a.className =
            "room-link" + (visited ? " room-link--visited" : "");
          a.href = "room.html?room=" + room.id;
          a.innerHTML =
            '<div><p class="room-link__meta">Layer ' +
            room.layer +
            '</p><p class="room-link__name">' +
            room.title +
            "</p></div>" +
            '<span class="room-link__state">' +
            (visited ? "Visited" : "Enter") +
            "</span>";
          li.appendChild(a);
        } else {
          const div = document.createElement("div");
          div.className = "room-link room-link--locked";
          div.innerHTML =
            '<div><p class="room-link__meta">Layer ' +
            room.layer +
            '</p><p class="room-link__name">' +
            room.title +
            '</p></div><span class="room-link__state">Locked</span>';
          li.appendChild(div);
        }

        list.appendChild(li);
      });

      section.appendChild(list);
      mapEl.appendChild(section);
    });

    const startRoom = char.startRoom;
    const startBtn = document.getElementById("start-room");
    if (startRoom) {
      startBtn.href = "room.html?room=" + startRoom;
      startBtn.classList.remove("hidden");
    }
  }

  document.getElementById("change-char").addEventListener("click", () => {
    const state = Resonance.getState();
    state.character = null;
    Resonance.saveState(state);
    location.reload();
  });

  const state = Resonance.getState();
  if (!state.character) {
    renderCharacters();
  } else {
    renderMap();
  }
})();
