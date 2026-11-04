---
name: scene-score-decoder
description: >-
  Decode a Vector Film scene video into a deterministic StageFlow 3D choreography score (*.yaml).
  Follows a strict Video-First workflow: (1) natively watch the .mp4 video first via read_file as
  SSOT, (2) enrich with scene.md, casting.md, and cast reference portraits, and (3) verify exact
  cut timings and Left/Right camera angles using cached PySceneDetect CSVs and FFmpeg keyframes
  in vector-film/_dropbox/_stageflow/. Outputs YAML in chat and _dropbox without touching tracked repo files.
---

# Scene-Score-Decoder: Vector Film to StageFlow 3D Choreography Compiler

This skill decodes a produced **Vector Film** scene into a 100% schema-valid **StageFlow YAML Choreography Score (`*.yaml`)** synchronized to the scene's YouTube stream.

---

## 1. Non-Negotiable Core Mandates

1. **Video-First Native Inspection (`read_file` on `.mp4` First — Video is SSOT)**:
   - **Step 1 is ALWAYS watching the video**: Before reading `scene.md` or `casting.md`, call `read_file` directly on the scene's `.mp4` video file (`e:/_github/vector-film/films/...`).
   - Watching the video first prevents script confirmation bias and grounds your understanding in what actually happens on screen: room geometry, number of subjects, camera motion, posture changes, and editorial rhythm.
   - Whenever `scene.md` prose diverges from the rendered video (cut timing, framing size, camera movement, or character blocking), **the video is the Single Source of Truth (SSOT) and always wins**.

2. **Mandatory Visual Character Recognition (`read_file` on Cast Portraits)**:
   - In Vector Film, **Troupe Actors are global (`cast/<ACTOR>/`) while Character Roles are local to a scene/universe** (e.g., Chef "Mark" in *Table Four* is portrayed by troupe actor `UMA`; Patron "Robert" is portrayed by `ROBBIE`).
   - After watching the video and reading `scene.md` + `casting.md`, call `read_file` on each participating actor's reference portrait (`cast/<ACTOR>/reference.jpg` or `.png`), any declared alternate look image (`cast/<ACTOR>/looks/look-XX-slug/...`), and the scene's cover image (`assets/covers/...`) to bind every face seen in the video to the exact character ID.

3. **Organized, Cache-First Workspace in `vector-film/_dropbox/_stageflow/`**:
   - **NEVER** create or modify tracked files inside `stageplay/` (such as `src/scores/`) or `vector-film/` during decoding.
   - Store all extracted cut lists, verification keyframes, and downloadable YAML outputs inside the git-ignored `_dropbox` folder using a deterministic per-scene directory keyed by `<SCENE-ID>-<slug>`:
     ```text
     e:/_github/vector-film/_dropbox/_stageflow/<SCENE-ID>-<slug>/
     ├── scenes.csv                         # PySceneDetect detect-adaptive cut table
     ├── <SCENE-ID>-<slug>.yaml             # Compiled StageFlow YAML score
     └── frames/                            # FFmpeg high-res verification frames
         ├── shot_01_mid.jpg
         ├── shot_02_start.jpg
         ├── shot_02_end.jpg
         └── ...
     ```
   - **Cache-First Lookup**: Before running `scenedetect` or `ffmpeg`, always check if `e:/_github/vector-film/_dropbox/_stageflow/<SCENE-ID>-<slug>/` already contains `scenes.csv` and `frames/`. If they already exist from an earlier run of the same video, **reuse them immediately** and only extract additional `ffmpeg` timestamps if a specific new frame is needed.
   - *(Authorization Note)*: While `vector-film` canon files are strictly read-only, read-only invocation of `scenedetect` and `ffmpeg` against `vector-film/films/*.mp4` writing into `vector-film/_dropbox/_stageflow/` is explicitly authorized for StageFlow decoding.

4. **`video:` Key Must Use the YouTube URL**:
   - The root `video:` key in the generated YAML score MUST be set to the canonical `video_url` from `scene.md` frontmatter (e.g., `video: "https://www.youtube.com/watch?v=..."`).

5. **StageFlow Schema & Coordinate Discipline**:
   - Consult [`docs/YAML_AUTHORING_GUIDE.md`](../../../docs/YAML_AUTHORING_GUIDE.md) and [`docs/CORE_MATH_AND_SCORE_SPECIFICATIONS.md`](../../../docs/CORE_MATH_AND_SCORE_SPECIFICATIONS.md).
   - **Units**: Metric meters (`1 unit = 1.0m`), human degrees (`pitch`, `yaw`, `roll`, `rotation`), decimal seconds (`start`, `end`, `duration`), and full-frame focal lengths (`18mm` to `135mm`).
   - **Decoupled Cameras**: `shots:` contains only `stage_camera` and `entities`. The diorama viewport camera is defined at root `stage.observer_camera` (and optional root `observer_shots:`). Never nest `observer_camera` inside `shots:`.

---

## 2. Step-by-Step Execution Protocol

### Phase 1: Watch the Video First (Native Multimodal Inspection)

1. **Resolve the Video Path**:
   - Locate the target `.mp4` in `e:/_github/vector-film/films/<universe>/<video_file>.mp4` (or `films/00-fragments/<video_file>.mp4`).
2. **Native Video Viewing (`read_file`)**:
   - Call `read_file` directly on the `.mp4` file before reading any scene prose.
   - Observe and mentally note:
     - The physical environment, key furniture/props, and spatial layout of the subjects.
     - Where the subjects start at `t = 0.0s` and whether anyone stands up, sits down, or walks across the space.
     - Which shots are static holds vs. moving camera trajectories (dolly push-in, pullback, tracking, arc/orbit).

---

### Phase 2: Enrich with Studio Documents & Visual Cast Recognition

1. **Read Scene & Casting Metadata (`vector-film`)**:
   - For Episodic Universes: Read `multiverse/<universe>/scenes/<scene>.md` and `multiverse/<universe>/casting.md` (plus `characters/<name>.md` if needed).
   - For Autonomous Micro-Cinemas (`00-fragments`): Read `multiverse/00-fragments/<slug>/scene.md`, `casting.md`, and `visual-concept.md`.
   - Extract:
     - Persistent scene slug `<SCENE-ID>-<slug>` (matching the `cover` filename stem, e.g. `SCENE-01-01-intent-over-rules` or `FRAG-12-table-four`).
     - `title`, `runtime`, `video_url` (YouTube URL), `setting`, `cast`, actor-to-role mappings, and the verbatim dialogue table.

2. **Load Cast Visual Reference Portraits (`read_file`)**:
   - Call `read_file` on each participating actor's portrait in `e:/_github/vector-film/cast/<ACTOR>/reference.jpg` (or `.png`), any specific `looks/look-XX-slug/` image cited in `casting.md`, and the scene's `assets/covers/` image.
   - Match these ground-truth portraits to the people you watched in Phase 1 so every character identity, wardrobe layer, and prop interaction is 100% locked.

---

### Phase 3: Cache-First `scenedetect` Cuts & `ffmpeg` Left/Right Verification

1. **Check Existing Cache in `vector-film/_dropbox/_stageflow/<SCENE-ID>-<slug>/`**:
   - Define `CACHE_DIR = "e:/_github/vector-film/_dropbox/_stageflow/<SCENE-ID>-<slug>"`.
   - Check if `<CACHE_DIR>/scenes.csv` and `<CACHE_DIR>/frames/` already exist:
     - **If they exist**: Read `<CACHE_DIR>/scenes.csv` and list `<CACHE_DIR>/frames/` to reuse them directly.
     - **If they do not exist**:
       1. Create `<CACHE_DIR>/frames`.
       2. Run `PySceneDetect` (`detect-adaptive`) to generate `<CACHE_DIR>/scenes.csv`:
          ```powershell
          scenedetect -i "e:/_github/vector-film/<video_path>" detect-adaptive list-scenes -o "<CACHE_DIR>" -f scenes.csv
          ```
       3. Parse `scenes.csv` for exact `[start, end]` decimal-second cut boundaries. *(If fast motion or a subtle dissolve caused `detect-adaptive` to miss or over-split a cut you saw in Phase 1, sample around that timestamp with `ffmpeg` to lock the true cut boundary.)*
       4. Extract high-resolution verification frames into `<CACHE_DIR>/frames/`:
          - For every shot $k$, extract the midpoint frame `t_mid = (start + end) / 2`:
            ```powershell
            ffmpeg -hide_banner -loglevel error -ss <t_mid> -i "e:/_github/vector-film/<video_path>" -frames:v 1 -q:v 2 "<CACHE_DIR>/frames/shot_<k>_mid.jpg"
            ```
          - For shots longer than `2.5s` or shots where you observed camera/actor motion in Phase 1, also extract `shot_<k>_start.jpg` (`start + 0.15s`) and `shot_<k>_end.jpg` (`end - 0.15s`).

2. **Inspect Extracted Frames via `read_file` for Final Spatial & Left/Right Verification**:
   - Establish the 3D World Stage at `t = 0.0s` (`-X` = Stage Left, `+X` = Stage Right, `+Z` = Downstage/Front, `-Z` = Upstage/Back; entity `rotation`: `0°` = `+Z`, `+90°` = `+X`, `-90°` = `-X`, `180°` = `-Z`).
   - For each shot's extracted `.jpg` frame(s), verify:
     1. **Anatomical Flank Check (Eliminates Left/Right Flips)**:
        - Does the lens see the subject's **anatomical RIGHT cheek/ear/shoulder**? $\longrightarrow$ Camera sits on the subject's **Right Flank**.
        - Does the lens see the subject's **anatomical LEFT cheek/ear/shoulder**? $\longrightarrow$ Camera sits on the subject's **Left Flank**.
        - Map `Subject World rotation` + `Visible Flank` to StageFlow `yaw`:
          | Subject World `rotation` | Camera Directly in Front | Camera on Subject's **Right Flank** (Sees Right Ear/Cheek) | Camera on Subject's **Left Flank** (Sees Left Ear/Cheek) | Camera Directly Behind Back |
          | :--- | :---: | :---: | :---: | :---: |
          | **Facing `+90°` (`+X` Stage Right)** | `yaw: 90°` | **`yaw: +15° to +75°`** (`+Z` Downstage side) | **`yaw: +105° to +165°`** (`-Z` Upstage side) | `yaw: -90°` |
          | **Facing `-90°` (`-X` Stage Left)** | `yaw: -90°` | **`yaw: -105° to -165°`** (`-Z` Upstage side) | **`yaw: -15° to -75°`** (`+Z` Downstage side) | `yaw: +90°` |
          | **Facing `0°` (`+Z` Downstage)** | `yaw: 0°` | **`yaw: -15° to -75°`** (`-X` Stage Left side) | **`yaw: +15° to +75°`** (`+X` Stage Right side) | `yaw: 180°` |
          | **Facing `180°` (`-Z` Upstage)** | `yaw: 180°` | **`yaw: +105° to +165°`** (`+X` Stage Right side) | **`yaw: -105° to -165°`** (`-X` Stage Left side) | `yaw: 0°` |
     2. **Decouple 2D Lead Room from 3D `yaw`**: Do not flip `yaw` because a subject sits on the left or right third of the 2D frame; use `target_offset: [dx, dy, dz]` for compositional lead room or seated eye-line drops (`[0, -0.30, 0]`).
     3. **Framing Size to Optical `lens` & `distance`**:
        - EWS: `24mm` (`6.0m–8.5m`) | WS: `28mm–35mm` (`4.2m–5.8m`) | MFS/Two-Shot: `35mm–50mm` (`3.0m–4.0m`) | MS: `50mm` (`2.4m–3.0m`) | OTS: `50mm–85mm` (`2.2m–2.8m`) | MCU: `50mm–85mm` (`1.7m–2.2m`) | CU/Insert: `85mm–100mm` (`1.1m–1.6m`).
     4. **Start vs. End Frame Motion Check**: Compare `_start.jpg` and `_end.jpg` to verify dolly push/pull distances, arc/orbit directions (`cw` vs `ccw`), and actor movement paths (`from` $\to$ `position`).

---

### Phase 4: Score Compilation & Delivery

1. **Compile Complete StageFlow YAML**:
   - Root header: `version: "1.0"`, `id`, `title`, `subtitle`, `video: "<youtube_url>"`, `aspect_ratio: "16:9"`, `duration`.
   - `stage:`: `width`, `depth`, `grid_step: 1`, wide decoupled `observer_camera`, baseline `stage_camera`.
   - `entities:`: Characters (`"#38bdf8"`, `"#a78bfa"`, `"#34d399"`, `"#fb7185"`) and key props (`"#94a3b8"`, `"#f59e0b"`).
   - `shots:`: Contiguous `[start, end]` cuts, descriptive `label`, dialogue/action `description`, `stage_camera`, and per-shot `entities` (`look_at`, `highlighted`, `position`).
   - Optional `observer_shots:`: Smooth macro diorama orbits spanning across cuts.

2. **Save to `_dropbox/_stageflow/` & Present in Chat**:
   - Write the final YAML score to `e:/_github/vector-film/_dropbox/_stageflow/<SCENE-ID>-<slug>/<SCENE-ID>-<slug>.yaml`.
   - Output in chat:
     1. A concise **Shot & Vantage Verification Table** (`Shot #`, `Timecode`, `Subject & Framing`, `Visible Flank`, `Lens / Distance / Yaw`).
     2. A clickable link to the downloadable YAML file in `_dropbox/_stageflow/<SCENE-ID>-<slug>/<SCENE-ID>-<slug>.yaml`.
     3. The complete ```` ```yaml ```` score block ready to paste into StageFlow's **`[ YAML Score ]`** Live Drawer.
