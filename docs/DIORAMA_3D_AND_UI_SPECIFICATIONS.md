# 3D Blueprint Diorama & 2D Workspace UI Specifications

This document is the authoritative technical specification for **Layer 4 (`src/stage/`)** and **Layer 5 (`src/ui/`)** in **StageFlow**. It is governed by [`AGENTS.md`](../AGENTS.md). For typography, color tokens, CSS variables, and theme palettes, see the companion Single Source of Truth: [**`docs/VISUAL_DESIGN_SYSTEM.md`**](VISUAL_DESIGN_SYSTEM.md).

---

## 1. Visual Aesthetic: Minimalist Blueprint / Architectural Schematic

StageFlow's 3D stage is engineered for maximum spatial legibility and zero visual clutter:
- **Studio Void Background & Fog**: Deep obsidian blueprint void with subtle depth fog (`16m` to `42m`), adapting dynamically via the diorama theme palette ([`src/stage/dioramaTheme.ts`](../src/stage/dioramaTheme.ts)).
- **Dual-Cadence Metric Floor Grid (`BlueprintFloorGrid.tsx`)**:
  - Renders a precision ground plane at $Y = 0$ with `1.0m` primary section lines, `0.25m` minor sub-grid lines, an active stage perimeter frame, center $X/Z$ axis crosshairs, an origin reticle at `(0, 0, 0)`, and cardinal stage labels (`+Z · Downstage / Front`, `-Z · Upstage / Back`). Grid line colors adapt dynamically to the diorama stage theme (see [`VISUAL_DESIGN_SYSTEM.md`](VISUAL_DESIGN_SYSTEM.md#5-decoupled-3d-diorama-stage-palette-srcstagedioramathemets)).
  - Cardinal labels are rendered as native WebGL SDF meshes (`Text` from `@react-three/drei`) lying flat on the perimeter floor plane ($Y = 0.005\text{m}$, rotation $-90^\circ$ around $X$) matching architectural blueprint convention; participating 100% in the WebGL Z-buffer so 3D camera cone/frustum lines and actors render naturally in front of the floor markings; automatically unmounted in `Stage Cam POV` (`cameraMode === 'stage-pov'`) to keep the viewfinder composition 100% clean.

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
   - **Dynamic Floor-Clamped 3D Orbit (`computeFloorClampedMaxPolarAngle`)**: Unlike legacy implementations that capped `maxPolarAngle` at a static $88.2^\circ$ relative to the subject's chest, the viewport dynamically computes the maximum allowable polar angle on every frame based on target elevation ($Y_{\text{target}}$) and radial distance ($R$), clamping the minimum camera elevation to $Y_{\text{cam}} \ge 0.05\text{m}$.
     - **Full 360° Aerial Orbit**: For elevated or flying entities (where $Y_{\text{target}} - R \ge 0.05\text{m}$), polar angle unlocks up to $176.4^\circ$ ($0.98\pi$), enabling complete 360° vertical inspection from underneath without bottom-pole gimbal lock.
     - **Floor-Level Directorial Worm's-Eye**: For ground actors, the camera can orbit down to knee and floor level ($Y = 0.05\text{m}$) and tilt upwards to inspect low-angle compositions, stopping smoothly at the floor plane without clipping through the stage grid into the underground void.
     - **Underground Pan Protection**: Both camera elevation and orbit target elevation are hard-clamped to $Y \ge 0.05\text{m}$ during mouse panning.
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
  - When moving (`maneuver !== 'cut'` and `showPath === true`), renders a dashed 3D curve along `stageCamera.trajectoryPoints` with start (sphere) and end (octahedron) waypoint beacons. Automatically hidden when `cameraMode === 'stage-pov'` so the physical track and waypoint beacons do not occlude the camera lens during forward/dolly moves. Trajectory coordinates are referentially stable across frames of the active shot via pure `WeakMap` score caching, preventing 10Hz React memoization jitter and maintaining a stationary, physically accurate track in world space.
- **3D Target Offset Tether & Anchor Beacon (`StageCameraOffsetTether.tsx`)**:
  - When a shot has an active world-space `target_offset` ($\ge 0.01\text{m}$), renders a cyan anchor beacon at the subject's un-offset look anchor (`baseTarget`) and a subtle dashed blueprint tether line connecting `baseTarget -> target`, making negative space composition, lead room, and headroom bias immediately readable in 3D.
  - Automatically hidden when `target_offset` magnitude is zero or when viewing through `'stage-pov'`.

### 2.3 Shared 3D Scene & Stage Cam Monitor Viewport (`BlueprintStageScene.tsx`, `StageCamMonitorCanvas.tsx`)
To enforce strict DRY principles and visual parity:
- **`BlueprintStageScene.tsx`**: Renders studio lighting, the metric floor grid (`BlueprintFloorGrid.tsx`), and directional mannequins (`DirectionalMannequin.tsx`), shared identically by both the 3D Diorama and the Stage Cam Viewport.
- **`StageCamMonitorCanvas.tsx` & `StageCamViewRig.tsx`**: When `score.video` uses `procedural://`, mounts an R3F `<Canvas>` locked directly to `frame.stageCamera.transform` (`position`, `target`, `fovDeg`), overlaid with a director's optical monitor HUD (90% safe-action frame, rule-of-thirds grid guides, optical reticle, and live focal length/distance telemetry). When video playback uses local `.mp4` or YouTube, the 3D canvas is unmounted (0% GPU overhead).

### 2.4 Dual-Tier State Gating on Camera & Blocking Cuts (Atomic Handover)
To eliminate 1-frame asynchronous ghosting between 60fps WebGL transforms (`frameRef.current`) and batched React 19 UI state (`uiFrame`):
- All 3D stage components ([`StageCameraRig.tsx`](../src/stage/StageCameraRig.tsx), [`ObserverCameraRig.tsx`](../src/stage/ObserverCameraRig.tsx), [`StageCamViewRig.tsx`](../src/stage/StageCamViewRig.tsx), and [`DirectionalMannequin.tsx`](../src/stage/DirectionalMannequin.tsx)) implement **Gated Frame Cuts**.
- Camera rigs gate on `shotId` (`liveFrame.stageCamera.shotId !== uiFrame.stageCamera.shotId`), while [`DirectionalMannequin.tsx`](../src/stage/DirectionalMannequin.tsx) gates on each entity's active `cueId` (`liveEntity.cueId !== initialState.cueId`). When an entity walks continuously across camera cuts via root `blocking:`, its `cueId` remains unchanged across the cut, ensuring zero frame freeze while still synchronizing instantaneous cue boundary transitions (`useStageFrameLoop.ts` flushes `uiSnapshot` immediately on both `shotChanged` and `entityCueChanged`).
- On the subsequent frame, when React re-renders with the new shot or blocking cue's props, the 3D position, rectangular frustum gate, floor movement trail, lens badge text, and 2D HUD switch **atomically on the exact same frame** with zero intermediate ghosting.

---

## 3. Directional Minimalist Mannequins & Props (`DirectionalMannequin.tsx`)

Scene entities (`character`, `prop`, `marker`) are rendered with unambiguous orientation and blocking cues:
- **Character Mannequin (`kind === 'character'`)**:
  - Stylized semi-transparent capsule torso column (`height = 1.75m`), shoulder cross-bar, and head sphere.
  - **Directional Eye-Visor Wedge & Ground Chevron**: A white visor cone on the front of the head (`+Z` local forward) paired with a ground chevron arrow pointing along `rotationYRad`, making character gaze and body facing immediately readable from overhead or side angles.
  - **Ground Contact Ring**: Circular base disc at `y = 0.012m` that expands and brightens when `highlighted === true`.
- **Dynamic Floor Movement Trail**:
  - When an entity moves during the active blocking cue or shot (`trailPoints.length >= 2`), renders a dashed floor trajectory curve tracing their full active movement path across the stage (persisting across camera cuts when driven by decoupled `blocking:`, and clearing during stationary holds/gaps).
- **Floating Identity Badges (`StageBillboardLabel.tsx`)**:
  - Uses `@react-three/drei` `<Html center zIndexRange={[5, 0]}>` with **Clamped Perspective Scaling** ($1.65\times$ near to $0.80\times$ far, anchored at $12\text{m}$) and prominent HUD-grade typography (`rounded-full bg-slate-950/90 backdrop-blur-md px-3.5 py-1.5 text-sm font-mono border border-slate-700/80 shadow-2xl`) above each mannequin (`Subject A`) and above the Stage Camera (`STAGE CAM · 50mm · ARC`). Perspective transforms mutate imperatively in `useFrame` directly on the inner DOM element style with zero React re-renders, delivering crisp 60fps/144fps responsiveness that eliminates microscopic text at mid/far distances while hard-capping near scaling to prevent close-up ballooning.
  - **Stacking Context Isolation & Calibrated Z-Index Range**: Calibrated to `zIndexRange={[5, 0]}` paired with container `isolation: isolate` on the diorama viewport (`ResizableSplitWorkspace.tsx`), ensuring 3D mannequin badges always depth-sort cleanly beneath 2D HUD overlays (`z-10`), bottom telemetry (`z-20`), the studio header (`relative z-30`), and dropdown menus (`z-50`).
  - **Camera Proximity Culling**: In `useFrame`, calculates true 3D world-space distance via `groupRef.current.getWorldPosition()`; if $R < 1.2\text{m}$, the badge smoothly fades to `opacity-0` so close foreground entities never block background stage action or actors.
  - **Clean Viewfinder in Stage Cam POV**: When viewing through `Stage Cam POV` (`cameraMode === 'stage-pov'`), floating 3D mannequin badges and floor compass markers are automatically unmounted (`visible = false`) so the director's viewfinder remains 100% focused on optical composition, actor silhouettes, and safe-action guides. Shot and entity metadata remain displayed in the top-left 2D HUD.
  - **Compact Identity-Only Default with Expand-on-Focus**: Mannequin badges display only their concise name (`● Robert`, `● Mark`) by default. Sublabels/roles (`· Scholar`, `· Assistant`) expand only when `highlighted === true` (active camera focus target) or on hover, cutting badge width by ~50% and preventing text collisions in tight two-shots.
  - **Directorial 3-Tier Hierarchy & Active Focus Highlighting**:
    - **Stage Camera**: Always at `100%` opacity (unghosted master optical telemetry).
    - **Active Focus Subject (`highlighted: true`)**: During active playback (`isPlaying === true`), displays at **`55%` opacity** with a character-tinted border (`borderColor: ${accentColor}99`), subtle luminous halo, bright glowing accent dot (`0 0 12px <color>`), and pure white bold text (`font-bold text-white`), establishing an immediate $2.75\times$ visual contrast over passive background actors without overpowering the diorama or competing with the Stage Camera. When paused or scrubbing, active focus entities render at **`100%` full brightness**.
    - **Passive Subjects (`highlighted: false`)**: Fade down to **`20%` opacity** (`opacity-20`) during playback to keep spatial blocking clean, restoring to `85%` opacity on pause.

---

## 4. 2D Workspace Shell & Authoring Utilities (`src/ui/`)

### 4.1 Three-Wing Studio Header & Score Library (`WorkspaceHeader.tsx`, `ScoreLibraryModal.tsx`)
- **SceneFlow 3-Wing Architecture**: Aligned with sister application SceneFlow (`Screenplay-Sync`), the top studio header bar is divided into three ergonomic wings:
  - **Left Wing**: Brand identity (`StageFlow · 3D Blocking Diorama`), tiered `File ▾` dropdown (`FileMenuDropdown.tsx`), and the interactive `ActiveScoreIndicator.tsx` pill displaying the active score title with uncluttered clarity (technical storage badges like `Bundled Baseline` and `Custom` are reserved for the YAML drawer and Score Library). Clicking the active score chip immediately opens the Score Library.
  - **Center Stage**: Centered `LayoutSegmentedControl.tsx` housing the 2 workspace layout modes (`Split` | `Full`) in an elevated pill container.
  - **Right Wing**: Standalone amber `[ 📖 Library ]` gateway button opening `ScoreLibraryModal.tsx` and the `[ YAML Score ]` drawer toggle.
  - **Authoritative Stacking Context**: The header uses `relative z-30`, ensuring all dropdown menus (`File ▾`) and popovers render safely above viewport HUD elements, labels, and badges.
- **Tiered `File ▾` Menu (`FileMenuDropdown.tsx`)**:
  - *Media & Score I/O*: "Open Video or Score..." (file picker trigger) and "Export Active Score (.yaml)" (direct browser download).
  - *Scores*: "New Blank Score..." and "Manage Custom Scores" (with custom scores badge count).
  - *Reference*: "Score Library..." and link to the YAML Authoring Guide.
- **2-Column Master-Detail Score Library & Project Hub (`ScoreLibraryModal.tsx`, `ScoreInspectorPane.tsx`, `ScoreStageMinimap.tsx`)**:
  - Accessible `max-w-5xl` studio dialog integrating score discovery and project lifecycle management into a unified 2-column layout.
  - **Left Column (~40%)**: Fast-scrolling catalog list (`ScoreLibraryCard.tsx`) with category tabs (`All`, `Bundled`, `Custom`), un-truncated titles, media engine badges (`YouTube`, `Simulator`, `Video`), and active scene indicators.
  - **Right Column (~60%)**: Rich Choreography Inspector (`ScoreInspectorPane.tsx`) featuring:
    - **Procedural 2D Vector SVG Stage Minimap (`ScoreStageMinimap.tsx`)**: Renders architectural top-down stage schematics (metric grid, character proxy circles with facing chevrons, and camera trajectory cones) derived directly from in-memory score geometry in $< 0.1\text{ms}$ with zero WebGL overhead.
    - **Cinematic Telemetry**: Full titles, directorial notes, focal length breakdown (e.g. `35mm, 50mm`), camera maneuver tags, and actor/prop lineup.
    - **Shot Coverage Sequence**: Miniature timeline breakdown detailing each shot's lens, maneuver, and duration.
    - **Unified Project Lifecycle Actions**: Direct inline **Rename**, **Duplicate**, **Export (.yaml)**, and **Delete** for custom projects (eliminating the redundant separate project management modal), alongside **Fork as Custom** for bundled blueprints and **Load Score into Studio**.
- **Desktop (`lg+`)**: Side-by-side split between the Left Video Viewport and Right 3D Diorama Stage, separated by a smooth pointer-drag divider bar (`18%` to `82%` clamp).
- **Workspace Layout Modes**:
  - `Split`: Side-by-side Video and 3D Diorama Stage. Remembers the user's customized drag ratio (defaults to 50%).
  - `Full`: Collapses the video panel to 0% for full-viewport 3D inspection while keeping the reference video/YouTube player mounted off-screen so background media playback, audio, and clock sync continue seamlessly.
- **Narrow Screens (`< lg`)**: Responsively stacks the Video Panel (`38%` height) above the 3D Diorama Stage (`62%` height) and hides the center segmented layout presets to prevent header crowding.

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
- **Protected Bundled Presets (Read-Only)**: When viewing factory Blueprints 01–05, editing is locked (`readOnly={true}`) and surfaces an informational banner with a prominent **`[ Fork to Edit ]`** button. Clicking it clones the score into a Custom Project and immediately unlocks the live editor.
- **Custom Projects Live Auto-Save**: When viewing Custom Projects, edits immediately re-evaluate the 3D stage in real time (`Frame_t = f(t)`) and auto-save debounced to IndexedDB, with a **`[ Duplicate ]`** button in the header. Syntax errors display a non-blocking diagnostic banner while preserving the last valid 3D stage state.
- Includes a 1-click **`[ Guide ]`** button that opens [`docs/YAML_AUTHORING_GUIDE.md`](YAML_AUTHORING_GUIDE.md) in a new browser tab for side-by-side reference.

### 4.4 Drag-and-Drop Custom Asset Loader (`useFileDropLoader.ts`)
- Dropping any `.yaml`/`.yml`/`.json` file or `.mp4`/`.webm`/`.mov` video file anywhere onto the window (or selecting via `[ Load Video / YAML ]`) binds the assets in browser memory (`URL.createObjectURL`) with zero server upload required.
- **Auto-Fork Collision Guard**: If a dropped YAML file has an `id` that matches a bundled preset (e.g. `demo-blueprint`), StageFlow automatically forks it with a unique custom ID, preserving the factory preset intact and saving the file to `Custom Projects`.

### 4.5 Storage Persistence Indicator (`StorageStatusBadge.tsx`)
- Displayed in the top studio header and the YAML inspector status bar.
- Visually communicates the active persistence tier:
  - `Bundled Baseline` (pristine unedited preset).
  - `Draft (IndexedDB)` (active edits saved safely in IndexedDB).
  - `Custom (IndexedDB)` (imported custom scene saved in IndexedDB).
  - `Saving Draft...` (transient pulse while debounced auto-save writes).

### 4.6 Reset Confirmation Modal (`ConfirmResetModal.tsx`)
- Accessible modal dialog protecting against accidental data loss.

### 4.7 Unified Project Management & Toast Notifications (`ScoreLibraryModal.tsx`, `ToastContainer.tsx`)
- **Unified Studio Hub**: Custom projects (stored in IndexedDB) are managed directly within the Score Library's Inspector pane (`ScoreInspectorPane.tsx`), featuring inline title renaming, YAML file export, project duplication, and delete confirmation with smooth fallback to Blueprint 01, completely eliminating redundant standalone dialogs.
- **Transient Toast Feedback (`ToastContainer.tsx`)**: Lightweight 3-second floating feedback banners confirming file drops, auto-forks, project deletions, and exports.
- **Legacy Draft Auto-Migration**: On startup hydration, any legacy drafts in IndexedDB that modified bundled presets are automatically migrated into standalone Custom Projects with zero data loss.

### 4.7 Directorial HUD & Viewport Overlays (`ShotBreakdownHud.tsx`, `CameraModeSwitcher.tsx`, `CameraPresetControls.tsx`, `CameraTelemetryCapsule.tsx`)
- **Top-Center Camera POV Mode Switcher (`CameraModeSwitcher.tsx`)**:
  - Elevated floating tactile segmented pill centered at `top-3` (`[ 👁 Scripted | 🪐 Free Orbit | 📷 Stage Cam ]`), decoupling viewport perspective selection from the bottom transport bar.
- **Top-Right Directorial Camera Presets (`CameraPresetControls.tsx`, `cameraPresets.ts`)**:
  - 1-click angle snaps cluster (`Top/Plan 84°`, `Iso 45°`, `Front 12°`, `Side 90°`, `Reset`) that snaps camera perspective and switches to Free Orbit without pausing playback.
- **Top-Left Shot Breakdown HUD (`ShotBreakdownHud.tsx`)**:
  - Displays active shot number, label, prime lens focal length, gate aspect ratio, and active maneuver.
  - Automatically de-duplicates title prefixes (`[SHOT 01] Slow Arc...` instead of repeating `Shot 01 · `).
  - Features a 1-click collapse/expand fold chevron shrinking the card to a sleek single-line pill, saving ~70% screen real estate.
  - When `target_offset` is active ($\ge 0.01\text{m}$), surfaces a cyan `OFFSET <magnitude>m` badge with crosshair icon and displays the exact world displacement vector `Δ [+X, +Y, +Z]m` in the optics row.
- **Bottom-Right Authoring Telemetry Capsule (`CameraTelemetryCapsule.tsx`)**:
  - Formatted with inline muted monospace micro-labels: `P 26.0° · Y 35.0° · [R -5.0°] · D 7.50m · TGT [0.0, 1.1, 0.0] · 50mm` for instant glanceability.
- **Stage Cam Monitor Optical HUD (`StageCamMonitorCanvas.tsx`)**:
  - Displays live lens focal length, distance, yaw, roll degrees, and metric `OFFSET` magnitude in the bottom status bar.

### 4.8 Viewport Label & Composition Guides Controls (`LabelDisplayModeToggle.tsx`)
- Floating top-right glassmorphic pill overlay mounted on the 3D diorama canvas.
- Conditioned so the `Guides` toggle button appears strictly when in `Stage Cam POV` (`cameraMode === 'stage-pov'`), keeping the 3D Observer view chrome uncluttered.
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

### 4.10 Deterministic 60fps Headless Viewport Recorder CLI (`scripts/record/`, `src/recorder/`)
- Standalone CLI recording tool (`npm run record [scene] [options]`) driven by Playwright and FFmpeg.
- **Stateless Frame Stepping ($t_i = i / 60\text{s}$)**: Steps through any choreography score frame-by-frame with zero dropped frames or browser pacing lag, streaming PNG frames into an FFmpeg H.264/VP9 pipe.
- **Dedicated Headless Render Route (`?mode=headless-render`)**: `App.tsx` routes to `<HeadlessRecorderView />`, mounting a pure, chrome-free diorama canvas with zero localStorage polling, media clocks, or extraneous listeners.
- **Two Core Directorial Recording Modes**:
  1. **Scripted Observer View (`--camera scripted`)**: Records the 3D diorama along the authored observer camera path.
  2. **Stage Camera POV (`--camera stage-pov`)**: Locks directly to the physical stage camera's optical sightline, focal length, and active film gate.
- **Visual Overlays & Chrome Control**:
  - `--labels all | camera-only | off`: Toggles 3D Drei HTML character and camera badges.
  - `--guides`: Renders the optical viewfinder safe-action box, rule of thirds, and reticle.
  - `--hud`: Includes top-left shot breakdown and bottom-right degree/meter telemetry badges.
  - `--audio <local_path>`: Opt-in audio extraction and muxing from a reference video or sound file (default output remains 100% silent).
- **Cinematic Presets & Slicing**:
  - `--preset isometric | top-down | front | side`: Sets fixed architectural perspective angles.
  - `--shot <shot_id>` or `--start <sec> --end <sec>`: Slices exact shot cues or timestamp windows.
  - `--res 1080p | 4k | 720p | square | vertical`, `--fps <number>`.

### 4.11 Theme Engine & Split Resize Invariants (`src/hooks/useAppShellTheme.ts`, `src/stage/dioramaTheme.ts`)
- **Visual Design System SSOT**: All typography, semantic CSS tokens, color palettes, and centralized `UI_TOKENS` are authored in [**`docs/VISUAL_DESIGN_SYSTEM.md`**](VISUAL_DESIGN_SYSTEM.md).
- **Dual-Tier Decoupled Theme System (`useAppShellTheme.ts`, `ThemeSelectorDropdown.tsx`)**:
  - **App Shell Theme**: 4 modes (`Dark`, `Warm`, `Light`, `Auto`) persisted in `stageflow:ui:theme-mode`.
  - **3D Diorama Stage Theme**: Decoupled from the app shell, with 4 modes (`Dark` [default], `Match App`, `Warm`, `Light`) persisted in `stageflow:ui:diorama-theme-mode`. Allows maintaining a high-contrast dark blueprint void on stage while authoring in warm drafting paper or light UI chrome.
- **Adaptive 3D Diorama Stage Palette (`dioramaTheme.ts`)**: Evaluates WebGL clear color, scene fog (`16m`–`42m`), and metric grid materials via `getDioramaPalette(effectiveCategory)` with **0 additional WebGL draw calls or shader passes**.
- **Transition Freezing (`disableTransitionsTemporarily()`)**: Momentarily suppresses global CSS transitions across the DOM for 1 animation frame during theme swaps, eliminating animation reflow lag.
- **60fps Split Resize Performance (`body.is-resizing-split`)**: Suppresses transitions and iframe pointer interception across the window while dragging the split workspace divider bar.
