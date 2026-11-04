# Core Math, Optics & Choreography Score Specifications

This document is the authoritative technical specification for **Layer 1 (`src/core/`)** and the **YAML Choreography Score Schema (`src/scores/*.yaml`)** in **StageFlow**. It is governed by [`AGENTS.md`](../AGENTS.md).

---

## 1. Coordinate System & Unit Conventions

StageFlow uses a standardized, human-intuitive metric coordinate system in YAML that maps cleanly to Three.js right-handed $Y$-up world space:

- **World Space Axes**:
  - $+X$: Stage Right
  - $+Y$: Vertical Elevation ($Y = 0$ is the stage floor plane)
  - $+Z$: Downstage / Front (toward the default viewer)
- **Spatial Units**: **Metric Meters ($1\text{ Three.js unit} = 1\text{m}$)**.
  - Standard character height: `1.75m` (chest/eye-line look-at anchor at `0.78 * height ≈ 1.365m`).
  - Default stage floor: `10m × 10m` with `1.0m` major grid sections and `0.25m` minor subdivisions.
- **Angular Units**:
  - **In YAML Scores & UI Readouts**: Authored and displayed in **human degrees (`deg`)** (e.g., `pitch: 26`, `yaw: -35`, `rotation: 90`).
  - **In Internal Core Math (`SphericalPose`, `SceneEntityDef`)**: Normalized to **radians (`rad`)** inside [`scorePrimitives.ts`](../src/core/scorePrimitives.ts) and [`scoreParser.ts`](../src/core/scoreParser.ts) via `degToRad()`.

---

## 2. Spherical Camera Model & Cartesian Conversion (`sphericalMath.ts`)

Both the **Observer Camera** (viewport camera) and the **Stage Camera** (illustrative 3D camera inside the diorama) are parameterized by [`SphericalPose`](../src/core/types.ts):

```typescript
export interface SphericalPose {
  target: Vec3;          // 3D look-at target point in meters
  distance: number;      // Radial distance from target to camera eye in meters
  pitch: number;         // Vertical elevation angle in radians (-85° to +85°)
  yaw: number;           // Horizontal azimuth angle in radians around Y-axis
  roll: number;          // Optical sightline roll angle in radians (0 = level horizon, + = CW from operator POV)
  focalLengthMm: number; // Full-frame equivalent focal length in millimeters
}
```

### 2.1 Forward Conversion (`sphericalToCartesian`)
Given a `SphericalPose`, [`sphericalToCartesian`](../src/core/sphericalMath.ts) computes the 3D eye position $(x, y, z)$ and the orthonormal rolled camera up-vector $\vec{U}_{\text{rolled}}$:
$$\begin{aligned}
x_{\text{eye}} &= \text{target}_x + d \cdot \cos(\text{pitch}) \cdot \sin(\text{yaw}) \\
y_{\text{eye}} &= \text{target}_y + d \cdot \sin(\text{pitch}) \\
z_{\text{eye}} &= \text{target}_z + d \cdot \cos(\text{pitch}) \cdot \cos(\text{yaw})
\end{aligned}$$

The unit up-vector $\vec{U}_{\text{rolled}}$ rotated by roll $\gamma$ around the forward sightline $\vec{F}$ is:
$$\vec{U}_{\text{rolled}} = \begin{bmatrix}
-\cos(\gamma)\sin(\text{pitch})\sin(\text{yaw}) + \sin(\gamma)\cos(\text{yaw}) \\
\cos(\gamma)\cos(\text{pitch}) \\
-\cos(\gamma)\sin(\text{pitch})\cos(\text{yaw}) - \sin(\gamma)\sin(\text{yaw})
\end{bmatrix}$$

Notice that `roll` preserves 3D eye position invariance: varying `roll` rotates the camera sensor and rectangular gate without moving $(x_{\text{eye}}, y_{\text{eye}}, z_{\text{eye}})$ or the look-at target.

### 2.2 Inverse Conversion (`cartesianToSpherical`)
When the user freely orbits or pans the viewport via `OrbitControls`, [`cartesianToSpherical(eye, target, focalLengthMm, roll)`](../src/core/sphericalMath.ts) recovers the exact `SphericalPose` so the bottom-right [`CameraTelemetryCapsule`](../src/ui/CameraTelemetryCapsule.tsx) displays live degrees and meters ready for 1-click YAML copying. Free orbit maintains level horizon ($\text{roll} = 0$).

### 2.3 Shortest-Arc Angular Unwrapping (`shortestAngleDiff`)
All angular interpolations (`yaw`, `roll`, and entity `rotationYRad`) use [`shortestAngleDiff(targetRad, currentRad)`](../src/core/sphericalMath.ts), which wraps $\Delta\theta$ onto $[-\pi, \pi]$ to prevent $360^\circ$ spin artifacts across the $-\pi / +\pi$ boundary. Explicit multi-turn rotations authored with `roll_delta` or `roll_start`/`roll_end` bypass modulo wrapping to execute complete deliberate barrel rolls.

### 2.4 Directed Orbit Angular Differences (`directedAngleDiff`)
When authoring `maneuver: "orbit"` or `"sweep"` with an explicit `direction: "cw"` or `"ccw"` alongside a destination `yaw`, [`directedAngleDiff(targetRad, currentRad, direction)`](../src/core/sphericalMath.ts) forces the angular rotation along the commanded azimuthal direction ($[-2\pi, 0]$ for clockwise, $[0, +2\pi]$ for counter-clockwise) rather than blindly defaulting to the shortest Euclidean arc. When `direction` is omitted, it falls back to `shortestAngleDiff`.

---

## 3. Directorial Lens Optics & Frustum Gate Geometry (`opticsMath.ts`)

StageFlow models camera framing using standard **35mm Full-Frame Sensor Gate Width ($W_{\text{sensor}} = 36.0\text{mm}$)**:

1. **Sensor Height Derivation**:
   $$H_{\text{sensor}} = \frac{36.0\text{mm}}{\text{aspectRatio}}$$
   (For `16:9` widescreen, $H_{\text{sensor}} = 20.25\text{mm}$; for `2.39:1` anamorphic scope, $H_{\text{sensor}} \approx 15.06\text{mm}$).
2. **Vertical Field of View (`focalLengthToVerticalFovDeg`)**:
   $$\text{FOV}_{\text{vert}} = 2 \cdot \arctan\left(\frac{H_{\text{sensor}}}{2 \cdot f_{\text{mm}}}\right) \cdot \frac{180}{\pi}$$
3. **Rectangular Film Gate Dimensions at Target Depth (`computeFrustumGateDimensions`)**:
   At distance $D$ (in meters) from the lens nodal point, the projected rectangular focus gate has dimensions:
   $$W_{\text{gate}} = D \cdot \frac{W_{\text{sensor}}}{f_{\text{mm}}}, \quad H_{\text{gate}} = D \cdot \frac{H_{\text{sensor}}}{f_{\text{mm}}}$$
   This guarantees that $\frac{W_{\text{gate}}}{H_{\text{gate}}} \equiv \text{aspectRatio}$ at every focal length and target distance.

---

## 4. Stateless Functional Timeline & Forward Pose Chaining (`frameEngine.ts`, `trajectoryChain.ts`)

### 4.1 Zero-Drift Stateless Evaluation (`Frame_t = f(t, score)`)
[`computeStageFrame(timestampSec, score, initialObserverPose)`](../src/core/frameEngine.ts) is a pure function:
- It never mutates external state or relies on previous frame deltas.
- Calling `computeStageFrame(5.0, score)` after playing forward ($0 \to 5$) or scrubbing backward ($10 \to 5$) produces the exact same 3D coordinates bit-for-bit.

### 4.2 Forward Pose Chaining ($P_0 \to P_1 \to \dots \to P_k$) & Track Normalization
In [`trajectoryChain.ts`](../src/core/trajectoryChain.ts) and [`entityEngine.ts`](../src/core/entityEngine.ts):
- Each shot cuts cleanly (`0ms`) to its target anchor point (`spec.target`) unless explicit camera travel from another anchor is authored via `from:`.
- Continuous camera parameters (`distance`, `pitch`, `yaw`) forward-chain from the preceding shot's terminal pose $P_{\text{end}}$ when unspecified, but immediately adopt newly specified angles (`pitch`, `pitch_start`, `yaw`, `yaw_start`) without cross-shot drift.
- **Option A Shot-Boundary Roll & Target-Offset Reset**: Unlike spatial position angles, both `roll` (Dutch angle) and `target_offset` (`[dx, dy, dz]` metric displacement from the base anchor) default to resetting to their neutral baselines (`0°` and `[0, 0, 0]`) at shot boundaries whenever a shot omits those parameters. To animate a continuous Dutch tilt or target offset across shots or smoothly recover back to neutral, authors specify `roll_start`/`roll_end` (or `roll_end: 0`) and `target_offset_start`/`target_offset_end` (or `target_offset_end: [0, 0, 0]`).
- For the active shot, `sampleTrajectoryPoints()` samples $N = 32$ 3D world-space eye coordinates along $u \in [0, 1]$ so moving cameras render a smooth 3D trajectory curve in the diorama. Trajectory lines are visibility-gated to the active shot ID to prevent 1-frame asynchronous ghosting across cut boundaries.
- **3-Tier Observer Camera Normalization**:
  1. **Tier 1 (Root `observer_shots:`)**: If `score.observerShots` is defined, the Observer Camera evaluates exclusively across these decoupled cues, allowing diorama viewport moves to span smoothly across film cuts. During any time gap between observer shots, the camera holds the terminal resting pose $P_{\text{end}}$ of the last completed cue and forward-chains into the next cue.
  2. **Tier 2 (Per-Shot `shots[].observer_camera`)**: If root `observer_shots:` is omitted, the engine extracts observer cues from `shots:`.
  3. **Tier 3 (Baseline Default)**: If neither is defined, the camera holds steady at `stage.defaultObserverPose`.

### 4.3 Supported Easing Curves & Trajectory Maneuvers (`maneuvers.ts`)
- **9 Easing Curves (`CameraEasing`)**: `smooth` (raised cosine default), `linear`, `ease-in`, `ease-out`, `expo`, `pop`, `accel`, `deccel`, `cruise`.
- **11 Trajectory Maneuvers (`CameraManeuver`)**:
  - `cut`: Instantaneous jump to destination pose.
  - `dolly` / `straight`: Direct 3D linear interpolation of target, distance, pitch, yaw, and focal length.
  - `arc` / `swoop`: 3D quadratic Bezier curve with $+Y$ elevation lift and mid-flight `breathe` distance pullback.
  - `orbit` / `sweep`: Continuous azimuthal turntable revolution (`cw` or `ccw`).
  - `spiral`: Helical zoom and elevation orbit.
  - `dive`: Fast perigee dip toward subject.
  - `recoil`: Immediate shockwave impulse kick.
  - `spline`: Multi-waypoint Catmull-Rom spline with automatic yaw unwrapping.

### 4.4 Opt-In Contiguous Shot Chaining (`continuous: true`) & YAML Order Priority
- **Contiguous Timeline Chaining**: When `continuous: true` is set at the score root, any shot in `shots:` omitting `start` automatically inherits the previous shot's `end` timestamp (`startSec = shots[k-1].endSec`), while `shots[0]` defaults to `0.0`. Explicit `start` declarations always take precedence to allow deliberate gaps.
- **Physical Camera Rig Chaining**: For any shot $k \ge 1$ with a moving maneuver (`arc`, `dolly`, `swoop`, `orbit`, etc.), omitting `distance_start`, `pitch_start`, or `yaw_start` causes the camera to start at $P_{\text{prev}}$ (the previous shot's terminal pose) and smoothly travel to the newly authored destination (`distance`, `pitch`, `yaw`). Opening shot (`k = 0`) values establish the baseline framing. Instantaneous cuts (`maneuver: cut`) snap directly to the authored values.
- **Discrete Optical Prime Lenses**: In accordance with cinema prime lens grammar, specifying `lens: 50mm` mounts that lens for the shot and holds it steady (no unwanted slow zoom). Omitting `lens` preserves the mounted lens from the previous shot. Dynamic zooming requires explicit `lens_start` and `lens_end`.
- **Explicit Look-At Retargeting**: Changing `target` without `from:` cuts the look-at anchor immediately at the shot boundary (`0ms`), preventing unintended diagonal room drifting. Specifying `from:` smoothly tracks from `from` to `target`.
- **Decoupled Observer Isolation**: `observer_shots:` remains strictly explicit (`start:` and `end:`) to preserve stationary diorama inspection periods.
- **YAML Declaration Order Overlap Priority**: When multiple shots overlap in time, the later shot in the YAML structure takes precedence across `frameEngine` (`activeShot`), `trajectoryChain` (camera track), and `entityEngine` (character kinematics).
- **Non-Blocking Typo Warnings**: In non-continuous mode (`continuous: false`), omitting `start` on `shots[k > 0]` surfaces an informative warning in the YAML Drawer rather than crashing.

---

## 5. Declarative YAML Choreography Schema (`scoreParser.ts`, `scorePrimitives.ts`, `cameraCueParser.ts`)

Scores are authored in human-readable YAML (see [`src/scores/demo_blueprint.yaml`](../src/scores/demo_blueprint.yaml)):

```yaml
version: "1.0"
id: "scene-id"
title: "Scene Title"
subtitle: "Optional Subtitle"
video: "procedural://demo-blueprint" # Or "/media/clip.mp4" or "https://youtu.be/..."
aspect_ratio: "16:9"                 # "16:9", "2.39:1", "4:3", or numeric float
duration: 10.0                       # Total duration in seconds
offset: 0.0                          # Optional A/V sync offset in seconds

stage:
  width: 10                          # Stage width in meters
  depth: 10                          # Stage depth in meters
  grid_step: 1                       # Major grid spacing in meters
  observer_camera:
    target: [0, 1.1, 0]
    distance: 7.5
    pitch: 26                        # Degrees
    yaw: 38                          # Degrees
    lens: 35mm
  stage_camera:
    target: "protagonist"            # Entity ID or [x, y, z]
    distance: 3.2
    pitch: 6
    yaw: -20
    lens: 50mm

entities:
  - id: "protagonist"
    label: "Subject A (Lead)"
    kind: "character"                # "character" | "prop" | "marker"
    position: [-0.9, 0, 0]           # Meters (Y=0 is floor)
    rotation: 90                     # Facing angle in degrees
    color: "#38bdf8"

shots:
  - id: "shot-1"
    shot: 1
    label: "Shot 01 · Slow Arc"
    description: "Brief staging note shown in the top-left HUD."
    start: 0.0
    end: 10.0
    stage_camera:
      from: "protagonist"
      target: "protagonist"
      maneuver: "arc"
      easing: "smooth"
      distance_start: 3.4
      distance_end: 2.6
      pitch_start: 8
      pitch_end: 4
      yaw_start: -20
      yaw_end: 25
      lens: 50mm
      show_path: true
    observer_camera:
      target: [0, 1.1, 0]
      maneuver: "orbit"
      easing: "smooth"
      distance: 7.5
      pitch: 26
      yaw_start: 35
      yaw_end: 55
      lens: 35mm
    entities:
      protagonist:
        position: [-0.9, 0, 0]       # Optional target position by end of shot
        look_at: "interlocutor"      # Dynamic facing toward another entity or [x, y, z]
        highlighted: true

# Optional Decoupled Viewport Observer Timeline (takes complete precedence over per-shot observer_camera)
observer_shots:
  - id: "diorama-orbit"
    start: 0.0
    end: 10.0
    target: "center"
    maneuver: "orbit"
    easing: "smooth"
    distance: 7.5
    pitch: 26
    yaw_start: 35
    yaw_end: 55
    lens: 35mm
```

---

## 6. Client Storage Persistence & Video Authority

### 6.1 Score Draft Persistence (`src/core/storage/scoreDb.ts`)
Live YAML edits and custom imported score files are persisted to an IndexedDB object store (`'stageflow-db'` $\to$ `'scores'`) using the [`idb`](https://github.com/jakearchibald/idb) promise library:
- **Record Structure**: `{ id, title, subtitle, rawYaml, isCustom, updatedAt }`.
- **Auto-save**: Debounced at `350ms` on every valid YAML edit.
- **Hydration & Deferred Invalidation**: On application mount, initial state preserves stored scene pointers without premature fallback. When IndexedDB hydration finishes, it reconciles the active scene pointer against the fully merged catalog.
- **Confirmed Reset**: Resetting a score deletes its IndexedDB record via `deleteStoredScore()` and reverts state to the bundled YAML.

### 6.2 Video Format Support & YAML SSOT Authority
The score parser supports both concise string syntax and structured object syntax for video:
```yaml
# Concise string syntax
video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# Or structured mapping syntax
video:
  src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  aspect_ratio: "16:9"
```
**YAML as Single Source of Truth**: Whenever the YAML score specifies or changes a video URL, any active in-memory dropped video override is automatically cleared so the score's video is played. Local dropped video files (`.mp4`, `.webm`) are maintained strictly in temporary session memory and are never written to `IndexedDB` or `localStorage`.

