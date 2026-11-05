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
} from '../../src/core/storage/localStorageUi';

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
});

import { isBundledSceneId, generateBlankScoreYaml } from '../../src/core/scoreCatalog';
import { parseStageScore } from '../../src/core/scoreParser';

describe('scoreCatalog — Bundled Presets & Blank Project Generator', () => {
  it('correctly identifies bundled scene IDs and custom scene IDs', () => {
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
