// Procedural audio — no sound files needed. Everything is synthesized.
let ctx = null;
let humNodes = null;

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function noiseBuffer(c, seconds = 1) {
  const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

// Fluorescent hum + low room tone. 60% of the atmosphere.
export function startHum() {
  const c = ac();
  if (humNodes) return;
  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 120;
  const oscGain = c.createGain();
  oscGain.gain.value = 0.006;
  const filt = c.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.value = 120;
  filt.Q.value = 8;

  const noise = c.createBufferSource();
  noise.buffer = noiseBuffer(c, 2);
  noise.loop = true;
  const nFilt = c.createBiquadFilter();
  nFilt.type = 'lowpass';
  nFilt.frequency.value = 90;
  const nGain = c.createGain();
  nGain.gain.value = 0.035;

  osc.connect(filt).connect(oscGain).connect(c.destination);
  noise.connect(nFilt).connect(nGain).connect(c.destination);
  osc.start();
  noise.start();
  humNodes = { osc, noise };
}

// Metallic strike — pitch varies with tool and how caved-in the can is.
export function hit(hard = 0.5) {
  const c = ac();
  const t = c.currentTime;
  // impact thump
  const noise = c.createBufferSource();
  noise.buffer = noiseBuffer(c, 0.15);
  const nf = c.createBiquadFilter();
  nf.type = 'lowpass';
  nf.frequency.value = 500 + hard * 1500;
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.4 + hard * 0.3, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  noise.connect(nf).connect(ng).connect(c.destination);
  noise.start(t);
  // metallic ring
  [830, 1247, 2100].forEach((f, i) => {
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f * (0.9 + Math.random() * 0.2);
    const g = c.createGain();
    g.gain.setValueAtTime(0.05 / (i + 1) * (0.5 + hard), t);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 0.25 + hard * 0.2);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + 0.6);
  });
}

// Lid gives way.
export function openPop() {
  const c = ac();
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = 'square';
  o.frequency.setValueAtTime(300, t);
  o.frequency.exponentialRampToValueAtTime(90, t + 0.18);
  const g = c.createGain();
  g.gain.setValueAtTime(0.22, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  o.connect(g).connect(c.destination);
  o.start(t); o.stop(t + 0.3);
  hit(0.9);
}

export function paper() {
  const c = ac();
  const t = c.currentTime;
  const noise = c.createBufferSource();
  noise.buffer = noiseBuffer(c, 0.4);
  const f = c.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 2500;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.06);
  g.gain.exponentialRampToValueAtTime(0.0004, t + 0.35);
  noise.connect(f).connect(g).connect(c.destination);
  noise.start(t);
}

export function beep(good = true) {
  const c = ac();
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.value = good ? 880 : 220;
  const g = c.createGain();
  g.gain.setValueAtTime(0.12, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + (good ? 0.12 : 0.4));
  o.connect(g).connect(c.destination);
  o.start(t); o.stop(t + 0.5);
}

export function unlock() {
  const c = ac();
  const t = c.currentTime;
  // heavy clunk
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(70, t);
  o.frequency.exponentialRampToValueAtTime(40, t + 0.4);
  const g = c.createGain();
  g.gain.setValueAtTime(0.5, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  o.connect(g).connect(c.destination);
  o.start(t); o.stop(t + 0.7);
  setTimeout(() => hit(0.2), 180);
  setTimeout(() => hit(0.35), 420);
}
