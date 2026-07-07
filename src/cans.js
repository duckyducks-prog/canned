import * as THREE from 'three';
import { NOTES, FOOD_LINES, TOOL_LINES } from './story.js';

// The 7 can types matching the user's Blender models. `size` in meters.
// When real glTF cans land in assets/, these placeholders are replaced by
// name-matching (can_<type>_NN) — the contents system stays identical.
export const CAN_TYPES = {
  tomato:    { label: '#c0392b', body: '#e8e2d0', size: [0.038, 0.095] },
  chicken:   { label: '#e07020', body: '#efe8d5', size: [0.040, 0.115] },
  corn:      { label: '#e6b820', body: '#efe4c0', size: [0.040, 0.100] },
  peaches:   { label: '#e8a83a', body: '#f2e6c8', size: [0.042, 0.105] },
  beans:     { label: '#b03a2e', body: '#e8dfc8', size: [0.040, 0.098] },
  meatballs: { label: '#c02020', body: '#f0ead8', size: [0.055, 0.140] },
  tuna:      { label: '#3aa0b8', body: '#e8e2d0', size: [0.048, 0.055] },
};

const METAL = new THREE.MeshStandardMaterial({ color: '#b8bcc0', metalness: 0.85, roughness: 0.35 });

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Build one placeholder can: body cylinder + label band + separate lid child.
export function buildPlaceholderCan(type, index) {
  const def = CAN_TYPES[type];
  const [r, h] = def.size;
  const group = new THREE.Group();
  group.name = `can_${type}_${String(index).padStart(2, '0')}`;

  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), METAL);
  body.name = 'body';
  group.add(body);

  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 1.005, r * 1.005, h * 0.62, 20, 1, true),
    new THREE.MeshStandardMaterial({ color: def.label, roughness: 0.8 })
  );
  label.name = 'label';
  group.add(label);

  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 1.006, r * 1.006, h * 0.22, 20, 1, true),
    new THREE.MeshStandardMaterial({ color: def.body, roughness: 0.85 })
  );
  band.position.y = h * 0.1;
  group.add(band);

  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.96, r * 0.96, h * 0.03, 20),
    new THREE.MeshStandardMaterial({ color: '#c8ccd0', metalness: 0.9, roughness: 0.25 })
  );
  lid.name = `can_${type}_${String(index).padStart(2, '0')}_lid`;
  lid.position.y = h / 2;
  group.add(lid);

  group.userData.canRadius = r;
  group.userData.canHeight = h;
  return group;
}

// Assign contents to a set of spawned cans, honoring story placement rules:
// the spoon hides in a tuna can, the second code fragment in a peaches can.
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

  // Tools — spoon honors the tuna hint; rock anywhere.
  const spoonCan = takeRandomOfType('tuna') || takeRandom();
  spoonCan.userData.contents = { kind: 'tool', tool: 'spoon', line: TOOL_LINES.spoon };
  const rockCan = takeRandom();
  rockCan.userData.contents = { kind: 'tool', tool: 'rock', line: TOOL_LINES.rock };

  // Notes — fragment 2 mentions fruit, so it lives in peaches.
  const fragments = NOTES.filter((n) => n.kind === 'fragment');
  const others = shuffle(NOTES.filter((n) => n.kind !== 'fragment'));
  if (fragments[1]) {
    const c = takeRandomOfType('peaches') || takeRandom();
    c.userData.contents = { kind: 'note', note: fragments[1] };
  }
  if (fragments[0]) {
    const c = takeRandom();
    c.userData.contents = { kind: 'note', note: fragments[0] };
  }
  for (const note of others) {
    if (!unassigned.size) break;
    takeRandom().userData.contents = { kind: 'note', note };
  }

  // Everything else: food.
  for (const can of unassigned) {
    can.userData.contents = { kind: 'food', line: FOOD_LINES[can.userData.type] };
  }
}
