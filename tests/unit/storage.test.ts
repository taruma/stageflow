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

    saveStoredSplitPreset('70-30');
    expect(loadStoredSplitPreset()).toBe('70-30');

    saveStoredSplitPreset('0-100');
    expect(loadStoredSplitPreset()).toBe('0-100');

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
