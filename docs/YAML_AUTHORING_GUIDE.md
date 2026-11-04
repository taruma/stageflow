# StageFlow YAML Score Authoring Manual (`*.yaml`)

This is the authoritative operational manual and directorial reference for authoring and editing **StageFlow Choreography Scores** (`*.yaml`). It covers coordinate conventions, scene setup, entity blocking, camera optics, trajectory maneuvers, easing profiles, and copy-pasteable cinematography recipes.

---

## 1. Mental Model & Core Rules

StageFlow compiles a declarative `.yaml` score into a deterministic, 60fps 3D spatial diorama via [`scoreParser.ts`](../src/core/scoreParser.ts) and [`frameEngine.ts`](../src/core/frameEngine.ts).

### The 5 Golden Rules of StageFlow YAML
1. **Pure Metric Meters (`m`)**: Every spatial coordinate (`[x, y, z]`), stage dimension (`width`, `depth`), and camera `distance` is in **real-world meters** ($1\text{ unit} = 1.0\text{m}$).
   - A standing human character is `1.75m` tall by default (with their eye/chest look-at anchor automatically placed at $0.78 \times \text{height} \approx 1.365\text{m}$).
2. **Human Degrees (`deg`)**: Every angle in YAML (`pitch`, `yaw`, `yaw_start`, `yaw_end`, `yaw_delta`, `rotation`, `orbit_speed`) is authored in **intuitive degrees** (e.g., `yaw: -45`, `pitch: 15`, `rotation: 90`). You never need to calculate radians by hand. *(Note: if you ever wish to pass raw radians, append `"rad"`, e.g. `"1.57rad"`).*
3. **Pure Decimal Seconds (`s`)**: Every timestamp (`duration`, `offset`, `start`, `end`) is in decimal seconds (e.g., `0.0`, `4.25`, `12.5`).
4. **Cinematic Full-Frame Lenses (`mm`)**: Camera optics are specified using real full-frame focal lengths (`24mm`, `35mm`, `50mm`, `85mm`), which mathematically drive both the Three.js vertical Field of View and the 3D rectangular film gate frustum.
5. **Forward Pose Chaining, Decoupled Blocking & Continuous Oner Mode ($P_0 \to P_1 \to \dots \to P_k$)**:
   - **Decoupled Entity Blocking (`blocking:`)**: You can stage actors and props along an independent root-level `blocking:` timeline whose time windows (`start`, `end`) span smoothly across multiple camera cuts without stopping or resetting velocity at shot boundaries. During active blocking cues, the dashed floor movement trail displays the full path of that blocking cue across all cuts.
   - **Per-Shot Entity Overrides (`shots[].entities`)**: When root `blocking:` is omitted, entities inherit their terminal resting position and rotation from Shot $k - 1$ across `shots:`. Even when `blocking:` is used, per-shot `highlighted: true` and `note:` in `shots[].entities` layer cleanly on top.
   - **Continuous Takes (`continuous: true`)**: When `continuous: true` is set at the score root, the **Stage Camera** (`shots:`) seamlessly chains physical coordinates (`distance`, `pitch`, `yaw`) from the preceding shot's terminal pose for all moving maneuvers (`maneuver !== 'cut'`). Lenses mount discretely at shot boundaries, and target framing snaps to new subjects unless an explicit `from:` subject is authored. `observer_shots:` and `blocking:` remain decoupled with explicit start/end spans.

---

## 2. 3D Stage Coordinate System & Compass

StageFlow uses a right-handed, **$Y$-Up** 3D coordinate system centered at the stage origin `[0, 0, 0]`:

```text
                     -Z (Upstage / Background)
                             ▲
                             │      +Y (Vertical Elevation / Height)
                             │     ↗
   -X (Stage Left) ◄─────────┼─────────► +X (Stage Right)
                            (0,0,0)
                             │
                             ▼
                     +Z (Downstage / Foreground)
```

### Spatial & Angular Reference Table

| Parameter | Value `0` Meaning | Positive (`+`) Direction | Negative (`-`) Direction |
| :--- | :--- | :--- | :--- |
| **`x` (Horizontal)** | Centerline of stage | **Stage Right** (`+X`, meters) | **Stage Left** (`-X`, meters) |
| **`y` (Vertical)** | Stage Floor Plane (`0.0m`) | **Upward / Overhead** (`+Y`, meters) | Below floor (`-Y`, meters) |
| **`z` (Depth)** | Centerline of stage | **Downstage / Front** (`+Z`, meters) | **Upstage / Back** (`-Z`, meters) |
| **`pitch` (Elevation)** | Horizon / Eye-Level (`0°`) | **High-Angle Overhead** (`+1°` to `+85°`, looking down at target) | **Low-Angle Hero** (`-1°` to `-85°`, looking up at target) |
| **`yaw` (Azimuth)** | Camera placed on **`+Z` axis** looking toward `-Z` (`0°`) | Rotates camera position toward **`+X` (Stage Right)** | Rotates camera position toward **`-X` (Stage Left)** |
| **`roll` (Dutch Angle / Bank)** | Level Horizon (`0°`) | **Clockwise Camera Bank** (`+1°` to `+180°`, camera leans right from operator POV) | **Counter-Clockwise Camera Bank** (`-1°` to `-180°`, camera leans left from operator POV) |
| **Entity `rotation`** | Mannequin faces **`+Z` (Downstage)** (`0°`) | Turns face toward **`+X` (`+90°` faces Stage Right)** | Turns face toward **`-X` (`-90°` faces Stage Left)** |

---

## 3. Root Header & Stage Setup Schema

Every YAML score begins with metadata, video source binding, and baseline stage geometry:

```yaml
version: "1.0"
id: "scene-01-interrogation"
title: "Scene 01: The Interrogation Table"
subtitle: "35mm Establishing to 85mm Close-Up"

# Video Source: Local MP4/WebM path, YouTube URL, or Procedural Simulator
video: "procedural://interrogation"
# Examples of other valid video bindings:
# video: "/media/interrogation_cut.mp4"
# video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
# video: "https://youtu.be/dQw4w9WgXcQ"

aspect_ratio: "16:9"   # Supports "16:9", "2.39:1", "2.35:1", "1.85:1", "4:3", "9:16", or float
duration: 16.0         # Total timeline duration in seconds
offset: 0.0            # Optional global A/V sync offset in seconds (+ advances cues, - delays cues)

stage:
  width: 10            # Stage floor width (X-axis) in meters (default: 10)
  depth: 10            # Stage floor depth (Z-axis) in meters (default: 10)
  grid_step: 1         # Major grid line spacing in meters (default: 1m; minor lines at 0.25m)

  # Default starting pose for the user's viewport camera (before Shot 1 or when unscripted)
  observer_camera:
    target: [0, 1.1, 0]
    distance: 7.5
    pitch: 26
    yaw: 38
    lens: 35mm

  # Default starting pose for the illustrative 3D camera inside the diorama
  stage_camera:
    target: "detective"
    distance: 3.5
    pitch: 8
    yaw: -20
    lens: 50mm
```

### Root & `stage:` Fields Reference

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `version` | `string` | `"1.0"` | Schema version tag. |
| `id` | `string` | `"custom-scene"` | Unique scene identifier in the catalog dropdown. |
| `title` | `string` | `"Untitled..."` | Primary title shown in the header selector and HUD. |
| `subtitle` | `string` | `undefined` | Optional secondary descriptor. |
| `continuous` | `boolean` | `false` | When `true`, shots in `shots:` omitting `start` automatically chain from the preceding shot's `end` (`shots[0]` defaults to `0.0`). Ideal for oners and contiguous takes. |
| `video` | `string` | `"procedural://demo"` | Video URL. Automatically selects `Html5MediaDriver`, `YouTubeMediaDriver`, or `ProceduralMediaDriver`. |
| `aspect_ratio` | `string \| number` | `"16:9"` | Controls both the Video Panel container aspect ratio and the 3D Stage Camera's rectangular film gate frustum. |
| `duration` | `number` | `max(shot.end)` | Total timeline length in seconds. |
| `offset` | `number` | `0.0` | Global clock calibration offset in seconds. |
| `stage.width` | `number` | `10` | Stage width in meters. |
| `stage.depth` | `number` | `10` | Stage depth in meters. |
| `stage.grid_step` | `number` | `1` | Primary metric grid division size in meters. |

---

## 4. Scene Entities (`entities:`)

The top-level `entities:` array declares all characters, props / furniture, and floor markers present on the stage, along with their initial `t = 0.0s` placement:

```yaml
entities:
  # 1. Character Mannequin (Torso + Head + Directional Eye Visor + Floor Gaze Chevron)
  - id: "protagonist"
    label: "Subject A (Lead)"
    kind: "character"
    position: [-0.9, 0, 0]   # [x, y, z] in meters (y=0 sits on the floor)
    rotation: 90             # Facing +90° (toward +X Stage Right)
    height: 1.75             # Optional height in meters (default: 1.75)
    radius: 0.26             # Optional shoulder/base radius in meters (default: 0.26)
    color: "#38bdf8"         # Hex color for mannequin, floor ring, trail & badge

  # 2. Second Character Mannequin
  - id: "interlocutor"
    label: "Subject B (Partner)"
    kind: "character"
    position: [0.9, 0, 0]
    rotation: -90            # Facing -90° (toward -X Stage Left)
    color: "#a78bfa"

  # 3. Set Piece / Prop Bounding Volume
  - id: "desk"
    label: "Interrogation Table"
    kind: "prop"
    position: [0, 0, 0]
    rotation: 0
    height: 0.78
    radius: 0.45
    color: "#94a3b8"

  # 4. Floor Blocking Marker Beacon
  - id: "mark_a"
    label: "T-Mark A"
    kind: "marker"
    position: [-0.9, 0, 1.5]
    color: "#fb7185"
```

### Entity Kinds & Defaults

| `kind` | 3D Blueprint Representation | Default `height` | Default `radius` | Default Look-At Anchor Height |
| :--- | :--- | :--- | :--- | :--- |
| `"character"` | Capsule torso, shoulder bar, head sphere, white forward eye-visor wedge, ground gaze arrow | `1.75m` | `0.26m` | `0.78 * height` (`~1.365m` chest/eye level) |
| `"prop"` | Semi-transparent architectural prism box (`2*radius × height × 2*radius`) | `0.85m` | `0.35m` | `0.50 * height` (`0.425m` center) |
| `"marker"` | Low-profile floor cylinder beacon with ground ring | `0.15m` | `0.25m` | `0.50 * height` (`0.075m`) |

---

## 5. Shot Timeline & Dual-Camera Cues (`shots:` & `observer_shots:`)

StageFlow supports two complementary ways to choreograph cameras across time:
1. **Film Coverage (`shots:`) [Mandatory]**: Defines the editorial cuts and staging of the recorded scene. Each shot includes `start`, `end`, `stage_camera:` (the physical camera in the diorama), and optional per-shot `entities:` overrides.
2. **Decoupled Viewport Moves (`observer_shots:`) [Recommended for Multi-Cut Sequences]**: Defines independent diorama viewport motions that glide smoothly across film cuts without being chopped into pieces every time a film cut occurs.

### The 3-Tier Observer Camera Resolution Hierarchy
When evaluating the Observer Camera (viewport diorama view) at any timestamp $t$:
- **Tier 1 (Root `observer_shots:`)**: If `observer_shots:` is defined at the root of the YAML score, it takes **complete precedence**. Any legacy `observer_camera:` blocks inside `shots:` are ignored.
- **Tier 2 (Per-Shot `shots[].observer_camera`)**: If root `observer_shots:` is omitted, the engine evaluates `observer_camera:` blocks defined inside each film shot (legacy behavior).
- **Tier 3 (Baseline Default)**: If neither is defined, the viewport camera holds steady at `stage.observer_camera`.

### Decoupled `observer_shots:` Schema
Authored as a top-level list with flattened camera properties:
```yaml
observer_shots:
  # Move 1: Continuous 180° diorama orbit over the first 12 seconds (spanning film shots 1-6)
  - id: "obs-01"
    start: 0.0
    end: 12.0
    target: "center"
    maneuver: "orbit"
    easing: "cruise"
    distance: 8.5
    pitch: 28
    yaw_start: 30
    yaw_end: 120
    lens: 35mm

  # Move 2: Push-in to an overhead tactical view for the remaining 8 seconds
  - id: "obs-02"
    start: 12.0
    end: 20.0
    target: "hero"
    maneuver: "dolly"
    distance: 5.0
    pitch: 50
    yaw: 90
    lens: 50mm
```

> [!NOTE]
> **Gap Semantics**: During any time gap between two `observer_shots`, the observer camera holds the terminal resting pose ($P_{\text{end}}$) of the last completed observer shot and automatically forward-chains into the next shot unless explicitly overridden.

### Film Coverage Cues (`shots:`)
```yaml
shots:
  - id: "shot-1"
    shot: 1
    label: "Shot 01 · Slow Arc to Over-the-Shoulder"
    description: "Stage camera dollies along a 45° clockwise arc from a profile two-shot into an OTS angle."
    start: 0.0
    end: 10.0
    stage_camera:
      # ... Stage Camera choreography ...
    observer_camera:
      # ... Legacy per-shot Observer Camera (used when root observer_shots is omitted) ...
    entities:
      # ... Actor movements & highlights ...
```

### 5.1 Continuous Take ("Oner") Mode (`continuous: true`)

When authoring a continuous single-take sequence ("oner") or contiguous multi-shot sequence, add `continuous: true` to the root of your YAML score:

```yaml
version: "1.0"
id: "continuous-oner-sequence"
continuous: true
# ...
shots:
  - id: "shot-1"
    end: 6.0
    stage_camera: { target: "hero", maneuver: "dolly", distance: 3.5, pitch: 12, yaw: 0, lens: 35mm }
  - id: "shot-2"
    end: 12.0
    stage_camera: { target: "hero", maneuver: "orbit", distance: 2.2, pitch: 6, yaw: 180, direction: "ccw", lens: 50mm }
```

#### Core Mechanics of `continuous: true`
1. **Contiguous Timeline Chaining**:
   - `shots[0]` automatically defaults omitted `start` to `0.0`.
   - Subsequent shots (`shots[k > 0]`) with omitted `start` automatically inherit the previous shot's `end` (`startSec = shots[k-1].endSec`).
   - **Explicit `start:` is Always Honored**: If you explicitly author `start: 15.0` on a shot, the engine honors it, allowing deliberate stationary camera holds or gaps between action blocks.
2. **Physical Parameter Chaining (Stage Camera)**:
   - For moving maneuvers (`maneuver !== 'cut'`), omitting `distance_start`, `pitch_start`, or `yaw_start` automatically pulls starting values from the previous shot's terminal pose ($P_{\text{prev}}$). The camera glides seamlessly to the newly authored destination without teleporting.
   - **Stage Camera Exclusive**: Continuous parameter chaining applies strictly to the Stage Camera (`shots:`). In `observer_shots:`, diorama viewport moves remain explicit with declared start/end poses so diorama staging holds its intended composition.
3. **Discrete Prime Lens Selection**:
   - Setting `lens: 50mm` on a subsequent shot mounts that prime lens immediately at the shot boundary and holds it steady throughout the shot. This prevents unintended motorized zooming. For deliberate motorized focal length sweeps, author explicit `lens_start` + `lens_end`.
4. **Target Snapping vs. Smooth Glides (`from:`)**:
   - Changing `target` without `from:` instantly cuts camera look-at tracking to the new target at the shot boundary.
   - To smoothly pan or dolly from the previous subject to a new subject, author `from: "<previous_target>"`.
5. **Declaration Order Overlap Priority**:
   - If two shots overlap in time, the later shot declared in YAML order takes precedence across the 3D diorama camera, the 2D HUD breakdown, and the transport scrubber.
6. **Typo Clamping & Non-Blocking Diagnostics**:
   - `endSec` is clamped to $\ge \text{startSec} + 0.1\text{s}$ for safety.
   - If `continuous` is omitted or `false` and a subsequent shot omits `start`, `scoreParser.ts` displays a non-blocking amber warning in the Live YAML Drawer advising you to add `start:` or enable `continuous: true`.

---

## 6. Complete Camera Choreography Reference (`stage_camera:` & `observer_camera:`)

Both `stage_camera` and `observer_camera` share the exact same spherical trajectory engine.

### 6.1 Target & Anchor Resolution (`target:` and `from:`)
You can point a camera at any subject or coordinate in 3 ways:
1. **By Entity ID or Label** (e.g. `target: "protagonist"`): Automatically locks onto the entity's live 3D eye/chest anchor (`y = 1.365m` for characters) and dynamically follows them if they walk during the shot!
2. **By Stage Preset** (`target: "center"` or `"origin"` or `"stage"`): Aims at `[0, 1.0, 0]`.
3. **By Explicit 3D Coordinate** (`target: [0.0, 1.25, -1.5]` or `{ x: 0, y: 1.25, z: -1.5 }`).

### 6.2 Pose & Span Parameters (Option A vs. Option B)
You can write camera cues in two intuitive ways:
- **Option A (Destination Only — Chained from Previous Shot)**: With `continuous: true`, specify `distance`, `pitch`, and `yaw` for moving maneuvers (`arc`, `dolly`, `swoop`, `orbit`). The camera smoothly travels from wherever the previous shot ended ($P_0$) to your new destination ($P_1$). `lens: 50mm` establishes the prime lens for that shot without unwanted slow zooming. Changing `target` without `from:` instantly cuts to the new subject at the shot boundary.
- **Option B (Explicit Start $\to$ End Span)**: Specify `from`, `distance_start` / `distance_end`, `pitch_start` / `pitch_end`, `yaw_start` / `yaw_end`, and `lens_start` / `lens_end` to define an exact self-contained span for the shot.

| YAML Field | Type | Units | Description |
| :--- | :--- | :--- | :--- |
| `maneuver` (or `style`) | `string` | — | Trajectory path geometry (`cut`, `dolly`, `straight`, `arc`, `swoop`, `orbit`, `sweep`, `spiral`, `dive`, `recoil`, `spline`). Default: `dolly`. |
| `easing` | `string` | — | Temporal velocity curve (`smooth`, `linear`, `ease-in`, `ease-out`, `expo`, `pop`, `accel`, `deccel`, `cruise`). Default: `smooth`. |
| `target` | `string \| [x,y,z]` | `m` | Destination look-at anchor (entity ID, `"center"`, or `[x, y, z]`). |
| `from` | `string \| [x,y,z]` | `m` | Optional explicit starting look-at anchor at `start` of shot (omitting `from:` cuts look-at target immediately to `target`). |
| `target_offset` | `[dx, dy, dz]` | `m` | World-space metric offset added to `target` (e.g. `[0, 0.25, 0]` for headroom). Defaults to `[0, 0, 0]` (Option A reset when omitted). |
| `target_offset_start` / `target_offset_end` | `[dx, dy, dz]` | `m` | Explicit start and end world-space target offsets in meters across the shot (e.g. vertical pedestal tilt from boots to face). |
| `distance` | `number` | `m` | Target radial distance from `target` in meters (in `continuous: true` mode with moving maneuvers, camera starts from previous distance and moves to this destination). |
| `distance_start` / `distance_end` | `number` | `m` | Explicit start and end distances in meters across the shot. |
| `pitch` | `number` | `deg` | Target vertical elevation angle in degrees (`-85°` to `+85°`). In `continuous: true` mode with moving maneuvers, camera starts from previous pitch and tilts to this destination. |
| `pitch_start` / `pitch_end` | `number` | `deg` | Explicit start and end elevation angles in degrees. |
| `yaw` | `number` | `deg` | Target horizontal azimuth angle in degrees. In `continuous: true` mode with moving maneuvers, camera starts from previous yaw and rotates to this destination. |
| `yaw_start` / `yaw_end` | `number` | `deg` | Explicit start and end azimuth angles in degrees. |
| `yaw_delta` | `number` | `deg` | Relative angular offset from starting yaw (e.g. `yaw_delta: 45` or `-90`). |
| `roll` (or `dutch`) | `number` | `deg` | Optical axis roll angle in degrees (Dutch angle / banking). Defaults to `0°` (Option A reset when omitted). |
| `roll_start` / `roll_end` | `number` | `deg` | Explicit start and end roll angles in degrees across the shot. |
| `roll_delta` | `number` | `deg` | Relative roll offset in degrees (e.g. `roll_delta: 360` for a complete barrel roll). |
| `lens` (or `focal_length`) | `number \| string` | `mm` | Full-frame lens focal length (e.g. `35mm`, `50`, `85mm`). Swaps immediately to this prime lens and holds steady. |
| `lens_start` / `lens_end` | `number \| string` | `mm` | Start and end focal lengths for deliberate dynamic zoom or Vertigo dolly-zoom shots. |
| `breathe` | `number` | multiplier | Mid-flight arc pullback factor for `arc`, `swoop`, and `recoil` (default `1.12`). |
| `direction` | `"cw" \| "ccw"` | — | Physical rotation direction for `orbit`, `sweep`, and `spiral` (default `"cw"`). Supports aliases `"clockwise"`, `"counterclockwise"`, `"counter-clockwise"`, `"counter_clockwise"`. When a destination `yaw` is specified, `direction` strictly forces rotation in that physical direction (up to $360^\circ$) via `directedAngleDiff` instead of collapsing to the shortest arc $\le 180^\circ$. |
| `revolutions` | `number` | turns | Number of full $360^\circ$ revolutions for `orbit` or `spiral` (e.g. `0.5` = $180^\circ$, `1.0` = $360^\circ$). |
| `orbit_speed` | `number` | `deg/s` | Continuous angular speed in degrees per second for `orbit`. |
| `waypoints` | `Array` | — | Multi-point control stops for `maneuver: "spline"` (see §6.5). |

### 6.3 Stage Camera Exclusive Visual Fields (`stage_camera:` only)

| YAML Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `frustum_depth` (or `cone_length`) | `number` | `auto` (`distance`) | Length of the 3D rectangular frustum pyramid in meters. When omitted or `0`, automatically matches the live `distance` to `target` so the Focus Plane Frame sits directly on the subject! |
| `frustum_color` | `string` | `"#f59e0b"` | Hex color for the Stage Camera frustum rays, focus plane frame, and trajectory line. |
| `show_path` | `boolean` | `true` | When `true`, renders the 3D dashed trajectory curve and start/end beacons in the diorama. |

### 6.4 Cinematic Lens Focal Length Guide (`lens:`)

| Focal Length | Vertical FOV (`16:9`) | Cinematic Role & Frustum Geometry |
| :--- | :--- | :--- |
| **`18mm`** | `~62.5°` | Ultra-Wide Architectural / Steadicam Master (wide expansive frustum pyramid) |
| **`24mm`** | `~47.8°` | Wide Establishing Shot / Dynamic Moving Master |
| **`35mm`** | `~33.4°` | Classic Director's Standard Wide / Two-Shot |
| **`50mm`** | `~23.6°` | Natural Human Eye Perspective / Medium Shot |
| **`85mm`** | `~14.0°` | Portrait / Over-the-Shoulder / Close-Up (narrow telephoto frustum tunnel) |
| **`135mm`** | `~8.8°` | Extreme Telephoto Compression / Tight Insert |

### 6.5 All 11 Camera Maneuvers (`maneuver:`)

| Maneuver | Geometric Path Behavior | Key Companion Parameters |
| :--- | :--- | :--- |
| **`cut`** | Instantaneous cut to destination pose at shot start (`show_path` automatically suppressed). | `target`, `distance`, `pitch`, `yaw`, `lens` |
| **`dolly`** / **`straight`** | Direct 3D linear translation of `target` and spherical coordinates (push-in, pull-back, or lateral truck). | `distance_start`, `distance_end`, `from`, `target` |
| **`arc`** | Curved 3D quadratic Bezier path between anchors with $+Y$ elevation lift and subtle mid-flight distance breathing (`breathe: 1.12`). | `yaw_start`, `yaw_end`, `breathe` |
| **`swoop`** | Like `arc`, plus a dynamic $+4.5^\circ$ mid-flight pitch elevation crest for sweeping crane transitions. | `yaw_start`, `yaw_end`, `breathe` |
| **`orbit`** / **`sweep`** | Continuous azimuthal turntable revolution around `target`. | `yaw_start` & `yaw_end`, OR `yaw_delta`, OR `revolutions`, OR `orbit_speed`, `direction: cw \| ccw` |
| **`spiral`** | Helical corkscrew combining continuous azimuthal revolution with distance zoom and pitch change. | `revolutions` (default `0.5`), `distance_start`, `distance_end`, `pitch_start`, `pitch_end` |
| **`dive`** | Fast perigee swoop that dips $14\%$ closer to the subject at mid-shot with a downward pitch dip. | `target`, `distance_start`, `distance_end` |
| **`recoil`** | Immediate shockwave impulse kick at the start of the shot ($t \cdot e^{-5t}$) that settles back onto target. | `breathe` (default `1.25` kick amplitude) |
| **`spline`** | Smooth $C^1$ Catmull-Rom curve passing through an arbitrary list of 3D `waypoints:`. | `waypoints: [{ target, distance, pitch, yaw, lens }, ...]` |

### 6.6 All 9 Temporal Easing Profiles (`easing:`)

| Easing | Velocity Profile | Best Used For |
| :--- | :--- | :--- |
| **`smooth`** *(Default)* | Symmetric raised-cosine S-curve ($0.5(1 - \cos(\pi t))$). Zero velocity at start and end. | Natural tripod pans, dollies, and arcs. |
| **`linear`** | Constant speed ($u = t$) from first frame to last frame. | Mid-action cuts where the camera is already moving across edits. |
| **`ease-in`** | Cubic acceleration ($t^3$) starting from rest and finishing at peak velocity. | Motivating a whip-pan or sudden chase initiation. |
| **`ease-out`** | Cubic deceleration ($1 - (1 - t)^3$) entering at high speed and settling gently to rest. | Landing a fast move into a locked close-up. |
| **`cruise`** | Cinematic dolly profile: smooth $25\%$ ramp-up $\to$ $50\%$ constant cruise $\to$ $25\%$ smooth stop. | Long tracking shots and master crane moves. |
| **`accel`** | Smooth $40\%$ ramp-up from rest into a constant linear exit velocity. | Entering a multi-shot continuous camera move. |
| **`deccel`** | Enters at constant linear speed and smoothly brakes over the final $40\%$. | Concluding a multi-shot continuous camera move. |
| **`expo`** | High-drama exponential S-curve with slow creep and rapid mid-shot snap. | Dramatic reveals and whip transitions. |
| **`pop`** | Spring overshoot damper that slightly overshoots the target before settling. | Kinetic action or stylized snap-zooms. |

---

## 7. Per-Shot Entity Blocking & Kinematics (`shots[].entities:`)

Inside any shot, the `entities:` map lets you move characters/props across the floor, rotate their facing direction, lock their gaze onto another character (`look_at`), or highlight them:

```yaml
    entities:
      protagonist:
        from: [-0.9, 0, 0]           # Optional explicit start position (defaults to previous shot's end)
        position: [-0.2, 0, 0.8]     # Target floor position [x, y, z] by the end of this shot
        easing: "smooth"             # Movement easing curve (smooth, linear, cruise, etc.)
        look_at: "interlocutor"      # Dynamically rotates head/torso visor to face Subject B!
        highlighted: true            # Brightens mannequin, expands floor ring & adds ACTIVE FOCUS tag
      interlocutor:
        look_at: "protagonist"       # Subject B turns to track Subject A as Subject A walks!
        highlighted: false
      secret_prop:
        visible: false               # Hide an entity during a specific shot
```

### Entity Override Rules
1. **Automatic Walking Orientation**: If an entity moves (`position` differs from start position by $> 0.05\text{m}$) and neither `rotation` nor `look_at` is specified, the mannequin automatically rotates to face along its walking direction vector, and a **dashed floor movement trail** is drawn along its path!
2. **Dynamic Gaze Tracking (`look_at`)**: When `look_at: "<entity_id>"` is set, the mannequin continuously updates its facing yaw at 60fps to look directly at the target entity—even if one or both characters are actively walking across the stage.

---

## 8. Fast Interactive Authoring Workflow (Telemetry Capsule + Live Drawer)

You don't have to guess camera coordinates in your head:
1. **Pause the Video (`Space`)**: In `Scripted Observer` mode, pausing automatically unlocks Three.js `OrbitControls` (or click `Free Orbit` at any time).
2. **Frame Your Shot in 3D**:
   - **Left-Click + Drag**: Orbit (`pitch` and `yaw`).
   - **Right-Click + Drag** (or Two-Finger Drag): Pan the 3D `target` point `[x, y, z]`.
   - **Scroll Wheel**: Dolly `distance` in meters.
3. **1-Click Copy YAML Coordinates**:
   - Look at the bottom-right **Camera Telemetry Capsule** (`26.0° / 38.0° · 7.50m · (0.00, 1.10, 0.00)`).
   - Click the capsule once. It formats and copies the exact YAML block to your clipboard:
     ```yaml
     target: [0.00, 1.10, 0.00]
     distance: 7.50
     pitch: 26.0
     yaw: 38.0
     lens: 35mm
     ```
4. **Paste into the Live YAML Drawer**:
   - Click **`[ YAML Score ]`** in the top-right header and paste the snippet under `stage_camera:` or `observer_camera:`. The 3D diorama updates live on the spot.

---

## 9. Director's Cookbook: 6 Cinematography Recipes

### Recipe 1: Classic Shot / Reverse-Shot Over-the-Shoulder (OTS) Pair
```yaml
shots:
  - id: "shot-1-ots-a"
    shot: 1
    label: "OTS on Subject A"
    description: "85mm Over-the-Shoulder past Subject B onto Subject A."
    start: 0.0
    end: 4.0
    stage_camera:
      target: "protagonist"
      maneuver: "cut"
      distance: 2.4
      pitch: 4
      yaw: 72
      lens: 85mm
    entities:
      protagonist:
        highlighted: true
        look_at: "interlocutor"

  - id: "shot-2-ots-b"
    shot: 2
    label: "Reverse OTS on Subject B"
    description: "Instant reverse cut to 85mm OTS on Subject B."
    start: 4.0
    end: 8.0
    stage_camera:
      target: "interlocutor"
      maneuver: "cut"
      distance: 2.4
      pitch: 4
      yaw: -72
      lens: 85mm
    entities:
      protagonist:
        highlighted: false
      interlocutor:
        highlighted: true
        look_at: "protagonist"
```

### Recipe 2: Vertigo "Dolly-Zoom" (Contra-Zoom / Trombone Effect)
Physically dollies the camera closer (`4.5m -> 1.8m`) while widening the optical lens (`85mm -> 24mm`) so the subject stays a similar size in frame while the background perspective expands dramatically:
```yaml
  - id: "shot-vertigo"
    shot: 3
    label: "Vertigo Dolly-Zoom on Lead"
    description: "Camera pushes in from 4.5m to 1.8m while zooming out from 85mm to 24mm."
    start: 8.0
    end: 13.0
    stage_camera:
      target: "protagonist"
      maneuver: "dolly"
      easing: "smooth"
      distance_start: 4.5
      distance_end: 1.8
      pitch: 5
      yaw: 0
      lens_start: 85mm
      lens_end: 24mm
      show_path: true
```

### Recipe 3: Walk-and-Talk Steadicam Leading Track
Subject A walks downstage (`z: -2.0 -> +2.0`) while the `28mm` Stage Camera tracks backward in front of them, maintaining a constant `2.2m` lead distance:
```yaml
  - id: "shot-walk-talk"
    shot: 4
    label: "28mm Steadicam Lead Track"
    description: "Subject A walks downstage while the Stage Camera leads them at 2.2m."
    start: 0.0
    end: 6.0
    stage_camera:
      from: "protagonist"
      target: "protagonist"
      maneuver: "dolly"
      easing: "cruise"
      distance: 2.2
      pitch: 6
      yaw: 15
      lens: 28mm
      show_path: true
    entities:
      protagonist:
        from: [0, 0, -2.0]
        position: [0, 0, 2.0]
        easing: "cruise"
        highlighted: true
```

### Recipe 4: 360° Michael Bay Hero Low-Angle Turntable Orbit
```yaml
  - id: "shot-hero-orbit"
    shot: 5
    label: "360° Low-Angle Hero Orbit"
    description: "Full 360-degree clockwise turntable revolution at -12° low hero pitch."
    start: 0.0
    end: 8.0
    stage_camera:
      target: "protagonist"
      maneuver: "orbit"
      easing: "smooth"
      distance: 2.8
      pitch: -12
      yaw_start: 0
      revolutions: 1.0
      direction: "cw"
      lens: 35mm
```

### Recipe 5: Multi-Waypoint Catmull-Rom Spline Master Shot (`maneuver: "spline"`)
Smoothly threads a single continuous camera move from a wide establishing view, past Subject B, into a tight close-up on Subject A:
```yaml
  - id: "shot-master-spline"
    shot: 6
    label: "Continuous 3-Stop Master Spline"
    description: "Catmull-Rom spline gliding from wide center to Subject B and landing on Subject A."
    start: 0.0
    end: 12.0
    stage_camera:
      from: "center"
      maneuver: "spline"
      easing: "cruise"
      distance_start: 6.5
      pitch_start: 28
      yaw_start: 0
      lens_start: 24mm
      waypoints:
        - target: "interlocutor"
          distance: 3.2
          pitch: 10
          yaw: -35
          lens: 35mm
        - target: "protagonist"
          distance: 1.9
          pitch: 4
          yaw: 25
          lens: 50mm

### Recipe 6: Multi-Cut Scene with Decoupled Continuous Observer Master Orbit (`observer_shots:`)
Allows 4 rapid film cuts to occur inside the diorama while a single, seamless 180° diorama master orbit rotates overhead across all cuts without interruption:
```yaml
version: "1.0"
id: "action-dialogue-orbit"
title: "Multi-Cut Confrontation with Master Orbit"
duration: 12.0

stage:
  observer_camera:
    target: "center"
    distance: 9.0
    pitch: 28
    yaw: 30
    lens: 35mm

# --- Film Coverage (4 rapid camera cuts) ---
shots:
  - id: "shot-1-master"
    shot: 1
    start: 0.0
    end: 3.0
    stage_camera: { target: "center", distance: 5.5, pitch: 10, yaw: 0, lens: 35mm }
  - id: "shot-2-ots-a"
    shot: 2
    start: 3.0
    end: 6.0
    stage_camera: { target: "protagonist", distance: 2.2, pitch: 6, yaw: 65, lens: 85mm }
  - id: "shot-3-ots-b"
    shot: 3
    start: 6.0
    end: 9.0
    stage_camera: { target: "interlocutor", distance: 2.2, pitch: 6, yaw: -65, lens: 85mm }
  - id: "shot-4-tight-a"
    shot: 4
    start: 9.0
    end: 12.0
    stage_camera: { target: "protagonist", distance: 1.8, pitch: 2, yaw: 45, lens: 135mm }

# --- Decoupled Diorama Observer Track (Smooth 180° turntable sweep) ---
observer_shots:
  - id: "diorama-turntable"
    start: 0.0
    end: 12.0
    maneuver: "orbit"
    easing: "cruise"
    target: "center"
    distance: 8.5
    pitch: 26
    yaw_start: 25
    yaw_end: 205
    lens: 35mm
```

### Recipe 7: Continuous Single-Take Oner (`continuous: true`)
A seamless multi-phase continuous take without editing cuts. Omitted `start` timestamps automatically chain from the preceding shot's `end`, and moving maneuvers (`arc`, `dolly`, `orbit`) smoothly chain `distance`, `pitch`, and `yaw` from the preceding shot's terminal pose while mounting prime lenses discretely:

```yaml
version: "1.0"
id: "continuous-oner-breakthrough"
title: "The Breakthrough — Continuous Steadicam Oner"
continuous: true # Activates contiguous shot chaining & physical parameter flow
aspect_ratio: "2.39:1"
duration: 24.0

entities:
  - id: "scientist"
    label: "Dr. Aris"
    kind: "character"
    position: [-1.2, 0, -0.5]
    rotation: 90
    color: "#38bdf8"
  - id: "terminal"
    label: "Mainframe Terminal"
    kind: "prop"
    position: [0.8, 0, -0.5]
    rotation: 0
    height: 1.1
    color: "#94a3b8"

shots:
  # Shot 1: Establishing Arc (0.0s to 7.0s)
  - id: "shot-1-arc"
    shot: 1
    label: "Phase 1: Establishing Arc"
    # start: 0.0 (omitted: automatically defaults to 0.0 under continuous: true)
    end: 7.0
    stage_camera:
      target: "scientist"
      maneuver: "arc"
      distance_start: 4.5
      distance_end: 3.2
      pitch_start: 18
      pitch_end: 10
      yaw_start: -40
      yaw_end: 30
      lens: 35mm

  # Shot 2: Push-in Dolly (7.0s to 14.0s)
  # - start omitted: automatically chains to 7.0s
  # - distance/pitch/yaw start omitted: automatically chains from Shot 1's end pose (3.2m, 10°, 30°)
  # - lens swaps immediately to 50mm prime and holds steady without motorized zoom
  - id: "shot-2-push"
    shot: 2
    label: "Phase 2: Push-In to Close Profile"
    end: 14.0
    stage_camera:
      target: "scientist"
      maneuver: "dolly"
      easing: "cruise"
      distance: 1.8
      pitch: 4
      yaw: 65
      lens: 50mm

  # Shot 3: 180° Counter-Clockwise Orbit around Dr. Aris to reveal Mainframe Terminal (14.0s to 24.0s)
  # - start omitted: automatically chains to 14.0s
  # - direction: "ccw" forces rotation counter-clockwise past Dr. Aris's face rather than behind his back
  # - from: "scientist" smoothly pans camera look-at from Dr. Aris to the Mainframe Terminal
  - id: "shot-3-reveal-orbit"
    shot: 3
    label: "Phase 3: 180° CCW Orbit & Pan to Terminal"
    end: 24.0
    stage_camera:
      from: "scientist"
      target: "terminal"
      maneuver: "orbit"
      direction: "ccw"
      distance: 2.8
      pitch: 12
      yaw: 220
      lens: 35mm
```

### Recipe 8: Decoupled Actor & Prop Blocking Across Multiple Camera Cuts (`blocking:`)
Stages a continuous 10-second walk for `arthur` across the room using root-level `blocking:` while the film camera cuts three times (`35mm` Wide $\to$ `50mm` Profile Arc $\to$ `85mm` Close-Up). Arthur's velocity and floor movement trail remain unbroken across every cut:

```yaml
version: "1.0"
id: "decoupled-blocking-cross"
title: "Continuous Actor Walk Across 3 Camera Cuts"
duration: 14.0

entities:
  - id: "arthur"
    label: "Arthur (Lead)"
    kind: "character"
    position: [-8.0, 0, 0]
    rotation: 90
    color: "#38bdf8"
  - id: "ruby"
    label: "Ruby (Partner)"
    kind: "character"
    position: [4.0, 0, 0]
    rotation: -90
    color: "#f43f5e"

# --- Layer A: Decoupled Physical Blocking Timeline ---
blocking:
  # Single-entity cue: Arthur walks continuously from t=0.0s to t=10.0s across Shots 1, 2, and 3
  - id: "arthur-cross-room"
    entity: "arthur"
    start: 0.0
    end: 10.0
    position: [1.5, 0, 0]
    easing: "cruise"
    look_at: "ruby"

  # Multi-entity beat: From t=10.5s to t=14.0s, both actors turn downstage toward the audience
  - id: "final-downstage-turn"
    start: 10.5
    end: 14.0
    entities:
      arthur: { rotation: 0, easing: "smooth" }
      ruby: { rotation: 0, easing: "smooth" }

# --- Layer B: Film Camera Coverage (Cuts freely across the continuous walk) ---
shots:
  - id: "shot-1-wide"
    shot: 1
    label: "Shot 01 · Wide Establishing"
    start: 0.0
    end: 3.5
    stage_camera: { target: "arthur", maneuver: "dolly", distance_start: 5.5, distance_end: 4.2, pitch: 10, yaw: 0, lens: 35mm }

  - id: "shot-2-profile"
    shot: 2
    label: "Shot 02 · Tight Profile Arc"
    start: 3.5
    end: 7.5
    stage_camera: { target: "arthur", maneuver: "arc", distance: 2.8, pitch: 6, yaw_start: -25, yaw_end: 25, lens: 50mm }
    entities:
      arthur:
        highlighted: true   # Highlights Arthur during Shot 2 without interrupting his 0..10s walk!

  - id: "shot-3-closeup"
    shot: 3
    label: "Shot 03 · 85mm Arrival & Turn"
    start: 7.5
    end: 14.0
    stage_camera: { target: "arthur", maneuver: "orbit", distance: 2.0, pitch: 4, yaw_start: 25, yaw_end: 0, lens: 85mm }
```
