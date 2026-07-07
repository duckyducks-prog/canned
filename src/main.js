import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { CAN_TYPES, buildCan, loadCanModel, assignContents } from './cans.js';
import * as ui from './ui.js';
import * as audio from './audio.js';

// --- Tool definitions ------------------------------------------------------
// hits: strikes to open · damageRisk: per-strike chance of ruining a note
const TOOLS = {
  hands: { hits: 8, damageRisk: 0.18, hard: 0.3 },
  rock:  { hits: 4, damageRisk: 0.15, hard: 0.8 },
  spoon: { hits: 6, damageRisk: 0.0,  hard: 0.45 },
};

// --- Scene basics -----------------------------------------------------------
const ROOM = { w: 5.2, d: 3.6, h: 2.5 };

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0a0b0a');
scene.fog = new THREE.Fog('#0a0b0a', 3.5, 9);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.02, 30);
camera.position.set(0, 1.62, 0.8);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Lighting: one fluorescent tube, flickering ------------------------------
const ambient = new THREE.AmbientLight('#5a6058', 0.35);
scene.add(ambient);
const tube = new THREE.PointLight('#dfe8d8', 14, 12, 1.6);
tube.position.set(0, ROOM.h - 0.15, 0);
tube.castShadow = true;
tube.shadow.mapSize.set(1024, 1024);
scene.add(tube);
const tubeMesh = new THREE.Mesh(
  new THREE.BoxGeometry(1.2, 0.05, 0.12),
  new THREE.MeshBasicMaterial({ color: '#eef5e8' })
);
tubeMesh.position.copy(tube.position);
scene.add(tubeMesh);

// --- Room (placeholder — replaced by assets/bunker.glb when it exists) -------
const canRegistry = [];
let keypadMesh, doorMesh, hatchMesh;

function concrete(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
}

function buildPlaceholderRoom() {
  const room = new THREE.Group();
  room.name = 'room';

  const floor = new THREE.Mesh(new THREE.BoxGeometry(ROOM.w, 0.1, ROOM.d), concrete('#3c3a36'));
  floor.position.y = -0.05;
  floor.receiveShadow = true;
  room.add(floor);

  const ceil = new THREE.Mesh(new THREE.BoxGeometry(ROOM.w, 0.1, ROOM.d), concrete('#2e2c29'));
  ceil.position.y = ROOM.h + 0.05;
  room.add(ceil);

  const wallMat = concrete('#4a4740');
  const mkWall = (w, h, x, z, ry) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.1), wallMat);
    wall.position.set(x, h / 2, z);
    wall.rotation.y = ry;
    wall.receiveShadow = true;
    room.add(wall);
  };
  mkWall(ROOM.w, ROOM.h, 0, -ROOM.d / 2, 0);
  mkWall(ROOM.w, ROOM.h, 0, ROOM.d / 2, 0);
  mkWall(ROOM.d, ROOM.h, -ROOM.w / 2, 0, Math.PI / 2);
  mkWall(ROOM.d, ROOM.h, ROOM.w / 2, 0, Math.PI / 2);

  // Vault door on the back wall (decorative for round 1 — the way out is DOWN)
  doorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.9, 0.12),
    new THREE.MeshStandardMaterial({ color: '#5a5f58', metalness: 0.6, roughness: 0.5 })
  );
  doorMesh.name = 'door';
  doorMesh.position.set(0, 0.95, -ROOM.d / 2 + 0.11);
  room.add(doorMesh);

  const wheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.025, 10, 24),
    new THREE.MeshStandardMaterial({ color: '#7a8078', metalness: 0.8, roughness: 0.3 })
  );
  wheel.position.set(0, 1.0, -ROOM.d / 2 + 0.2);
  room.add(wheel);

  keypadMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.2, 0.05),
    new THREE.MeshStandardMaterial({ color: '#1b1d1a', roughness: 0.4 })
  );
  keypadMesh.name = 'keypad';
  keypadMesh.position.set(0.65, 1.25, -ROOM.d / 2 + 0.08);
  room.add(keypadMesh);
  const kglow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.09, 0.05),
    new THREE.MeshBasicMaterial({ color: '#3aff3a' })
  );
  kglow.position.set(0.65, 1.31, -ROOM.d / 2 + 0.106);
  room.add(kglow);

  // Floor hatch (locked until code entered)
  hatchMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.05, 0.85),
    new THREE.MeshStandardMaterial({ color: '#565b54', metalness: 0.7, roughness: 0.45 })
  );
  hatchMesh.name = 'hatch';
  hatchMesh.position.set(1.6, 0.03, 0.9);
  room.add(hatchMesh);
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.09, 0.018, 8, 20),
    new THREE.MeshStandardMaterial({ color: '#8a8f86', metalness: 0.8, roughness: 0.3 })
  );
  handle.rotation.x = Math.PI / 2;
  handle.position.set(1.6, 0.07, 0.9);
  room.add(handle);

  // Shelving units along three walls, cans on top
  const shelfMat = new THREE.MeshStandardMaterial({ color: '#6b6458', metalness: 0.4, roughness: 0.6 });
  const shelfDefs = [
    { x: -ROOM.w / 2 + 0.25, z: -0.6, ry: Math.PI / 2 },
    { x: -ROOM.w / 2 + 0.25, z: 0.7, ry: Math.PI / 2 },
    { x: ROOM.w / 2 - 0.25, z: -0.6, ry: -Math.PI / 2 },
    { x: ROOM.w / 2 - 0.25, z: 0.7, ry: -Math.PI / 2 },
    { x: -0.9, z: ROOM.d / 2 - 0.25, ry: Math.PI },
  ];
  const shelfSpots = [];
  for (const def of shelfDefs) {
    const unit = new THREE.Group();
    unit.position.set(def.x, 0, def.z);
    unit.rotation.y = def.ry;
    for (const y of [0.55, 0.95, 1.35]) {
      const board = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.03, 0.34), shelfMat);
      board.position.y = y;
      board.castShadow = board.receiveShadow = true;
      unit.add(board);
      for (let i = 0; i < 3; i++) {
        shelfSpots.push({ unit, local: new THREE.Vector3(-0.38 + i * 0.38 + (Math.random() - 0.5) * 0.08, y + 0.015, (Math.random() - 0.5) * 0.1) });
      }
    }
    for (const sx of [-0.53, 0.53]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.5, 0.04), shelfMat);
      leg.position.set(sx, 0.75, 0.14);
      unit.add(leg);
      const leg2 = leg.clone(); leg2.position.z = -0.14; unit.add(leg2);
    }
    room.add(unit);
  }

  // Spawn 15 cans across random shelf spots
  const typeNames = Object.keys(CAN_TYPES);
  const spots = shelfSpots.sort(() => Math.random() - 0.5).slice(0, 15);
  // Guarantee at least one tuna + one peaches (story placement depends on them)
  const forced = ['tuna', 'peaches'];
  spots.forEach((spot, i) => {
    const type = forced[i] || typeNames[Math.floor(Math.random() * typeNames.length)];
    const can = buildCan(type, i);
    can.userData.type = type;
    can.position.copy(spot.local); // model base sits at group origin -> on the shelf
    can.rotation.y = Math.random() * Math.PI * 2;
    spot.unit.add(can);
    canRegistry.push(can);
  });
  assignContents(canRegistry);

  scene.add(room);
  refreshStatus();
}

// Load the real can model, then build the room (placeholder room geometry +
// real cloned cans). When a bunker.glb lands, harvest it here by name instead.
loadCanModel()
  .then(() => buildPlaceholderRoom())
  .catch((err) => {
    console.error('Can model failed to load:', err);
    buildPlaceholderRoom(); // room still works; cans just won't appear
  });

// --- Controls ----------------------------------------------------------------
const controls = new PointerLockControls(camera, renderer.domElement);
const overlay = document.getElementById('overlay');
const crosshair = document.getElementById('crosshair');

overlay.addEventListener('click', () => {
  controls.lock();
  audio.startHum();
});
controls.addEventListener('lock', () => {
  overlay.style.display = 'none';
  crosshair.style.display = 'block';
});
controls.addEventListener('unlock', () => {
  if (!ui.keypadVisible() && !state.escaped) {
    overlay.style.display = 'flex';
    crosshair.style.display = 'none';
  }
});

const keys = {};
window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

// --- Game state ----------------------------------------------------------------
const state = {
  tool: 'hands',
  held: null,          // can currently held up for inspection
  hits: 0,             // strikes on the held can
  damaged: false,      // has this can's note been ruined
  opened: 0,
  fragments: 0,
  unlocked: false,
  escaped: false,
};

function refreshStatus() {
  ui.setStatus({ tool: state.tool, opened: state.opened, total: canRegistry.length, fragments: state.fragments });
}
refreshStatus();

// --- Interaction ----------------------------------------------------------------
const raycaster = new THREE.Raycaster();
raycaster.far = 2.2;

function lookTarget() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const openables = canRegistry.filter((c) => !c.userData.opened && !c.userData.held);
  const targets = [...openables, keypadMesh, hatchMesh].filter(Boolean);
  const hits = raycaster.intersectObjects(targets, true);
  if (!hits.length) return null;
  let obj = hits[0].object;
  while (obj && !obj.name.startsWith('can_') && obj.name !== 'keypad' && obj.name !== 'hatch') obj = obj.parent;
  return obj;
}

let shake = 0;

function strikeHeldCan() {
  const tool = TOOLS[state.tool];
  state.hits++;
  audio.hit(tool.hard);
  shake = 0.5 + tool.hard * 0.5;

  const can = state.held;
  const lid = can.children.find((c) => c.name.endsWith('_lid'));
  if (lid) {
    // progressive caving: tilt + sink + crumple
    const p = state.hits / tool.hits;
    lid.rotation.x = (Math.random() - 0.5) * 0.3 * p;
    lid.rotation.z = (Math.random() - 0.5) * 0.3 * p;
    lid.position.y = can.userData.canHeight / 2 - p * can.userData.canHeight * 0.12;
    lid.scale.y = Math.max(0.3, 1 - p * 0.5);
  }
  if (state.hits > 1 && Math.random() < tool.damageRisk) state.damaged = true;

  if (state.hits >= tool.hits) openHeldCan();
  else ui.setPrompt(`CLICK — strike again  (${state.hits}/${tool.hits})\nE — put it back`);
}

function openHeldCan() {
  const can = state.held;
  can.userData.opened = true;
  state.opened++;
  audio.openPop();
  const lid = can.children.find((c) => c.name.endsWith('_lid'));
  if (lid) lid.visible = false;

  const contents = can.userData.contents;
  if (contents.kind === 'food') {
    // low-poly slop
    const slop = new THREE.Mesh(
      new THREE.SphereGeometry(can.userData.canRadius * 0.8, 8, 6),
      new THREE.MeshStandardMaterial({ color: can.userData.slopColor, roughness: 0.4 })
    );
    slop.scale.y = 0.35;
    slop.position.y = can.userData.canHeight * 0.9;
    can.add(slop);
    ui.setPrompt(contents.line + '\n\nE — put it back');
  } else if (contents.kind === 'tool') {
    state.tool = contents.tool;
    ui.setPrompt(contents.line + '\n\nE — put the can back');
  } else if (contents.kind === 'note') {
    if (contents.note.kind === 'fragment' && !state.damaged) state.fragments++;
    ui.showNote(contents.note, state.damaged);
    ui.setPrompt('');
  }
  refreshStatus();
}

const HOLD_POS = new THREE.Vector3(0, -0.12, -0.42);

function pickUp(can) {
  state.held = can;
  state.hits = 0;
  state.damaged = false;
  can.userData.held = true;
  can.userData.prevParent = can.parent;
  can.userData.prevPos = can.position.clone();
  can.userData.prevRot = can.rotation.clone();
  camera.add(can);
  scene.add(camera); // ensure camera is in graph for child rendering
  can.position.copy(HOLD_POS);
  can.rotation.set(0.15, 0.6, 0);
  const toolName = state.tool === 'hands' ? 'your bare hands' : `the ${state.tool}`;
  ui.setPrompt(`CLICK — strike with ${toolName}\nE — put it back`);
}

function putBack() {
  const can = state.held;
  if (!can) return;
  camera.remove(can);
  can.userData.prevParent.add(can);
  can.position.copy(can.userData.prevPos);
  can.rotation.copy(can.userData.prevRot);
  can.userData.held = false;
  state.held = null;
  ui.setPrompt('');
}

function onUnlockDoor() {
  state.unlocked = true;
  // hatch swings open
  hatchMesh.userData.opening = true;
  ui.setPrompt('the hatch is open.');
  setTimeout(() => ui.setPrompt(''), 2500);
  controls.lock();
}
ui.initKeypad(onUnlockDoor);

function descend() {
  state.escaped = true;
  controls.unlock();
  crosshair.style.display = 'none';
  ui.setPrompt('');
  ui.showRoundCard();
}

// Click routing
document.addEventListener('mousedown', (e) => {
  if (!controls.isLocked || e.button !== 0) return;
  if (ui.noteVisible()) { ui.hideNote(); ui.setPrompt('E — put the can back'); return; }
  if (state.held) { strikeHeldCan(); return; }
  const target = lookTarget();
  if (!target) return;
  if (target.name === 'keypad') {
    controls.unlock();
    overlay.style.display = 'none';
    ui.showKeypad();
  } else if (target.name === 'hatch') {
    if (state.unlocked) descend();
    else { ui.setPrompt('locked. there is a keypad by the door.'); audio.beep(false); setTimeout(() => ui.setPrompt(''), 2000); }
  } else if (target.name.startsWith('can_')) {
    pickUp(target);
  }
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyE' && state.held && !ui.noteVisible()) putBack();
  if (e.code === 'Escape' && ui.keypadVisible()) { ui.hideKeypad(); controls.lock(); }
});

// --- Main loop -------------------------------------------------------------------
const clock = new THREE.Clock();
const vel = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  // movement
  if (controls.isLocked) {
    const speed = 2.2;
    vel.set(0, 0, 0);
    if (keys['KeyW']) vel.z += 1;
    if (keys['KeyS']) vel.z -= 1;
    if (keys['KeyA']) vel.x -= 1;
    if (keys['KeyD']) vel.x += 1;
    if (vel.lengthSq() > 0) {
      vel.normalize().multiplyScalar(speed * dt);
      controls.moveForward(vel.z);
      controls.moveRight(vel.x);
    }
    const p = camera.position;
    p.x = THREE.MathUtils.clamp(p.x, -ROOM.w / 2 + 0.45, ROOM.w / 2 - 0.45);
    p.z = THREE.MathUtils.clamp(p.z, -ROOM.d / 2 + 0.45, ROOM.d / 2 - 0.45);
    p.y = 1.62;

    // hover prompts when empty-handed
    if (!state.held && !ui.noteVisible() && !ui.keypadVisible()) {
      const t = lookTarget();
      if (!t) ui.setPrompt('');
      else if (t.name === 'keypad') ui.setPrompt('CLICK — use keypad');
      else if (t.name === 'hatch') ui.setPrompt(state.unlocked ? 'CLICK — descend' : 'a floor hatch. locked.');
      else if (t.name.startsWith('can_')) ui.setPrompt('CLICK — pick up the can');
    }
  }

  // camera shake on strikes
  if (shake > 0.001) {
    camera.rotation.x += (Math.random() - 0.5) * 0.01 * shake;
    camera.rotation.z += (Math.random() - 0.5) * 0.006 * shake;
    shake *= Math.pow(0.001, dt * 3);
  }

  // fluorescent flicker
  const t = clock.elapsedTime;
  let flicker = 1;
  if (Math.random() < 0.008) flicker = 0.3 + Math.random() * 0.4;
  tube.intensity = 14 * flicker * (0.96 + 0.04 * Math.sin(t * 47));
  tubeMesh.material.color.setScalar(flicker > 0.6 ? 1 : 0.4);

  // hatch opening animation
  if (hatchMesh?.userData.opening && hatchMesh.rotation.x > -Math.PI / 2.2) {
    hatchMesh.rotation.x -= dt * 1.4;
    hatchMesh.position.z = 0.9 - Math.sin(-hatchMesh.rotation.x) * 0.4;
    hatchMesh.position.y = 0.03 + Math.sin(-hatchMesh.rotation.x) * 0.3;
  }

  renderer.render(scene, camera);
}
animate();

// --- Debug hooks (used by automated tests; harmless in production) -----------------
window.__game = { state, canRegistry, camera, scene, TOOLS, ui, controls };
