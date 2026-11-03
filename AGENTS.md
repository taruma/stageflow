# AGENTS.md — StageFlow: 3D Choreography Diorama Guidelines

This is the authoritative operating guide for AI agents working in **StageFlow**. Read it first before inspecting, planning, or modifying any code.

---

## 1. Mission & Role

**StageFlow** is a standalone 3D Camera-Blocking & Scene Choreography Diorama web application. It synchronizes a universal video player (**Local `.mp4`/`.webm`**, **YouTube URLs**, or a **60fps Stage Cam Blueprint Simulator**) with an interactive **Three.js / React Three Fiber (R3F)** blueprint stage to analyze, dissect, and visualize spatial staging and camera maneuvers at every millisecond of a scene.

- **Taruma Sakti** ([@taruma](https://github.com/taruma)) is the Creator and Showrunner. He owns product direction, visual staging philosophy, and UX decisions.
- **The AI Agent** is a software engineering partner and system architect. Its mission is to keep the engine strictly decoupled, mathematically deterministic, unit-tested, and synchronized with living documentation.

---

## 2. Non-Negotiable Core Governance & Workflow Rules

### 2.1 Ask First When Intent Is Unclear (Zero Guessing)
- **Never guess on ambiguous scope, UX behavior, or visual staging.** Product and directorial decisions belong to Taruma.
- If any instruction, edge case, or requirement has doubt or ambiguity, **ask first before writing code or scaffolding**.
- Brainstorm or clarify before building anything that changes what the application shows or how the user interacts with it.

### 2.2 Strictly Decoupled Architecture (No Monoliths)
- **Propose and enforce decoupled systems at all times.** Never bundle math calculations, media clock I/O, Three.js scene objects, and 2D React UI chrome into monolithic files.
- Keep modules focused on a single responsibility (target $\le 250$ lines per file). If a file starts doing two jobs, split it into clean, testable submodules.
- Layer dependencies must flow strictly one way (`core/` $\to$ `media/` $\to$ `hooks/` $\to$ `stage/` & `ui/`). `src/core/` must have **zero React and zero DOM/Three.js runtime dependencies**.

### 2.3 Living Documentation as Single Source of Truth (SSOT)
- **Documentation and codebase must never drift.** With **every code change**, the agent MUST proactively audit and update [`AGENTS.md`](AGENTS.md), [`README.md`](README.md), [`SPECIFICATION.md`](SPECIFICATION.md), and the domain specifications in [`docs/`](docs/) as part of completing the task.
- **Detailed `CHANGELOG.md` Tracking (`## [Unreleased]`)**: Every change must be recorded in [`CHANGELOG.md`](CHANGELOG.md) under the `## [Unreleased]` section. Bullet points must reflect granular details derived directly from pending file diffs (`git diff HEAD`).
- **Showrunner Versioning & Release Authority**: Version numbers, release checkpoints, and Git tagging (`git tag`) are strictly decided and executed by Taruma. The agent never increments version numbers or tags releases autonomously.
- Always cross-verify documentation claims against the **actual current state of the codebase** before and after implementation. Taruma should never have to remind the agent to update docs.
- **Strict 24,000-Byte Root Cap (`AGENTS.md` vs. `docs/*.md`)**: Antigravity enforces a hard `24,000-byte` per-file inline rule limit on `AGENTS.md`. Keep `AGENTS.md` concise (holding universal governance, architecture maps, and invariant digests) and place deep technical specifications verbatim inside the corresponding `docs/*.md` files.

### 2.4 Never Commit Autonomously
- Never run `git commit`, `git push`, or `git tag`. Committing, pushing, and tagging are strictly human-in-the-loop actions reserved for Taruma.
- Upon concluding every verified task, run `git status` and `git diff HEAD`, then **propose a ready-to-copy Conventional Commit message** derived strictly from the full pending diff:

```text
<type>(<scope>): <concise intent>

- Concise bullet points explaining architectural rationale or scope
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

### 2.5 Dual-Tier Lifecycle & Deferred Invalidation (Zero Premature Fallback)
- **Never discard stored state pointers against partial synchronous data.** When pairing fast synchronous pointers (`localStorage`, URL query params) with asynchronous storage (`IndexedDB`, network), initial frame-$0$ state must preserve the raw pointer without discarding it or prematurely falling back to index $0$.
- **Always reconcile post-hydration.** When asynchronous data finishes loading, reconcile the active pointer against the complete merged dataset before applying fallbacks.
- **Mandatory 4-State Persistence Testing**:
  1. Cold start with empty storage (default fallback)
  2. Cold start with bundled scene pointer
  3. Cold start with custom/IndexedDB scene pointer
  4. Cold start with active draft edits

---

## 3. Mandatory Pre-Flight Domain Specification Lookup Gate

> [!IMPORTANT]
> Detailed technical specifications are modularized under [`docs/`](docs/). Before planning, inspecting, or modifying files in any domain below, the agent **MUST** call `read_file` on the corresponding specification document:
> - **Layer 1: Core Math, Optics, Trajectories & YAML Score Schema** (`src/core/*`, `public/scores/*.yaml`, `tests/unit/*`): Read [`docs/CORE_MATH_AND_SCORE_SPECIFICATIONS.md`](docs/CORE_MATH_AND_SCORE_SPECIFICATIONS.md) and [`docs/YAML_AUTHORING_GUIDE.md`](docs/YAML_AUTHORING_GUIDE.md).
> - **Layer 2 & 3: Universal Media Clock, YouTube Sync & Dual-Tier 60fps Loop** (`src/media/*`, `src/hooks/*`): Read [`docs/MEDIA_CLOCK_AND_SYNC_SPECIFICATIONS.md`](docs/MEDIA_CLOCK_AND_SYNC_SPECIFICATIONS.md).
> - **Layer 4 & 5: 3D Blueprint Diorama, Dual-Camera Rigs & 2D Workspace UI** (`src/stage/*`, `src/ui/*`, `src/App.tsx`): Read [`docs/DIORAMA_3D_AND_UI_SPECIFICATIONS.md`](docs/DIORAMA_3D_AND_UI_SPECIFICATIONS.md).

### Universal StageFlow Invariants Matrix

| # | Invariant | Core Constraint & Engineering Rule | Domain Spec |
| :--- | :--- | :--- | :--- |
| 1 | **Stateless Timeline (`Frame_t = f(t)`)** | `computeStageFrame(t, score)` is 100% pure and deterministic; scrubbing forward or backward yields bit-for-bit identical 3D states | [Core Math Specs](docs/CORE_MATH_AND_SCORE_SPECIFICATIONS.md) |
| 2 | **Metric Meters & Human Degrees** | World space uses **meters** ($1\text{ unit} = 1\text{m}$); YAML angles use **degrees** (`pitch`, `yaw`, `roll`, `rotation`) converted to radians in `scoreParser.ts` | [Core Math Specs](docs/CORE_MATH_AND_SCORE_SPECIFICATIONS.md) |
| 3 | **Shortest-Arc Angle Unwrapping** | All yaw, roll, and facing interpolations use `shortestAngleDiff` on $[-\pi, \pi]$ to eliminate $360^\circ$ wrap-around spin flips | [Core Math Specs](docs/CORE_MATH_AND_SCORE_SPECIFICATIONS.md) |
| 4 | **Cinematic Lens Optics (`mm`)** | Stage & Observer cameras use full-frame focal lengths (`24mm`, `35mm`, `50mm`, `85mm`) mapped to vertical FOV via $36\text{mm}$ sensor math | [Core Math Specs](docs/CORE_MATH_AND_SCORE_SPECIFICATIONS.md) |
| 5 | **Rectangular Film Gate Frustum** | Stage Camera projects a rectangular pyramidal frustum matching the video aspect ratio (`16:9`, `2.39:1`) with a target Focus Plane Frame | [3D & UI Specs](docs/DIORAMA_3D_AND_UI_SPECIFICATIONS.md) |
| 6 | **Universal Media Clock Parity** | Local `.mp4`, YouTube URLs, and Procedural Simulator share `MediaClockDriver`; YouTube uses 60fps `performance.now()` drift extrapolation | [Media & Sync Specs](docs/MEDIA_CLOCK_AND_SYNC_SPECIFICATIONS.md) |
| 7 | **Dual-Tier 60fps Render Engine** | Tier 1 mutates Three.js transforms imperatively in R3F `useFrame` (0 React re-renders); Tier 2 syncs React UI state at ~10Hz (`95ms`) | [Media & Sync Specs](docs/MEDIA_CLOCK_AND_SYNC_SPECIFICATIONS.md) |
| 8 | **Pause-to-Free-Orbit Handover** | In `'scripted'` mode: playback locks viewport to `observerCamera`; pausing unlocks `OrbitControls`; scrubbing while paused snaps camera | [3D & UI Specs](docs/DIORAMA_3D_AND_UI_SPECIFICATIONS.md) |
| 9 | **Instant Camera POV Cuts (0ms)** | Switching between `'scripted'`, `'free'`, and `'stage-pov'` cuts instantaneously on the next frame without disorienting transition lag | [3D & UI Specs](docs/DIORAMA_3D_AND_UI_SPECIFICATIONS.md) |
| 10 | **Directional Mannequins & Trails** | Character proxies render a torso column, head sphere, forward $+Z$ eye-visor wedge, ground chevron, and dashed floor movement trails | [3D & UI Specs](docs/DIORAMA_3D_AND_UI_SPECIFICATIONS.md) |
| 11 | **Resizable Split Workspace** | Draggable split divider ($18\%$–$82\%$) with 1-click header presets (`50/50`, `70/30 Stage`, `70/30 Video`, `100% Stage`) | [3D & UI Specs](docs/DIORAMA_3D_AND_UI_SPECIFICATIONS.md) |
| 12 | **Telemetry Capsule & Live YAML** | Bottom-right capsule copies formatted YAML (`target`, `distance`, `pitch`, `yaw`, `roll`, `lens`); YAML Drawer re-evaluates stage live without crashing | [3D & UI Specs](docs/DIORAMA_3D_AND_UI_SPECIFICATIONS.md) |
| 13 | **Dual-Tier Storage & Deferred Invalidation** | Scores & drafts persist in IndexedDB (`idb`); UI preferences in `localStorage`; local dropped videos remain in-memory only; YAML is SSOT; synchronous initializers must never discard stored pointers before asynchronous hydration completes | [Core Math Specs](docs/CORE_MATH_AND_SCORE_SPECIFICATIONS.md) |

---

## 4. Repository Structure & 5-Layer Architecture

Each layer depends only on the layers below it.

```text
stageflow/
├── AGENTS.md                        # Root governance, workflow rules & invariant router (< 24 KB)
├── CHANGELOG.md                     # Semantic version release log & unreleased change tracking
├── SPECIFICATION.md                 # Foundational product vision & system mechanics
├── README.md                        # Quickstart overview & CLI command reference
├── docs/                            # Detailed technical & architectural specifications (SSOT)
│   ├── YAML_AUTHORING_GUIDE.md      # Complete YAML score manual, syntax reference & recipes
│   ├── CORE_MATH_AND_SCORE_SPECIFICATIONS.md
│   ├── MEDIA_CLOCK_AND_SYNC_SPECIFICATIONS.md
│   └── DIORAMA_3D_AND_UI_SPECIFICATIONS.md
├── public/
│   └── scores/
│       ├── demo_blueprint.yaml      # Blueprint 01: Single-shot two-shot arc score
│       ├── blueprint_02_dialogue.yaml # Blueprint 02: 6-shot dialogue coverage flow
│       ├── blueprint_03_ball_pass.yaml # Blueprint 03: 30m 3-actor ball pass, parabolic arc & roll tracking
│       └── blueprint_04_cinematography_tutorial.yaml # Blueprint 04: 16-shot framing, movement, roll & offset tutorial
├── src/
│   ├── core/                        # Layer 1: Pure TypeScript Math, Optics & Stateless Frame Engine
│   │   ├── types.ts                 # Canonical interfaces (StageScore, ShotCue, ObserverShotCue, StageFrame)
│   │   ├── constants.ts             # Metric bounds, sensor constants, blueprint color palette
│   │   ├── opticsMath.ts            # Focal length (mm) <-> Vertical FOV (deg) & Rectangular Gate math
│   │   ├── sphericalMath.ts         # Degrees <-> Radians, Spherical <-> Cartesian, shortestAngleDiff
│   │   ├── maneuvers.ts             # 9 easing curves & 11 3D camera trajectory maneuvers
│   │   ├── entityEngine.ts          # Per-shot character blocking, look_at rotation & floor trails
│   │   ├── trajectoryChain.ts       # Forward pose chaining (P_0 -> P_k) & 32-point 3D path sampling
│   │   ├── frameEngine.ts           # Master stateless evaluator: computeStageFrame(t, score)
│   │   ├── scoreParser.ts           # Resilient YAML/JSON parser & degree/meter normalizer
│   │   ├── scoreCatalog.ts          # Bundled & custom scene score registry
│   │   └── storage/                 # Client persistence utilities
│   │       ├── scoreDb.ts           # IndexedDB persistence for score drafts & custom scenes (idb)
│   │       └── localStorageUi.ts    # Synchronous localStorage helpers for UI preferences
│   ├── media/                       # Layer 2: Universal Media Clock Drivers
│   │   ├── mediaTypes.ts            # MediaClockDriver interface & URL source classifier
│   │   ├── html5MediaDriver.ts      # Native <video> adapter for local MP4/WebM & dropped blobs
│   │   ├── youtubeMediaDriver.ts    # YouTube IFrame API adapter with 60fps drift extrapolation
│   │   └── proceduralMediaDriver.ts # 60fps virtual clock for procedural:// blueprint simulator
│   ├── hooks/                       # Layer 3: Dual-Tier State & Bridge Hooks
│   │   ├── useMediaClock.ts         # Transport controls, frame-stepping ([ / ]), loop-shot, hotkeys
│   │   ├── useStageFrameLoop.ts     # 60fps ref evaluation tick + ~10Hz throttled React UI sync
│   │   ├── useFileDropLoader.ts     # Drag-and-drop & file picker loader for .yaml and .mp4 pairs
│   │   └── useScorePersistence.ts   # Startup hydration, draft auto-saving & confirmed reset
│   ├── stage/                       # Layer 4: React Three Fiber 3D Blueprint Diorama
│   │   ├── DioramaCanvas.tsx        # Root R3F <Canvas>, lighting, fog, and priority -1 frame ticker
│   │   ├── BlueprintStageScene.tsx  # Shared lighting, metric floor grid, and mannequins
│   │   ├── BlueprintFloorGrid.tsx   # Metric floor grid (1m / 0.25m), perimeter frame & compass labels
│   │   ├── ObserverCameraRig.tsx    # Viewport PerspectiveCamera + OrbitControls handover & POV cuts
│   │   ├── StageCameraRig.tsx       # 3D camera prop, rectangular gate frustum, focus plane & path line
│   │   ├── StageCameraOffsetTether.tsx # 3D cyan anchor beacon & dashed tether line for target offsets
│   │   ├── StageCamViewRig.tsx      # Stage Camera POV lock controller for procedural monitor
│   │   ├── StageCamMonitorCanvas.tsx# True 3D Stage Cam monitor with optical safe-action HUD
│   │   ├── DirectionalMannequin.tsx # Stylized character/prop proxies with facing visor & floor trails
│   │   └── StageBillboardLabel.tsx  # Crisp 3D HTML floating identity badges
│   ├── ui/                          # Layer 5: 2D Directorial UI Shell
│   │   ├── WorkspaceHeader.tsx      # Scene selector, file upload, split presets & YAML drawer toggle
│   │   ├── ResizableSplitWorkspace.tsx # Draggable side-by-side split container
│   │   ├── UniversalVideoViewport.tsx  # Local video, YouTube IFrame, or 60fps Stage Cam Simulator
│   │   ├── ShotBreakdownHud.tsx     # Top-left active shot, lens, maneuver & staging note overlay
│   │   ├── CameraTelemetryCapsule.tsx  # Live degree/meter readout with 1-click YAML snippet copy
│   │   ├── DirectorialTransportBar.tsx # Shot-marker scrubber, shot chips, speed (0.25x-2x) & POV toggle
│   │   ├── YamlInspectorDrawer.tsx  # Slide-out live YAML editor with non-blocking syntax diagnostics
│   │   ├── ConfirmResetModal.tsx    # Accessible confirmation dialog modal for discarding drafts
│   │   └── StorageStatusBadge.tsx   # Visual status badge (Bundled vs. IndexedDB draft)
│   ├── App.tsx                      # Root application state wiring
│   ├── main.tsx                     # Application entry point
│   └── index.css                    # Tailwind CSS v4 + blueprint design tokens
└── tests/
    └── unit/                        # Vitest deterministic unit test suites
        ├── opticsMath.test.ts
        ├── sphericalMath.test.ts
        ├── frameEngine.test.ts
        ├── scoreParser.test.ts
        └── storage.test.ts
```

---

## 5. Tooling, Verification & Testing Policy

Every change—whether in core math, media drivers, 3D stage components, or UI—must pass all three automated verification gates before completion:

| Gate | Command | Requirement |
| :--- | :--- | :--- |
| **1. Unit Tests** | `npm test` | All Vitest unit suites in `tests/unit/` must pass. New math/parser/engine features require unit tests. |
| **2. Build & Typecheck** | `npm run build` | `tsc -b && vite build` must pass with **zero TypeScript errors**. |
| **3. Linter** | `npm run lint` | `oxlint` must report **0 warnings and 0 errors**. |
| **4. Dev Server** | `npm run dev` | Local interactive verification on `http://localhost:5173`. |

### Pre-Delivery Audit Checklist
Before reporting completion of any task:
1. Run `npm test`, `npm run build`, and `npm run lint`.
2. Verify that no monolithic files were introduced and layer boundaries remain pure.
3. Audit [`AGENTS.md`](AGENTS.md) and [`docs/*.md`](docs/) against the current state of the app and update any affected specifications or file maps.
4. Record granular change bullets in [`CHANGELOG.md`](CHANGELOG.md) under `## [Unreleased]` based directly on pending diffs (`git diff HEAD`).
5. Run `git status` and `git diff HEAD` and provide a ready-to-copy Conventional Commit message.
