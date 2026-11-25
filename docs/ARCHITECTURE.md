# Architecture

## The decision that shapes everything
A browser cannot path-trace this scene at 60 fps, and a pre-rendered film cannot be orbited or repainted. Revival uses each where it is strong:

| Part | How it is drawn | Why |
|---|---|---|
| Film (scroll) | 320 path-traced frames drawn to a 2D canvas | Real light transport, silk, depth of field; the cost is fixed whatever the scene contains |
| Walk around (interactive) | Three.js through React Three Fiber | Orbit, paint, lamps, notes |

The two meet at one camera. `blender/film.py` frame 319 and `src/explore/start.ts` hold the same position, target and lens, and a unit test reads both files and fails if they drift.

## Pipeline
```
challenger_1970.glb (CC BY)
  blender/car.py         normalise, remove badges, assign physical materials  -> car.blend
  blender/cloth.py       simulate 34,881-vertex silk over a remeshed proxy     -> cloth_raw.npy
  blender/film.py        studio, lights, camera path, Cycles                   -> render/film/*.png
  tools/encode_film.mjs  bloom, sharpen, two WebP sizes                        -> public/film/
  blender/export_web.py  weld, decimate per part, join per material            -> car_raw.glb
  gltf-transform         meshopt compression                                  -> public/models/car.glb
```

## Runtime
- `src/film/timeline.ts`: pure functions. Scroll to frame, download order, nearest available frame. Flat stretches in the map are where a chapter holds.
- `src/film/player.ts`: fetches frames coarse to fine (every 16th first), keeps them compressed, and decodes only a window around the playhead with `createImageBitmap`. Holding all 320 decoded would need about 1.8 GB; the window of 40 needs about 230 MB, or 58 MB at the small size (28 frames).
- The two hard camera cuts (280 to 281 and 304 to 305) are never interpolated across.
- `src/explore/*` is a separate chunk. Three.js downloads only when someone heads for the interactive view.
- Quality tiers step down after sustained slow frames and never step up, so they cannot oscillate.

## Alternatives measured and rejected
- **Realtime cloth**: not repeatable and not reversible, so it cannot be scrubbed.
- **Baked cloth decoded in a vertex shader**: built first, with a concept car. A 32-component PCA basis had a worst-case error of 304 mm; int16 keyframes with delta coding and deflate were 2.8 MB against 20.6 MB raw and needed 20 texture reads per vertex instead of 165. It worked, and was replaced when the film moved to path tracing.
- **Video scrubbing**: seeking backwards through inter-frame compression is slow, and an all-intra file is as large as the image sequence without its coarse-to-fine loading.

## Accessibility
All text is DOM. The silk is a native range input. Interactive notes are reachable from the panel without pointing at the car. `prefers-reduced-motion` replaces scrubbing with a cut per chapter. Without WebGL2 the film still plays and the interactive view is not offered.

## Known limits
- The model has no interior or engine, so windows are opaque black and nothing opens.
- The simulation let silk slip into the hollow wheels; `clear_wheels` in `film.py` lifts it back out at render time, around all four.
- The realtime view approximates the film's lighting. They match in framing, not exactly in light.
