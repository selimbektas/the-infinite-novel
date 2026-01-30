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
  const r = Math.random() * total;

  let acc = 0;
  for (const item of items) {
    acc += item.weight;
    if (r <= acc) return item.value;
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

function clearState() {
  try {
    localStorage.removeItem(KEY_TEXT);
    localStorage.removeItem(KEY_HISTORY);
    localStorage.removeItem(KEY_KEYS);
  } catch (e) {}
}

// --- DOM ---
const novelText = document.getElementById("novelText");
const typeBtn = document.getElementById("typeBtn");
const undoBtn = document.getElementById("undoBtn");
const stats = document.getElementById("stats");
const lastCharEl = document.getElementById("lastChar");
const fakeCaret = document.getElementById("fakeCaret");


// --- State ---
const state = {
  text: "",
  history: [],
  keystrokes: 0,
};

function setLastChar(ch) {
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

function render() {
  novelText.value = state.text;

  // auto-scroll bottom
  novelText.scrollTop = novelText.scrollHeight;

  const chars = state.text.length;
  const words = countWords(state.text);

  stats.textContent = `${chars.toLocaleString()} chars • ${words.toLocaleString()} words • ${state.keystrokes.toLocaleString()} keystrokes`;

  undoBtn.disabled = state.history.length === 0;

  saveState();
}

function typeChar() {
  const ch = generateRandomChar();
  state.history.push(state.text);
  state.text += ch;
  state.keystrokes += 1;
  setLastChar(ch);
  render();
}

function undo() {
  if (state.history.length === 0) return;
  state.text = state.history.pop() || "";
  render();
}

// --- Events ---
typeBtn.addEventListener("click", typeChar);
undoBtn.addEventListener("click", undo);

window.addEventListener("keydown", (e) => {
  // TYPE
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    typeChar();
  }

  // UNDO
  if (e.key === "Backspace") {
    e.preventDefault();
    undo();
  }

  // RESET (debug)
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "r") {
    e.preventDefault();
    clearState();
    state.text = "";
    state.history = [];
    state.keystrokes = 0;
    render();
  }
});

// --- Boot ---
const loaded = loadState();
if (loaded) {
  state.text = loaded.text || "";
  state.history = Array.isArray(loaded.history) ? loaded.history : [];
  state.keystrokes = Number.isFinite(loaded.keystrokes) ? loaded.keystrokes : 0;
}

render();
function positionCaret() {
  // textarea içindeki metnin sonuna caret yerleştirme
  // basit ölçüm: hidden mirror div ile son karakterin pixel konumu hesaplanır
  positionCaret();


  const text = novelText.value;

  const mirror = document.createElement("div");
  const style = window.getComputedStyle(novelText);

  // textarea'nın yazı stilini aynala
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";
  mirror.style.overflowWrap = "break-word";

  mirror.style.fontFamily = style.fontFamily;
  mirror.style.fontSize = style.fontSize;
  mirror.style.lineHeight = style.lineHeight;
  mirror.style.padding = style.padding;
  mirror.style.border = style.border;
  mirror.style.width = style.width;

  // textarea ile aynı scroll durumunu hesaba kat
  mirror.style.height = style.height;

  // textarea içeriği + anchor
  mirror.textContent = text;
  const anchor = document.createElement("span");
  anchor.textContent = "\u200b"; // zero-width space
  mirror.appendChild(anchor);

  // novel container içine koy (ölçüm için)
  const container = novelText.parentElement;
  container.appendChild(mirror);

  const anchorRect = anchor.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  // caret'i konumlandır
  const x = anchorRect.left - containerRect.left;
  const y = anchorRect.top - containerRect.top;

  fakeCaret.style.left = x + "px";
  fakeCaret.style.top = y + "px";

  // cleanup
  container.removeChild(mirror);
}
