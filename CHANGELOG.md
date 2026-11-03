# Changelog

All notable changes to **StageFlow** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-11-03

### Added
- **Core Stateless Frame Engine & Cinematic Optics (Layer 1)**:
  - Deterministic evaluation function `computeStageFrame(t, score)` guaranteeing bit-for-bit identical staging on forward and backward scrubs.
  - Forward camera pose chaining ($P_0 \to P_1 \to \dots \to P_k$) calculating cumulative camera positions and targets across cuts.
  - 9 easing algorithms (`linear`, `ease_in_quad`, `ease_out_quad`, `ease_in_out_quad`, `ease_in_cubic`, `ease_out_cubic`, `ease_in_out_cubic`, `ease_in_out_sine`, `ease_in_out_expo`).
  - 11 3D camera trajectory maneuvers (`static`, `pan`, `tilt`, `dolly_in`, `dolly_out`, `truck_left`, `truck_right`, `pedestal_up`, `pedestal_down`, `arc_orbit`, `compound`).
  - Shortest-arc angular unwrapping (`shortestAngleDiff`) on $[-\pi, \pi]$ preventing $360^\circ$ yaw and facing flips.
  - Full-frame cinema lens focal length mapping ($24\text{mm}$, $35\text{mm}$, $50\text{mm}$, $85\text{mm}$) to vertical FOV using $36\text{mm} \times 24\text{mm}$ sensor math.
  - Rectangular film gate frustum projection matching target aspect ratios (`16:9`, `2.39:1`) with focal distance and focus plane bounds.
  - Decoupled `observer_shots` timeline allowing independent observation choreography separate from stage director cuts.
  - Resilient YAML/JSON score parser (`scoreParser.ts`) converting human angles (degrees) to radians and metric distances with validation diagnostics.
  - Bundled score registry (`scoreCatalog.ts`) supporting synchronous bundled lookups and asynchronous custom imports.
- **Universal Media Clock Drivers (Layer 2)**:
  - Polymorphic `MediaClockDriver` interface powering Local Video, YouTube URLs, and Procedural Simulator.
  - HTML5 Video Driver (`html5MediaDriver.ts`) supporting local `.mp4`/`.webm` and dropped blobs with play, pause, seek, and loop support.
  - YouTube Driver (`youtubeMediaDriver.ts`) with IFrame API integration and 60fps drift-compensated extrapolation via `performance.now()`.
  - Procedural Virtual Clock (`proceduralMediaDriver.ts`) generating accurate 60fps playback timelines without video files.
- **Dual-Tier State Hooks & Storage (Layer 3)**:
  - Imperative 60fps frame tick (`useStageFrameLoop.ts`) mutating Three.js objects directly with zero React re-renders, paired with ~10Hz (`95ms`) throttled React UI state updates.
  - Unified transport hook (`useMediaClock.ts`) handling play/pause, time updates, variable speed (`0.25x`, `0.5x`, `1x`, `2x`), frame stepping (`[` / `]`), and shot looping.
  - Dual-tier storage engine (`scoreDb.ts`, `localStorageUi.ts`, `useScorePersistence.ts`) persisting custom scores and drafts to IndexedDB (`idb`) and UI preferences to `localStorage`.
  - Deferred invalidation pattern preventing premature fallback to defaults during asynchronous hydration.
  - Drag-and-drop & file picker loader (`useFileDropLoader.ts`) for pairing `.yaml` scores and `.mp4` video files.
- **React Three Fiber 3D Blueprint Diorama (Layer 4)**:
  - Minimalist dark diorama aesthetic with blueprint-styled grid lines ($1\text{m}$ primary, $0.25\text{m}$ sub-grid), stage boundary perimeter, and cardinal compass markers.
  - Stylized directional mannequins (`DirectionalMannequin.tsx`) with torso columns, head spheres, directional eye-visors, floor chevrons, and dashed motion trails.
  - Dual-camera rig system (`StageCameraRig.tsx`, `ObserverCameraRig.tsx`):
    - Illustrative Stage Camera in 3D space with rectangular frustum pyramid, optical focus plane, and 32-sample smoothed trajectory curves.
    - Viewport Observer Camera with seamless pause-to-free-orbit handover (`OrbitControls`) and instantaneous 0ms POV cuts between Scripted Observer, Free Orbit, and Stage Cam.
  - True 3D Stage Cam monitor (`StageCamMonitorCanvas.tsx`, `StageCamViewRig.tsx`) simulating physical viewfinder optics with safe-action crosshairs and letterbox framing.
  - High-performance imperative updates: direct frustum geometry and gate scaling without React reconciliation, and memoized billboard labels (`StageBillboardLabel.tsx`).
- **Directorial 2D Workspace Shell (Layer 5)**:
  - Resizable split workspace (`ResizableSplitWorkspace.tsx`) with a draggable divider ($18\%\text{--}82\%$) and 1-click header presets (`50/50`, `70/30 Stage`, `70/30 Video`, `100% Stage`).
  - Shot Breakdown HUD (`ShotBreakdownHud.tsx`) overlaying active shot index, lens focal length, camera maneuver, and directorial staging notes.
  - Camera Telemetry Capsule (`CameraTelemetryCapsule.tsx`) displaying real-time spherical coordinates (`target`, `distance`, `pitch`, `yaw`, `lens`) with 1-click YAML snippet copying.
  - Directorial Transport Bar (`DirectorialTransportBar.tsx`) featuring shot timeline markers, interactive shot chips, transport buttons, playback speed menu, and POV mode toggle.
  - Slide-out YAML Inspector Drawer (`YamlInspectorDrawer.tsx`) with real-time syntax error reporting and live stage re-evaluation.
  - Draft management UI (`StorageStatusBadge.tsx`, `ConfirmResetModal.tsx`) indicating storage tier and providing safe draft discard workflows.
- **Bundled Scores & Living Documentation Suite**:
  - `demo_blueprint.yaml`: Blueprint 01 featuring a 10-second two-shot 90° arc movement with subject blocking and facing dynamics.
  - `blueprint_02_dialogue.yaml`: Blueprint 02 featuring 6-shot dialogue coverage across 2 actors with 3 decoupled cinematic observer orbits.
  - `CHANGELOG.md`: Project changelog following Keep a Changelog and Semantic Versioning specifications.
  - Complete living specifications: `AGENTS.md` (with continuous diff-driven changelog tracking & Showrunner release authority), `SPECIFICATION.md`, `README.md`, `YAML_AUTHORING_GUIDE.md`, `CORE_MATH_AND_SCORE_SPECIFICATIONS.md`, `MEDIA_CLOCK_AND_SYNC_SPECIFICATIONS.md`, and `DIORAMA_3D_AND_UI_SPECIFICATIONS.md`.
