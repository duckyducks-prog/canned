# Blender source files

Keep your `.blend` files here. Export the game scene to `../assets/bunker.glb` and push — the game loads it automatically.

## Export checklist (Blender → glTF)

1. Select all → `Ctrl+A` → **All Transforms** (apply scale/rotation)
2. File → Export → **glTF 2.0 (.glb)** — format "glTF Binary"
3. In export options: check **Apply Modifiers**; textures are embedded by default
4. Scale: 1 unit = 1 meter (a can ≈ 12 cm tall, room ≈ 3–4 m)

## Naming (so the game can find things)

- Cans: `can_tomato_01`, `can_beans_02`, … with lids as separate child
  objects named `can_tomato_01_lid`
- Interactive: `keypad`, `hatch`, `door`
- Static: anything else (walls, shelves) — name freely

If your naming differs, that's fine — just say what convention you used and
the game code will be matched to it.
