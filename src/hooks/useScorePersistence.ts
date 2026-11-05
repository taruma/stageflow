/**
 * Hook orchestrating IndexedDB persistence for StageFlow scores.
 * Handles startup hydration, auto-migration of legacy drafts, fork-on-edit,
 * debounced auto-saving for custom projects, and project lifecycle management.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  INITIAL_CATALOG_ITEMS,
  generateBlankScoreYaml,
  isBundledSceneId,
  type ScoreCatalogItem,
} from '../core/scoreCatalog';
import { parseStageScore } from '../core/scoreParser';
import type { StageScore, StoragePersistenceStatus } from '../core/types';
import {
  deleteStoredScore,
  listAllStoredScores,
  saveStoredScore,
} from '../core/storage/scoreDb';
import { loadStoredActiveSceneId } from '../core/storage/localStorageUi';

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

  // 1. Asynchronously hydrate saved custom scenes from IndexedDB on startup
  // Automatically migrates any legacy drafts stored under bundled IDs into Custom Projects
  useEffect(() => {
    let isCancelled = false;

    async function hydrateFromStorage() {
      const stored = await listAllStoredScores();
      if (isCancelled) return;

      const storedCustomItems: ScoreCatalogItem[] = [];

      for (const record of stored) {
        // Auto-migration for legacy drafts modifying bundled IDs
        if (isBundledSceneId(record.id)) {
          const baseline = INITIAL_CATALOG_ITEMS.find((b) => b.id === record.id);
          if (baseline && record.rawYaml.trim() !== baseline.rawYaml.trim()) {
            const timestamp = Date.now().toString(36);
            const safeSlug = (record.title || record.id)
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '');
            const migratedId = `custom-${safeSlug || record.id}-${timestamp}`;
            let updatedYaml = record.rawYaml;
            if (/^id:\s*["']?[^"'\n\r]+["']?/m.test(updatedYaml)) {
              updatedYaml = updatedYaml.replace(
                /^id:\s*["']?[^"'\n\r]+["']?/m,
                `id: "${migratedId}"`
              );
            } else {
              updatedYaml = `id: "${migratedId}"\n${updatedYaml}`;
            }

            const parsedMigrated = parseStageScore(updatedYaml, migratedId);
            if (parsedMigrated.score) {
              const migratedRecord = {
                id: migratedId,
                title: record.title || parsedMigrated.score.title,
                subtitle: record.subtitle ?? parsedMigrated.score.subtitle,
                rawYaml: updatedYaml,
                isCustom: true,
                updatedAt: Date.now(),
              };
              await saveStoredScore(migratedRecord);
              await deleteStoredScore(record.id); // Remove draft from bundled ID so preset is pristine!
              storedCustomItems.push({
                id: migratedRecord.id,
                title: migratedRecord.title,
                subtitle: migratedRecord.subtitle,
                rawYaml: migratedRecord.rawYaml,
                score: parsedMigrated.score,
                isCustom: true,
              });
              continue;
            }
          } else {
            // Unmodified copy of bundled baseline: clean up redundant record from IndexedDB
            await deleteStoredScore(record.id);
            continue;
          }
        }

        const parsed = parseStageScore(record.rawYaml, record.id);
        if (!parsed.score) continue;
        storedCustomItems.push({
          id: record.id,
          title: record.title,
          subtitle: record.subtitle,
          rawYaml: record.rawYaml,
          score: parsed.score,
          isCustom: true,
        });
      }

      // Merge bundled items (always pristine) with custom projects
      const mergedCatalog = [...INITIAL_CATALOG_ITEMS, ...storedCustomItems];
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
        setStorageStatus(targetItem.isCustom ? 'custom' : 'bundled');
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

  // 3. Debounced auto-save for custom projects
  const saveYamlDraftDebounced = useCallback(
    (nextYaml: string, parsedScore: StageScore) => {
      // Bundled presets are read-only; auto-save only applies to custom projects
      if (isBundledSceneId(activeSceneId)) {
        return;
      }

      setStorageStatus('saving');

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(async () => {
        await saveStoredScore({
          id: activeSceneId,
          title: parsedScore.title,
          subtitle: parsedScore.subtitle,
          rawYaml: nextYaml,
          isCustom: true,
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
                  isCustom: true,
                }
              : item
          )
        );

        setStorageStatus('custom');
      }, 350);
    },
    [activeSceneId, setCatalog]
  );

  // 4. Fork a scene (bundled or custom) into a new standalone Custom Project
  const forkScoreAsCustom = useCallback(
    async (
      sourceId: string,
      customTitle?: string
    ): Promise<ScoreCatalogItem | null> => {
      const sourceItem = catalog.find((c) => c.id === sourceId);
      if (!sourceItem) return null;

      const timestamp = Date.now().toString(36);
      const safeSlug = (sourceItem.id || 'custom')
        .replace(/[^a-z0-9]+/gi, '-')
        .toLowerCase();
      const newId = `custom-${safeSlug}-${timestamp}`;
      const newTitle = customTitle?.trim() || `${sourceItem.title} (Copy)`;

      // Replace id and title in the raw YAML score
      let updatedYaml = sourceItem.rawYaml;
      if (/^id:\s*["']?[^"'\n\r]+["']?/m.test(updatedYaml)) {
        updatedYaml = updatedYaml.replace(
          /^id:\s*["']?[^"'\n\r]+["']?/m,
          `id: "${newId}"`
        );
      } else {
        updatedYaml = `id: "${newId}"\n${updatedYaml}`;
      }

      if (/^title:\s*["']?[^"'\n\r]+["']?/m.test(updatedYaml)) {
        updatedYaml = updatedYaml.replace(
          /^title:\s*["']?[^"'\n\r]+["']?/m,
          `title: "${newTitle}"`
        );
      } else {
        updatedYaml = `title: "${newTitle}"\n${updatedYaml}`;
      }

      const parsed = parseStageScore(updatedYaml, newId);
      if (!parsed.score) return null;

      const newItem: ScoreCatalogItem = {
        id: newId,
        title: newTitle,
        subtitle: sourceItem.subtitle,
        rawYaml: updatedYaml,
        score: parsed.score,
        isCustom: true,
      };

      await saveStoredScore({
        id: newItem.id,
        title: newItem.title,
        subtitle: newItem.subtitle,
        rawYaml: newItem.rawYaml,
        isCustom: true,
        updatedAt: Date.now(),
      });

      setCatalog((prev) => [...prev, newItem]);
      setActiveSceneId(newItem.id);
      setRawYaml(newItem.rawYaml);
      setActiveScore(newItem.score);
      setStorageStatus('custom');

      return newItem;
    },
    [catalog, setActiveSceneId, setRawYaml, setActiveScore, setCatalog]
  );

  // 5. Delete a custom scene from IndexedDB and catalog with fallback
  const deleteCustomScore = useCallback(
    async (sceneId: string): Promise<boolean> => {
      if (isBundledSceneId(sceneId)) return false; // Bundled blueprints cannot be deleted

      await deleteStoredScore(sceneId);

      setCatalog((prev) => prev.filter((c) => c.id !== sceneId));

      // If the deleted scene was active, fallback smoothly to the first bundled preset
      if (activeSceneId === sceneId) {
        const fallbackItem = INITIAL_CATALOG_ITEMS[0];
        setActiveSceneId(fallbackItem.id);
        setRawYaml(fallbackItem.rawYaml);
        setActiveScore(fallbackItem.score);
        onClearVideoOverride();
        setStorageStatus('bundled');
      }

      return true;
    },
    [
      activeSceneId,
      setActiveSceneId,
      setRawYaml,
      setActiveScore,
      onClearVideoOverride,
      setCatalog,
    ]
  );

  // 6. Rename a custom scene in-place
  const renameCustomScore = useCallback(
    async (sceneId: string, newTitle: string): Promise<boolean> => {
      if (isBundledSceneId(sceneId) || !newTitle.trim()) return false;

      const targetItem = catalog.find((c) => c.id === sceneId);
      if (!targetItem) return false;

      const trimmedTitle = newTitle.trim();
      let updatedYaml = targetItem.rawYaml;
      if (/^title:\s*["']?[^"'\n\r]+["']?/m.test(updatedYaml)) {
        updatedYaml = updatedYaml.replace(
          /^title:\s*["']?[^"'\n\r]+["']?/m,
          `title: "${trimmedTitle}"`
        );
      } else {
        updatedYaml = `title: "${trimmedTitle}"\n${updatedYaml}`;
      }

      const parsed = parseStageScore(updatedYaml, sceneId);
      if (!parsed.score) return false;

      await saveStoredScore({
        id: sceneId,
        title: trimmedTitle,
        subtitle: targetItem.subtitle,
        rawYaml: updatedYaml,
        isCustom: true,
        updatedAt: Date.now(),
      });

      setCatalog((prev) =>
        prev.map((item) =>
          item.id === sceneId
            ? {
                ...item,
                title: trimmedTitle,
                rawYaml: updatedYaml,
                score: parsed.score!,
              }
            : item
        )
      );

      if (activeSceneId === sceneId) {
        setRawYaml(updatedYaml);
        setActiveScore(parsed.score);
      }

      return true;
    },
    [catalog, activeSceneId, setRawYaml, setActiveScore, setCatalog]
  );

  // 7. Create a blank new custom project
  const createBlankScore = useCallback(
    async (customTitle?: string): Promise<ScoreCatalogItem | null> => {
      const timestamp = Date.now().toString(36);
      const newId = `custom-project-${timestamp}`;
      const newTitle = customTitle?.trim() || 'New Custom Project';
      const blankYaml = generateBlankScoreYaml(newId, newTitle);
      const parsed = parseStageScore(blankYaml, newId);
      if (!parsed.score) return null;

      const newItem: ScoreCatalogItem = {
        id: newId,
        title: newTitle,
        subtitle: parsed.score.subtitle,
        rawYaml: blankYaml,
        score: parsed.score,
        isCustom: true,
      };

      await saveStoredScore({
        id: newItem.id,
        title: newItem.title,
        subtitle: newItem.subtitle,
        rawYaml: newItem.rawYaml,
        isCustom: true,
        updatedAt: Date.now(),
      });

      setCatalog((prev) => [...prev, newItem]);
      setActiveSceneId(newItem.id);
      setRawYaml(newItem.rawYaml);
      setActiveScore(newItem.score);
      onClearVideoOverride();
      setStorageStatus('custom');

      return newItem;
    },
    [
      setActiveSceneId,
      setRawYaml,
      setActiveScore,
      onClearVideoOverride,
      setCatalog,
    ]
  );

  // 8. Modal-confirmed reset: for legacy support, reverts bundled baseline
  const confirmResetActiveScore = useCallback(async () => {
    setIsResetModalOpen(false);
    await deleteStoredScore(activeSceneId);

    const bundledItem =
      INITIAL_CATALOG_ITEMS.find((c) => c.id === activeSceneId) ??
      INITIAL_CATALOG_ITEMS[0];

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
    forkScoreAsCustom,
    deleteCustomScore,
    renameCustomScore,
    createBlankScore,
  };
}
