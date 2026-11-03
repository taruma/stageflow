# Changelog

All notable changes to **StageFlow** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Camera Target Offset (`target_offset`, `target_offset_start`, `target_offset_end`) Support**:
  - Extended `CameraCueSpec` and `CameraWaypointSpec` (`src/core/types.ts`) with world-space metric offset vectors (`targetOffset`, `targetOffsetStart`, `targetOffsetEnd`).
  - Implemented Option A shot-boundary offset reset and cross-shot recovery (`resolveShotStartOffset`, `resolveShotDestOffset`, and offset-aware `resolveTargetPoint3D` in `src/core/trajectoryChain.ts`), supporting static offsets, animated intra-shot pedestal/pan offsets, and Catmull-Rom spline waypoint offsets.
  - Extended YAML parser (`src/core/scoreParser.ts`) to normalize `target_offset`, `target_offset_start`, and `target_offset_end` on shots, observer shots, spline waypoints, and baseline stage cameras.
  - Added 3 deterministic unit tests in `tests/unit/scoreParser.test.ts` and `tests/unit/frameEngine.test.ts` verifying YAML parsing, Option A reset, optical sightline invariance, and animated offset recovery.
- **Blueprint 03 Choreography Example: "The Long Distance Pass" (`public/scores/blueprint_03_ball_pass.yaml`)**:
  - Authored a 30-meter, 3-actor, 6-shot dynamic choreography score illustrating:
    - Wide-span spatial staging with three characters aligned along the $X$-axis: Arthur at $X = -15\text{m}$, Ruby at $X = +5\text{m}$ ($20\text{m}$ span), and Mark at $X = +15\text{m}$ ($10\text{m}$ span).
    - Parabolic projectile arc for the ball pass from Arthur to Ruby utilizing gravity deceleration and acceleration: Shot 1 ascent to $5.2\text{m}$ apex using `ease-out`, followed by Shot 2 steep descent into Ruby's hands using `ease-in`.
    - Multi-second centrifugal ball orbit around Ruby across Shots 3 and 4 ($t = 6.0\text{s} \to 11.0\text{s}$) with dynamic actor gaze tracking (`look_at: "ball"`).
    - High-speed straight-line bullet pass from Ruby to Mark across Shots 5 and 6 ($10\text{m}$ direct horizontal trajectory at $Y = 1.25\text{m}$).
    - Stage camera solely tracking the ball (`target: "ball"`) across all 6 shots with varied lenses ($28\text{mm}$, $35\text{mm}$, $50\text{mm}$, $65\text{mm}$, $85\text{mm}$) and expressive Dutch roll angles ($+14^\circ$, $-18^\circ$, $+22^\circ$, $-16^\circ$, dynamic roll swing $-12^\circ \to +12^\circ$, and settling to $0^\circ$ on catch).
    - Viewport diorama camera left unscripted (omitted `observer_shots:`), enabling full free orbit inspection at all times.
  - Registered Blueprint 03 in `src/core/scoreCatalog.ts` alongside Blueprint 01 and 02.
  - Updated unit test catalog assertions in `tests/unit/scoreParser.test.ts` and added comprehensive deterministic choreography verification in `tests/unit/frameEngine.test.ts`.
- **Camera Roll (Dutch Angle / Banking) Support across Layers 1–5**:
  - `SphericalPose.roll` added in radians (`src/core/types.ts`), parameterizing camera rotation around the optical sightline with zero position drift.
  - Orthonormal rolled up-vector `CameraTransform3D.up` derived analytically in `sphericalToCartesian` (`src/core/sphericalMath.ts`) using $\vec{U}_{\text{rolled}} = \cos(\gamma)\vec{U}_0 + \sin(\gamma)\vec{R}_0$.
  - Option A shot-boundary reset semantics implemented in `resolveShotStartRoll` and `resolveShotDestRoll` (`src/core/trajectoryChain.ts`), automatically resetting omitted roll to the level baseline ($0^\circ$) while supporting static Dutch angles (`roll`), explicit spans (`roll_start`, `roll_end`), relative turns (`roll_delta`), and cross-shot recovery (`roll_end: 0`).
  - Catmull-Rom spline roll unwrapping and interpolation across waypoints in `evaluateSplineCameraPose`.
  - Pure roll progress interpolation `interpolateRoll` supporting all 11 camera maneuvers in `src/core/maneuvers.ts`.
  - YAML parser extension in `src/core/scoreParser.ts` converting `roll`, `roll_start`, `roll_end`, `roll_delta`, and `dutch` alias in human degrees to radians.
  - 3D Stage Camera banking in `src/stage/StageCameraRig.tsx` via dedicated inner `rollGroupRef` (`rotation.z = -pose.roll`), tilting the chassis and rectangular frustum gate while keeping the floating `"STAGE CAM"` identity badge upright in unrolled space.
  - True 3D Stage Cam Monitor Viewport (`src/stage/StageCamViewRig.tsx`) and Viewport Observer Camera (`src/stage/ObserverCameraRig.tsx`) optical roll synchronization via local `persp.rotateZ(pose.roll)`.
  - UI Telemetry Capsule (`src/ui/CameraTelemetryCapsule.tsx`) displaying live roll degrees, tooltip readout, and 1-click YAML snippet copying with dynamic `roll: <deg>` injection.
  - Optical Stage Cam Monitor HUD (`src/stage/StageCamMonitorCanvas.tsx`) displaying live `ROLL` telemetry.
  - 5 new deterministic unit tests in `sphericalMath.test.ts`, `scoreParser.test.ts`, and `frameEngine.test.ts` verifying position invariance, orthonormal up-vector math, YAML parsing, Option A reset, animated roll, and cross-shot recovery.

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
