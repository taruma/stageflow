# Universal Media Clock & Dual-Tier Synchronization Specifications

This document is the authoritative technical specification for **Layer 2 (`src/media/`)** and **Layer 3 (`src/hooks/`)** in **Stageplay**. It is governed by [`AGENTS.md`](../AGENTS.md).

---

## 1. Universal `MediaClockDriver` Contract (`src/media/mediaTypes.ts`)

To guarantee 100% behavioral parity whether the user is analyzing a local `.mp4`/`.webm` file, a YouTube link, or a zero-asset procedural blueprint scene, the 3D diorama and transport controls never couple directly to a raw `<video>` tag. Instead, they interact strictly through [`MediaClockDriver`](../src/media/mediaTypes.ts):

```typescript
export interface MediaClockDriver {
  readonly kind: 'html5' | 'youtube' | 'procedural';
  isReady(): boolean;
  isPlaying(): boolean;
  getCurrentTime(): number; // Frame-accurate in seconds at 60fps
  getDuration(): number;    // Total duration in seconds
  getPlaybackRate(): number;
  isMuted(): boolean;
  play(): Promise<void>;
  pause(): void;
  seek(timeSec: number): void;
  setPlaybackRate(rate: number): void;
  setMuted(muted: boolean): void;
  destroy(): void;
}
```

### Automatic Source Classification (`classifyMediaSource`)
[`classifyMediaSource(rawUrl)`](../src/media/mediaTypes.ts) inspects `score.videoUrl` (or user-supplied override URLs):
1. **YouTube (`'youtube'`)**: Matches `youtube.com/watch?v=<id>`, `youtu.be/<id>`, `youtube.com/embed/<id>`, `youtube.com/shorts/<id>`, or raw 11-character video IDs via `extractYouTubeId()`.
2. **Procedural Simulator (`'procedural'`)**: Matches `procedural://...` or empty strings.
3. **HTML5 Video (`'html5'`)**: Matches local relative paths (`/media/...`), full HTTP video URLs, and drag-and-dropped local file `blob:` URLs.

---

## 2. Pluggable Media Drivers (`src/media/`)

### 2.1 `Html5MediaDriver` (`html5MediaDriver.ts`)
- Binds directly to the mounted `<video>` element in [`UniversalVideoViewport.tsx`](../src/ui/UniversalVideoViewport.tsx).
- Reads `video.currentTime` synchronously at 60fps and forwards native `play`, `pause`, `loadedmetadata`, `ratechange`, and `ended` events.

### 2.2 `YouTubeMediaDriver` & 60fps Drift-Corrected Extrapolation (`youtubeMediaDriver.ts`)
- Dynamically loads `https://www.youtube.com/iframe_api` via a singleton promise and mounts an chromeless player (`controls: 0`, `disablekb: 1`, `modestbranding: 1`, `rel: 0`, `playsinline: 1`).
- **Solving IFrame `postMessage` Polling Latency**:
  - Because YouTube's `player.getCurrentTime()` updates over an asynchronous `postMessage` bridge at ~10–15Hz, reading it raw at 60fps would cause visible camera stepping.
  - `YouTubeMediaDriver` solves this via **high-resolution clock extrapolation**:
    1. Whenever `player.getCurrentTime()` reports a new timestamp (`Math.abs(rawYtTime - lastPolledYtTime) > 0.001`), it re-anchors `anchorVideoTimeSec = rawYtTime` and `anchorPerfTimeMs = performance.now()`.
    2. On intermediate 60fps animation frames while playing, `getCurrentTime()` returns:
       $$t_{\text{extrapolated}} = \text{anchorVideoTimeSec} + \frac{\text{performance.now()} - \text{anchorPerfTimeMs}}{1000} \times \text{playbackRate}$$
    3. When `seek(targetSec)` is invoked (e.g. scrubbing while paused or frame-stepping), `anchorVideoTimeSec` updates **synchronously on the same call stack** before `player.seekTo(targetSec, true)` is dispatched, giving the 3D diorama **0ms scrub latency**.

### 2.3 `ProceduralMediaDriver` (`proceduralMediaDriver.ts`)
- Pure `performance.now()` virtual clock used by `procedural://` blueprint scenes.
- Paired with a 60fps 2D optical monitor canvas in [`UniversalVideoViewport.tsx`](../src/ui/UniversalVideoViewport.tsx) that projects the scene entities from the Stage Camera's exact POV with a rule-of-thirds safe-action reticle and live lens telemetry strip.

---

## 3. Dual-Tier 60fps Render & State Architecture (`src/hooks/useStageFrameLoop.ts`)

To maintain locked 60fps rendering in Three.js without triggering React component tree reconciliation on every animation frame, Stageplay enforces a strict **Two-Tier State Engine**:

```mermaid
sequenceDiagram
    participant R3F as R3F useFrame (60fps)
    participant Loop as useStageFrameLoop
    participant Core as computeStageFrame(t)
    participant Three as Three.js Rigs (StageCam / Mannequins / ObserverCam)
    participant UI as React 2D UI (~10Hz Throttled)

    R3F->>Loop: evaluateTick60fps() (Priority -1)
    Loop->>Core: computeStageFrame(driver.getCurrentTime(), score)
    Core-->>Loop: nextFrame (StageFrame)
    Loop->>Loop: Mutate frameRef.current = nextFrame
    R3F->>Three: Read frameRef.current & mutate Object3D transforms directly
    alt Every >= 95ms OR Shot Changed OR Paused/Seeked
        Loop->>UI: setUiSnapshot({ timestampSec, frame, liveViewportPose })
    end
```

1. **Tier 1 — Imperative 60fps Ref Path (`frameRef`, `liveViewportPoseRef`)**:
   - Inside [`DioramaCanvas.tsx`](../src/stage/DioramaCanvas.tsx), `FrameLoopTicker` runs at `useFrame` priority `-1`, calling `evaluateTick60fps()` once per animation frame.
   - [`ObserverCameraRig`](../src/stage/ObserverCameraRig.tsx), [`StageCameraRig`](../src/stage/StageCameraRig.tsx), and [`DirectionalMannequin`](../src/stage/DirectionalMannequin.tsx) read `frameRef.current` inside their own `useFrame` hooks and mutate `THREE.Group` / `THREE.PerspectiveCamera` transforms directly in memory.
2. **Tier 2 — Throttled ~10Hz React UI Snapshot (`uiSnapshot`)**:
   - `setUiSnapshot` is throttled to fire at most once every `95ms` during continuous playback, or immediately whenever a shot boundary is crossed, playback pauses, the user scrubs/steps frames (`forceSyncUi()`), or the camera POV mode is toggled.

---

## 4. Transport Controls & Keyboard Shortcuts (`src/hooks/useMediaClock.ts`)

| Action | UI Control | Keyboard Shortcut | Behavior |
| :--- | :--- | :--- | :--- |
| **Play / Pause** | Play / Pause Button | `Space` | Toggles active `MediaClockDriver` playback; restarts from `0.0s` if at end. |
| **Frame Step Back** | `< [` Button | `[` | Pauses playback and seeks backward by $-\frac{1}{30}\text{s}$ (`-33.3ms`). |
| **Frame Step Forward** | `] >` Button | `]` | Pauses playback and seeks forward by $+\frac{1}{30}\text{s}$ (`+33.3ms`). |
| **Skip $\pm 1\text{s}$ / $\pm 5\text{s}$** | Scrubber Bar | `ArrowLeft` / `ArrowRight` (`+Shift` for $5\text{s}$) | Seeks $\pm 1\text{s}$ (or $\pm 5\text{s}$ with `Shift`) and increments `lastManualSeekIdRef`. |
| **Playback Speed** | `0.25x`, `0.5x`, `1x`, `2x` | — | Adjusts `playbackRate` across HTML5, YouTube, and Procedural drivers. |
| **Loop Active Shot** | `Loop Shot` Toggle | — | Automatically seeks back to `activeShot.startSec` when reaching `activeShot.endSec`. |
