// --- Storage keys ---
const KEY_TEXT = "infinite_novel_text";
const KEY_HISTORY = "infinite_novel_history";
const KEY_KEYS = "infinite_novel_keystrokes";

// --- Character pools ---
const lettersLower = "abcçdefgğhıijklmnoöprsştuüvyz";
const lettersUpper = lettersLower.toUpperCase();
const punctuation = [".", ",", ";", ":", "!", "?", "…"];
const rareSymbols = ["—", "“", "”", "(", ")", "[", "]"];

// --- Helpers ---
function randomFromString(s) {
  return s[Math.floor(Math.random() * s.length)];
}

function randomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick(items) {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  let r = Math.random() * total;

  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

function generateRandomChar() {
  const category = weightedPick([
    { value: "letter", weight: 70 },
    { value: "space", weight: 12 },
    { value: "punct", weight: 14 },
    { value: "newline", weight: 2 },
    { value: "rare", weight: 2 },
  ]);

  switch (category) {
    case "letter": {
      const useUpper = Math.random() < 0.1;
      return useUpper
        ? randomFromString(lettersUpper)
        : randomFromString(lettersLower);
    }
    case "space":
      return " ";
    case "punct":
      return randomFromArray(punctuation);
    case "newline":
      return "\n";
    case "rare":
      return randomFromArray(rareSymbols);
    default:
      return " ";
  }
}

function countWords(text) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

// --- Storage ---
function saveState() {
  try {
    localStorage.setItem(KEY_TEXT, state.text);
    localStorage.setItem(KEY_HISTORY, JSON.stringify(state.history));
    localStorage.setItem(KEY_KEYS, String(state.keystrokes));
  } catch (e) {}
}

function loadState() {
  try {
    const text = localStorage.getItem(KEY_TEXT);
    if (text === null) return null;

    const historyRaw = localStorage.getItem(KEY_HISTORY);
    const history = historyRaw ? JSON.parse(historyRaw) : [];

    const keysRaw = localStorage.getItem(KEY_KEYS);
    const keystrokes = keysRaw ? Number(keysRaw) : 0;

    return { text, history, keystrokes };
  } catch (e) {
    return null;
  }
}

// --- DOM ---
const novelText = document.getElementById("novelText");
const typeBtn = document.getElementById("typeBtn");
const undoBtn = document.getElementById("undoBtn");
const stats = document.getElementById("stats");
const lastCharEl = document.getElementById("lastChar");
const fakeCaret = document.getElementById("fakeCaret");
const resetBtn = document.getElementById("resetBtn");


// --- State ---
const state = {
  text: "",
  history: [],
  keystrokes: 0,
};

// --- UI helpers ---
function setLastChar(ch) {
  if (!lastCharEl) return;

  if (!ch) {
    lastCharEl.style.display = "none";
    lastCharEl.textContent = "";
    return;
  }

  lastCharEl.style.display = "inline-block";
  lastCharEl.textContent = ch === "\n" ? "↵" : ch;

  clearTimeout(setLastChar._t);
  setLastChar._t = setTimeout(() => setLastChar(null), 250);
}

function caretFlash() {
  if (!fakeCaret) return;
  fakeCaret.classList.remove("flash");
  // restart animation trick
  void fakeCaret.offsetWidth;
  fakeCaret.classList.add("flash");
}

function escapeHtml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/**
 * ChatGPT-like caret positioning:
 * - We keep textarea visible (normal)
 * - We measure the pixel position of the end of the text using a hidden mirror
 * - Then place #fakeCaret at that point
 */
function positionCaretAtEnd() {
  if (!fakeCaret) return;

  // caret'i .novel container'a göre konumlandıracağız
  const novel = document.querySelector(".novel");
  if (!novel) return;

  const text = novelText.value;

  const taRect = novelText.getBoundingClientRect();
  const taStyle = window.getComputedStyle(novelText);
  const novelRect = novel.getBoundingClientRect();

  // Mirror: textarea ile aynı font/width/padding ile metnin sonunu ölçer
  const mirror = document.createElement("div");
  mirror.setAttribute("aria-hidden", "true");

  mirror.style.position = "fixed";
  mirror.style.left = taRect.left + "px";
  mirror.style.top = taRect.top + "px";
  mirror.style.width = taRect.width + "px";

  mirror.style.visibility = "hidden";
  mirror.style.pointerEvents = "none";

  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordBreak = "break-word";
  mirror.style.overflowWrap = "break-word";

  mirror.style.fontFamily = taStyle.fontFamily;
  mirror.style.fontSize = taStyle.fontSize;
  mirror.style.lineHeight = taStyle.lineHeight;

  mirror.style.padding = taStyle.padding;
  mirror.style.border = taStyle.border;

  // metin + anchor
  const safe = text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

  mirror.innerHTML = safe.replaceAll("\n", "<br/>") + "<span id='__a'>\u200b</span>";

  document.body.appendChild(mirror);

  const anchor = mirror.querySelector("#__a");
  const aRect = anchor.getBoundingClientRect();

  // caret: .novel'a göre left/top
  const left = aRect.left - novelRect.left;
  const top = aRect.top - novelRect.top - novelText.scrollTop;

  fakeCaret.style.left = `${left}px`;
  fakeCaret.style.top = `${top}px`;

  // caret görünür
  fakeCaret.style.opacity = "1";

  document.body.removeChild(mirror);
}


// --- Render ---
function render() {
  novelText.value = state.text;

  // auto-scroll bottom
  novelText.scrollTop = novelText.scrollHeight;

  const chars = state.text.length;
  const words = countWords(state.text);

  stats.textContent = `${chars.toLocaleString()} chars • ${words.toLocaleString()} words • ${state.keystrokes.toLocaleString()} keystrokes`;
  undoBtn.disabled = state.history.length === 0;

  saveState();

  // caret update
  positionCaretAtEnd();
}

// --- Actions ---
function typeChar() {
  const ch = generateRandomChar();

  state.history.push(state.text);
  state.text += ch;
  state.keystrokes += 1;

  setLastChar(ch);
  caretFlash();
  render();
}

function undo() {
  if (state.history.length === 0) return;
  state.text = state.history.pop() || "";
  caretFlash();
  render();
}

// --- Events ---
typeBtn.addEventListener("click", typeChar);
undoBtn.addEventListener("click", undo);
novelText.addEventListener("scroll", () => {
  positionCaretAtEnd();
});


// keyboard shortcuts
window.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    typeChar();
  }

  if (e.key === "Backspace") {
    e.preventDefault();
    undo();
  }
});

// caret should reposition on resize
window.addEventListener("resize", () => {
  positionCaretAtEnd();
});

// --- Boot ---
const loaded = loadState();
if (loaded) {
  state.text = loaded.text || "";
  state.history = Array.isArray(loaded.history) ? loaded.history : [];
  state.keystrokes = Number.isFinite(loaded.keystrokes) ? loaded.keystrokes : 0;
}

render();
// RESET
const resetBtn = document.getElementById("resetBtn");

if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    state.text = "";
    state.history = [];
    state.keystrokes = 0;

    lastCharEl.textContent = "";
    lastCharEl.style.display = "none";

    saveState();
    render();
  });
}

