"use strict";

/* ---------- CONFIG ---------- */
const DAILY_WORDS = [
  "kod","gun","ritim","karanlik","roman",
  "maymun","kelime","rastgele","sabir","sans"
];

const START_DATE = new Date("2026-01-01T00:00:00Z");
const KEY_FREE = "monkeytype:free:v1";
const KEY_DAILY_PREFIX = "monkeytype:daily:";

/* ---------- STATE ---------- */
const state = {
  mode: "daily",
  free: { text:"", history:[], keystrokes:0 },
  daily:{ word:"", stream:"", history:[], progress:0, keystrokes:0, finished:false }
};

/* ---------- DOM ---------- */
const modeFreeBtn = document.getElementById("modeFree");
const modeDailyBtn = document.getElementById("modeDaily");
const dailyPanel = document.getElementById("dailyPanel");
const dailyWordEl = document.getElementById("dailyWord");
const dailyProgressEl = document.getElementById("dailyProgress");
const dailyStreamEl = document.getElementById("dailyStream");
const shareDailyBtn = document.getElementById("shareDaily");

const novelText = document.getElementById("novelText");
const typeBtn = document.getElementById("typeBtn");
const undoBtn = document.getElementById("undoBtn");
const resetBtn = document.getElementById("resetBtn");
const stats = document.getElementById("stats");

/* ---------- UTIL ---------- */
function todayIndex(){
  return Math.floor((Date.now()-START_DATE)/86400000);
}
function todayKey(){
  return new Date().toISOString().slice(0,10);
}
function wordForToday(){
  return DAILY_WORDS[todayIndex()%DAILY_WORDS.length];
}

/* ---------- STORAGE ---------- */
function saveFree(){ localStorage.setItem(KEY_FREE,JSON.stringify(state.free)); }
function loadFree(){ return JSON.parse(localStorage.getItem(KEY_FREE)||"null"); }

function saveDaily(){
  localStorage.setItem(KEY_DAILY_PREFIX+todayKey(),JSON.stringify(state.daily));
}
function loadDaily(){
  return JSON.parse(localStorage.getItem(KEY_DAILY_PREFIX+todayKey())||"null");
}

/* ---------- MODE ---------- */
function setMode(m){
  state.mode=m;
  dailyPanel.style.display = m==="daily"?"block":"none";
  novelText.style.display = m==="free"?"block":"none";
  render();
}
modeFreeBtn.onclick=()=>setMode("free");
modeDailyBtn.onclick=()=>setMode("daily");

/* ---------- FREE ---------- */
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
  state.free.text="";
  state.free.history=[];
  state.free.keystrokes++; // reset counts
  saveFree();
}

/* ---------- DAILY ---------- */
function dailyInit(){
  const w=wordForToday();
  const saved=loadDaily();
  if(saved && saved.word===w){ state.daily=saved; return; }
  state.daily={word:w,stream:"",history:[],progress:0,keystrokes:0,finished:false};
  saveDaily();
}

function dailyType(ch){
  if(state.daily.finished) return;
  state.daily.keystrokes++;
  state.daily.stream+=ch;
  state.daily.history.push(ch);

  if(ch===state.daily.word[state.daily.progress]){
    state.daily.progress++;
  }
  if(state.daily.progress===state.daily.word.length){
    state.daily.finished=true;
    setTimeout(()=>alert("Score: "+state.daily.keystrokes),50);
  }
  saveDaily();
}

function dailyUndo(){
  if(!state.daily.history.length) return;
  state.daily.history.pop();
  state.daily.stream=state.daily.stream.slice(0,-1);
  state.daily.keystrokes++;

  let p=0;
  for(const c of state.daily.stream){
    if(c===state.daily.word[p]) p++;
  }
  state.daily.progress=p;
  state.daily.finished=p===state.daily.word.length;
  saveDaily();
}

function dailyReset(){
  state.daily.stream="";
  state.daily.history=[];
  state.daily.progress=0;
  state.daily.keystrokes++;
  state.daily.finished=false;
  saveDaily();
}

/* ---------- RNG ---------- */
const FREE_CHARS="abcçdefgğhıijklmnoöprsştuüvyz .,!?";
const DAILY_ALPHA="abcdefghijklmnopqrstuvwxyz";
const pick=s=>s[Math.floor(Math.random()*s.length)];

/* ---------- ACTIONS ---------- */
function doType(){
  const ch = state.mode==="daily"?pick(DAILY_ALPHA):pick(FREE_CHARS);
  state.mode==="daily"?dailyType(ch):freeType(ch);
  render();
}
function doUndo(){ state.mode==="daily"?dailyUndo():freeUndo(); render(); }
function doReset(){ state.mode==="daily"?dailyReset():freeReset(); render(); }

/* ---------- RENDER ---------- */
function render(){
  if(state.mode==="free"){
    novelText.value=state.free.text;
    novelText.selectionStart=novelText.selectionEnd=novelText.value.length;
    stats.textContent=`${state.free.text.length} chars • ${state.free.keystrokes} strokes`;
    return;
  }

  dailyWordEl.textContent=state.daily.word;
  dailyProgressEl.innerHTML="";
  for(let i=0;i<state.daily.word.length;i++){
    const d=document.createElement("div");
    d.className="slot";
    d.textContent = i<state.daily.progress?state.daily.word[i]:"•";
    dailyProgressEl.appendChild(d);
  }
  dailyStreamEl.textContent=state.daily.stream;
  stats.textContent=`${state.daily.keystrokes} strokes • ${state.daily.progress}/${state.daily.word.length}`;
}

/* ---------- EVENTS ---------- */
typeBtn.onclick=doType;
undoBtn.onclick=doUndo;
resetBtn.onclick=doReset;

window.onkeydown=e=>{
  if(e.key===" "||e.key==="Enter"){e.preventDefault();doType();}
  if(e.key==="Backspace"){e.preventDefault();doUndo();}
};

/* ---------- SHARE ---------- */
shareDailyBtn.onclick=()=>{
  navigator.clipboard.writeText(
    `MonkeyType ${todayKey()} score: ${state.daily.keystrokes}`
  );
};

/* ---------- BOOT ---------- */
(function(){
  const f=loadFree(); if(f) state.free=f;
  dailyInit();
  setMode("daily");
})();
