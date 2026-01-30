/* =========================================================
   THE INFINITE NOVEL
   script.js (clean + stable)
   ========================================================= */

"use strict";

/* ---------------------------
   Config
--------------------------- */

// Random pool (letters + punctuation + whitespace)
const CHAR_POOL = [
  ..."abcdefghijklmnopqrstuvwxyz",
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  ..."0123456789",
  ..."ğüşıöçĞÜŞİÖÇ",
  ..." .,;:!?—-()[]{}'\"/\\",
  "\n",
];

// localStorage key
const STORAGE_KEY = "the-infinite-novel:v1";

/* ---------------------------
   State
--------------------------- */

const state = {
  text: "",
  history: [], // stack of appended chars
  keystrokes: 0,
};

/* ---------------------------
   DOM
--------------------------- */

const novelText = document.getElementById("novelText");
const typeBtn = document.getElementById("typeBtn");
const undoBtn = document.getElementById("undoBtn");
const resetBtn = document.getElementById("resetBtn"); // optional
const stats = document.getElementById("stats");
const lastCharEl = document.getElementById("lastChar");
const fakeCaret = document.getElementById("fakeCaret");

/* ---------------------------
   Utils
--------------------------- */

function pickRandomChar() {
  const idx = Math.floor(Math.random() * CHAR_POOL.length);
  return CHAR_POOL[idx];
}

function countWords(str) {
  const trimmed = str.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

function escapeVisibleChar(ch) {
  if (ch === "\n") return "↵";
  if (ch === " ") return "␠";
  if (ch === "\t") return "⇥";
  return ch;
}

/* ---------------------------
   Persistence
--------------------------- */

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

/* ---------------------------
   Caret (fake)
   - Mirrors textarea to measure where the text ends
   - Supports wrapping + scroll
--------------------------- */

function positionCaretAtEnd() {
  if (!fakeCaret || !novelText) return;

  const novel = document.querySelector(".novel");
  if (!novel) return;

  const taRect = novelText.getBoundingClientRect();
  const novelRect = novel.getBoundingClientRect();
  const s = getComputedStyle(novelText);

  const mirror = document.createElement("div");
  mirror.setAttribute("aria-hidden", "true");

  // place mirror exactly on top of textarea (viewport coordinates)
  mirror.style.position = "fixed";
  mirror.style.left = `${taRect.left}px`;
  mirror.style.top = `${taRect.top}px`;
  mirror.style.width = `${taRect.width}px`;

  mirror.style.visibility = "hidden";
  mirror.style.pointerEvents = "none";

  // match textarea behavior
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

  // same text
  mirror.textContent = novelText.value;

  // anchor at the end
  const anchor = document.createElement("span");
  anchor.textContent = "\u200b";
  mirror.appendChild(anchor);

  document.body.appendChild(mirror);

  const aRect = anchor.getBoundingClientRect();

  // convert viewport coords -> .novel local coords
  const left = aRect.left - novelRect.left;
  const top = aRect.top - novelRect.top - novelText.scrollTop;

  fakeCaret.style.left = `${left}px`;
  fakeCaret.style.top = `${top}px`;
  fakeCaret.style.opacity = "1";

  document.body.removeChild(mirror);
}

function caretFlash() {
  if (!fakeCaret) return;
  fakeCaret.classList.remove("flash");
  // force reflow
  void fakeCaret.offsetWidth;
  fakeCaret.classList.add("flash");
}

/* ---------------------------
   Render
--------------------------- */

function render() {
  novelText.value = state.text;

  // stats
  const chars = state.text.length;
  const words = countWords(state.text);

  stats.textContent = `${chars} chars • ${words} words • ${state.keystrokes} keystrokes`;

  // undo button enabled?
  undoBtn.disabled = state.history.length === 0;

  // caret
  positionCaretAtEnd();
}

/* ---------------------------
   Actions
--------------------------- */

function typeChar() {
  const ch = pickRandomChar();

  state.text += ch;
  state.history.push(ch);
  state.keystrokes += 1;

  // last char chip
  if (lastCharEl) {
    lastCharEl.textContent = escapeVisibleChar(ch);
    lastCharEl.style.display = "inline-flex";
  }

  saveState();
  render();
  caretFlash();

  // keep view at bottom-ish (optional)
  // novelText.scrollTop = novelText.scrollHeight;
}

function undo() {
  if (state.history.length === 0) return;

  const last = state.history.pop();
  state.text = state.text.slice(0, -last.length);

  state.keystrokes += 1;

  saveState();
  render();
  caretFlash();
}

function resetAll() {
  state.text = "";
  state.history = [];
  state.keystrokes = 0;

  if (lastCharEl) {
    lastCharEl.textContent = "";
    lastCharEl.style.display = "none";
  }

  saveState();
  render();
  caretFlash();
}

/* ---------------------------
   Events
--------------------------- */

// buttons
typeBtn.addEventListener("click", typeChar);
undoBtn.addEventListener("click", undo);

if (resetBtn) {
  resetBtn.addEventListener("click", resetAll);
}

// scroll + resize
novelText.addEventListener("scroll", positionCaretAtEnd);
window.addEventListener("resize", positionCaretAtEnd);

// keyboard shortcuts
window.addEventListener("keydown", (e) => {
  // type
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    typeChar();
    return;
  }

  // undo
  if (e.key === "Backspace") {
    e.preventDefault();
    undo();
    return;
  }

  // reset: Ctrl+Shift+X
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "x") {
    e.preventDefault();
    resetAll();
    return;
  }
});

/* ---------------------------
   Boot
--------------------------- */

const loaded = loadState();
if (loaded) {
  state.text = typeof loaded.text === "string" ? loaded.text : "";
  state.history = Array.isArray(loaded.history) ? loaded.history : [];
  state.keystrokes = Number.isFinite(loaded.keystrokes) ? loaded.keystrokes : 0;
}

render();
