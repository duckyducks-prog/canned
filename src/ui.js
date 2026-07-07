import { DOOR_CODE } from './story.js';
import * as audio from './audio.js';

const promptEl = document.getElementById('prompt');
const statusEl = document.getElementById('status');
const noteEl = document.getElementById('note');
const noteTextEl = document.getElementById('notetext');
const keypadEl = document.getElementById('keypad');
const kscreen = document.getElementById('kscreen');
const kgrid = document.getElementById('kgrid');
const roundcard = document.getElementById('roundcard');

export function setPrompt(text) { promptEl.textContent = text || ''; }

export function setStatus({ tool, opened, total, fragments }) {
  statusEl.innerHTML =
    `TOOL: ${tool.toUpperCase()}<br>` +
    `CANS OPENED: ${opened} / ${total}<br>` +
    `CODE FRAGMENTS: ${'■'.repeat(fragments)}${'□'.repeat(2 - fragments)}`;
}

// --- Notes ---------------------------------------------------------------

// Damaged notes lose random characters — soaked, torn, smeared.
function damageText(text, severity) {
  return text.split('').map((ch) => {
    if (ch === '\n' || ch === ' ') return ch;
    return Math.random() < severity ? '▓' : ch;
  }).join('');
}

export function showNote(note, damaged) {
  noteEl.classList.toggle('damaged', !!damaged);
  noteEl.querySelectorAll('.stain').forEach((s) => s.remove());
  noteTextEl.textContent = damaged ? damageText(note.text, 0.45) : note.text;
  if (damaged) {
    for (let i = 0; i < 3; i++) {
      const s = document.createElement('span');
      s.className = 'stain';
      const size = 60 + Math.random() * 90;
      s.style.width = s.style.height = `${size}px`;
      s.style.left = `${Math.random() * 80}%`;
      s.style.top = `${Math.random() * 70}%`;
      noteEl.appendChild(s);
    }
  }
  noteEl.style.display = 'block';
  audio.paper();
}

export function hideNote() { noteEl.style.display = 'none'; }
export function noteVisible() { return noteEl.style.display === 'block'; }

// --- Keypad --------------------------------------------------------------

let entry = '';
let onUnlock = null;

function renderScreen() {
  kscreen.textContent = (entry + '____').slice(0, 4).split('').join(' ');
}

export function initKeypad(unlockCallback) {
  onUnlock = unlockCallback;
  const keys = ['1','2','3','4','5','6','7','8','9','C','0','⏎'];
  for (const k of keys) {
    const b = document.createElement('button');
    b.textContent = k;
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (k === 'C') { entry = ''; audio.beep(false); }
      else if (k === '⏎') { submit(); }
      else if (entry.length < 4) { entry += k; audio.beep(true); }
      renderScreen();
    });
    kgrid.appendChild(b);
  }
  renderScreen();
}

function submit() {
  if (entry === DOOR_CODE) {
    kscreen.textContent = 'OPEN';
    kscreen.style.color = '#7dff7d';
    audio.unlock();
    setTimeout(() => { hideKeypad(); onUnlock?.(); }, 700);
  } else {
    kscreen.textContent = 'NO';
    kscreen.style.color = '#ff6d6d';
    audio.beep(false);
    setTimeout(() => { entry = ''; kscreen.style.color = '#7dff7d'; renderScreen(); }, 800);
  }
}

export function showKeypad() { entry = ''; renderScreen(); keypadEl.style.display = 'block'; }
export function hideKeypad() { keypadEl.style.display = 'none'; }
export function keypadVisible() { return keypadEl.style.display === 'block'; }

export function showRoundCard() { roundcard.style.display = 'flex'; }
