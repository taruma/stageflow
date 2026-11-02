# 3D Blueprint Diorama & 2D Workspace UI Specifications

This document is the authoritative technical specification for **Layer 4 (`src/stage/`)** and **Layer 5 (`src/ui/`)** in **Stageplay**. It is governed by [`AGENTS.md`](../AGENTS.md).

---

## 1. Visual Aesthetic: Minimalist Blueprint / Architectural Schematic

Stageplay's 3D stage is engineered for maximum spatial legibility and zero visual clutter:
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
   - Locks the viewport camera directly to `frame.stageCamera.transform` (`position`, `target`, `fovDeg`) so the user looks directly through the illustrative Stage Camera's lens.

> [!IMPORTANT]
> **Instant Cut Invariant (0ms Transition)**: Switching between `'scripted'`, `'free'`, and `'stage-pov'` applies an instantaneous cut on the very next animation frame without slerp/lerp transition lag.

### 2.2 The Illustrative Stage Camera Rig (`StageCameraRig.tsx`)
Visualizes the physical camera filming the shot inside the 3D diorama:
- **Camera Chassis & Lens Barrel**: Positioned at `stageCamera.transform.position` and oriented via `lookAt(target)`. Automatically hidden when `cameraMode === 'stage-pov'` so the 3D chassis does not occlude the viewport lens.
- **Rectangular Cinematic Gate Frustum**:
  - Projects 4 corner pyramid rays from the lens nodal point `(0, 0, 0)` to the 4 corners of the rectangular focus gate at `frustumDepth`, sized via `computeFrustumGateDimensions(focalLengthMm, frustumDepth, aspectRatio)`.
  - Renders a luminous **Focus Plane Frame** with subtle rule-of-thirds horizon guides, translucent glass fill, and a target center crosshair ring right at the subject's focus plane.
- **3D Trajectory Path Curve**:
  - When moving (`maneuver !== 'cut'` and `showPath === true`), renders a dashed 3D curve along `stageCamera.trajectoryPoints` with start (sphere) and end (octahedron) waypoint beacons.

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
  - Uses `@react-three/drei` `<Html center distanceFactor={9}>` to float crisp monospace labels above each mannequin (`Subject A (Lead)`) and above the Stage Camera (`STAGE CAM · 50mm · ARC`).

---

## 4. 2D Workspace Shell & Authoring Utilities (`src/ui/`)

### 4.1 Resizable Split Workspace (`WorkspaceHeader.tsx`, `ResizableSplitWorkspace.tsx`)
- **Desktop (`lg+`)**: Side-by-side split between the Left Video Viewport and Right 3D Diorama Stage, separated by a smooth pointer-drag divider bar (`18%` to `82%` clamp).
- **Quick-Toggle Header Presets**:
  - `50/50`: Balanced 50% Video / 50% 3D Stage.
  - `70/30 Stage`: 32% Video / 68% 3D Diorama Focus.
  - `70/30 Video`: 68% Video / 32% 3D Stage.
  - `100% Stage`: Collapses the video panel to 0% for full-viewport 3D inspection.
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
