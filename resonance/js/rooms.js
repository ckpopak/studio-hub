(function (global) {
  "use strict";

  const ROOMS = [
    /* ── Hub ── */
    {
      id: "hub-corridor",
      wing: "hub",
      layer: 0,
      title: "Corridor of Unfinished Sentences",
      eyebrow: "Studio Hub",
      scene: [
        "The walls hold lines that trail off mid-thought.",
        "Someone left a cup here. The tea is still warm, but no one is sitting.",
        "A sentence waits on the far wall — one word missing.",
      ],
      atmosphere: null,
      unlock: { startFor: ["sai"] },
      choices: [
        {
          id: "complete",
          label: "Whisper the missing word.",
          characters: ["sai", "lin"],
          resonance: { type: "phrase", value: "listen" },
          ledger: "I said the word the corridor needed.",
          result: "The sentence closes. A door you had not noticed becomes a frame of light.",
        },
        {
          id: "wait",
          label: "Wait. Let the silence finish it.",
          characters: ["mo", "sai"],
          resonance: { type: "tone", value: "stillness" },
          ledger: "The corridor finished the sentence without me.",
          result: "The missing word was never spoken. The wall accepts that.",
        },
        {
          id: "echo",
          label: "Leave an echo for whoever comes next.",
          characters: ["sai"],
          echo: "…still here",
          echoLabel: "still-here",
          ledger: "I left an echo in the corridor.",
          result: "Your word stays in the air. It will be here when you return.",
        },
      ],
      betweenNotes: {
        text: "Between the unfinished lines, you hear a melody from the gramophone — half a song, perfectly incomplete.",
        resonance: { type: "gap", value: "half-song" },
      },
      links: [{ label: "Return to Hub", href: "index.html" }],
    },

    /* ── QuietLY Layer 1 ── */
    {
      id: "mist-river",
      wing: "quietly",
      layer: 1,
      title: "Mist River Dock",
      eyebrow: "Café QuietLY · 靜",
      scene: [
        "Cold mist. A dock with no boat.",
        "Somewhere downstream, a guqin finds one note and lets it go.",
        "The river does not rush. Neither should you.",
      ],
      atmosphere: "../../channels/quietly/atmosphere.html",
      unlock: { startFor: ["mo"] },
      choices: [
        {
          id: "sit",
          label: "Sit on the dock. Watch the mist.",
          resonance: { type: "tone", value: "patience" },
          ledger: "I sat until the mist forgot I was there.",
          result: "The dock creaks once — acknowledgment, not invitation.",
        },
        {
          id: "hum",
          label: "Hum the note you almost hear.",
          characters: ["mo", "lin"],
          resonance: { type: "phrase", value: "one-note" },
          ledger: "I hummed what the river would not say.",
          result: "The mist thins for a breath. A pavilion appears upstream.",
        },
        {
          id: "close",
          label: "Close your eyes. Listen to the water only.",
          resonance: { type: "tone", value: "stillness" },
          ledger: "Water. Nothing else.",
          result: "When you open your eyes, the dock feels older — as if you have been here before.",
        },
      ],
      betweenNotes: {
        text: "In the pause after the note, you hear footsteps on a mountain path that is not here yet.",
        resonance: { type: "gap", value: "footsteps-ahead" },
      },
      links: [
        { label: "QuietLY Atmosphere", href: "../../channels/quietly/atmosphere.html" },
      ],
    },
    {
      id: "empty-pavilion",
      wing: "quietly",
      layer: 1,
      title: "Empty Pavilion",
      eyebrow: "Café QuietLY · 靜",
      scene: [
        "Bamboo sways. Wind passes through a pavilion with no walls worth mentioning.",
        "A cushion. No occupant.",
        "The room is not empty — it is waiting.",
      ],
      atmosphere: "../../channels/quietly/atmosphere.html",
      unlock: { resonances: [{ type: "tone", value: "patience" }] },
      choices: [
        {
          id: "sit-longer",
          label: "Sit longer than feels necessary.",
          resonance: { type: "tone", value: "patience" },
          ledger: "I stayed past the point of comfort.",
          result: "The wind changes. A desk materializes in the corner — ink not yet black.",
        },
        {
          id: "no-speak",
          label: "Do not speak.",
          characters: ["mo"],
          resonance: { type: "tone", value: "stillness" },
          ledger: "Silence was the only answer.",
          result: "The pavilion accepts your quiet. A path to stone and water opens.",
        },
        {
          id: "name-wind",
          label: "Name the sound the wind makes.",
          resonance: { type: "phrase", value: "wind-name" },
          ledger: "I gave the wind a name it did not ask for.",
          result: "The bamboo stills. For a moment, the pavilion has a voice.",
        },
      ],
      betweenNotes: {
        text: "Between gusts, you hear someone folding paper — a letter that will never leave this room.",
        resonance: { type: "gap", value: "unsent" },
      },
    },
    {
      id: "inkstone-room",
      wing: "quietly",
      layer: 1,
      title: "Inkstone Room",
      eyebrow: "Café QuietLY · 靜",
      scene: [
        "Black stone. Clear water.",
        "The brush has not touched down.",
        "The room waits for a word you do not have yet.",
      ],
      unlock: { visited: ["empty-pavilion"] },
      choices: [
        {
          id: "silent",
          label: "Do not speak.",
          characters: ["mo"],
          resonance: { type: "tone", value: "stillness" },
          ledger: "The inkstone kept its silence. So did I.",
          result: "The water darkens without a brush. That is enough.",
        },
        {
          id: "color",
          label: "Name the color of the water.",
          resonance: { type: "phrase", value: "ink-not-yet-black" },
          ledger: "Not black. Not yet.",
          result: "The word settles on the stone like a drop that has not fallen.",
        },
        {
          id: "hum-hub",
          label: "Hum the melody from the Studio.",
          characters: ["lin", "sai"],
          resonance: { type: "tone", value: "bridge" },
          ledger: "A melody crossed the wing.",
          result: "The ink ripples. Somewhere in Siam, a chair turns toward you.",
        },
      ],
      betweenNotes: {
        text: "Between heartbeats, the character 靜 appears in the water — still, not written.",
        resonance: { type: "phrase", value: "jing" },
      },
    },
  ];

  /* QuietLY Layer 2 */
  ROOMS.push(
    {
      id: "rain-on-tile",
      wing: "quietly",
      layer: 2,
      title: "Rain on Tile",
      eyebrow: "Café QuietLY · 靜",
      scene: [
        "Slow jazz under rainfall.",
        "Each drop writes the same character on the tile, then forgets it.",
        "You are dry here. The music is not.",
      ],
      atmosphere: "../../channels/quietly/atmosphere.html",
      unlock: { resonances: [{ type: "tone", value: "stillness" }] },
      choices: [
        {
          id: "listen-rain",
          label: "Listen to the rain, not the jazz.",
          resonance: { type: "tone", value: "patience" },
          ledger: "Rain first. Music second.",
          result: "The jazz fades to edge. Rain becomes the room.",
        },
        {
          id: "both",
          label: "Let both sounds share the same breath.",
          characters: ["lin"],
          resonance: { type: "tone", value: "bridge" },
          ledger: "Two weathers, one breath.",
          result: "The tile warms. A letter appears on a desk you cannot see yet.",
        },
        {
          id: "leave-word",
          label: "Leave one word on the tile.",
          characters: ["sai"],
          echo: "慢",
          echoLabel: "man-slow",
          ledger: "慢 — slow — I left it on the tile.",
          result: "The character stays when the rain moves on.",
        },
      ],
      betweenNotes: {
        text: "Between drops, a line of Thai script flickers — ช้า ๆ — then dissolves.",
        resonance: { type: "bridge", value: "cha-cha" },
      },
    },
    {
      id: "letter-never-sent",
      wing: "quietly",
      layer: 2,
      title: "Letter Never Sent",
      eyebrow: "Café QuietLY · 靜",
      scene: [
        "One folded paper on a desk.",
        "The seal is unbroken because the words were never finished.",
        "Outside, rain has stopped pretending to be gentle.",
      ],
      unlock: { resonances: [{ type: "gap", value: "unsent" }] },
      choices: [
        {
          id: "not-open",
          label: "Do not open it.",
          characters: ["mo"],
          resonance: { type: "tone", value: "stillness" },
          ledger: "Some letters are meant to stay folded.",
          result: "The paper yellows with patience, not age.",
        },
        {
          id: "finish",
          label: "Whisper how the letter should end.",
          characters: ["lin", "sai"],
          resonance: { type: "phrase", value: "soft-ending" },
          ledger: "I finished a sentence that was not mine.",
          result: "The seal loosens without breaking. The room exhales.",
        },
        {
          id: "echo-letter",
          label: "Leave an echo inside the fold.",
          characters: ["sai"],
          echo: "if you are reading this, you stayed",
          echoLabel: "reading-this",
          ledger: "An echo inside the letter.",
          result: "The paper holds your warmth. It will remember.",
        },
      ],
    },
    {
      id: "quiet-market",
      wing: "quietly",
      layer: 3,
      title: "The Quiet Market",
      eyebrow: "Café QuietLY · 靜",
      scene: [
        "Vendors sell only sounds.",
        "One stall: the click of a teacup. Another: a word for distance.",
        "No one haggles. You listen, you choose.",
      ],
      unlock: {
        visited: ["rain-on-tile", "letter-never-sent"],
        minPosture: { depth: 2 },
      },
      choices: [
        {
          id: "buy-stillness",
          label: "Take the sound of stillness.",
          resonance: { type: "tone", value: "stillness" },
          ledger: "I bought stillness. It cost nothing.",
          result: "The vendor bows. The market folds into mist behind you.",
        },
        {
          id: "translate",
          label: "Ask for the word in two languages.",
          characters: ["lin"],
          resonance: { type: "bridge", value: "slowly-cha" },
          ledger: "慢 — ช้า ๆ — the same slowness.",
          result: "Both words ring true. A door to The Between hums open.",
        },
        {
          id: "leave-echo-market",
          label: "Leave your echo at the last stall.",
          characters: ["sai"],
          echo: "thank you for listening",
          echoLabel: "thanks-listening",
          ledger: "I thanked a market that sells sounds.",
          result: "The vendors smile without faces. The stall stays lit.",
        },
      ],
      ending: {
        character: "mo",
        title: "The Note That Does Not Resolve",
        text: "A melody refuses its last note. You choose not to complete it. The gramophone in the Hub will play half a song forever — on purpose.",
      },
    }
  );

  /* ── Siam Layer 1 ── */
  ROOMS.push(
    {
      id: "rain-on-teak",
      wing: "siam",
      layer: 1,
      title: "Rain on Teak",
      eyebrow: "Café Siam · ไทย",
      scene: [
        "The café is empty except for one chair pulled out, as if someone stood up mid-sentence.",
        "Rain writes on the windows in a language you almost know.",
        "Under it, a soft line repeats — English, then Thai, then silence.",
      ],
      atmosphere: "../../channels/siam/enthp/",
      unlock: { startFor: ["lin"] },
      choices: [
        {
          id: "wait-line",
          label: "Sit. Wait for the line to finish.",
          characters: ["mo", "lin"],
          resonance: { type: "tone", value: "patience" },
          ledger: "I waited for the sentence to end.",
          result: "The line completes in silence. A second table appears across the room.",
        },
        {
          id: "whisper-thai",
          label: "Whisper the Thai line back.",
          characters: ["lin"],
          resonance: { type: "phrase", value: "cha-cha" },
          ledger: "ช้า ๆ ก็ได้ — slowly is fine.",
          result: "The rain slows. A corner booth materializes — Japanese script on the menu.",
        },
        {
          id: "leave-almost",
          label: "Leave the word you almost said.",
          characters: ["sai"],
          echo: "almost",
          echoLabel: "almost",
          ledger: "I left the word on the table.",
          result: "The chair turns toward you. On your next visit, it will remember.",
        },
        {
          id: "rain-only",
          label: "Close your eyes. Rain only.",
          resonance: { type: "tone", value: "stillness" },
          ledger: "Rain. No language.",
          result: "When you look again, mist from another wing touches the glass.",
        },
      ],
      betweenNotes: {
        text: "Beneath the repeat, a third language — not sung, only breathed.",
        resonance: { type: "gap", value: "third-language" },
      },
      links: [
        { label: "EN×TH Atmosphere", href: "../../channels/siam/enthp/" },
      ],
    },
    {
      id: "mirror-table",
      wing: "siam",
      layer: 1,
      title: "Mirror Table",
      eyebrow: "Café Siam · ไทย",
      scene: [
        "Two cups. One conversation reflected in teak.",
        "Thai first, then English — or the other way around. The room does not mind.",
        "Someone left a napkin with one word circled twice.",
      ],
      atmosphere: "../../channels/siam/thenth/",
      unlock: { visited: ["rain-on-teak"] },
      choices: [
        {
          id: "repeat",
          label: "Repeat the line until it changes.",
          characters: ["lin"],
          resonance: { type: "tone", value: "curiosity" },
          ledger: "The same line, different weight each time.",
          result: "On the fourth repeat, the meaning shifts — not the words.",
        },
        {
          id: "translate",
          label: "Offer a translation the room accepts.",
          characters: ["lin"],
          resonance: { type: "bridge", value: "shared-meaning" },
          ledger: "Not the same word. The same feeling.",
          result: "Both cups steam at once. Hospitality becomes a Resonance.",
        },
        {
          id: "listen",
          label: "Listen without answering.",
          characters: ["mo"],
          resonance: { type: "tone", value: "patience" },
          ledger: "I let the table speak both languages alone.",
          result: "The reflection in the teak deepens. You see a kitchen light.",
        },
      ],
      links: [
        { label: "TH×EN room", href: "../../channels/siam/thenth/" },
      ],
    },
    {
      id: "late-table-enthp",
      wing: "siam",
      layer: 1,
      title: "Late Table",
      eyebrow: "Café Siam · EN×TH",
      scene: [
        "Past midnight. The café should be closed.",
        "One table still set. Two languages on the menu, one song at the edge.",
        "The waiter is the rain.",
      ],
      unlock: { visited: ["rain-on-teak"] },
      choices: [
        {
          id: "order-silence",
          label: "Order silence.",
          characters: ["mo"],
          resonance: { type: "tone", value: "stillness" },
          ledger: "Silence. Served warm.",
          result: "The rain approves. The kitchen light flickers on.",
        },
        {
          id: "one-line",
          label: "Speak one clear line in each language.",
          characters: ["lin"],
          resonance: { type: "phrase", value: "clear-line" },
          ledger: "One line. Two tongues. Same table.",
          result: "The song moves closer. Five tables feel like one house.",
        },
        {
          id: "echo-late",
          label: "Leave an echo for the next late guest.",
          characters: ["sai"],
          echo: "you are welcome to sit",
          echoLabel: "welcome-sit",
          ledger: "Welcome, to whoever comes late.",
          result: "The table settings shift — a third cup, just in case.",
        },
      ],
      links: [
        { label: "Enter EN×TH café", href: "../../channels/siam/enthp/" },
      ],
    }
  );

  /* Siam Layer 2–3 */
  ROOMS.push(
    {
      id: "jpth-corner",
      wing: "siam",
      layer: 2,
      title: "JP×TH Corner",
      eyebrow: "Café Siam",
      scene: [
        "A corner booth. Japanese script meets Thai script on the same napkin.",
        "The music is soft enough to count syllables.",
        "Distance feels shorter here — not gone, just held differently.",
      ],
      atmosphere: "../../channels/siam/jpth/",
      unlock: { resonances: [{ type: "phrase", value: "cha-cha" }] },
      choices: [
        {
          id: "count",
          label: "Count the syllables in both lines.",
          characters: ["lin", "mo"],
          resonance: { type: "tone", value: "curiosity" },
          ledger: "Different counts. Same pause.",
          result: "The booth widens. A window opens to 中文×TH.",
        },
        {
          id: "bridge-phrase",
          label: "Speak one resonant phrase across both.",
          characters: ["lin"],
          resonance: { type: "bridge", value: "jp-th-bridge" },
          ledger: "ゆっくり — ช้า ๆ — slowly, in both.",
          result: "The napkin absorbs the phrase. The kitchen smells of lime.",
        },
      ],
      links: [{ label: "JP×TH café", href: "../../channels/siam/jpth/" }],
    },
    {
      id: "kitchen-after-close",
      wing: "siam",
      layer: 3,
      title: "The Kitchen After Close",
      eyebrow: "Café Siam · ไทย",
      scene: [
        "Pots settling. One light.",
        "The staff have gone. The room still serves warmth.",
        "This is where all five tables meet — if you have sat at enough of them.",
      ],
      unlock: {
        visited: ["late-table-enthp", "mirror-table", "jpth-corner"],
        minPosture: { span: 2 },
      },
      choices: [
        {
          id: "wash-cup",
          label: "Wash a cup that is already clean.",
          resonance: { type: "tone", value: "hospitality" },
          ledger: "A clean cup. A quiet ritual.",
          result: "The light softens. The Between opens — subtitles in the air.",
        },
        {
          id: "hum-kitchen",
          label: "Hum what the pots remember.",
          characters: ["sai"],
          echo: "home",
          echoLabel: "home",
          ledger: "The kitchen hummed back.",
          result: "Your echo joins the settling metal. The house feels whole.",
        },
      ],
      ending: {
        character: "lin",
        title: "The Phrase That Holds Both",
        text: "You speak one line true in two languages and false in neither. The tables empty. The lights stay on. You did not choose a language — you chose the listener.",
      },
    }
  );

  /* ── The Between ── */
  ROOMS.push(
    {
      id: "silence-subtitles",
      wing: "between",
      layer: 1,
      title: "Silence With Subtitles",
      eyebrow: "The Between",
      scene: [
        "Pure quiet.",
        "Words appear in the air — optional. Mandarin. Thai. English.",
        "You may read them. You may not. The room does not require literacy.",
      ],
      unlock: { minResonances: 6, minPosture: { depth: 1, span: 1 } },
      choices: [
        {
          id: "read",
          label: "Read the subtitles.",
          characters: ["lin"],
          resonance: { type: "bridge", value: "all-tongues" },
          ledger: "Three languages. One silence.",
          result: "The subtitles fade. What remains is understood.",
        },
        {
          id: "ignore",
          label: "Ignore the words. Listen deeper.",
          characters: ["mo"],
          resonance: { type: "tone", value: "stillness" },
          ledger: "I did not read. I heard.",
          result: "The silence grows teeth — gentle ones. It holds you.",
        },
        {
          id: "echo-between",
          label: "Leave an echo in the silence.",
          characters: ["sai"],
          echo: "…",
          echoLabel: "ellipsis",
          ledger: "An echo with no words.",
          result: "The Between remembers. All wings are visible from the Hub.",
        },
      ],
      ending: {
        character: "sai",
        title: "The Echo Answered",
        text: "You return to every room where an echo was left. Each one has been answered — by you, on a prior visit. The Studio was never empty. It was waiting for you to come back.",
      },
    }
  );

  function getRoom(id) {
    return ROOMS.find((r) => r.id === id) || null;
  }

  function getRoomsByWing(wing) {
    return ROOMS.filter((r) => r.wing === wing);
  }

  global.ResonanceRooms = {
    ROOMS,
    getRoom,
    getRoomsByWing,
  };
})(typeof window !== "undefined" ? window : globalThis);
