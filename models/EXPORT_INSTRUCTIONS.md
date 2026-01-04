# Exporting model.blend to GLB for Three.js

## Steps to export in Blender:

1. Open `models/model.blend` in Blender
2. Go to **File -> Export -> glTF 2.0 (.glb/.gltf)**
3. In the export settings:
   - Format: **glTF Binary (.glb)**
   - Include: Check **Selected Objects** (or export all if needed)
   - Transform: Apply any necessary rotations
   - Geometry: 
     - Check **Apply Modifiers**
     - Check **UVs** if you have textures
     - Check **Normals**
   - Animation: Uncheck if no animations needed
4. Save as `models/model.glb` (same folder as model.blend)
5. Refresh the game in your browser

## Model Guidelines:

- The model will be scaled to 0.15x in-game
- It will be positioned relative to the camera as a first-person weapon
- Black/dark colors (#1a1a1a) work best with the sketch aesthetic
- Keep polycount reasonable for real-time rendering

## Current Settings:

The model is configured in weapons.js with:
- Scale: 0.15, 0.15, 0.15
- Position offset: 0.3, -0.2, -0.5 (right, down, forward from camera)
- Rotation: -0.1, 0, 0 (slight downward tilt)

You can adjust these values in the `loadWeaponModels()` function in weapons.js.
