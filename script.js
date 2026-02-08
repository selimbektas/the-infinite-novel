/* ============================
   MonkeyType (Free + Daily)
   script.js (merged)
   ============================ */

"use strict";

/* ---------- CONFIG ---------- */
// tiny daily word list (örnek). Genişlet/yerine words.json kullanabilirsin.
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

// start date for rotating daily word
const START_DATE = new Date("2026-01-01T00:00:00Z");

// persistence keys
const KEY_FREE = "monkeytype:free:v1";
const KEY_DAILY_PREFIX = "monkeytype:daily:";

/* ---------- STATE ---------- */
const state = {
  mode: "free", // 'free' or 'daily'
  // free-mode
  free: {
    text: "",
    history: [],
    keystrokes: 0,
  },
  // daily-mode (per day object)
  daily: {
    word: "",
    stream: "", // all typed chars (visible)
    history: [], // chars stack for undo
    progress: 0, // how many letters of word matched (prefix)
    keystrokes: 0,
    finished: false,
  },
};

/* ---------- DOM ---------- */
const modeFreeBtn = document.getElementById("modeFree");
const modeDailyBtn = document.getElementById("modeDaily");
const dailyPanel = document.getElementById("dailyPanel");
const dailyWordEl = document.getElementById("dailyWord");
const dailyProgressEl = document.getElementById("dailyProgress");
const dailyStreamEl = document.getElementById("dailyStream");
const shareDailyBtn = document.getElementById("shareDaily");

const novelSection = document.querySelector(".novel");
const novelText = document.getElementById("novelText");
const typeBtn = document.getElementById("typeBtn");
const undoBtn = document.getElementById("undoBtn");
const resetBtn = document.getElementById("resetBtn");
const stats = document.getElementById("stats");
const lastCharEl = document.getElementById("lastChar");
const fakeCaret = document.getElementById("fakeCaret");

/* ---------- UTIL ---------- */
function todayKey() {
  const now = new Date();
  const dayIndex = Math.floor(
    (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
      Date.UTC(
        START_DATE.getUTCFullYear(),
        START_DATE.getUTCMonth(),
        START_DATE.getUTCDate()
      )) /
      86400000
  );
  return dayIndex;
}

function wordForToday() {
  const idx = todayKey() % DAILY_WORDS.length;
  return DAILY_WORDS[idx].toUpperCase();
}

function saveFree() {
  try {
    localStorage.setItem(KEY_FREE, JSON.stringify(state.free));
  } catch (_) {}
}

function loadFree() {
  try {
    const raw = localStorage.getItem(KEY_FREE);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function saveDailyFor(dateKey) {
  try {
    localStorage.setItem(KEY_DAILY_PREFIX + dateKey, JSON.stringify(state.daily));
  } catch (_) {}
}

function loadDailyFor(dateKey) {
  try {
    const raw = localStorage.getItem(KEY_DAILY_PREFIX + dateKey);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

/* ---------- MODE SWITCH ---------- */
function setMode(m) {
  state.mode = m;
  if (m === "free") {
    modeFreeBtn.classList.add("active");
    modeDailyBtn.classList.remove("active");
    dailyPanel.style.display = "none";
    if (novelSection) {
      novelSection.style.display = "block";
    }
    novelText.style.display = "block";
  } else {
    modeFreeBtn.classList.remove("active");
    modeDailyBtn.classList.add("active");
    dailyPanel.style.display = "block";
    if (novelSection) {
      novelSection.style.display = "none";
    }
    novelText.style.display = "none";
  }
  render();
}

modeFreeBtn.addEventListener("click", () => setMode("free"));
modeDailyBtn.addEventListener("click", () => setMode("daily"));

/* ---------- FREE MODE (basit, mevcut davranış) ---------- */
function freeTypeChar(ch) {
  state.free.text += ch;
  state.free.history.push(ch);
  state.free.keystrokes += 1;

  if (lastCharEl) {
    lastCharEl.textContent = ch === "\n" ? "↵" : ch;
    lastCharEl.style.display = "inline-flex";
    clearTimeout(freeTypeChar._t);
    freeTypeChar._t = setTimeout(() => {
      lastCharEl.style.display = "none";
    }, 250);
  }
  saveFree();
  render();
}

function freeUndo() {
  if (state.free.history.length === 0) return;
  const last = state.free.history.pop();
  state.free.text = state.free.text.slice(0, -last.length);
  state.free.keystrokes += 1;
  saveFree();
  render();
}

function freeReset() {
  state.free.keystrokes += 1;
  state.free.text = "";
  state.free.history = [];
  saveFree();
  render();
}

/* ---------- DAILY MODE ---------- */
/* Daily rules:
   - word is visible
   - every generated char appended to stream
   - if a generated char equals word[progress], then progress++ (prefix matched)
   - undo pops last char from stream and reverts progress if necessary
   - goal: reach progress == word.length with minimum keystrokes
*/

function dailyInit() {
  const w = wordForToday();
  state.daily.word = w;
  const dayKey = new Date().toISOString().slice(0, 10);
  const loaded = loadDailyFor(dayKey);
  if (loaded && loaded.word === w) {
    // restore
    state.daily = Object.assign(state.daily, loaded);
  } else {
    // fresh
    state.daily.stream = "";
    state.daily.history = [];
    state.daily.progress = 0;
    state.daily.keystrokes = 0;
    state.daily.finished = false;
    saveDailyFor(dayKey);
  }
}

function dailyTypeChar(ch) {
  if (state.daily.finished) return;
  state.daily.stream += ch;
  state.daily.history.push(ch);
  state.daily.keystrokes += 1;

  // if correct next char, advance progress
  const expected = state.daily.word.charAt(state.daily.progress);
  if (ch === expected) {
    state.daily.progress += 1;
  }

  // check win
  if (state.daily.progress >= state.daily.word.length) {
    state.daily.finished = true;
  }

  saveDailyFor(new Date().toISOString().slice(0, 10));
  render();
}

function dailyUndo() {
  if (state.daily.history.length === 0) return;
  const last = state.daily.history.pop();
  state.daily.stream = state.daily.stream.slice(0, -last.length);
  state.daily.keystrokes += 1;

  // if last char was part of progress (i.e., it matched the char at progress-1),
  // we need to recompute progress conservatively: recompute by scanning stream
  const w = state.daily.word;
  let p = 0;
  for (let i = 0; i < state.daily.stream.length; i++) {
    if (state.daily.stream[i] === w[p]) p++;
    if (p >= w.length) break;
  }
  state.daily.progress = p;
  state.daily.finished = p >= w.length;

  saveDailyFor(new Date().toISOString().slice(0, 10));
  render();
}

function dailyReset() {
  state.daily.keystrokes += 1;
  state.daily.stream = "";
  state.daily.history = [];
  state.daily.progress = 0;
  state.daily.finished = false;
  saveDailyFor(new Date().toISOString().slice(0, 10));
  render();
}

/* ---------- RANDOM GENERATOR (shared) ---------- */
// Use previous random char generator (lighter)
const lettersLower = "abcçdefgğhıijklmnoöprsştuüvyz";
const lettersUpper = lettersLower.toUpperCase();
const punctuation = [".", ",", ";", ":", "!", "?", "…"];
const rareSymbols = ["—", "“", "”", "(", ")", "[", "]"];

function weightedPick(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= it.weight;
    if (r <= 0) return it.value;
  }
  return items[items.length - 1].value;
}

function generateRandomChar() {
  const cat = weightedPick([
    { value: "letter", weight: 70 },
    { value: "space", weight: 12 },
    { value: "punct", weight: 14 },
    { value: "newline", weight: 2 },
    { value: "rare", weight: 2 },
  ]);
  switch (cat) {
    case "letter":
      return Math.random() < 0.1
        ? lettersUpper[Math.floor(Math.random() * lettersUpper.length)]
        : lettersLower[Math.floor(Math.random() * lettersLower.length)];
    case "space":
      return " ";
    case "punct":
      return punctuation[Math.floor(Math.random() * punctuation.length)];
    case "newline":
      return "\n";
    case "rare":
      return rareSymbols[Math.floor(Math.random() * rareSymbols.length)];
    default:
      return " ";
  }
}

/* ---------- RENDER ---------- */
function renderFreeUI() {
  novelText.value = state.free.text;
  // caret & stats reused
  const chars = state.free.text.length;
  const words = state.free.text.trim()
    ? state.free.text.trim().split(/\s+/).length
    : 0;
  stats.textContent = `${chars} chars • ${words} words • ${state.free.keystrokes} keystrokes`;
  undoBtn.disabled = state.free.history.length === 0;
  resetBtn.disabled = false;
  positionCaretAtEnd();
}

function renderDailyUI() {
  // show word
  dailyWordEl.textContent = state.daily.word;
  // progress slots
  dailyProgressEl.innerHTML = "";
  for (let i = 0; i < state.daily.word.length; i++) {
    const slot = document.createElement("div");
    slot.className = "slot";
    if (i < state.daily.progress) {
      slot.textContent = state.daily.word[i];
      slot.style.background = "linear-gradient(180deg,#d9ffd6,#b9f8b0)";
    } else {
      slot.textContent = "•";
      slot.style.opacity = "0.35";
    }
    dailyProgressEl.appendChild(slot);
  }
  // stream slots
  dailyStreamEl.innerHTML = "";
  const streamWindow = state.daily.stream.slice(-state.daily.word.length);
  for (let i = 0; i < state.daily.word.length; i++) {
    const slot = document.createElement("div");
    slot.className = "slot";
    if (i < streamWindow.length) {
      slot.textContent = streamWindow[i];
    } else {
      slot.textContent = "•";
      slot.classList.add("empty");
    }
    dailyStreamEl.appendChild(slot);
  }

  // stats area reuse: show keystrokes and progress
  stats.textContent = `${state.daily.keystrokes} keystrokes • progress ${state.daily.progress}/${state.daily.word.length}`;
  undoBtn.disabled = state.daily.history.length === 0;
  resetBtn.disabled = false;
}

/* shared render */
function render() {
  if (state.mode === "free") {
    renderFreeUI();
  } else {
    renderDailyUI();
  }
}

/* ---------- CARET (mirror method - stable) ---------- */
function positionCaretAtEnd() {
  if (!fakeCaret) return;
  // We will measure textarea only when free mode visible
  if (state.mode !== "free") {
    fakeCaret.style.opacity = "0";
    return;
  }

  const novel = document.querySelector(".novel");
  if (!novel || !novelText) return;
  const taRect = novelText.getBoundingClientRect();
  const novelRect = novel.getBoundingClientRect();
  const s = getComputedStyle(novelText);

  const mirror = document.createElement("div");
  mirror.setAttribute("aria-hidden", "true");
  mirror.style.position = "fixed";
  mirror.style.left = `${taRect.left}px`;
  mirror.style.top = `${taRect.top}px`;
  mirror.style.width = `${taRect.width}px`;
  mirror.style.visibility = "hidden";
  mirror.style.pointerEvents = "none";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordBreak = "break-word";
  mirror.style.overflowWrap = "break-word";
  mirror.style.fontFamily = s.fontFamily;
  mirror.style.fontSize = s.fontSize;
  mirror.style.fontWeight = s.fontWeight;
  mirror.style.lineHeight = s.lineHeight;
  mirror.style.padding = s.padding;
  mirror.style.border = s.border;
  mirror.style.boxSizing = "border-box";

  mirror.textContent = state.free.text || "";
  const anchor = document.createElement("span");
  anchor.textContent = "\u200b";
  mirror.appendChild(anchor);

  document.body.appendChild(mirror);
  const aRect = anchor.getBoundingClientRect();
  const left = aRect.left - novelRect.left;
  const top = aRect.top - novelRect.top - novelText.scrollTop;

  fakeCaret.style.left = `${left}px`;
  fakeCaret.style.top = `${top}px`;
  fakeCaret.style.opacity = "1";

  document.body.removeChild(mirror);
}

/* ---------- ACTION BINDINGS ---------- */
function handleType() {
  const ch = generateRandomChar();
  if (state.mode === "free") {
    freeTypeChar(ch);
  } else {
    dailyTypeChar(ch);
  }
}

function handleUndo() {
  if (state.mode === "free") freeUndo();
  else dailyUndo();
}

function handleReset() {
  if (state.mode === "free") {
    freeReset();
    return;
  }
  dailyReset();
}

/* ---------- EVENTS ---------- */
typeBtn.addEventListener("click", handleType);
undoBtn.addEventListener("click", handleUndo);
resetBtn.addEventListener("click", handleReset);

window.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    handleType();
    return;
  }
  if (e.key === "Backspace") {
    e.preventDefault();
    handleUndo();
    return;
  }
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "x") {
    e.preventDefault();
    handleReset();
    return;
  }
});

novelText.addEventListener("scroll", positionCaretAtEnd);
window.addEventListener("resize", positionCaretAtEnd);

/* ---------- DAILY SHARE ---------- */
shareDailyBtn.addEventListener("click", () => {
  if (!state.daily.word) return;
  const score = `${state.daily.keystrokes} keystrokes`;
  const msg = `MonkeyType — ${new Date().toISOString().slice(0, 10)}\nWord: ${state.daily.word}\nScore: ${score}\n\n${state.daily.stream}`;
  navigator.clipboard
    ?.writeText(msg)
    .then(
      () => alert("Copied results to clipboard!"),
      () => alert("Copy failed.")
    );
});


/* ---------- BOOT ---------- */
function boot() {
  // load free
  const f = loadFree();
  if (f) {
    state.free = Object.assign(state.free, f);
  }

  // init daily
  dailyInit();

  // default mode: free
  setMode("daily");
  render();
}

boot();
