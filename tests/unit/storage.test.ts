import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  loadStoredSplitPreset,
  saveStoredSplitPreset,
  loadStoredYamlDrawerOpen,
  saveStoredYamlDrawerOpen,
  loadStoredActiveSceneId,
  saveStoredActiveSceneId,
  loadStoredLabelMode,
  saveStoredLabelMode,
  loadStoredViewfinderGuides,
  saveStoredViewfinderGuides,
  loadStoredThemeMode,
  saveStoredThemeMode,
  loadStoredDioramaThemeMode,
  saveStoredDioramaThemeMode,
  loadStoredEditMode,
  saveStoredEditMode,
  loadStoredLeftSplitPct,
  saveStoredLeftSplitPct,
  loadStoredRightSplitPct,
  saveStoredRightSplitPct,
  loadStoredVideoHeightPct,
  saveStoredVideoHeightPct,
  loadStoredSubpanelCollapsed,
  saveStoredSubpanelCollapsed,
  loadStoredEditorWordWrap,
  saveStoredEditorWordWrap,
} from '../../src/core/storage/localStorageUi';
import { getDioramaThemeColors } from '../../src/stage/dioramaTheme';

describe('localStorageUi — Synchronous UI Preferences Persistence', () => {
  const memoryStore: Record<string, string> = {};

  beforeEach(() => {
    for (const key of Object.keys(memoryStore)) {
      delete memoryStore[key];
    }

    const mockStorage = {
      getItem: (key: string) => memoryStore[key] ?? null,
      setItem: (key: string, val: string) => {
        memoryStore[key] = val;
      },
      removeItem: (key: string) => {
        delete memoryStore[key];
      },
      clear: () => {
        for (const key of Object.keys(memoryStore)) delete memoryStore[key];
      },
    };

    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    for (const key of Object.keys(memoryStore)) {
      delete memoryStore[key];
    }
  });

  it('saves and loads valid split presets', () => {
    expect(loadStoredSplitPreset()).toBeNull();

    saveStoredSplitPreset('split');
    expect(loadStoredSplitPreset()).toBe('split');

    saveStoredSplitPreset('full');
    expect(loadStoredSplitPreset()).toBe('full');

    // Backward-compatible migration of legacy ratio presets
    globalThis.localStorage.setItem('stageflow:ui:split-preset', '70-30');
    expect(loadStoredSplitPreset()).toBe('split');

    globalThis.localStorage.setItem('stageflow:ui:split-preset', '0-100');
    expect(loadStoredSplitPreset()).toBe('full');

    // Invalid value fallback
    globalThis.localStorage.setItem('stageflow:ui:split-preset', 'invalid-preset');
    expect(loadStoredSplitPreset()).toBeNull();
  });

  it('saves and loads YAML drawer open state', () => {
    expect(loadStoredYamlDrawerOpen()).toBeNull();

    saveStoredYamlDrawerOpen(true);
    expect(loadStoredYamlDrawerOpen()).toBe(true);

    saveStoredYamlDrawerOpen(false);
    expect(loadStoredYamlDrawerOpen()).toBe(false);
  });

  it('saves and loads active scene ID pointer', () => {
    expect(loadStoredActiveSceneId()).toBeNull();

    saveStoredActiveSceneId('blueprint-02-dialogue');
    expect(loadStoredActiveSceneId()).toBe('blueprint-02-dialogue');
  });

  it('saves and loads label display mode with fallback', () => {
    expect(loadStoredLabelMode()).toBeNull();

    saveStoredLabelMode('camera-only');
    expect(loadStoredLabelMode()).toBe('camera-only');

    saveStoredLabelMode('off');
    expect(loadStoredLabelMode()).toBe('off');

    saveStoredLabelMode('all');
    expect(loadStoredLabelMode()).toBe('all');

    // Invalid value fallback
    globalThis.localStorage.setItem('stageflow:ui:label-mode', 'invalid-mode');
    expect(loadStoredLabelMode()).toBeNull();
  });

  it('saves and loads viewfinder composition guides toggle state', () => {
    expect(loadStoredViewfinderGuides()).toBeNull();

    saveStoredViewfinderGuides(true);
    expect(loadStoredViewfinderGuides()).toBe(true);

    saveStoredViewfinderGuides(false);
    expect(loadStoredViewfinderGuides()).toBe(false);
  });

  it('saves and loads theme mode with fallback', () => {
    expect(loadStoredThemeMode()).toBeNull();

    saveStoredThemeMode('dark');
    expect(loadStoredThemeMode()).toBe('dark');

    saveStoredThemeMode('warm');
    expect(loadStoredThemeMode()).toBe('warm');

    saveStoredThemeMode('light');
    expect(loadStoredThemeMode()).toBe('light');

    saveStoredThemeMode('auto');
    expect(loadStoredThemeMode()).toBe('auto');

    // Invalid fallback
    globalThis.localStorage.setItem('stageflow:ui:theme-mode', 'invalid-theme');
    expect(loadStoredThemeMode()).toBeNull();
  });

  it('saves and loads decoupled diorama theme mode with fallback', () => {
    expect(loadStoredDioramaThemeMode()).toBeNull();

    saveStoredDioramaThemeMode('dark');
    expect(loadStoredDioramaThemeMode()).toBe('dark');

    saveStoredDioramaThemeMode('match-app');
    expect(loadStoredDioramaThemeMode()).toBe('match-app');

    saveStoredDioramaThemeMode('warm');
    expect(loadStoredDioramaThemeMode()).toBe('warm');

    saveStoredDioramaThemeMode('light');
    expect(loadStoredDioramaThemeMode()).toBe('light');

    // Invalid fallback
    globalThis.localStorage.setItem('stageflow:ui:diorama-theme-mode', 'invalid-diorama');
    expect(loadStoredDioramaThemeMode()).toBeNull();
  });

  it('saves and loads 3-column studio layout dimensions and edit mode', () => {
    // Edit mode
    expect(loadStoredEditMode()).toBeNull();
    saveStoredEditMode(true);
    expect(loadStoredEditMode()).toBe(true);
    saveStoredEditMode(false);
    expect(loadStoredEditMode()).toBe(false);

    // Left split percentage
    expect(loadStoredLeftSplitPct()).toBeNull();
    saveStoredLeftSplitPct(32.5);
    expect(loadStoredLeftSplitPct()).toBe(32.5);
    // Invalid / out-of-range clamping check
    globalThis.localStorage.setItem('stageflow:ui:left-split-pct', '100');
    expect(loadStoredLeftSplitPct()).toBeNull();

    // Right split percentage
    expect(loadStoredRightSplitPct()).toBeNull();
    saveStoredRightSplitPct(28);
    expect(loadStoredRightSplitPct()).toBe(28);

    // Video height percentage
    expect(loadStoredVideoHeightPct()).toBeNull();
    saveStoredVideoHeightPct(45);
    expect(loadStoredVideoHeightPct()).toBe(45);

    // Subpanel collapsed state
    expect(loadStoredSubpanelCollapsed()).toBeNull();
    saveStoredSubpanelCollapsed(true);
    expect(loadStoredSubpanelCollapsed()).toBe(true);
    saveStoredSubpanelCollapsed(false);
    expect(loadStoredSubpanelCollapsed()).toBe(false);
  });

  it('persists and hydrates editor word wrap preference', () => {
    expect(loadStoredEditorWordWrap()).toBeNull();

    saveStoredEditorWordWrap(true);
    expect(loadStoredEditorWordWrap()).toBe(true);

    saveStoredEditorWordWrap(false);
    expect(loadStoredEditorWordWrap()).toBe(false);
  });

  it('provides distinct, valid hex colors for all diorama theme categories', () => {
    const darkColors = getDioramaThemeColors('dark');
    const warmColors = getDioramaThemeColors('warm');
    const lightColors = getDioramaThemeColors('light');

    expect(darkColors.bg).toBe('#0c0a09');
    expect(warmColors.bg).toBe('#f3efe6');
    expect(lightColors.bg).toBe('#f5f5f4');

    expect(darkColors.floorColor).toBe('#171514');
    expect(warmColors.floorColor).toBe('#faf7f0');
    expect(lightColors.floorColor).toBe('#ffffff');
  });
});

import { isBundledSceneId, generateBlankScoreYaml } from '../../src/core/scoreCatalog';
import { parseStageScore } from '../../src/core/scoreParser';

describe('scoreCatalog — Bundled Presets & Blank Project Generator', () => {
  it('correctly identifies bundled scene IDs and custom scene IDs', () => {
    expect(isBundledSceneId('vector-field-taruma-sakti')).toBe(true);
    expect(isBundledSceneId('demo-blueprint')).toBe(true);
    expect(isBundledSceneId('blueprint-02-dialogue')).toBe(true);
    expect(isBundledSceneId('blueprint-03-ball-pass')).toBe(true);
    expect(isBundledSceneId('blueprint-04-cinematography-tutorial')).toBe(true);
    expect(isBundledSceneId('blueprint-05-two-rooms')).toBe(true);

    expect(isBundledSceneId('the-expansion')).toBe(false);
    expect(isBundledSceneId('custom-project-123')).toBe(false);
    expect(isBundledSceneId('random-id')).toBe(false);
  });

  it('generates a valid, parseable blank choreography score', () => {
    const yaml = generateBlankScoreYaml('my-new-shot', 'My New Shot');
    expect(yaml).toContain('id: "my-new-shot"');
    expect(yaml).toContain('title: "My New Shot"');

    const result = parseStageScore(yaml, 'my-new-shot');
    expect(result.error).toBeNull();
    expect(result.score).not.toBeNull();
    expect(result.score?.id).toBe('my-new-shot');
    expect(result.score?.title).toBe('My New Shot');
    expect(result.score?.shots.length).toBeGreaterThan(0);
    expect(result.score?.entities.length).toBeGreaterThan(0);
  });
});
