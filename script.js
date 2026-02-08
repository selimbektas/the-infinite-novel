"use strict";

/* ================= CONFIG ================= */

const DAILY_WORDS = [
  "KOD","GUN","RITIM","KARANLIK","ROMAN",
  "MAYMUN","KELIME","RASTGELE","SABIR","SANS"
];

const START_DATE = new Date("2026-01-01T00:00:00Z");

const KEY_FREE = "monkeytype:free:final";
const KEY_DAILY = "monkeytype:daily:final:";

/* ================= STATE ================= */

const state = {
  mode: "daily",
  free: { text:"", history:[], keystrokes:0 },
  daily: { word:"", progress:0, keystrokes:0, history:[], finished:false }
};

/* ================= DOM ================= */

const novelText = document.getElementById("novelText");
const fakeCaret = document.getElementById("fakeCaret");

const typeBtn = document.getElementById("typeBtn");
const undoBtn = document.getElementById("undoBtn");
const resetBtn = document.getElementById("resetBtn");
const shareBtn = document.getElementById("shareDaily");

const stats = document.getElementById("stats");

const modeDailyBtn = document.getElementById("modeDaily");
const modeFreeBtn = document.getElementById("modeFree");

const dailyPanel = document.getElementById("dailyPanel");
const dailyWordEl = document.getElementById("dailyWord");
const dailyProgEl = document.getElementById("dailyProgress");

/* ================= DATE ================= */

function todayIndex(){
  const now = new Date();
  return Math.floor(
    (Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()) -
     Date.UTC(START_DATE.getUTCFullYear(),START_DATE.getUTCMonth(),START_DATE.getUTCDate()))
     / 86400000
  );
}

function wordForToday(){
  return DAILY_WORDS[todayIndex() % DAILY_WORDS.length].toUpperCase();
}

/* ================= STORAGE ================= */

function saveFree(){ localStorage.setItem(KEY_FREE, JSON.stringify(state.free)); }
function loadFree(){ return JSON.parse(localStorage.getItem(KEY_FREE)||"null"); }

function dailyKey(){ return KEY_DAILY + new Date().toISOString().slice(0,10); }
function saveDaily(){ localStorage.setItem(dailyKey(), JSON.stringify(state.daily)); }
function loadDaily(){ return JSON.parse(localStorage.getItem(dailyKey())||"null"); }

/* ================= MODE ================= */

function setMode(m){
  state.mode = m;

  modeDailyBtn.classList.toggle("active", m==="daily");
  modeFreeBtn.classList.toggle("active", m==="free");

  dailyPanel.style.display = m==="daily" ? "block":"none";
  novelText.style.display = m==="free" ? "block":"none";
  fakeCaret.style.display = m==="free" ? "block":"none";
  shareBtn.style.display = m==="daily" ? "inline-block":"none";

  render();
}

modeDailyBtn.onclick=()=>setMode("daily");
modeFreeBtn.onclick=()=>setMode("free");

/* ================= RANDOM ================= */

const letters="abcçdefgğhıijklmnoöprsştuüvyz";
const lettersU=letters.toUpperCase();

function rc(str){ return str[Math.floor(Math.random()*str.length)]; }

function randomFreeChar(){
  const r=Math.random();
  if(r<0.75) return Math.random()<0.1?rc(lettersU):rc(letters);
  if(r<0.88) return " ";
  if(r<0.97) return rc(".,;:!?");
  return "\n";
}

const DAILY_ALPHA="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
function randomDailyChar(){
  return rc(DAILY_ALPHA);
}

/* ================= FREE MODE ================= */

function freeType(ch){
  state.free.text+=ch;
  state.free.history.push(ch);
  state.free.keystrokes++;
  saveFree();
}

function freeUndo(){
  if(!state.free.history.length) return;
  const c=state.free.history.pop();
  state.free.text=state.free.text.slice(0,-c.length);
  state.free.keystrokes++;
  saveFree();
}

function freeReset(){
  state.free={text:"",history:[],keystrokes:0};
  saveFree();
}

/* ================= DAILY MODE ================= */

function dailyInit(){
  const w=wordForToday();
  const loaded=loadDaily();

  if(loaded && loaded.word===w){
    state.daily=loaded;
  }else{
    state.daily={word:w,progress:0,keystrokes:0,history:[],finished:false};
    saveDaily();
  }
}

function dailyType(ch){
  if(state.daily.finished) return;

  state.daily.keystrokes++;

  const expected = state.daily.word[state.daily.progress];

  if(ch === expected){
    state.daily.progress++;
    state.daily.history.push(true);
  } else {
    state.daily.history.push(false);
  }

  if(state.daily.progress === state.daily.word.length){
    state.daily.finished=true;
    setTimeout(()=>alert(`Score: ${state.daily.keystrokes}`),50);
  }

  saveDaily();
}

function dailyUndo(){
  if(!state.daily.history.length) return;
  const ok = state.daily.history.pop();
  state.daily.keystrokes++;
  if(ok && state.daily.progress>0) state.daily.progress--;
  state.daily.finished=false;
  saveDaily();
}

function dailyReset(){
  state.daily.progress=0;
  state.daily.keystrokes=0;
  state.daily.history=[];
  state.daily.finished=false;
  saveDaily();
}

/* ================= CARET ================= */

function caret(){
  if(state.mode!=="free") return;
  fakeCaret.style.opacity="1";
}

/* ================= RENDER ================= */

function renderFree(){
  novelText.value=state.free.text;
  const chars=state.free.text.length;
  const words=state.free.text.trim()?state.free.text.trim().split(/\s+/).length:0;
  stats.textContent=`${chars} chars • ${words} words • ${state.free.keystrokes}`;
  caret();
}

function renderDaily(){
  dailyWordEl.textContent=state.daily.word;
  dailyProgEl.innerHTML="";

  for(let i=0;i<state.daily.word.length;i++){
    const d=document.createElement("div");
    d.className="slot";
    if(i<state.daily.progress){
      d.textContent=state.daily.word[i];
      d.style.background="#b9f8b0";
    } else {
      d.textContent="•";
      d.style.opacity=.35;
    }
    dailyProgEl.appendChild(d);
  }

  stats.textContent=
    `${state.daily.keystrokes} strokes • ${state.daily.progress}/${state.daily.word.length}`;
}

function render(){
  if(state.mode==="free") renderFree();
  else renderDaily();
}

/* ================= ACTIONS ================= */

function doType(){
  const ch = state.mode==="daily" ? randomDailyChar() : randomFreeChar();
  state.mode==="daily" ? dailyType(ch) : freeType(ch);
  render();
}

function doUndo(){
  state.mode==="daily" ? dailyUndo() : freeUndo();
  render();
}

function doReset(){
  state.mode==="daily" ? dailyReset() : freeReset();
  render();
}

/* ================= EVENTS ================= */

typeBtn.onclick=doType;
undoBtn.onclick=doUndo;
resetBtn.onclick=doReset;

window.addEventListener("keydown",e=>{
  if(e.key===" "||e.key==="Enter"){e.preventDefault();doType();}
  if(e.key==="Backspace"){e.preventDefault();doUndo();}
});

shareBtn.onclick=()=>{
  const msg=`MonkeyType Daily\nWord: ${state.daily.word}\nScore: ${state.daily.keystrokes}`;
  navigator.clipboard.writeText(msg);
  alert("Copied");
};

/* ================= BOOT ================= */

function boot(){
  const f=loadFree();
  if(f) state.free=f;
  dailyInit();
  setMode("daily");
}

boot();
render();

