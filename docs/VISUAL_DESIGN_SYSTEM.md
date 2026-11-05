# Visual Design System Specification

This document is the authoritative Single Source of Truth (SSOT) for the **Visual Design System**, styling tokens, typography, theme engine, and aesthetic invariants in **StageFlow**. It is governed by [`AGENTS.md`](../AGENTS.md) and pairs with [`docs/DIORAMA_3D_AND_UI_SPECIFICATIONS.md`](DIORAMA_3D_AND_UI_SPECIFICATIONS.md).

---

## 1. Design Philosophy & Creative Suite Parity

StageFlow is designed to feel like a high-end, tactile director's diorama and architectural blueprint desk. It aligns visually with its sister application **SceneFlow** (`Screenplay-Sync`), sharing:
- **Physical Stationery Aesthetic**: Tactile pill-shaped chrome, elevated surfaces with subtle shadows, and crisp division borders (`border-border-main`).
- **Quiet, Functional Restraint**: The interface steps back so that the universal video player, 3D spatial staging, camera frustums, and blocking trajectories remain the primary focus.
- **Instantaneous Responsiveness**: Theme swaps, split resizes, and camera cuts occur with **zero animation stutter and zero 60fps WebGL frame drops**.

---

## 2. Typographic Hierarchy

StageFlow pairs three distinct font families loaded in [`index.html`](../index.html) to establish an unmistakable editorial and technical hierarchy:

| Font Family | Classification | Role & Usage | Tailwind Class |
| :--- | :--- | :--- | :--- |
| **`Libre Baskerville`** | Editorial Serif | Key brand identity headings, modal titles, literary emphasis, and directorial titles | `font-serif` |
| **`Inter`** | Geometric Sans-Serif | Primary UI chrome, button labels, navigation pills, descriptions, and modal body text | `font-sans` |
| **`JetBrains Mono`** | Technical Monospace | Precision telemetry (degrees, meters, focal lengths), timecodes, shot badges, and live YAML score editing | `font-mono` |

---

## 3. App Shell Themes & CSS Variables (`src/index.css`)

The 2D application shell supports 4 distinct theme modes managed by [`useAppShellTheme.ts`](../src/hooks/useAppShellTheme.ts) and persisted in `localStorage` (`stageflow:ui:theme-mode`):

```text
stageflow:ui:theme-mode = 'dark' | 'warm' | 'light' | 'auto'
```

When set to `'auto'`, the active category dynamically follows the user's OS preference (`prefers-color-scheme`).

### Semantic Color Variables

All UI components reference semantic CSS custom properties defined in [`src/index.css`](../src/index.css):

| CSS Variable | Role & Application |
| :--- | :--- |
| `--app-bg` | Root application background beneath split viewports and headers |
| `--surface` | Elevated card surfaces (modals, dropdown menus, transport bar, video card) |
| `--surface-subtle` | Secondary surface fills (table rows, inactive pills, drawer sidebars) |
| `--surface-muted` | Muted background fills (disabled buttons, empty state backgrounds) |
| `--border-main` | Primary structural borders dividing viewports, cards, and modal headers |
| `--text-main` | High-contrast body text and prominent titles |
| `--text-muted` | Secondary labels, descriptions, and inactive tabs |
| `--text-subtle` | Monospace timestamps, telemetry sub-labels, and subtle captions |
| `--accent-primary` | Cinematic amber/cyan interactive focus, hover states, and active pills |

### Theme Palettes Matrix

| Theme Mode | Intent & Visual Atmosphere | `--app-bg` | `--surface` | `--border-main` |
| :--- | :--- | :--- | :--- | :--- |
| **`Dark`** (Default) | **Warm Obsidian Studio**: Low eye-strain, cinematic diorama contrast | `#0c0a09` | `#171514` | `#2c2825` |
| **`Warm`** | **Architectural Drafting Paper**: Ivory and cream stationery | `#f3efe6` | `#faf7f0` | `#dfd7c5` |
| **`Light`** | **Clean Warm Stone**: High-clarity editorial daylight | `#f5f5f4` | `#ffffff` | `#e7e5e4` |
| **`Pure Black`** | **OLED Blueprint Void**: Pitch black for pitch dark viewing environments | `#000000` | `#080808` | `#1f1f1f` |

---

## 4. Centralized `UI_TOKENS` (`src/ui/tokens/ui.ts`)

To prevent inline class duplication and ensure uniform physical stationery styling across all components, StageFlow centralizes its design tokens in [`src/ui/tokens/ui.ts`](../src/ui/tokens/ui.ts):

### 4.1 Layout Shells
- `UI_TOKENS.layout.appHeader`: 3-wing header bar with `relative z-30`, tactile bottom border, and theme-aware surface fill.
- `UI_TOKENS.layout.sectionTitle`: Monospace section title with tracking, uppercase formatting, and muted tone.
- `UI_TOKENS.layout.viewportContainer`: Rounded card frame (`rounded-2xl`) with subtle border and deep shadow.

### 4.2 Modal Dialogs
- `UI_TOKENS.modal.containerSm`, `.containerMd`, `.containerLibrary`: Standardized accessible modal wrappers with responsive width clamps, backdrop blur, and tactile borders.
- `UI_TOKENS.modal.header`: Title row with `Libre Baskerville` serif typography, status chips, and close button.
- `UI_TOKENS.modal.footer`: Bottom action row with secondary/primary button alignment.
- `UI_TOKENS.modal.backdrop`: Translucent dark backdrop (`bg-black/60 backdrop-blur-sm`).

### 4.3 Dropdowns & Menus
- `UI_TOKENS.dropdown.menu`: Floating elevated menu panel with tactile border and shadow.
- `UI_TOKENS.dropdown.header`: Monospace section category dividers.
- `UI_TOKENS.dropdown.item`: Interactive menu row with hover accent and icon slot.

### 4.4 Tactile Buttons & Pills
- `UI_TOKENS.button.actionPill`: Rounded pill (`rounded-full px-3 py-1 text-xs font-mono font-medium`) for primary triggers.
- `UI_TOKENS.button.filePill`: Stationery pill for `File ▾` and active score chips.
- `UI_TOKENS.button.libraryPop`: Distinct amber-accented library gateway button.
- `UI_TOKENS.button.segmentedGroup`: Segmented pill container for workspace layout and camera POV switchers.

---

## 5. Decoupled 3D Diorama Stage Palette (`src/stage/dioramaTheme.ts`)

### 5.1 Directorial Rationale
In film and choreography staging, users frequently prefer reading scripts, authoring notes, or browsing project files in a warm or light stationery interface while keeping the 3D diorama stage in a **high-contrast dark blueprint void**. Keeping the 3D void dark preserves:
1. Visibility of luminous camera cones, rectangular frustum gate lines, and target tether lines.
2. Distinct visual contrast for white eye-visor directional cones on character mannequins.
3. Uncluttered depth fog perception across the stage perimeter.

Therefore, the 3D Diorama Stage Theme is **strictly decoupled** from the 2D App Shell Theme and persisted independently via `localStorage` (`stageflow:ui:diorama-theme-mode`):

```text
stageflow:ui:diorama-theme-mode = 'dark' | 'match-app' | 'warm' | 'light'
```

- **`dark` (Default)**: Always preserves the obsidian blueprint diorama void regardless of whether the app shell is light or warm.
- **`match-app`**: Dynamically links the diorama floor to the active app shell theme category.
- **`warm`**: Sets the diorama floor to ivory architectural drafting paper.
- **`light`**: Sets the diorama floor to clean warm stone.

### 5.2 WebGL Dynamic Palette Evaluation

The active diorama colors are computed purely in JavaScript via [`getDioramaPalette(effectiveCategory)`](../src/stage/dioramaTheme.ts) and applied directly to R3F materials with **zero extra WebGL draw calls or shader passes**:

| Palette Element | Dark Mode | Warm Mode | Light Mode |
| :--- | :--- | :--- | :--- |
| **Clear Color / Background** | `#0c0a09` | `#f3efe6` | `#f5f5f4` |
| **Depth Fog (`16m`–`42m`)** | `#0c0a09` | `#f3efe6` | `#f5f5f4` |
| **Ground Plane Floor** | `#171514` | `#faf7f0` | `#ffffff` |
| **Primary Section Grid (1m)** | `#38bdf8` (Cyan) | `#b0a898` (Warm Grey) | `#a8a29e` (Stone Grey) |
| **Minor Sub-Grid (0.25m)** | `#1e293b` (Slate) | `#dfd7c5` (Subtle Ivory) | `#e7e5e4` (Subtle Stone) |
| **Stage Perimeter Frame** | `#0284c7` (Deep Cyan) | `#8c8270` (Muted Warm) | `#78716c` (Muted Stone) |
| **Axis Crosshair & Reticle** | `#0ea5e9` | `#78716c` | `#57534e` |

---

## 6. Performance & Interaction Invariants

### 6.1 Transition Freezing (`disableTransitionsTemporarily()`)
Changing themes across a heavy WebGL diorama and complex 2D UI tree can cause multi-frame CSS transition reflow lag. StageFlow eliminates this via `disableTransitionsTemporarily()` in [`src/hooks/useAppShellTheme.ts`](../src/hooks/useAppShellTheme.ts):
- Injects `.disable-theme-transitions * { transition: none !important; }` onto the root document for 1 animation frame during theme swaps.
- Guarantees instantaneous color swapping with **zero animation stutter and zero dropped frames**.

### 6.2 60fps Split Resize Performance (`body.is-resizing-split`)
When dragging the split workspace divider bar between the video player and 3D diorama:
- [`ResizableSplitWorkspace.tsx`](../src/ui/ResizableSplitWorkspace.tsx) adds `is-resizing-split` to `document.body`.
- This temporarily disables CSS transitions and suppresses iframe pointer interception (`pointer-events: none` on `<iframe />` elements).
- Eliminates pointer capture loss over YouTube iframes and maintains a locked **60fps divider resizing experience**.

### 6.3 Stacking Context Isolation & 3D Billboard Label Layering
To prevent Three.js Drei `<Html>` elements from colliding with or occluding 2D UI chrome:
- **Calibrated Z-Index Range**: [`StageBillboardLabel.tsx`](../src/stage/StageBillboardLabel.tsx) restricts `<Html>` depth sorting to `zIndexRange={[5, 0]}`. Closer 3D mannequins render above farther ones in 3D space, but remain strictly beneath 2D viewport HUDs (`z-10`) and bottom telemetry capsules (`z-20`).
- **Viewport Stacking Isolation**: The 3D diorama container in [`ResizableSplitWorkspace.tsx`](../src/ui/ResizableSplitWorkspace.tsx) enforces `isolation: isolate`, confining all 3D canvas HTML DOM projections inside a discrete stacking context.
- **Authoritative Studio Header**: The top header (`WorkspaceHeader.tsx`) enforces `relative z-30`, ensuring all navigation dropdowns (`File ▾`, `Color Themes ▾`) and modal overlays (`z-[100]`) render authoritatively above the 3D diorama canvas.
