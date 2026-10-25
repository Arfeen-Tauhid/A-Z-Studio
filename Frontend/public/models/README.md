# Camera model for the intro

Place a licensed, optimized `az-camera.glb` in this folder. The intro looks for:

`/models/az-camera.glb`

No model is included in this project. Until one is supplied, visitors see the studio-branded fallback intro; the site never presents primitive geometry as a realistic camera.

## Recommended model structure

- Export GLB with PBR materials and sensible texture sizes (typically 2K or lower).
- Put each animated assembly component in its own top-level node/group under the scene.
- Give parts descriptive names so the exploded directions can be tailored: `camera_body`, `lens_barrel`, `lens_mount`, `sensor`, `circuit_board`, `top_plate`, `buttons`, `battery_door`, `grip`, `screw_01`.
- Keep the model centered near its origin and oriented with the lens facing the viewer along local `+Z`.
- Preserve component transforms at their assembled positions. The runtime derives the initial exploded offsets from the component names.
- If the GLB has a suitable pre-authored assembly clip, retain it; custom timelines can be adapted to play named clips.
- Apply Draco or Meshopt compression only if the asset is exported with the matching decoder support configured in the loader.
- Verify that you have permission to use and redistribute the model and its textures. Do not use a ripped or unlicensed commercial camera model.

The loader currently expects the top-level GLB children to be independently animatable component groups. If an export contains one combined mesh, re-export separate parts before using the intro.
