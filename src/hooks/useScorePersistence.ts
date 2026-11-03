/**
 * Hook orchestrating IndexedDB persistence for Stageplay scores.
 * Handles startup hydration, debounced draft auto-saving, and modal-confirmed resets.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  INITIAL_CATALOG_ITEMS,
  type ScoreCatalogItem,
} from '../core/scoreCatalog';
import { parseStageScore } from '../core/scoreParser';
import type { StageScore } from '../core/types';
import {
  deleteStoredScore,
  listAllStoredScores,
  saveStoredScore,
} from '../core/storage/scoreDb';
import { loadStoredActiveSceneId } from '../core/storage/localStorageUi';
import type { StoragePersistenceStatus } from '../ui/StorageStatusBadge';

export interface UseScorePersistenceOptions {
  catalog: ScoreCatalogItem[];
  activeSceneId: string;
  rawYaml: string;
  setCatalog: React.Dispatch<React.SetStateAction<ScoreCatalogItem[]>>;
  setActiveSceneId: (id: string) => void;
  setRawYaml: (yaml: string) => void;
  setActiveScore: (score: StageScore) => void;
  onClearVideoOverride: () => void;
}

export function useScorePersistence({
  catalog,
  activeSceneId,
  rawYaml,
  setCatalog,
  setActiveSceneId,
  setRawYaml,
  setActiveScore,
  onClearVideoOverride,
}: UseScorePersistenceOptions) {
  const [storageStatus, setStorageStatus] =
    useState<StoragePersistenceStatus>('bundled');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Asynchronously hydrate saved drafts and custom scenes from IndexedDB on startup
  useEffect(() => {
    let isCancelled = false;

    async function hydrateFromStorage() {
      const stored = await listAllStoredScores();
      if (isCancelled) return;

      const storedItems: ScoreCatalogItem[] = [];
      for (const record of stored) {
        const parsed = parseStageScore(record.rawYaml, record.id);
        if (!parsed.score) continue;
        storedItems.push({
          id: record.id,
          title: record.title,
          subtitle: record.subtitle,
          rawYaml: record.rawYaml,
          score: parsed.score,
          isCustom: record.isCustom,
        });
      }

      // Merge bundled items with stored items
      const mergedCatalog = [...INITIAL_CATALOG_ITEMS];
      for (const item of storedItems) {
        const existingIndex = mergedCatalog.findIndex((c) => c.id === item.id);
        if (existingIndex >= 0) {
          mergedCatalog[existingIndex] = item;
        } else {
          mergedCatalog.push(item);
        }
      }

      setCatalog(mergedCatalog);

      // Reconcile active scene: honor localStorage pointer across custom and bundled scenes
      const preferredId = loadStoredActiveSceneId() ?? activeSceneId;
      const targetItem =
        mergedCatalog.find((item) => item.id === preferredId) ??
        mergedCatalog[0];

      if (targetItem) {
        setActiveSceneId(targetItem.id);
        setRawYaml(targetItem.rawYaml);
        setActiveScore(targetItem.score);

        if (targetItem.isCustom) {
          setStorageStatus('custom');
        } else {
          const bundledBaseline = INITIAL_CATALOG_ITEMS.find(
            (b) => b.id === targetItem.id
          );
          if (
            bundledBaseline &&
            targetItem.rawYaml.trim() !== bundledBaseline.rawYaml.trim()
          ) {
            setStorageStatus('draft-saved');
          } else {
            setStorageStatus('bundled');
          }
        }
      }
    }

    hydrateFromStorage();

    return () => {
      isCancelled = true;
    };
  }, []); // Run once on mount

  // 2. Evaluate storage status when active scene changes
  useEffect(() => {
    const currentItem = catalog.find((c) => c.id === activeSceneId);
    if (!currentItem) return;

    if (currentItem.isCustom) {
      setStorageStatus('custom');
      return;
    }

    const bundledBaseline = INITIAL_CATALOG_ITEMS.find(
      (b) => b.id === activeSceneId
    );
    if (!bundledBaseline) {
      setStorageStatus('custom');
    } else if (rawYaml.trim() !== bundledBaseline.rawYaml.trim()) {
      setStorageStatus('draft-saved');
    } else {
      setStorageStatus('bundled');
    }
  }, [activeSceneId, catalog, rawYaml]);

  // 3. Debounced auto-save draft to IndexedDB when YAML changes
  const saveYamlDraftDebounced = useCallback(
    (nextYaml: string, parsedScore: StageScore) => {
      setStorageStatus('saving');

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(async () => {
        const currentItem = catalog.find((c) => c.id === activeSceneId);
        const isCustom = Boolean(currentItem?.isCustom);

        await saveStoredScore({
          id: activeSceneId,
          title: parsedScore.title,
          subtitle: parsedScore.subtitle,
          rawYaml: nextYaml,
          isCustom,
          updatedAt: Date.now(),
        });

        // Update in-memory catalog
        setCatalog((prev) =>
          prev.map((item) =>
            item.id === activeSceneId
              ? {
                  ...item,
                  title: parsedScore.title,
                  subtitle: parsedScore.subtitle,
                  rawYaml: nextYaml,
                  score: parsedScore,
                }
              : item
          )
        );

        setStorageStatus(isCustom ? 'custom' : 'draft-saved');
      }, 350);
    },
    [activeSceneId, catalog, setCatalog]
  );

  // 4. Modal-confirmed reset: delete draft from IndexedDB and revert to bundled baseline
  const confirmResetActiveScore = useCallback(async () => {
    setIsResetModalOpen(false);
    await deleteStoredScore(activeSceneId);

    const bundledItem =
      INITIAL_CATALOG_ITEMS.find((c) => c.id === activeSceneId) ??
      INITIAL_CATALOG_ITEMS[0];

    // Revert catalog item
    setCatalog((prev) =>
      prev.map((item) =>
        item.id === bundledItem.id ? { ...bundledItem } : item
      )
    );

    setActiveSceneId(bundledItem.id);
    setRawYaml(bundledItem.rawYaml);
    setActiveScore(bundledItem.score);
    onClearVideoOverride();
    setStorageStatus('bundled');
  }, [
    activeSceneId,
    setCatalog,
    setActiveSceneId,
    setRawYaml,
    setActiveScore,
    onClearVideoOverride,
  ]);

  return {
    storageStatus,
    isResetModalOpen,
    setIsResetModalOpen,
    saveYamlDraftDebounced,
    confirmResetActiveScore,
  };
}
