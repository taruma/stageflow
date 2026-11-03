/**
 * Synchronous local storage accessors for StageFlow UI preferences.
 * Safely handles environments where localStorage is disabled or restricted.
 */

import type { SplitPreset } from '../../ui/WorkspaceHeader';

const STORAGE_KEYS = {
  SPLIT_PRESET: 'stageflow:ui:split-preset',
  DRAWER_OPEN: 'stageflow:ui:yaml-drawer-open',
  ACTIVE_SCENE_ID: 'stageflow:ui:active-scene-id',
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
