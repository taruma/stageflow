# StageFlow — 3D Camera-Blocking & Scene Choreography Diorama

**StageFlow** is a standalone 3D spatial staging and camera-blocking visualizer built with **React 19**, **Three.js / React Three Fiber (`@react-three/fiber` & `@react-three/drei`)**, **TypeScript**, and **Tailwind CSS v4**.

It synchronizes a universal video player (**Local `.mp4`/`.webm`**, **YouTube URLs**, or a built-in **60fps Stage Cam Blueprint Simulator**) with an interactive **3D Minimalist Blueprint Diorama** to illustrate where subjects/props are positioned and how the physical camera is placed, lensed, and moving at every millisecond of a scene.

---

## Key Capabilities

1. **Stateless Functional Timeline (`Frame_t = f(t, score)`)**:
   - Pure mathematical evaluation of camera poses, forward pose chaining ($P_0 \to P_1 \to \dots \to P_k$), and actor blocking with zero-drift scrubbing determinism.
2. **Hybrid Geometric + Directorial Lens Optics**:
   - Metric coordinates ($1\text{ unit} = 1\text{m}$), human-authored degrees in YAML (`pitch`, `yaw`, `rotation`), and full-frame equivalent cinema lens focal lengths (`24mm`, `35mm`, `50mm`, `85mm`) projecting a true **Rectangular Cinematic Gate Frustum (`16:9` / `2.39:1`)** with an optical focus plane frame.
3. **Dual-Camera Architecture & Free-Orbit Handover**:
   - **Observer Camera**: Drives the 3D viewport during playback and automatically releases to `OrbitControls` when paused so you can freely orbit, pan, and inspect the frozen 3D setup.
   - **Stage Camera**: Illustrative 3D camera rig inside the diorama with sight-line, rectangular gate frustum, and 3D trajectory path curve.
   - **Instant POV Cut**: Switch between `Scripted Observer`, `Free Orbit`, and `Stage Cam POV` with zero transition lag.
4. **Universal Media Clock Parity**:
   - Identical 60fps synchronization, scrubbing, frame-stepping (`[` / `]`), and slow-motion playback (`0.25x`, `0.5x`, `1x`, `2x`) across local `.mp4` files, YouTube URLs, and procedural blueprint slates.
5. **Live YAML Score Drawer & Authoring Telemetry Capsule**:
   - Edit YAML scores live in the slide-out drawer with instant 3D re-evaluation, or click the floating telemetry capsule to copy live camera coordinates (`target`, `distance`, `pitch`, `yaw`, `lens`) directly to the clipboard.
6. **Dual-Tier Storage Persistence & YAML SSOT**:
   - Automatically saves score drafts and custom imported scenes in browser **IndexedDB** (`idb`), while persisting UI layout preferences in **`localStorage`**. Heavy local dropped videos remain strictly in temporary session memory, and the YAML score remains the authoritative single source of truth for video playback.
7. **Deterministic 60fps Viewport Video Recorder**:
   - Headless CLI tool (`npm run record`) powered by Playwright and FFmpeg that steps through scores frame-by-frame ($t_i = i / 60\text{s}$) with zero dropped frames. Exports Scripted Observer or Stage Cam POV viewports in 1080p/4K MP4, WebM, animated GIF, or PNG sequence with toggleable 3D HTML labels and composition guides.
8. **SceneFlow Visual Design Parity & Decoupled Theme Engine**:
   - Tactile pill chrome, delicate borders, and editorial typography (`Inter`, `Libre Baskerville`, `JetBrains Mono`) aligned with sister suite app **SceneFlow** (`Screenplay-Sync`). Features an instant 4-mode app theme switcher (`Dark Obsidian Studio`, `Warm Drafting Paper`, `Light Warm Stone`, `Auto System`) with transition-freeze performance, paired with an independently configurable 3D diorama stage theme (`Dark`, `Match App`, `Warm`, `Light`) so you can retain high-contrast dark blueprint void on the stage while working in warm drafting paper UI chrome (0 extra draw calls).

---

## Architecture & Documentation

StageFlow is organized into a strictly decoupled **5-Layer Architecture** (`core/` $\to$ `media/` $\to$ `hooks/` $\to$ `stage/` & `ui/`). See the living specification suite for complete details:

- [**`AGENTS.md`**](AGENTS.md) — Repository governance, non-negotiable invariants, and 5-layer architecture map.
- [**`CHANGELOG.md`**](CHANGELOG.md) — Semantic version release history, milestone checkpoints, and unreleased change tracking.
- [**`SPECIFICATION.md`**](SPECIFICATION.md) — Product vision and core system mechanics.
- [**`docs/STAGEFLOW_SCRIPT_SPECIFICATION.md`**](docs/STAGEFLOW_SCRIPT_SPECIFICATION.md) — Pure mathematical and formal YAML script specification (coordinate transformations, optical projections, kinematic equations, and complete schema reference).
- [**`docs/YAML_AUTHORING_GUIDE.md`**](docs/YAML_AUTHORING_GUIDE.md) — Authoritative YAML choreography score authoring manual & SSOT (quickstart, schema reference, studio workflow, and cinematography recipes).
- [**`docs/CORE_MATH_AND_SCORE_SPECIFICATIONS.md`**](docs/CORE_MATH_AND_SCORE_SPECIFICATIONS.md) — Layer 1 stateless math (`Frame_t = f(t)`), metric/degree conventions, lens optics (`mm`), and YAML score schema.
- [**`docs/MEDIA_CLOCK_AND_SYNC_SPECIFICATIONS.md`**](docs/MEDIA_CLOCK_AND_SYNC_SPECIFICATIONS.md) — Layer 2 & 3 universal `MediaClockDriver`, YouTube 60fps drift extrapolation, and dual-tier 60fps ref / ~10Hz UI loop.
- [**`docs/DIORAMA_3D_AND_UI_SPECIFICATIONS.md`**](docs/DIORAMA_3D_AND_UI_SPECIFICATIONS.md) — Layer 4 & 5 React Three Fiber blueprint stage, dual-camera handover, directional mannequins, and workspace UI.
- [**`docs/VISUAL_DESIGN_SYSTEM.md`**](docs/VISUAL_DESIGN_SYSTEM.md) — Single Source of Truth for visual design language, typographic hierarchy, theme engine, centralized `UI_TOKENS`, and decoupled 3D diorama palettes.

---

## Commands

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Run unit test suite (Vitest)
npm test

# Type-check and build production bundle
npm run build

# Run fast linter (oxlint)
npm run lint

# Deterministic 60fps Viewport Video Recorder (Playwright + FFmpeg)
npm run record [scene] [options]

# Examples:
# Record Blueprint 01 from Scripted Observer View at 1080p 60fps
npm run record 01

# Record Stage Camera POV through director's lens with safe-action guides
npm run record 01 -- --camera stage-pov --guides -o stage_pov.mp4

# Record clean 3D diorama geometry only (no HTML labels)
npm run record 02 -- --labels off -o clean.mp4

# Record custom scene and slap audio track from reference video (video image excluded)
npm run record path/to/my_scene.yaml -- --audio path/to/reference.mp4 -o my_scene.mp4

# Record single shot cue with isometric schematic camera preset in 4K
npm run record 04 -- --shot shot_01 --preset isometric --res 4k -o shot01_iso_4k.mp4
```
