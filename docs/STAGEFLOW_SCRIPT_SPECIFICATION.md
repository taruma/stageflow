# StageFlow Script Technical & Mathematical Specification

This document defines the formal mathematical model, coordinate transformations, optical equations, kinematic evaluators, and declarative YAML schema for **StageFlow Choreography Scores (`*.yaml`)**. It specifies how the engine evaluates a script without prescribing directorial choices.

---

## 1. Coordinate System & Units

StageFlow operates in a right-handed, $Y$-up 3D Cartesian coordinate space $\mathbb{R}^3$ with origin $(0, 0, 0)$ at the center of the stage floor:

| Axis / Dimension | Symbol | Positive ($+$) Direction | Negative ($-$) Direction | Unit |
| :--- | :---: | :--- | :--- | :---: |
| **Horizontal (Width)** | $X$ | Stage Right ($+X$) | Stage Left ($-X$) | Meters ($\text{m}$) |
| **Vertical (Elevation)** | $Y$ | Upward / Overhead ($+Y$) | Below Floor ($-Y$, floor is $Y = 0$) | Meters ($\text{m}$) |
| **Depth** | $Z$ | Downstage / Front ($+Z$) | Upstage / Back ($-Z$) | Meters ($\text{m}$) |
| **Time** | $t$ | Forward timeline progression | — | Seconds ($\text{s}$) |
| **Angle** | $\theta, \psi, \gamma$ | Authored in degrees ($\text{deg}$) | Converted via $\text{rad} = \text{deg} \cdot \frac{\pi}{180}$ | Degrees ($\text{deg}$)* |
| **Focal Length** | $f_{\text{mm}}$ | 35mm full-frame equivalent | — | Millimeters ($\text{mm}$) |

*\*Numeric angle fields in YAML are interpreted in degrees by default; string values suffixed with `"rad"` (e.g., `"1.57rad"`) are parsed directly as radians.*

---

## 2. Spherical Camera Model & Forward Kinematics

Every camera state (both `stage_camera` and `observer_camera`) is parameterized by a 6-tuple spherical pose:

$$P = \left(\vec{T},\; d,\; \theta,\; \psi,\; \gamma,\; f_{\text{mm}}\right)$$

- $\vec{T} = (T_x, T_y, T_z) \in \mathbb{R}^3$: Look-at target anchor point in meters.
- $d \in [0.4, 80.0]\text{ m}$: Radial distance from $\vec{T}$ to the camera nodal point $\vec{E}$.
- $\theta \in [-85^\circ, +85^\circ]$: Pitch (elevation angle above/below the horizontal plane of $\vec{T}$).
  - $\theta > 0^\circ$: Camera is elevated above $\vec{T}$, looking downward.
  - $\theta < 0^\circ$: Camera is positioned below $\vec{T}$, looking upward.
- $\psi \in (-\infty, +\infty)$: Yaw (horizontal azimuth angle around the world $Y$-axis relative to $+Z$).
  - $\psi = 0^\circ$: Camera is placed at $(T_x, y, T_z + d\cos\theta)$, looking toward $-Z$.
  - $\psi = +90^\circ$: Camera is placed on the $+X$ side of $\vec{T}$, looking toward $-X$.
  - $\psi = -90^\circ$: Camera is placed on the $-X$ side of $\vec{T}$, looking toward $+X$.
  - $\psi = \pm 180^\circ$: Camera is placed on the $-Z$ side of $\vec{T}$, looking toward $+Z$.
- $\gamma \in (-\infty, +\infty)$: Optical roll (Dutch angle) around the forward sightline vector $\vec{F} = \frac{\vec{T} - \vec{E}}{\|\vec{T} - \vec{E}\|}$.
  - $\gamma = 0^\circ$: Level horizon.
  - $\gamma > 0^\circ$: Clockwise camera bank from the operator's point of view.
- $f_{\text{mm}} \in [12, 200]\text{ mm}$: Full-frame lens focal length.

### 2.1 Spherical-to-Cartesian Projection
Given pose $P$ (with $\theta, \psi, \gamma$ in radians), the 3D world-space camera eye position $\vec{E} = (x_{\text{eye}}, y_{\text{eye}}, z_{\text{eye}})$ is:

$$
\begin{aligned}
x_{\text{eye}} &= T_x + d \cos(\theta) \sin(\psi) \\
y_{\text{eye}} &= T_y + d \sin(\theta) \\
z_{\text{eye}} &= T_z + d \cos(\theta) \cos(\psi)
\end{aligned}
$$

The unrolled orthonormal camera basis vectors $(\vec{R}_0, \vec{U}_0)$ and the roll-transformed camera up-vector $\vec{U}_{\text{rolled}}$ are:

$$\vec{R}_0 = \begin{bmatrix} \cos\psi \\ 0 \\ -\sin\psi \end{bmatrix}, \quad \vec{U}_0 = \begin{bmatrix} -\sin\theta\sin\psi \\ \cos\theta \\ -\sin\theta\cos\psi \end{bmatrix}, \quad \vec{U}_{\text{rolled}} = \cos(\gamma)\vec{U}_0 + \sin(\gamma)\vec{R}_0$$

### 2.2 Inverse Projection (Cartesian-to-Spherical)
Given $\vec{E}$ and $\vec{T}$ with displacement $\Delta\vec{p} = \vec{E} - \vec{T} = (\Delta x, \Delta y, \Delta z)$:

$$d = \sqrt{\Delta x^2 + \Delta y^2 + \Delta z^2}, \quad d_{xz} = \sqrt{\Delta x^2 + \Delta z^2}, \quad \theta = \operatorname{atan2}(\Delta y, d_{xz}), \quad \psi = \operatorname{atan2}(\Delta x, \Delta z)$$

---

## 3. Optical Sensor & Film Gate Geometry

StageFlow models a standard 35mm full-frame sensor with horizontal gate width $W_{\text{sensor}} = 36.0\text{ mm}$.

1. **Sensor Height ($H_{\text{sensor}}$)**:
   Given scene aspect ratio $\text{AR} = \frac{W}{H}$ (e.g., $16:9 \implies 1.7778$, $2.39:1 \implies 2.39$):
   $$H_{\text{sensor}} = \frac{36.0\text{ mm}}{\text{AR}}$$

2. **Vertical Field of View ($\text{FOV}_{\text{vert}}$ in degrees)**:
   $$\text{FOV}_{\text{vert}} = 2 \arctan\left(\frac{H_{\text{sensor}}}{2 f_{\text{mm}}}\right) \cdot \frac{180}{\pi}$$

3. **Projected Spatial Gate Dimensions at Distance $D$ (in meters)**:
   At radial distance $D$ from the camera eye $\vec{E}$, the rectangular field of view covers a physical plane of width $W_{\text{gate}}$ and height $H_{\text{gate}}$:
   $$W_{\text{gate}}(D) = D \cdot \frac{36.0}{f_{\text{mm}}}, \qquad H_{\text{gate}}(D) = D \cdot \frac{H_{\text{sensor}}}{f_{\text{mm}}} = \frac{W_{\text{gate}}(D)}{\text{AR}}$$

---

## 4. Entities, Anchors & Orientation

Each entity $i$ declared in `entities:` has a kind $k_i \in \{\text{"character"}, \text{"prop"}, \text{"marker"}\}$, floor/base coordinate $\vec{p}_i = (x_i, y_i, z_i)$, height $h_i$, radius $r_i$, and horizontal facing angle $\psi_{\text{entity}, i}$.

### 4.1 Default Geometry & Intrinsic Look-At Anchor ($\vec{A}_i$)
When a camera `target` or `from` references an entity by `id` or `label`, it resolves to the entity's intrinsic 3D anchor $\vec{A}_i$:

| `kind` | Default `height` ($h$) | Default `radius` ($r$) | Anchor Elevation Ratio | Resolved Look-At Anchor $\vec{A}_i$ |
| :--- | :---: | :---: | :---: | :--- |
| `"character"` | $1.75\text{ m}$ | $0.26\text{ m}$ | $0.90 h$ | $(x_i,\; y_i + 0.90 h_i,\; z_i)$ *(default $y = 1.575\text{ m}$ eye level)* |
| `"prop"` | $0.85\text{ m}$ | $0.35\text{ m}$ | $0.50 h$ | $(x_i,\; y_i + 0.50 h_i,\; z_i)$ *(default $y = 0.425\text{ m}$)* |
| `"marker"` | $0.15\text{ m}$ | $0.25\text{ m}$ | $0.50 h$ | $(x_i,\; y_i + 0.50 h_i,\; z_i)$ *(default $y = 0.075\text{ m}$)* |

- **Stage Preset Anchor**: `target: "center"` (or `"origin"`, `"stage"`) resolves to $\vec{A}_{\text{center}} = (0,\; 1.0,\; 0)$.
- **Explicit Coordinate Anchor**: `target: [x, y, z]` resolves directly to $(x,\; y,\; z)$.
- **Target Offset Displacement**: Adding `target_offset: [dx, dy, dz]` shifts the resolved anchor in world space:
  $$\vec{T}_{\text{effective}} = \vec{A} + (\text{dx},\; \text{dy},\; \text{dz})$$

### 4.2 Entity Facing Angle (`rotation` & `look_at`)
- An entity with `rotation: 0` faces $+Z$ (downstage). `rotation: 90` faces $+X$ (stage right). `rotation: -90` faces $-X$ (stage left). `rotation: 180` faces $-Z$ (upstage).
- **Dynamic Gaze (`look_at`)**: When an entity specifies `look_at: "<target_id>"` (or `[x, y, z]`) at position $\vec{p}_{\text{target}}$, its horizontal facing yaw at time $t$ is computed continuously as:
  $$\psi_{\text{entity}}(t) = \operatorname{atan2}\!\left(x_{\text{target}}(t) - x_{\text{self}}(t),\; z_{\text{target}}(t) - z_{\text{self}}(t)\right)$$
- **Automatic Locomotion Heading**: If an entity translates during a shot ($\|\vec{p}_{\text{end}, xz} - \vec{p}_{\text{start}, xz}\| > 0.05\text{ m}$) and neither `rotation` nor `look_at` is specified for that shot, $\psi_{\text{entity}}$ automatically aligns with the displacement vector $\operatorname{atan2}(\Delta x, \Delta z)$.

---

## 5. Temporal Easing & Trajectory Maneuvers

For a shot spanning $[t_{\text{start}}, t_{\text{end}}]$ with duration $\Delta t = \max(0.016, t_{\text{end}} - t_{\text{start}})$, normalized time is:

$$\tau = \operatorname{clamp}\left(\frac{t - t_{\text{start}}}{\Delta t},\; 0,\; 1\right)$$

### 5.1 Easing Functions ($u = E(\tau)$)

| `easing` | Mathematical Definition $u = E(\tau)$ for $\tau \in [0, 1]$ |
| :--- | :--- |
| `"smooth"` *(default)* | $u = \frac{1}{2}\left(1 - \cos(\pi \tau)\right)$ |
| `"linear"` | $u = \tau$ |
| `"ease-in"` | $u = \tau^3$ |
| `"ease-out"` | $u = 1 - (1 - \tau)^3$ |
| `"expo"` | $u = \begin{cases} 0 & \tau = 0 \\ \frac{1}{2} 2^{20\tau - 10} & 0 < \tau < 0.5 \\ 1 - \frac{1}{2} 2^{-20\tau + 10} & 0.5 \le \tau < 1 \\ 1 & \tau = 1 \end{cases}$ |
| `"pop"` | $u = \operatorname{clamp}\!\left(1 - e^{-6\tau}\cos(2.5\pi\tau),\; 0,\; 1.2\right)$ for $\tau \in (0, 1)$, endpoints $0$ and $1$ |
| `"cruise"` | Raised-cosine ramp-up over $\tau \in [0, p)$, constant velocity $v_c = \frac{1}{1 - p}$ over $[p, 1-p]$, raised-cosine ramp-down over $(1-p, 1]$ with $p = 0.25$ |
| `"accel"` | Raised-cosine acceleration over $\tau \in [0, p)$ into constant velocity $v_c = \frac{1}{1 - p/2}$ over $[p, 1]$ with $p = 0.40$ |
| `"deccel"` | Constant velocity $v_c = \frac{1}{1 - p/2}$ over $\tau \in [0, 1-p]$ into raised-cosine deceleration over $(1-p, 1]$ with $p = 0.40$ |

### 5.2 Angular Unwrapping Operators
1. **Shortest-Arc Difference** ($\Delta_{\text{short}}(\alpha_1, \alpha_0) \in [-\pi, \pi]$):
   $$\Delta_{\text{short}}(\alpha_1, \alpha_0) = \left((\alpha_1 - \alpha_0 + \pi) \bmod 2\pi\right) - \pi$$
2. **Directed Orbit Difference** ($\Delta_{\text{dir}}(\alpha_1, \alpha_0, \text{dir})$):
   When `direction` is `"ccw"` (increasing yaw, $+Z \to +X \to -Z$), forces $\Delta \in (0, +2\pi]$. When `"cw"` (decreasing yaw, $+Z \to -X \to -Z$), forces $\Delta \in [-2\pi, 0)$. If `direction` is omitted, falls back to $\Delta_{\text{short}}$.

### 5.3 Camera Trajectory Maneuvers ($P(u)$ from $P_0 \to P_1$)
Across all maneuvers, focal length and roll interpolate as:
$$f_{\text{mm}}(u) = f_0 + u(f_1 - f_0), \qquad \gamma(u) = \begin{cases} \gamma_0 + u(\gamma_1 - \gamma_0) & \text{if } \texttt{roll\_delta} \text{ or } (\texttt{roll\_start} \land \texttt{roll\_end}) \\ \gamma_0 + u\,\Delta_{\text{short}}(\gamma_1, \gamma_0) & \text{otherwise} \end{cases}$$

| `maneuver` | Trajectory Equations $P(u)$ for $u \in [0, 1]$ |
| :--- | :--- |
| `"cut"` | $P(u) = P_1$ *(instantaneous hold at destination pose; trajectory path line suppressed)* |
| `"dolly"` / `"straight"` | $\vec{T}(u) = (1-u)\vec{T}_0 + u\vec{T}_1$, $\quad d(u) = d_0 + u(d_1 - d_0)$, $\quad \theta(u) = \theta_0 + u(\theta_1 - \theta_0)$, $\quad \psi(u) = \psi_0 + u\,\Delta_{\text{short}}(\psi_1, \psi_0)$ |
| `"arc"` | Quadratic Bezier target $\vec{T}(u) = (1-u)^2\vec{T}_0 + 2(1-u)u\vec{C} + u^2\vec{T}_1$ where $\vec{C} = \vec{M} + (0.14 L \hat{r}_x,\; 0.16 L,\; 0.14 L \hat{r}_z)$ with chord $L = \|\vec{T}_1 - \vec{T}_0\|$ and midpoint $\vec{M} = \frac{\vec{T}_0 + \vec{T}_1}{2}$. Distance breathes via $d(u) = \big(d_0 + u(d_1 - d_0)\big)\big(1 + (b - 1)\sin(\pi u)\big)$ where $b = \texttt{breathe}$ (default $1.12$). $\theta(u)$ and $\psi(u)$ match `"dolly"`. |
| `"swoop"` | Identical to `"arc"`, plus a mid-flight elevation crest: $\theta(u) = \theta_0 + u(\theta_1 - \theta_0) + 0.08\sin(\pi u)\text{ rad}$ ($\approx +4.58^\circ$). |
| `"orbit"` / `"sweep"` | Linear $\vec{T}(u), d(u), \theta(u)$. Azimuthal rotation $\psi(u) = \psi_{\text{start}} + \Delta\psi \cdot u$, where $\Delta\psi$ is resolved in priority order from: (1) $\pm 2\pi \cdot \texttt{revolutions}$, (2) $\pm \texttt{orbit\_speed} \cdot \Delta t$, (3) $\texttt{yaw\_delta}$, (4) $\Delta_{\text{dir}}(\psi_1, \psi_0, \texttt{direction})$ when `direction` is set, (5) $\psi_1 - \psi_0$ when both `yaw_start` and `yaw_end` are set, or (6) $\Delta_{\text{short}}(\psi_1, \psi_0)$. Sign is $-1$ for `"cw"` (default) and $+1$ for `"ccw"`. |
| `"spiral"` | Helical orbit with $\Delta\psi = \operatorname{sign}(\texttt{direction}) \cdot (\texttt{revolutions} ?? 0.5) \cdot 2\pi u$, combined with linear interpolation of $\vec{T}(u), d(u), \theta(u)$. |
| `"dive"` | Perigee swoop: $d(u) = \big(d_0 + u(d_1 - d_0)\big)\big(1 - 0.14\sin(2\pi u)\big)$ and $\theta(u) = \theta_0 + u(\theta_1 - \theta_0) - 0.12\sin(\pi u)\text{ rad}$. |
| `"recoil"` | Impulse damper: $d(u) = d_0 + u(d_1 - d_0) + (b - 1)\,d_0 \cdot 3.5\tau e^{-5\tau}$ where $b = \texttt{breathe}$ (default $1.25$). |
| `"spline"` | Piecewise $C^1$ Catmull-Rom spline over pose chain $[P_0, W_1, W_2, \dots, W_m]$ defined in `waypoints:`, with sequential $\Delta_{\text{short}}$ unwrapping on $\psi$ and $\gamma$: $q(s) = \frac{1}{2}\big(2q_1 + (-q_0 + q_2)s + (2q_0 - 5q_1 + 4q_2 - q_3)s^2 + (-q_0 + 3q_1 - 3q_2 + q_3)s^3\big)$. |

---

## 6. Timeline Chaining & Boundary Semantics ($P_0 \to P_1 \to \dots \to P_k$)

StageFlow is a **stateless functional evaluator** (`Frame_t = f(t, score)`). State at shot $k$ is deterministically chained forward from shot $k - 1$:

1. **3-Tier Entity Blocking Resolution & State Persistence**:
   - **Tier 1 (Root `blocking:`)**: When `blocking:` is defined and non-empty at the score root, entity movement and orientation evaluate across these decoupled time windows $[t_{\text{start}, c}, t_{\text{end}, c}]$ in a **Two-Pass Kinematic Evaluator**:
     - **Pass 1 (World Positions & Visibility)**: For each entity $i$, chronological cues $c_{i, 1} \dots c_{i, m}$ forward-chain $\vec{p}_{\text{start}, k} \to \vec{p}_{\text{end}, k}$ and `visible` starting from `entities[i]`. During un-cued gaps or after the final cue, the entity holds its preceding terminal pose $\vec{p}_{\text{end}, k}$.
     - **Pass 2 (Rotation & $C^0$ Gaze Handoff)**: Once all entity world positions $\vec{P}(j, t)$ are solvable for any $t$, each entity forward-chains $\psi_{\text{start}, k} \to \psi_{\text{end}, k}$. If cue $k$ specifies `look_at`, $\psi_{\text{end}, k}$ is sampled against $\vec{P}(\text{target}, t_{\text{end}, k})$, guaranteeing a $0\text{ rad}$ continuous handoff into subsequent holds or turns.
     - **Option A Ground Movement Trails**: While an entity is inside an active blocking cue ($t \in [t_{\text{start}, k}, t_{\text{end}, k})$) with displacement $> 0.05\text{ m}$, `trailPoints` renders the full 16-segment path of that blocking cue across any camera cuts, and clears (`[]`) during holds/gaps.
     - **Hybrid Per-Shot Focus Layering**: Per-shot `shots[k].entities.<id>.highlighted` and `note` overlay non-destructively onto the continuous blocking state.
   - **Tier 2 (Per-Shot `shots[].entities`)**: When root `blocking:` is omitted, at the start of shot $k$, every entity inherits its terminal position $\vec{p}_{\text{end}, k-1}$, facing angle $\psi_{\text{end}, k-1}$, and `visible` flag from shot $k - 1$, unless overridden by `from:` in `shots[k].entities.<id>`. `highlighted` is evaluated per-shot (defaults to `false` if omitted in shot $k$).
   - **Tier 3 (Static `entities:`)**: Holds baseline position and rotation.
2. **Camera Spatial Chaining (`continuous: false` vs. `continuous: true`)**:
   - **Standard Mode (`continuous: false`, default)**: Each shot explicitly declares `start` and `end`. If a shot specifies single-value `distance`, `pitch`, or `yaw` without `*_start`, the camera starts and ends the shot at that value (unless `*_end` is also provided). Omitting a parameter inherits the previous shot's terminal value.
   - **Continuous Mode (`continuous: true` at root)**:
     - **Timeline**: If `shots[0]` omits `start`, $t_{\text{start}, 0} = 0.0$. If `shots[k]` ($k \ge 1$) omits `start`, $t_{\text{start}, k} = t_{\text{end}, k-1}$. Explicit `start` values are always honored.
     - **Pose Flow**: For any moving maneuver (`maneuver !== "cut"`) on `shots[k]` ($k \ge 1$), omitting `distance_start`, `pitch_start`, or `yaw_start` automatically binds the shot's starting pose $P_0$ to the previous shot's terminal pose $P_{\text{end}, k-1}$, interpolating smoothly to the newly authored `distance`, `pitch`, and `yaw`.
3. **Discrete Prime Lens Mounting**:
   - Specifying `lens: 50mm` mounts that focal length immediately at $t_{\text{start}}$ and holds it constant ($f_0 = f_1 = 50\text{ mm}$).
   - Omitting `lens`, `lens_start`, and `lens_end` preserves the previous shot's terminal focal length.
   - Continuous optical zoom (or dolly-zoom) occurs only when both `lens_start` and `lens_end` are specified (or across `spline` waypoints).
4. **Look-At Target Snapping vs. Panning (`target` vs. `from`)**:
   - Specifying `target` without `from` snaps the look-at anchor to `target` at $t_{\text{start}}$ ($\vec{T}_0 = \vec{T}_1 = \vec{T}_{\text{target}}$). If the target is a moving entity, $\vec{T}(t)$ tracks the entity's live position throughout the shot.
   - Specifying both `from` and `target` interpolates the look-at anchor from $\vec{T}_{\text{from}}(t_{\text{start}})$ to $\vec{T}_{\text{target}}(t_{\text{end}})$.
5. **Shot-Boundary Reset of `roll` and `target_offset`**:
   - Unlike $d, \theta, \psi$, both `roll` and `target_offset` reset to $0^\circ$ and $[0, 0, 0]$ at shot boundaries whenever omitted.
   - To persist or animate them across a shot, specify `roll`, `roll_start`/`roll_end`, `roll_delta`, `target_offset`, or `target_offset_start`/`target_offset_end`.
6. **Observer Camera Resolution Hierarchy**:
   - **Tier 1**: Root `observer_shots:` (decoupled timeline; takes complete precedence if non-empty).
   - **Tier 2**: Per-shot `shots[].observer_camera`.
   - **Tier 3**: Static fallback `stage.observer_camera`.
7. **Overlapping Shots Priority**:
   - If two shots overlap temporally, the shot declared **later in YAML array order** takes precedence.

---

## 7. Complete YAML Schema Reference

```yaml
# ============================================================================
# 1. ROOT METADATA & TIMELINE CONFIGURATION
# ============================================================================
version: "1.0"                        # string (default: "1.0")
id: "scene-identifier"                # string (default: "custom-scene")
title: "Scene Title"                  # string
subtitle: "Optional Subtitle"         # string (optional)
continuous: false                     # boolean (default: false) — enables contiguous shot & pose chaining
video: "procedural://scene"           # string ("procedural://...", "/path.mp4", or YouTube URL)
                                      # OR object: { src: "...", aspect_ratio: "16:9" }
aspect_ratio: "16:9"                  # string | number ("16:9", "2.39:1", "1.85:1", "4:3", "9:16", or float)
duration: 16.0                        # number (seconds; defaults to max(shot.end))
offset: 0.0                           # number (seconds; global clock sync offset, default: 0.0)

# ============================================================================
# 2. STAGE GEOMETRY & BASELINE CAMERAS
# ============================================================================
stage:
  width: 10                           # number (meters along X-axis, default: 10)
  depth: 10                           # number (meters along Z-axis, default: 10)
  grid_step: 1                        # number (major grid line spacing in meters, default: 1)

  observer_camera:                    # Baseline viewport pose (SphericalPose)
    target: [0, 1.1, 0]               # [x, y, z] | {x, y, z} (default: [0, 1.1, 0])
    distance: 7.5                     # number (m, default: 7.5)
    pitch: 26                         # number (deg, default: 28)
    yaw: 38                           # number (deg, default: 35)
    roll: 0                           # number (deg, alias: dutch, default: 0)
    lens: 35mm                        # number | string (mm, alias: focal_length, default: 35)

  stage_camera:                       # Baseline 3D stage camera pose
    target: "actor_a"                 # entity id/label | "center" | [x, y, z]
    distance: 3.5                     # number (m, default: 3.8)
    pitch: 8                          # number (deg, default: 12)
    yaw: -20                          # number (deg, default: 0)
    roll: 0                           # number (deg, default: 0)
    lens: 50mm                        # number | string (mm, default: 35)

# ============================================================================
# 3. SCENE ENTITIES (INITIAL t = 0.0s STATE)
# ============================================================================
entities:
  - id: "actor_a"                     # string (unique identifier)
    label: "Subject A"                # string (display badge name)
    kind: "character"                 # "character" | "prop" | "marker" (aliases: "actor", "person", "set", " furniture")
    position: [-1.2, 0, 0]            # [x, y, z] in meters (Y=0 is floor)
    rotation: 90                      # number (deg; 0=+Z, 90=+X, -90=-X, 180=-Z)
    height: 1.75                      # number (m, optional; defaults by kind)
    radius: 0.26                      # number (m, optional; defaults by kind)
    color: "#38bdf8"                  # hex color string (optional)

# ============================================================================
# 4. SHOT TIMELINE (FILM COVERAGE & BLOCKING)
# ============================================================================
shots:
  - id: "shot-1"                      # string
    shot: 1                           # number (1-based index)
    label: "Shot Label"               # string
    description: "Staging summary"    # string (optional)
    start: 0.0                        # number (s; optional on shots[k] when continuous: true)
    end: 6.0                          # number (s; clamped to >= start + 0.1)

    stage_camera:
      maneuver: "dolly"               # "cut" | "dolly" | "straight" | "arc" | "swoop" | "orbit" | "sweep" | "spiral" | "dive" | "recoil" | "spline" (alias: style)
      easing: "smooth"                # "smooth" | "linear" | "ease-in" | "ease-out" | "cruise" | "accel" | "deccel" | "expo" | "pop"
      from: "actor_a"                 # string | [x, y, z] (optional starting look-at anchor)
      target: "actor_a"               # string | [x, y, z] (destination look-at anchor)

      # Target Offset (world-space meter displacement added to resolved target anchor; resets to [0,0,0] if omitted)
      target_offset: [0, 0, 0]        # [dx, dy, dz] (alias: offset)
      target_offset_start: [0, -0.5, 0] # [dx, dy, dz] (optional start offset)
      target_offset_end: [0, 0.2, 0]  # [dx, dy, dz] (optional end offset)

      # Radial Distance (meters)
      distance: 2.8                   # number (constant or destination distance)
      distance_start: 3.6             # number (optional explicit start distance)
      distance_end: 2.8               # number (optional explicit end distance)

      # Elevation Pitch (degrees, clamped to [-85, 85])
      pitch: 6                        # number (constant or destination pitch)
      pitch_start: 12                 # number (optional explicit start pitch)
      pitch_end: 6                    # number (optional explicit end pitch)

      # Horizontal Azimuth Yaw (degrees)
      yaw: 35                         # number (constant or destination yaw)
      yaw_start: -15                  # number (optional explicit start yaw)
      yaw_end: 35                     # number (optional explicit end yaw)
      yaw_delta: 50                   # number (optional relative angular delta from start yaw)

      # Optical Roll / Dutch Angle (degrees; resets to 0 if omitted)
      roll: 0                         # number (alias: dutch)
      roll_start: 0                   # number (optional explicit start roll)
      roll_end: 15                    # number (optional explicit end roll)
      roll_delta: 15                  # number (optional relative roll delta)

      # Optics (35mm equivalent focal length in mm)
      lens: 50mm                      # number | string (alias: focal_length; discrete prime mount)
      lens_start: 35mm                # number | string (optional start focal length for zoom)
      lens_end: 85mm                  # number | string (optional end focal length for zoom)

      # Maneuver-Specific Modifiers
      breathe: 1.12                   # number (mid-shot distance multiplier for arc/swoop/recoil)
      direction: "cw"                 # "cw" | "ccw" (rotation direction for orbit/sweep/spiral)
      revolutions: 0.5                # number (full 360° turns for orbit/spiral)
      orbit_speed: 30                 # number (deg/s angular velocity for orbit)
      waypoints:                      # Array of control stops (used when maneuver: "spline")
        - { target: "actor_a", target_offset: [0, 0, 0], distance: 2.5, pitch: 8, yaw: 10, roll: 0, lens: 50mm }

      # 3D Diorama Visual Guides (stage_camera only)
      frustum_depth: 0                # number (m, alias: cone_length; 0 or omitted = auto-match live distance)
      frustum_color: "#f59e0b"        # hex string
      show_path: true                 # boolean (default: true for moving maneuvers)

    observer_camera:                  # Optional per-shot viewport camera cue (same fields as stage_camera except frustum_*/show_path)
      target: "center"
      maneuver: "orbit"
      distance: 8.0
      pitch: 26
      yaw_start: 30
      yaw_end: 60
      lens: 35mm

    entities:                         # Optional per-shot entity kinematics & state overrides (keyed by entity id)
      actor_a:
        from: [-1.2, 0, 0]            # [x, y, z] (optional explicit start position; defaults to previous shot's end)
        position: [-0.4, 0, 0.5]      # [x, y, z] (destination floor position at shot end)
        rotation: 45                  # number (deg; explicit destination facing yaw)
        look_at: "actor_b"            # entity id | [x, y, z] (dynamic continuous gaze tracking)
        easing: "smooth"              # CameraEasing curve applied to entity translation & rotation
        highlighted: true             # boolean (active subject focus indicator)
        visible: true                 # boolean (toggle entity visibility)
        note: "Steps forward"         # string (optional annotation)

# ============================================================================
# 5. DECOUPLED OBSERVER TIMELINE (OPTIONAL — OVERRIDES PER-SHOT OBSERVER CUES)
# ============================================================================
observer_shots:
  - id: "obs-1"
    start: 0.0
    end: 16.0
    target: "center"
    maneuver: "orbit"
    easing: "cruise"
    distance: 8.5
    pitch: 28
    yaw_start: 25
    yaw_end: 145
    lens: 35mm

# ============================================================================
# 6. DECOUPLED ENTITY BLOCKING TIMELINE (OPTIONAL — OVERRIDES PER-SHOT KINEMATICS)
# ============================================================================
blocking:
  # Single-entity cue format
  - id: "actor-cross"
    entity: "actor_a"                 # entity id or label
    start: 0.0
    end: 9.0
    from: [-1.2, 0, 0]                # optional explicit start position
    position: [2.0, 0, 0]             # destination floor position at cue end
    rotation: 45                      # optional destination facing yaw in deg
    look_at: "actor_b"                # optional dynamic gaze target (entity id | [x, y, z])
    easing: "cruise"                  # CameraEasing curve
    highlighted: true                 # optional focus highlight
    visible: true                     # optional visibility toggle
    note: "Crosses stage across cuts" # optional staging note

  # Multi-entity beat format
  - id: "beat-2"
    start: 10.0
    end: 16.0
    entities:
      actor_a: { rotation: 0, easing: "smooth" }
```
