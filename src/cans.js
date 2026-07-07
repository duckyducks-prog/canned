import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { NOTES, FOOD_LINES, TOOL_LINES } from './story.js';

// Real optimized can model (blank/unlabeled Meshy export). One model, cloned
// for every can for now — labeled variants can map type -> different .glb later.
const CAN_MODEL_URL = './assets/can.glb';
const CAN_SCALE = 0.055;          // Meshy units (2.0 tall) -> ~0.11 m tall
const CAN_HEIGHT = 2.0 * CAN_SCALE;
const CAN_RADIUS = 0.72 * CAN_SCALE;

// Internal types still drive contents placement (hints/fragments). Visually
// identical for now since we use one blank model.
export const CAN_TYPES = {
  tomato: {}, chicken: {}, corn: {}, peaches: {}, beans: {}, meatballs: {}, tuna: {},
};
const SLOP_COLOR = '#8a5a3a';

let cachedModel = null;

export async function loadCanModel() {
  if (cachedModel) return cachedModel;
  const draco = new DRACOLoader().setDecoderPath('./vendor/draco/');
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const gltf = await loader.loadAsync(CAN_MODEL_URL);
  cachedModel = gltf.scene;
  return cachedModel;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Build one can: cloned real model + a procedural lid cap the player peels open.
export function buildCan(type, index) {
  const group = new THREE.Group();
  group.name = `can_${type}_${String(index).padStart(2, '0')}`;

  const model = cachedModel.clone(true);
  model.scale.setScalar(CAN_SCALE);
  model.name = 'body';
  group.add(model);

  // A thin metal lid sitting on top — the mash mechanic dents/removes THIS.
  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(CAN_RADIUS * 0.92, CAN_RADIUS * 0.92, CAN_HEIGHT * 0.035, 20),
    new THREE.MeshStandardMaterial({ color: '#c8ccd0', metalness: 0.9, roughness: 0.25 })
  );
  lid.name = `can_${type}_${String(index).padStart(2, '0')}_lid`;
  lid.position.y = CAN_HEIGHT * 0.98;
  group.add(lid);

  group.userData.canRadius = CAN_RADIUS;
  group.userData.canHeight = CAN_HEIGHT;
  group.userData.slopColor = SLOP_COLOR;
  return group;
}

// Assign contents to spawned cans, honoring story placement rules.
export function assignContents(cans) {
  const byType = (t) => cans.filter((c) => c.userData.type === t);
  const unassigned = new Set(cans);
  const take = (can) => { unassigned.delete(can); return can; };
  const takeRandomOfType = (t) => {
    const pool = byType(t).filter((c) => unassigned.has(c));
    if (!pool.length) return null;
    return take(pool[Math.floor(Math.random() * pool.length)]);
  };
  const takeRandom = () => {
    const pool = [...unassigned];
    return take(pool[Math.floor(Math.random() * pool.length)]);
  };

  const spoonCan = takeRandomOfType('tuna') || takeRandom();
  spoonCan.userData.contents = { kind: 'tool', tool: 'spoon', line: TOOL_LINES.spoon };
  const rockCan = takeRandom();
  rockCan.userData.contents = { kind: 'tool', tool: 'rock', line: TOOL_LINES.rock };

  const fragments = NOTES.filter((n) => n.kind === 'fragment');
  const others = shuffle(NOTES.filter((n) => n.kind !== 'fragment'));
  if (fragments[1]) {
    const c = takeRandomOfType('peaches') || takeRandom();
    c.userData.contents = { kind: 'note', note: fragments[1] };
  }
  if (fragments[0]) takeRandom().userData.contents = { kind: 'note', note: fragments[0] };
  for (const note of others) {
    if (!unassigned.size) break;
    takeRandom().userData.contents = { kind: 'note', note };
  }
  for (const can of unassigned) {
    can.userData.contents = { kind: 'food', line: FOOD_LINES[can.userData.type] };
  }
}
