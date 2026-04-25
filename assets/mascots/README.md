# Mascot GLB Assets

This folder is for 3D mascot models exported from Blender.

## Panda script from user reference

The file `panda_blender.py` was added from your Blender base code and expanded to:

- create the panda meshes/materials,
- apply smooth shading,
- add a simple idle animation,
- export `panda.glb` in this same folder.

Run it in Blender from this folder so export lands at `assets/mascots/panda.glb`.

PowerShell example:

```powershell
blender --background --python .\assets\mascots\panda_blender.py
```

## Required file names

Put one `.glb` per mascot with these exact names:

- `panda.glb`
- `fox.glb`
- `bunny.glb`
- `otter.glb`
- `koala.glb`
- `owl.glb`
- `cat.glb`
- `dolphin.glb`

## Recommended animation clip names

The app picks clips by name regex. Use names containing these words:

- Idle: `Idle`, `Breath`, `Rest`
- Listening: `Listen`, `Attention`, `Curious`, `Hear`
- Thinking: `Think`, `Ponder`, `Idea`, `Question`
- Speaking: `Speak`, `Talk`, `Explain`, `Chat`, `Say`
- Happy: `Happy`, `Celebrate`, `Joy`, `Dance`, `Cheer`, `Success`

If a mood clip is missing, the renderer falls back to `Idle` or the first available clip.

## Lip sync conventions (optional but recommended)

The runtime tries two strategies in this order:

1. Jaw bones with names containing: `jaw`, `mandible`, `mouth`, `chin`
2. Morph targets containing: `jawOpen`, `mouthOpen`, `viseme_AA`, `viseme_AH`, `viseme_A`

If your model has either convention, speaking mode will animate mouth opening automatically.

## Blender export notes

- Format: glTF Binary (`.glb`)
- Include: mesh + armature + animations
- Apply transforms before export (`Ctrl+A`) to avoid scale drift
- Keep character facing +Z or +Y consistently across all mascots
- Use one armature root for cleaner retargeting later

## Runtime configuration

Set these variables before running web:

PowerShell:

```powershell
$env:EXPO_PUBLIC_USE_GLB_MASCOTS="1"
$env:EXPO_PUBLIC_MASCOT_GLB_BASE_URL="http://localhost:4000/assets/mascots"
```

Then serve models from that base URL using your backend static files or any CDN.

Note: current web mascot scene loads `/assets/mascots/panda.glb` directly when the selected mascot is `panda`.
