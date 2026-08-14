(function () {
  "use strict";

  const state = Resonance.getState();

  const glyphsEl = document.getElementById("glyphs");
  state.resonances.forEach((r) => {
    const span = document.createElement("span");
    span.className = "glyph";
    span.textContent = r.value;
    span.title = r.type + " · " + (r.room || "");
    glyphsEl.appendChild(span);
  });

  const ledgerEl = document.getElementById("ledger");
  if (!state.ledger.length) {
    ledgerEl.innerHTML =
      '<p class="lead">No lines yet. Enter a room and listen — your words will gather here.</p>';
    return;
  }

  [...state.ledger].reverse().forEach((entry) => {
    const room = ResonanceRooms.getRoom(entry.room);
    const div = document.createElement("div");
    div.className = "ledger-entry";
    div.innerHTML =
      '<p class="ledger-entry__room">' +
      (room ? room.title : entry.room) +
      '</p><p class="ledger-entry__line">“' +
      entry.line +
      "”</p>";
    ledgerEl.appendChild(div);
  });

  document.getElementById("export-btn").addEventListener("click", () => {
    const text = Resonance.exportLedger();
    navigator.clipboard.writeText(text).then(() => {
      document.getElementById("export-btn").textContent = "Copied";
      setTimeout(() => {
        document.getElementById("export-btn").textContent = "Copy ledger";
      }, 2000);
    });
  });

  document.getElementById("reset-btn").addEventListener("click", () => {
    if (
      confirm(
        "Clear all Resonances, echoes, and ledger entries? This cannot be undone."
      )
    ) {
      Resonance.resetState();
      location.reload();
    }
  });
})();
