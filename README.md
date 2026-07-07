# CANNED

You wake up in a survivalist's panic room. There is nothing but cans.
One of them knows the way out. Start opening.

## Run it

No build step. From the repo root:

```sh
npx serve .
# or: python3 -m http.server 8000
```

Then open the printed URL in a browser. Click to grab the mouse.

**Controls:** WASD move · mouse look · CLICK pick up / strike · E put back · ESC release mouse

## How it's put together

```
├── index.html        # HUD, note paper, keypad, import map
├── src/
│   ├── main.js       # scene, room, controls, game loop, interactions
│   ├── cans.js       # can types, placeholder models, contents placement
│   ├── story.js      # ★ ALL narrative text + door code — edit freely, no code
│   ├── ui.js         # note rendering (incl. damage), keypad, HUD
│   └── audio.js      # procedural sound (hum, strikes, unlock) — no files
├── vendor/           # three.js, vendored (works offline, no npm needed)
├── assets/           # bunker.glb lands here
└── blender/          # your .blend source files
```

### Design pillars (from the workshop)

- **Hard-mode start:** bare hands (8 strikes/can, 18% per-strike risk of ruining a
  note). Find the **rock** (4 strikes, still risky) and the **spoon**
  (6 strikes, clean opens) inside cans.
- **Investigation:** notes are story + hints + two door-code fragments. Damaged
  notes render half-legible.
- **Rounds:** the keypad opens the floor **hatch** — Round 2 goes deeper.

### Swapping in real Blender assets

Export your scene as glTF (`.glb`) into `assets/bunker.glb`. The loader
already tries it before building placeholders. Naming contract for objects the
game controls: `can_<type>_<nn>` with a child `can_<type>_<nn>_lid`, plus
`keypad`, `hatch`, `door`. Types: tomato, chicken, corn, peaches, beans,
meatballs, tuna.
