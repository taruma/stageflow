/**
 * Synchronous local storage accessors for StageFlow UI preferences.
 * Safely handles environments where localStorage is disabled or restricted.
 */

import type { LabelDisplayMode, SplitPreset } from '../types';

const STORAGE_KEYS = {
  SPLIT_PRESET: 'stageflow:ui:split-preset',
  DRAWER_OPEN: 'stageflow:ui:yaml-drawer-open',
  ACTIVE_SCENE_ID: 'stageflow:ui:active-scene-id',
  LABEL_MODE: 'stageflow:ui:label-mode',
  VIEWFINDER_GUIDES: 'stageflow:ui:viewfinder-guides',
} as const;

export function loadStoredSplitPreset(): SplitPreset | null {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.SPLIT_PRESET);
    if (
      val === '50-50' ||
      val === '30-70' ||
      val === '70-30' ||
      val === '0-100'
    ) {
      return val;
    }
  } catch {
    // Ignore localStorage access restrictions (e.g. sandboxed iframes)
  }
  return null;
}

export function saveStoredSplitPreset(preset: SplitPreset): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SPLIT_PRESET, preset);
  } catch {
    // Ignore storage quota or access errors
  }
}

export function loadStoredYamlDrawerOpen(): boolean | null {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.DRAWER_OPEN);
    if (val === 'true') return true;
    if (val === 'false') return false;
  } catch {
    // Ignore localStorage access restrictions
  }
  return null;
}

export function saveStoredYamlDrawerOpen(isOpen: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DRAWER_OPEN, String(isOpen));
  } catch {
    // Ignore storage quota or access errors
  }
}

export function loadStoredActiveSceneId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_SCENE_ID);
  } catch {
    // Ignore localStorage access restrictions
  }
  return null;
}

export function saveStoredActiveSceneId(sceneId: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SCENE_ID, sceneId);
  } catch {
    // Ignore storage quota or access errors
  }
}

export function loadStoredLabelMode(): LabelDisplayMode | null {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.LABEL_MODE);
    if (val === 'all' || val === 'camera-only' || val === 'off') {
      return val;
    }
  } catch {
    // Ignore localStorage access restrictions
  }
  return null;
}

export function saveStoredLabelMode(mode: LabelDisplayMode): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LABEL_MODE, mode);
  } catch {
    // Ignore storage quota or access errors
  }
}

export function loadStoredViewfinderGuides(): boolean | null {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.VIEWFINDER_GUIDES);
    if (val === 'true') return true;
    if (val === 'false') return false;
  } catch {
    // Ignore localStorage access restrictions
  }
  return null;
}

export function saveStoredViewfinderGuides(showGuides: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.VIEWFINDER_GUIDES, String(showGuides));
  } catch {
    // Ignore storage quota or access errors
  }
}
