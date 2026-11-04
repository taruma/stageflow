# 3D Blueprint Diorama & 2D Workspace UI Specifications

This document is the authoritative technical specification for **Layer 4 (`src/stage/`)** and **Layer 5 (`src/ui/`)** in **StageFlow**. It is governed by [`AGENTS.md`](../AGENTS.md).

---

## 1. Visual Aesthetic: Minimalist Blueprint / Architectural Schematic

StageFlow's 3D stage is engineered for maximum spatial legibility and zero visual clutter:
- **Studio Void Background**: Deep blueprint obsidian (`#050811`) with subtle depth fog (`16m` to `42m`).
- **Dual-Cadence Metric Floor Grid (`BlueprintFloorGrid.tsx`)**:
  - Renders a precision ground plane at $Y = 0$ with `1.0m` primary section lines (`#1e293b`), `0.25m` minor sub-grid lines (`#0f172a`), an active stage perimeter frame (`#38bdf8`), center $X/Z$ axis crosshairs, an origin reticle at `(0, 0, 0)`, and cardinal stage labels (`+Z · Downstage / Front`, `-Z · Upstage / Back`).

---

## 2. Dual-Camera Architecture & Free-Orbit Handover (`src/stage/`)

Every frame evaluates two distinct camera roles inside the 3D diorama:

### 2.1 The Observer Camera & `OrbitControls` Handover (`ObserverCameraRig.tsx`)
Controls the main Three.js `PerspectiveCamera` through which the user views the diorama. Supports three instant-cut POV modes (`CameraViewMode`):

1. **`'scripted'` (Scripted Observer View — Default)**:
   - **While Playing (`isPlaying === true`)**: `OrbitControls` user input is disabled; the viewport camera is driven at 60fps by `frame.observerCamera.transform`.
   - **When Paused (`isPlaying === false`)**: The scripted lock automatically releases and `OrbitControls` is enabled, allowing the user to freely orbit, pan, and zoom around the frozen 3D setup from any angle.
   - **Scrubbing While Paused (`seekOccurred`)**: Whenever the user drags the timeline scrubber, clicks a shot chip, or steps a frame (`[` / `]`) while paused, `lastManualSeekIdRef` increments and the viewport camera snaps cleanly to the scrubbed timestamp's pose before returning to free-orbit control.
2. **`'free'` (Free Orbit View)**:
   - Keeps `OrbitControls` unlocked at all times—even while the video is actively playing.
3. **`'stage-pov'` (Stage Camera POV)**:
   - Locks the viewport camera directly to `frame.stageCamera.transform` (`position`, `target`, `fovDeg`) with analytical vertical FOV compensation (`computeViewfinderCanvasFovDeg`), guaranteeing that the 3D scene inside the contained active film gate matches the lens focal length across any split workspace width with zero distortion.
   - Automatically activates the Director's Optical Viewfinder Overlay (`StageCamViewfinderOverlay.tsx`), featuring an 82% obsidian Look-Around veil outside the gate, active framing brackets, and toggleable composition guides.

> [!IMPORTANT]
> **Instant Cut Invariant (0ms Transition)**: Switching between `'scripted'`, `'free'`, and `'stage-pov'` applies an instantaneous cut on the very next animation frame without slerp/lerp transition lag.

### 2.2 The Illustrative Stage Camera Rig (`StageCameraRig.tsx`)
Visualizes the physical camera filming the shot inside the 3D diorama:
- **Camera Chassis & Lens Barrel**: Positioned at `stageCamera.transform.position` and oriented via `lookAt(target)`. Automatically hidden when `cameraMode === 'stage-pov'` so the 3D chassis does not occlude the viewport lens. The chassis, lens barrel, and frustum pyramid bank around the optical sightline inside a dedicated rolled group (`rotation.z = -pose.roll`), while the floating monospace label badge (`STAGE CAM`) remains upright in unrolled space.
- **Rectangular Cinematic Gate Frustum**:
  - Projects 4 corner pyramid rays from the lens nodal point `(0, 0, 0)` to the 4 corners of the rectangular focus gate at `frustumDepth`, sized via `computeFrustumGateDimensions(focalLengthMm, frustumDepth, aspectRatio)`.
  - Renders a luminous **Focus Plane Frame** with subtle rule-of-thirds horizon guides, translucent glass fill, and a target center crosshair ring right at the subject's focus plane.
- **3D Trajectory Path Curve**:
  - When moving (`maneuver !== 'cut'` and `showPath === true`), renders a dashed 3D curve along `stageCamera.trajectoryPoints` with start (sphere) and end (octahedron) waypoint beacons. Automatically hidden when `cameraMode === 'stage-pov'` so the physical track and waypoint beacons do not occlude the camera lens during forward/dolly moves.
- **3D Target Offset Tether & Anchor Beacon (`StageCameraOffsetTether.tsx`)**:
  - When a shot has an active world-space `target_offset` ($\ge 0.01\text{m}$), renders a cyan anchor beacon at the subject's un-offset look anchor (`baseTarget`) and a subtle dashed blueprint tether line connecting `baseTarget -> target`, making negative space composition, lead room, and headroom bias immediately readable in 3D.
  - Automatically hidden when `target_offset` magnitude is zero or when viewing through `'stage-pov'`.

### 2.3 Shared 3D Scene & Stage Cam Monitor Viewport (`BlueprintStageScene.tsx`, `StageCamMonitorCanvas.tsx`)
To enforce strict DRY principles and visual parity:
- **`BlueprintStageScene.tsx`**: Renders studio lighting, the metric floor grid (`BlueprintFloorGrid.tsx`), and directional mannequins (`DirectionalMannequin.tsx`), shared identically by both the 3D Diorama and the Stage Cam Viewport.
- **`StageCamMonitorCanvas.tsx` & `StageCamViewRig.tsx`**: When `score.video` uses `procedural://`, mounts an R3F `<Canvas>` locked directly to `frame.stageCamera.transform` (`position`, `target`, `fovDeg`), overlaid with a director's optical monitor HUD (90% safe-action frame, rule-of-thirds grid guides, optical reticle, and live focal length/distance telemetry). When video playback uses local `.mp4` or YouTube, the 3D canvas is unmounted (0% GPU overhead).

### 2.4 Dual-Tier State Gating on Camera Cuts (Atomic Handover)
To eliminate 1-frame asynchronous ghosting between 60fps WebGL transforms (`frameRef.current`) and batched React 19 UI state (`uiFrame`):
- All 3D stage components ([`StageCameraRig.tsx`](../src/stage/StageCameraRig.tsx), [`ObserverCameraRig.tsx`](../src/stage/ObserverCameraRig.tsx), [`StageCamViewRig.tsx`](../src/stage/StageCamViewRig.tsx), and [`DirectionalMannequin.tsx`](../src/stage/DirectionalMannequin.tsx)) implement **Gated Frame Cuts**.
- If the 60fps clock crosses a shot boundary (`liveFrame.stageCamera.shotId !== uiFrame.stageCamera.shotId`) before React commits its render cycle (~16ms), the 3D rigs hold their transforms at `uiFrame`'s committed shot.
- On the subsequent frame, when React re-renders with the new shot's props, the 3D position, rectangular frustum gate, lens badge text, and 2D HUD switch **atomically on the exact same frame** with zero intermediate ghosting.

---

## 3. Directional Minimalist Mannequins & Props (`DirectionalMannequin.tsx`)

Scene entities (`character`, `prop`, `marker`) are rendered with unambiguous orientation and blocking cues:
- **Character Mannequin (`kind === 'character'`)**:
  - Stylized semi-transparent capsule torso column (`height = 1.75m`), shoulder cross-bar, and head sphere.
  - **Directional Eye-Visor Wedge & Ground Chevron**: A white visor cone on the front of the head (`+Z` local forward) paired with a ground chevron arrow pointing along `rotationYRad`, making character gaze and body facing immediately readable from overhead or side angles.
  - **Ground Contact Ring**: Circular base disc at `y = 0.012m` that expands and brightens when `highlighted === true`.
- **Dynamic Floor Movement Trail**:
  - When an entity moves during the active shot (`trailPoints.length >= 2`), renders a dashed floor trajectory curve tracing their path across the stage.
- **Floating Identity Badges (`StageBillboardLabel.tsx`)**:
  - Uses `@react-three/drei` `<Html center distanceFactor={9}>` to render ultra-compact, borderless micro-pills (`rounded-full bg-slate-950/70 backdrop-blur-sm px-2 py-0.5 text-[9px] font-mono`) above each mannequin (`Subject A`) and above the Stage Camera (`STAGE CAM · 50mm · ARC`).
  - **Selective Playback Ghosting**: While the scene is actively playing (`isPlaying === true`), actor/prop mannequin labels smoothly fade down to `20%` opacity (`opacity-20 transition-opacity duration-200`) so spatial trajectories and character blocking take center stage without visual clutter. The Stage Camera label remains at `100%` opacity so optical focal length and maneuver telemetry remain readable. When paused or scrubbing, all visible labels restore to full crispness.
  - **Active Camera Focus Highlight**: When an entity is the active focus target of the camera (`highlighted === true`), its colored dot renders an accent glow (`boxShadow: 0 0 6px <color>`) with higher text brightness. Passive actors remain soft and muted.

---

## 4. 2D Workspace Shell & Authoring Utilities (`src/ui/`)

### 4.1 Resizable Split Workspace (`WorkspaceHeader.tsx`, `ResizableSplitWorkspace.tsx`)
- **Desktop (`lg+`)**: Side-by-side split between the Left Video Viewport and Right 3D Diorama Stage, separated by a smooth pointer-drag divider bar (`18%` to `82%` clamp).
- **Quick-Toggle Header Presets**:
  - `50/50`: Balanced 50% Video / 50% 3D Stage.
  - `70/30 Stage`: 32% Video / 68% 3D Diorama Focus.
  - `70/30 Video`: 68% Video / 32% 3D Stage.
  - `100% Stage`: Collapses the video panel to 0% for full-viewport 3D inspection while keeping the reference video/YouTube player mounted off-screen so background media playback, audio, and clock sync continue seamlessly.
- **Narrow Screens (`< lg`)**: Responsively stacks the Video Panel (`38%` height) above the 3D Diorama Stage (`62%` height).

### 4.2 Authoring Telemetry Capsule (`CameraTelemetryCapsule.tsx`)
- Floating bottom-right glassmorphic badge inside the 3D viewport displaying live **human degrees and metric meters** (`Pitch° / Yaw° · Distance(m) · (X, Y, Z)`).
- **Live Free-Orbit Tracking**: Updates in real time as the user orbits/pans/zooms via `OrbitControls` (`cartesianToSpherical`).
- **1-Click YAML Snippet Copy**: Clicking the capsule copies a formatted YAML camera block directly to the clipboard:
  ```yaml
  target: [0.00, 1.10, 0.00]
  distance: 7.50
  pitch: 26.0
  yaw: 38.0
  lens: 35mm
  ```

### 4.3 Slide-Out Live YAML Score Drawer (`YamlInspectorDrawer.tsx`)
- Toggled via the top-right `[ YAML Score ]` button (closes with `Escape` or `X`).
- Provides a live monospace editor bound to `parseStageScore()`.
- Valid edits immediately re-evaluate the 3D stage in real time (`Frame_t = f(t)`); syntax errors display a non-blocking diagnostic banner while preserving the last valid 3D stage state.
- Includes a 1-click **`[ Guide ]`** button that opens [`docs/YAML_AUTHORING_GUIDE.md`](YAML_AUTHORING_GUIDE.md) in a new browser tab for side-by-side reference.

### 4.4 Drag-and-Drop Custom Asset Loader (`useFileDropLoader.ts`)
- Dropping any `.yaml`/`.yml`/`.json` file or `.mp4`/`.webm`/`.mov` video file anywhere onto the window (or selecting via `[ Load Video / YAML ]`) binds the assets in browser memory (`URL.createObjectURL`) with zero server upload required.

### 4.5 Storage Persistence Indicator (`StorageStatusBadge.tsx`)
- Displayed in the top studio header and the YAML inspector status bar.
- Visually communicates the active persistence tier:
  - `Bundled Baseline` (pristine unedited preset).
  - `Draft (IndexedDB)` (active edits saved safely in IndexedDB).
  - `Custom (IndexedDB)` (imported custom scene saved in IndexedDB).
  - `Saving Draft...` (transient pulse while debounced auto-save writes).

### 4.6 Reset Confirmation Modal (`ConfirmResetModal.tsx`)
- Accessible modal dialog protecting against accidental data loss.

### 4.7 Directorial HUD & Optical Telemetry (`ShotBreakdownHud.tsx`, `StageCamMonitorCanvas.tsx`)
- **Top-Left Shot Breakdown HUD (`ShotBreakdownHud.tsx`)**:
  - Displays active shot number, label, prime lens focal length, gate aspect ratio, and active maneuver.
  - When `target_offset` is active ($\ge 0.01\text{m}$), automatically surfaces a cyan `OFFSET <magnitude>m` badge with crosshair icon and displays the exact world displacement vector `Δ [+X, +Y, +Z]m` in the optics row.
- **Stage Cam Monitor Optical HUD (`StageCamMonitorCanvas.tsx`)**:
  - Displays live lens focal length, distance, yaw, roll degrees, and metric `OFFSET` magnitude in the bottom status bar.

### 4.8 Viewport Label & Composition Guides Controls (`LabelDisplayModeToggle.tsx`)
- Floating top-right glassmorphic pill overlay mounted on the 3D diorama canvas.
- Supports 3 distinct directorial visibility modes (`LabelDisplayMode`):
  - **`All`**: Displays both actor/prop mannequins and Stage Camera labels with playback auto-ghosting.
  - **`Cam` (`camera-only`)**: Hides actor/prop labels, keeping only the illustrative Stage Camera lens & maneuver badge.
  - **`Off`**: Hides all 3D labels (including floor cardinal orientation tags) for an unobstructed geometric diorama.
- **Global Hotkey `L`**: Cycles through `'all' -> 'camera-only' -> 'off' -> 'all'` at any time (ignored while typing in text inputs or code editors).
- **Composition Guides Toggle (`[ Guides ]` / Hotkey `G`)**: Toggles the 90% safe-action boundary, rule-of-thirds grid, and center reticle across both the right Viewfinder and the left Procedural Monitor.
- **Synchronous Persistence**: Preferences are remembered across reloads via `localStorage` (`stageflow:ui:label-mode`, `stageflow:ui:viewfinder-guides`).

### 4.9 Director's Optical Viewfinder Overlay (`StageCamViewfinderOverlay.tsx`)
- Engages automatically whenever the 3D diorama switches to **`Stage Cam POV`** (`cameraMode === 'stage-pov'`).
- **Centered Film Gate**: Sized to `score.aspectRatio` (`16:9`, `2.39:1`) and scaled to 84% of the viewport (`VIEWFINDER_GATE_SCALE = 0.84`), auto-scaling cleanly when the split divider is dragged.
- **Semi-Translucent Look-Around Mask**: Renders an 82% darkened obsidian veil (`rgba(5, 8, 17, 0.82)`) outside the active gate boundary so off-camera actors and props waiting in the wings remain faintly visible while the active frame pops with commanding contrast.
- **Framing Brackets & Stamp**: Luminous corner brackets and a top-left micro-stamp (`REC GATE · 16:9 · 50mm`).
- **Toggleable Guides**: 90% Safe-Action dashed frame, Rule-of-Thirds 3x3 grid, and Center Optical Crosshairs.

