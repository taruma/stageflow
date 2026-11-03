\# Project Specification: 3D Scene \& Camera Choreography Diorama



\## 1. Vision \& Objective

Build a standalone web application that synchronizes an HTML5 video player with an interactive 3D diorama. The 3D scene illustrates spatial staging—where subjects/props are positioned and where the camera is placed and moving—at every moment of the video.



This project is a next-generation evolution of the orchestration engine in `taruma-film`. Rather than copying the previous project's 2D canvas projection verbatim, we are adapting its best architectural patterns (declarative YAML scores, stateless time evaluation, and spherical camera maneuvers) into a cleaner, modular \*\*Three.js / React Three Fiber\*\* foundation designed for long-term extensibility.



\---



\## 2. Architectural Heritage (What to Adapt from `taruma-film`)

Explore `taruma-film` to extract, refine, and modernize these core systems:

1\. \*\*Stateless Functional Timeline (`Frame\_t = f(t)`):\*\*

&#x20;  - Given any timestamp `t`, the engine deterministically computes the complete state of the 3D stage (camera poses, active shot, highlighted actors, movement paths) without relying on stateful event queues or external tweening libraries.

2\. \*\*Spherical Camera Coordinate \& Maneuver System:\*\*

&#x20;  - Adapt the `{ target, distance, pitch, yaw, roll }` camera model, shortest-angle unwrapping, and declarative maneuvers (`cut`, `dolly`, `arc`, `swoop`, `orbit`, `spline`, etc.) so they drive Three.js objects and cameras cleanly.

3\. \*\*Authoritative Media Clock \& Free-Orbit Handover:\*\*

&#x20;  - Sync the 60fps render loop directly to the video element's playback clock.

&#x20;  - Preserve the interactive camera handover: when the video plays, the scripted Observer Camera drives the viewport; when the user pauses the video, the scripted lock releases so the user can freely orbit, pan, and inspect the frozen 3D setup; when scrubbing while paused, the viewport updates to match the scrubbed timestamp.



\---



\## 3. Core System Mechanics



\### 3.1 Dual-Camera Architecture

Every frame evaluates two distinct camera roles inside the 3D scene:

1\. \*\*The Observer Camera (Viewport Camera):\*\*

&#x20;  - The main Three.js camera through which the user views the diorama.

&#x20;  - Controlled by the timeline's observer camera track during playback, and handed over to `OrbitControls` when paused.

2\. \*\*The Stage Camera (Illustrative 3D Camera Object):\*\*

&#x20;  - A visible 3D camera prop inside the diorama that illustrates where the shot is being filmed from and what it is pointing at.

&#x20;  - Includes a simple visual sight-line / view cone (frustum illustration) projecting toward its target so the user can clearly see the framing direction and coverage area.

&#x20;  - Can cut instantly between positions on shot changes or move smoothly along a trajectory path (using the same maneuver math as the Observer Camera).

&#x20;  - Optionally renders a visible trajectory path line in 3D space when performing a moving shot.



\### 3.2 Simple 3D Stage \& Proxy Entities

\- The 3D scene consists of a clean spatial reference ground (e.g., grid/stage floor) and configurable 3D proxy objects representing characters, props, or set pieces.

\- Entities are defined declaratively in the score/config (ID, label, position, rotation, basic mesh/model type) and can be highlighted or animated across cues.

\- Floating labels identify key subjects and the active camera in 3D space.



\### 3.3 Declarative Choreography Schema (YAML / JSON)

Design a clean, human-readable score format inspired by `taruma-film`'s YAML scores:

\- \*\*Scene Definition:\*\* Video source, stage dimensions, and a list of scene entities (actors, props, markers) with their base 3D transforms.

\- \*\*Shot / Cue Timeline:\*\* Time-bounded blocks (`start`, `end`, `label`, `description`) containing:

&#x20; - `stage\_camera`: Position/target or maneuver config for the illustrative 3D camera inside the scene, plus simple cone/coverage settings.

&#x20; - `observer\_camera`: Spherical pose and maneuver config for the user's viewport camera.

&#x20; - `entities` (optional): Per-shot position overrides, movements, or visual highlights for subjects in the scene.

&#x20; - `continuous` (optional): Opt-in flag (`continuous: true`) enabling automatic contiguous shot chaining where shots omitting `start` inherit the previous shot's `end` timestamp (`shots[0]` defaults to `0.0`). Deliberate gaps via explicit `start:` are preserved.

&#x20; - `observer_shots` (optional): Root-level decoupled viewport timeline for diorama moves (start, end, maneuver, target, distance, pitch, yaw, lens) that span smoothly across multiple film cuts with complete precedence over per-shot cues. Overlapping shots prioritize the latest declaration in the YAML structure.



\---



\## 4. Layout \& User Interface (Simple \& Generic)

Keep the visual styling clean, minimal, and functional so the focus remains on spatial clarity and smooth playback:



1\. \*\*Main Workspace Layout:\*\*

&#x20;  - \*\*Video Panel:\*\* Clean video viewport displaying the source footage (collapsible or resizable side-by-side / stacked layout).

&#x20;  - \*\*3D Diorama Viewport:\*\* Interactive Three.js canvas occupying the primary workspace, showing the floor grid, subject proxies, floating labels, and the illustrative Stage Camera with its view cone.

2\. \*\*Minimal Info Overlay:\*\*

&#x20;  - Simple HUD badge displaying the current shot number/name, active maneuver type, and brief staging note.

3\. \*\*Timeline \& Transport Bar:\*\*

&#x20;  - Bottom transport controls: Play/Pause, current timecode, total duration, and an interactive timeline scrubber with visual markers indicating shot cuts.

&#x20;  - Camera Mode Toggle: Quick toggle to let the user switch between "Scripted Observer View", "Free Orbit View" (even while playing), and "Stage Camera POV" (looking through the illustrative camera itself).

4\. \*\*Inspector / Authoring Helper (Dev Utility):\*\*

&#x20;  - A lightweight panel or readout displaying current camera coordinates (`target`, `distance`, `pitch`, `yaw`, `roll`) with a one-click copy button to make authoring YAML cues fast and intuitive.



\---



\## 5. Engineering Priorities for the New Repo

\- \*\*Modularity:\*\* Decouple the core timeline \& math engine (`core/`) from the Three.js rendering components (`stage/`) and the React UI shell (`ui/`).

\- \*\*Zero-Drift Determinism:\*\* Ensure scrubbing forward, backward, or jumping across shots always produces the exact same 3D state for any timestamp `t`.

\- **Extensibility:** Keep entity types and camera maneuvers pluggable so future iterations can easily swap basic 3D proxies for custom `.glb` models or add new choreography tracks.

---

## 6. Client-Side Persistence Architecture

To ensure user edits are preserved without risk of exceeding browser quotas or leaking large binary media files into storage, StageFlow uses a **Dual-Tier Persistence Engine**:

1. **IndexedDB (via `idb`):**
   - Automatically persists live YAML choreography score drafts and imported custom scenes to the `'scores'` store in `stageflow-db`.
   - Work is retained across browser refreshes and tab closures.
   - Resetting a scene requires explicit confirmation via `ConfirmResetModal` before deleting the draft and reverting to the bundled baseline.
2. **Synchronous `localStorage`:**
   - Retains lightweight UI and layout preferences (`splitPreset`, `isYamlDrawerOpen`, `activeSceneId`).
   - Hydrated synchronously on mount to eliminate layout shifts or UI flicker.
3. **In-Memory Ephemeral Video Policy:**
   - Heavy local video files (`.mp4`, `.webm`) dropped by the user are handled purely as session memory `blob:` URLs and are **never** persisted to `IndexedDB` or `localStorage`.
   - Reloading the page or switching scenes reverts to the score's authoritative video source (`videoUrl` in YAML) or the procedural stage cam simulator.
4. **YAML Video Authority:**
   - The YAML choreography score is the single source of truth for video playback. Both string formats (`video: "https://..."`) and structured objects (`video: { src: "...", aspect_ratio: "16:9" }`) are parsed robustly. Editing or changing the video property in YAML immediately clears any local drop override.

