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
   - **Active Target Pivot Preservation**: Directorial camera preset snaps (**Top / Iso / Front / Side**) preserve the user's active look-at target or active character anchor (Blender Numpad 7/1/3 style), falling back to stage chest level `[0, 1.1, 0]` rather than jumping the target vertically or colliding with floor clearance bounds. Clicking a preset immediately flushes the Telemetry Capsule UI without throttling delay.
3. **`'stage-pov'` (Stage Camera POV)**:
   - Locks the viewport camera directly to `frame.stageCamera.transform` (`position`, `target`, `fovDeg`) with analytical vertical FOV compensation (`computeViewfinderCanvasFovDeg`), guaranteeing that the 3D scene inside the contained active film gate matches the lens focal length across any split workspace width with zero distortion.
   - Automatically activates the Director's Optical Viewfinder Overlay (`StageCamViewfinderOverlay.tsx`), featuring an 82% obsidian Look-Around veil outside the gate, active framing brackets, and toggleable composition guides.

### 2.2 Fluid Adaptive Diorama Framing (`computeAdaptiveDioramaFovDeg` — Approach A)
To eliminate stage clipping in the resizable split workspace without forcing black bars or letterboxing:
- When viewing the diorama in `'scripted'` or `'free'` mode, `ObserverCameraRig.tsx` dynamically evaluates `computeAdaptiveDioramaFovDeg(baseFov, width, height, baselineAspect)`.
- In wide viewports ($\ge 16:9$), the standard vertical FOV is preserved and horizontal view expands naturally.
- In narrow viewports ($< 16:9$, such as 50/50 split or mobile), the vertical FOV expands analytically:
  $$v\text{FOV}_{\text{adapted}} = 2 \times \arctan\left(\frac{\text{baselineAspect}}{\text{currentAspect}} \times \tan\left(\frac{v\text{FOV}_{\text{base}}}{2}\right)\right)$$
- Guarantees that whatever stage width is visible in full 16:9 recording is also completely visible in the interactive split workspace, eliminating the authoring trap where split-window adjustments look too distant when recorded.

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
- **Desktop (`lg+`) 3-Column Studio Workspace Architecture (`ResizableSplitWorkspace.tsx`)**:
  - **Left Column (~30%)**: Houses the reference video player (anchored top, aspect-fit), a continuous horizontal drag divider, and the modular **`VideoWorkspaceSubpanel.tsx`**. Features a dual-mode **`[ Notes | Stage Cam ]`** header toggle when reference video is present, allowing directors to preview the virtual 3D Stage Cam monitor directly beneath the video while capping active WebGL contexts at 2. Utilizes pure CSS container-query aspect-fit containment (`.aspect-fit-container` and `.aspect-fit-box` via `min(100cqw, calc(100cqh * ratio))`) across both viewports, strictly maintaining film aspect ratios (16:9, 2.39:1) with automatic letterboxing/pillarboxing and SMPTE 90% safe-action guides without vertical squishing.
  - **Center Column (~40%)**: Dedicated, uninterrupted 3D Blueprint Diorama viewport with 4-corner directorial HUD.
  - **Right Column (~30%)**: Dedicated, full-height YAML Score Studio (`YamlInspectorDrawer.tsx` in flex column mode) for real-time score authoring and validation.
- **Center Header Workflow & Layout Pairing (`LayoutSegmentedControl.tsx`)**:
  - Couples the layout mode segmented pill `[ ◫ Split | ⛶ Full ]` with an adjacent **`[ ✎ Edit ]`** toggle pill (styled with SceneFlow-aligned amber accent active state).
- **Workspace State Matrix**:
  - `Split + Edit OFF`: Classic 2-column playback view (Video 50% / Diorama 50%). Subpanel collapses into minimal header.
  - `Split + Edit ON`: Full 3-Column Studio (Left 30% [Video + Subpanel] | Center 40% [Diorama] | Right 30% [YAML]). Subpanel defaults to expanded.
  - `Full + Edit OFF`: 100% 3D Diorama stage. Reference video is mounted offscreen (`fixed -left-[99999px]`) to maintain media clock and audio sync without interruption.
  - `Full + Edit ON`: 2-Column Mode (Diorama 60% | YAML 40%, video cleanly offscreened). Perfect for procedural blueprint scores.
- **Continuous 3-Way Resizing**:
  - Left vertical divider (col-resize) adjusts Left Column width ($18\%$ to $45\%$).
  - Right vertical divider (col-resize) adjusts Right Column width ($18\%$ to $45\%$).
  - Left horizontal divider (row-resize) adjusts Video container height ($180\text{px}$ min video, $140\text{px}$ min subpanel).
  - Enforces `.is-resizing-split` during any drag operation to maintain 60fps responsiveness across WebGL and IFrames.
- **Narrow Screens (`< lg`)**: Responsively stacks the Video Panel (`40%` height) above the 3D Diorama Stage and hides the center layout presets to prevent header crowding.

### 4.2 4-Corner Directorial HUD Architecture (Wide Mode $\ge 580\text{px}$)
Adopts professional 3D viewport convention (Blender, Unreal Engine, Maya) distributing chrome strictly to the 4 corners while leaving the center stage sightline 100% clean:
1. **Top-Left (Metadata & Context)**: [`ShotBreakdownHud.tsx`](../src/ui/ShotBreakdownHud.tsx) displaying `#xx` active shot tag, clean title, and optical focal length. Defaults to a sleek 2-line collapsed pill to maintain a low profile; click anywhere on the card to toggle between collapsed and expanded states as a persistent directorial widget (retaining its state during 3D orbit and timeline playback without unexpected click-outside auto-dismissals).
2. **Top-Right (Display & Legend)**: [`LabelDisplayModeToggle.tsx`](../src/ui/LabelDisplayModeToggle.tsx) providing rapid toggles for 3D character/camera billboard labels (`All`, `Cam`, `Off`) and viewfinder composition guides.
3. **Bottom-Left (Camera Workstation Dock)**: 2-tier stacked dock positioned immediately above the transport scrubber deck:
   - **Upper Tier ([`CameraPresetControls.tsx`](../src/ui/CameraPresetControls.tsx))**: 1-click angle snaps featuring bespoke **isometric 3D ViewCube SVG icons** (Top plan, Iso 45°, Front proscenium, Side profile, and Reset) with rich tooltips, eliminating text clutter and avoiding popup menus.
   - **Lower Tier ([`CameraModeSwitcher.tsx`](../src/ui/CameraModeSwitcher.tsx))**: Tactile segmented 3-way POV mode switcher (`Scripted` [👁️], `Free Orbit` [🌐], `Stage Cam` [🎥]).
4. **Bottom-Right (Telemetry & Coordinates)**: [`CameraTelemetryCapsule.tsx`](../src/ui/CameraTelemetryCapsule.tsx) displaying live degrees, distance, and 1-click YAML snippet copying.

### 4.3 Authoring Telemetry Capsule (`CameraTelemetryCapsule.tsx`)
- Floating bottom-right glassmorphic badge inside the 3D viewport displaying live **human degrees and metric meters** (`Pitch° / Yaw° · Distance(m) · (X, Y, Z)`).
- **Live Free-Orbit Tracking**: Updates in real time as the user orbits/pans/zooms via `OrbitControls` (`cartesianToSpherical`).
- **Narrow Viewport Auto-Hiding**: When the diorama pane width drops below the $580\text{px}$ narrow threshold, the capsule is automatically unmounted to keep the bottom 3D stage area 100% clean and unobstructed.
- **1-Click YAML Snippet Copy**: Clicking the capsule copies a formatted YAML camera block directly to the clipboard:
  ```yaml
  target: [0.00, 1.10, 0.00]
  distance: 7.50
  pitch: 26.0
  yaw: 38.0
  lens: 35mm
  ```

### 4.4 Dedicated Compact Diorama Header (`CompactDioramaHeader.tsx` — `< 580px`)
- When the diorama pane width drops below $580\text{px}$ (e.g. in extreme split mode or on compact screens), `src/App.tsx` dynamically switches from the distributed top overlay trio to a dedicated, unified compact header mounted at `top-3 left-3 right-3`:
  - **Left Wing**: `#xx` tag and clean shot title with a click-to-expand details popover displaying focal length, gate aspect ratio, and maneuver note.
  - **Center Wing**: Streamlined 3-way segmented Camera POV Switcher (`Scripted`, `Free Orbit`, `Stage Cam`).
  - **Right Wing**: Unified `[ View ▾ ]` popover consolidating 1-click angle presets (Top, Iso, Front, Side, Reset), 3D label display modes (All, Cam, Off), and viewfinder guides toggle into an accessible, collision-free dropdown.
  - **Outside Click Dismissal**: Automatically closes open popovers on outside pointer interactions.

### 4.3 Code-First YAML Score Studio (`src/ui/editor/`, `YamlStudioPanel.tsx`)
- Mounted full-height in the right studio column when Edit Mode is active (`[ ✎ Edit ]` toggle).
- **CodeMirror 6 Engine (`YamlEditorCanvas.tsx`, `useYamlEditor.ts`)**:
  - Replaces plain `<textarea>` with a virtualized, responsive CodeMirror 6 editor featuring Lezer-based YAML grammar (`@codemirror/lang-yaml`), line numbers gutter, soft line-wrapping, 2-space tab indent (`indentWithTab`), and native search/replace (`Ctrl+F`).
  - **Dynamic Theme Adaptation (`useCodeMirrorTheme.ts`)**: Uses CodeMirror `Compartment` instances to dynamically adapt editor chrome, line numbers, cursor, selection, and syntax tokens (amber keys, emerald strings, sky measurements, purple booleans, and muted slate comments) across StageFlow's 4 active themes (`Dark Obsidian`, `Warm Paper`, `Light Stone`, `Pure Black`) with zero reload lag.
- **Protected Bundled Presets (Read-Only)**: When viewing factory Blueprints 01–05, editing is locked (`EditorState.readOnly.of(true)`) and surfaces a sky-blue banner with a prominent **`[ Fork to Edit → ]`** button. Clicking it clones the score into IndexedDB and immediately unlocks the editor.
- **Debounced Live Sync & Re-Evaluation (~150ms)**: When editing custom projects, typing updates locally with zero input latency at 60fps/144fps, while `parseStageScore` and 3D diorama re-evaluation trigger after 150ms of typing inactivity, debouncing writes to IndexedDB and preventing WebGL stutter.
  - **Playback & Focus Collision Guards**: Protects in-flight typing against background 10Hz React UI sync renders during looped playback via a three-tier guard (`lastDispatchedTextRef` updated upon actual debounce dispatch, `view.hasFocus` write protection, and `sceneId` transition boundary detection with safe selection clamping).
- **Top Panel Header (`YamlEditorHeader.tsx`)**:
  - Compact title bar housing the editor title (`Live YAML Score`), a status badge (`● Live Sync` with pulsing dot or `Read-Only` for bundled blueprints), a **`[ Guide ]`** trigger button (opening the authoring manual in a new tab at `?mode=guide`), and an isolated **`[ ✕ ]`** close button.
  - Omit redundant clutter (`Meters...` subtitle, storage badges, and mathematical slogans) for a clean directorial look.
- **Directorial Action Bar (`YamlActionBar.tsx`)**:
  - Dedicated sub-header strip housing primary buffer actions: **`[ Wrap ]`** (toggles soft line-wrapping on `.cm-scroller` via a dynamic CodeMirror `Compartment`, persisted in `localStorage` under `stageflow:ui:editor-word-wrap`), **`[ Copy ]`** (copies full YAML with visual feedback), and **`[ Fork to Edit → ]`** (when viewing bundled blueprints).
  - Redundant project-level actions (`Duplicate`, `Reset`) are omitted as they reside in the Score Library.
- **Dedicated Score Authoring Guide View (`ScoreAuthoringGuideView.tsx`, `?mode=guide`)**:
  - Mounted when `?mode=guide` is present in the URL, rendering `docs/YAML_AUTHORING_GUIDE.md` in a dedicated, full-window Markdown + KaTeX reading environment.
  - Skips mounting the 3D diorama canvas, video player, and transport deck entirely (zero GPU/WebGL overhead).
  - Features StageFlow theme synchronization, quick section jump anchors, tactical search filtering, and a `[ ← Back to Studio ]` / tab-close button.
- **Conditional Diagnostics & Alert Banner (`YamlDiagnosticsBanner.tsx`)**:
  - Renders `null` when the score is valid, giving maximum vertical space directly to the CodeMirror 6 canvas without an empty idle strip.
  - Displays exact line and column numbers on syntax errors (`Line X, Col Y`) extracted from `YAMLParseError.linePos` with a 1-click **`[ Jump ]`** button that positions the cursor and scrolls smoothly to the invalid line.
  - Displays amber warnings for non-fatal schema diagnostics.
- **Backward Compatibility**: `YamlInspectorDrawer.tsx` is preserved as a thin adapter delegating to `YamlStudioPanel.tsx`.

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
  - Displays active shot identifier formatted as `#xx` (`#01`–`#17`), clean un-prefixed label, prime lens focal length, gate aspect ratio, active maneuver, 3D target offset, and camera mode status.
  - Automatically de-duplicates redundant title prefixes (`#01 Slow Arc...` instead of repeating `Shot 01 · `).
  - **Strict 2-Line Collapsed Mode**: Features a 1-click fold chevron (and whole-card click target) shrinking the card to strictly 2 lines (`Line 1: [#xx] Title >` and `Line 2: 50mm · DOLLY · Δ 0.36m · Free Orbit`) with precision single-line truncation, saving ~70% screen real estate.
  - **Structured Expanded Mode**: Dedicated header row for `#xx` and `OFFSET` badges, prominent full-width title row, rich optics/maneuver row with icons, and directorial description.
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
