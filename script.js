/* ============================
   MonkeyType (Free + Daily)
   FINAL
   ============================ */

"use strict";

/* ---------- CONFIG ---------- */

const DAILY_WORDS = [
  "KOD",
  "GUN",
  "RITIM",
  "KARANLIK",
  "ROMAN",
  "MAYMUN",
  "KELIME",
  "RASTGELE",
  "SABIR",
  "SANS",
];

const START_DATE = new Date("2026-01-01T00:00:00Z");

const KEY_FREE = "monkeytype:free:v2";
const KEY_DAILY_PREFIX = "monkeytype:daily:v2:";

/* ---------- STATE ---------- */

const state = {
  mode: "daily",

  free: {
    text: "",
    history: [],
    keystrokes: 0,
  },

  daily: {
    word: "",
    progress: 0,
    keystrokes: 0,
    history: [], // true=correct hit, false=miss
    finished: false,
  },
};

/* ---------- DOM ---------- */

const modeFreeBtn = document.getElementById("modeFree");
const modeDailyBtn = document.getElementById("modeDaily");

const dailyPanel = document.getElementById("dailyPanel");
const dailyWordEl = document.getElementById("dailyWord");
const dailyProgressEl = document.getElementById("dailyProgress");
const shareDailyBtn = document.getElementById("shareDaily");

const novelSection = document.querySelector(".novel");
const novelText = document.getElementById("novelText");

const typeBtn = document.getElementById("typeBtn");
const undoBtn = document.getElementById("undoBtn");
const resetBtn = document.getElementById("resetBtn");

const stats = document.getElementById("stats");
const lastCharEl = document.getElementById("lastChar");
const fakeCaret = document.getElementById("fakeCaret");

/* ---------- DATE / DAILY WORD ---------- */

function todayIndex() {
  const now = new Date();
  const d =
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
    Date.UTC(
      START_DATE.getUTCFullYear(),
      START_DATE.getUTCMonth(),
      START_DATE.getUTCDate()
    );
  return Math.floor(d / 86400000);
}

function wordForToday() {
  const i = todayIndex() % DAILY_WORDS.length;
  return DAILY_WORDS[i].toUpperCase();
}

/* ---------- STORAGE ---------- */

function saveFree() {
  localStorage.setItem(KEY_FREE, JSON.stringify(state.free));
}

function loadFree() {
  const raw = localStorage.getItem(KEY_FREE);
  return raw ? JSON.parse(raw) : null;
}

function dailyKey() {
  return KEY_DAILY_PREFIX + new Date().toISOString().slice(0, 10);
}

function saveDaily() {
  localStorage.setItem(dailyKey(), JSON.stringify(state.daily));
}

function loadDaily() {
  const raw = localStorage.getItem(dailyKey());
  return raw ? JSON.parse(raw) : null;
}

/* ---------- MODE ---------- */

function setMode(m) {
  state.mode = m;

  modeFreeBtn.classList.toggle("active", m === "free");
  modeDailyBtn.classList.toggle("active", m === "daily");

  dailyPanel.style.display = m === "daily" ? "block" : "none";
  novelSection.style.display = m === "free" ? "block" : "none";

  render();
}

modeFreeBtn.onclick = () => setMode("free");
modeDailyBtn.onclick = () => setMode("daily");

/* ---------- RANDOM CHAR ---------- */

const letters = "abcçdefgğhıijklmnoöprsştuüvyz";
const lettersU = letters.toUpperCase();
const punctuation = [".", ",", ";", ":", "!", "?"];

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomChar() {
  const r = Math.random();

  if (r < 0.7) {
    return Math.random() < 0.1 ? rand(lettersU) : rand(letters);
  }
  if (r < 0.82) return " ";
  if (r < 0.96) return rand(punctuation);
  return "\n";
}

/* ---------- FREE MODE ---------- */

function freeType(ch) {
  state.free.text += ch;
  state.free.history.push(ch);
  state.free.keystrokes++;

  if (lastCharEl) {
    lastCharEl.textContent = ch === "\n" ? "↵" : ch;
    lastCharEl.style.display = "inline-flex";
    setTimeout(() => (lastCharEl.style.display = "none"), 300);
  }

  saveFree();
}

function freeUndo() {
  if (!state.free.history.length) return;
  const last = state.free.history.pop();
  state.free.text = state.free.text.slice(0, -last.length);
  state.free.keystrokes++;
  saveFree();
}

function freeReset() {
  state.free = { text: "", history: [], keystrokes: 0 };
  saveFree();
}

/* ---------- DAILY MODE (FIXED MECHANIC) ---------- */

function dailyInit() {
  const w = wordForToday();
  const loaded = loadDaily();

  if (loaded && loaded.word === w) {
    state.daily = loaded;
  } else {
    state.daily = {
      word: w,
      progress: 0,
      keystrokes: 0,
      history: [],
      finished: false,
    };
    saveDaily();
  }
}

function dailyType(ch) {
  if (state.daily.finished) return;

  state.daily.keystrokes++;

  const expected = state.daily.word[state.daily.progress];

  if (ch.toUpperCase() === expected) {
    state.daily.progress++;
    state.daily.history.push(true);
  } else {
    state.daily.history.push(false);
  }

  if (state.daily.progress >= state.daily.word.length) {
    state.daily.finished = true;
    setTimeout(() => {
      alert(`🎉 Completed in ${state.daily.keystrokes} strokes`);
    }, 50);
  }

  saveDaily();
}

function dailyUndo() {
  if (!state.daily.history.length) return;

  const wasCorrect = state.daily.history.pop();
  state.daily.keystrokes++;

  if (wasCorrect && state.daily.progress > 0) {
    state.daily.progress--;
  }

  state.daily.finished = false;
  saveDaily();
}

function dailyReset() {
  state.daily.progress = 0;
  state.daily.keystrokes = 0;
  state.daily.history = [];
  state.daily.finished = false;
  saveDaily();
}

/* ---------- CARET ---------- */

function positionCaretAtEnd() {
  if (state.mode !== "free" || !fakeCaret) {
    if (fakeCaret) fakeCaret.style.opacity = "0";
    return;
  }

  const taRect = novelText.getBoundingClientRect();
  fakeCaret.style.left = taRect.width - 4 + "px";
  fakeCaret.style.top = taRect.height - 24 + "px";
  fakeCaret.style.opacity = "1";
}

/* ---------- RENDER ---------- */

function renderFree() {
  novelText.value = state.free.text;
  const chars = state.free.text.length;
  const words = state.free.text.trim()
    ? state.free.text.trim().split(/\s+/).length
    : 0;

  stats.textContent = `${chars} chars • ${words} words • ${state.free.keystrokes} keystrokes`;
  undoBtn.disabled = !state.free.history.length;
}

function renderDaily() {
  dailyWordEl.textContent = state.daily.word;
  dailyProgressEl.innerHTML = "";

  for (let i = 0; i < state.daily.word.length; i++) {
    const d = document.createElement("div");
    d.className = "slot";

    if (i < state.daily.progress) {
      d.textContent = state.daily.word[i];
      d.style.background = "#b9f8b0";
    } else if (i === state.daily.progress) {
      d.textContent = state.daily.word[i];
      d.style.background = "#222";
      d.style.outline = "2px solid #fff";
    } else {
      d.textContent = "•";
      d.style.opacity = 0.35;
    }

    dailyProgressEl.appendChild(d);
  }

  stats.textContent =
    `${state.daily.keystrokes} keystrokes • ` +
    `${state.daily.progress}/${state.daily.word.length}`;

  undoBtn.disabled = !state.daily.history.length;
}

function render() {
  if (state.mode === "free") renderFree();
  else renderDaily();
}

/* ---------- ACTIONS ---------- */

function handleType() {
  const ch = generateRandomChar();
  if (state.mode === "free") freeType(ch);
  else dailyType(ch);
  render();
}

function handleUndo() {
  if (state.mode === "free") freeUndo();
  else dailyUndo();
  render();
}

function handleReset() {
  if (state.mode === "free") freeReset();
  else dailyReset();
  render();
}

/* ---------- EVENTS ---------- */

typeBtn.onclick = handleType;
undoBtn.onclick = handleUndo;
resetBtn.onclick = handleReset;

window.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    handleType();
  }
  if (e.key === "Backspace") {
    e.preventDefault();
    handleUndo();
  }
});

shareDailyBtn.onclick = () => {
  const msg =
    `MonkeyType Daily\n` +
    `Word: ${state.daily.word}\n` +
    `Score: ${state.daily.keystrokes} strokes`;
  navigator.clipboard.writeText(msg);
  alert("Copied!");
};

/* ---------- BOOT ---------- */

function boot() {
  const f = loadFree();
  if (f) state.free = f;

  dailyInit();
  setMode("daily");
}

boot();
render();
