/**
 * Custom hook managing 3D diorama display preferences (label display modes,
 * viewfinder composition guides) and global studio keyboard shortcuts ('L' / 'G').
 * Layer 3 hook.
 */

import { useState, useCallback, useEffect } from 'react';
import type { LabelDisplayMode } from '../core/types';
import {
  loadStoredLabelMode,
  loadStoredViewfinderGuides,
  saveStoredLabelMode,
  saveStoredViewfinderGuides,
} from '../core/storage/localStorageUi';

export function useStudioDisplaySettings() {
  const [labelMode, setLabelModeState] = useState<LabelDisplayMode>(
    () => loadStoredLabelMode() ?? 'all'
  );

  const [showGuides, setShowGuidesState] = useState<boolean>(
    () => loadStoredViewfinderGuides() ?? true
  );

  const handleSelectLabelMode = useCallback((mode: LabelDisplayMode) => {
    setLabelModeState(mode);
    saveStoredLabelMode(mode);
  }, []);

  const handleCycleLabelMode = useCallback(() => {
    setLabelModeState((prev) => {
      const next: LabelDisplayMode =
        prev === 'all' ? 'camera-only' : prev === 'camera-only' ? 'off' : 'all';
      saveStoredLabelMode(next);
      return next;
    });
  }, []);

  const handleToggleGuides = useCallback(() => {
    setShowGuidesState((prev) => {
      const next = !prev;
      saveStoredViewfinderGuides(next);
      return next;
    });
  }, []);

  // Global hotkeys: 'L' cycles label modes, 'G' toggles composition guides
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        handleCycleLabelMode();
      } else if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        handleToggleGuides();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCycleLabelMode, handleToggleGuides]);

  return {
    labelMode,
    showGuides,
    handleSelectLabelMode,
    handleCycleLabelMode,
    handleToggleGuides,
  };
}
