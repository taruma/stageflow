/**
 * Accessible Score Library Modal for StageFlow.
 * Displays bundled factory blueprints and custom user scores with rich metadata
 * (duration, shot count, aspect ratio, persistence status) and 1-click loading.
 * Styled with SceneFlow tactile modal design tokens.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Clapperboard,
  Plus,
  FolderKanban,
  X,
  Search,
} from 'lucide-react';
import type { ScoreCatalogItem } from '../core/scoreCatalog';
import { ScoreLibraryCard } from './library/ScoreLibraryCard';
import { UI_TOKENS } from './tokens/ui';

export interface ScoreLibraryModalProps {
  isOpen: boolean;
  catalog: ScoreCatalogItem[];
  activeSceneId: string;
  onSelectScene: (sceneId: string) => void;
  onCreateBlankScore?: () => void;
  onOpenManageScores?: () => void;
  onClose: () => void;
}

type FilterTab = 'all' | 'bundled' | 'custom';

export const ScoreLibraryModal: React.FC<ScoreLibraryModalProps> = ({
  isOpen,
  catalog,
  activeSceneId,
  onSelectScene,
  onCreateBlankScore,
  onOpenManageScores,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const bundledScores = useMemo(
    () => catalog.filter((item) => !item.isCustom),
    [catalog]
  );
  const customScores = useMemo(
    () => catalog.filter((item) => item.isCustom),
    [catalog]
  );

  const filteredScores = useMemo(() => {
    let list = catalog;
    if (activeTab === 'bundled') list = bundledScores;
    if (activeTab === 'custom') list = customScores;

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.id.toLowerCase().includes(q)
    );
  }, [catalog, activeTab, bundledScores, customScores, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="score-library-title"
      className={UI_TOKENS.modal.overlay}
      onClick={onClose}
    >
      <div
        className={UI_TOKENS.modal.containerLibrary}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={UI_TOKENS.modal.header}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-surface-muted border border-border-main flex items-center justify-center text-text-main shrink-0 shadow-2xs">
              <Clapperboard className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="score-library-title"
                className="text-base font-bold font-sans text-text-main tracking-tight leading-none"
              >
                Choreography Score Library
              </h2>
              <span className="text-xs font-sans text-text-muted truncate block mt-1">
                Explore bundled blueprint scores and custom saved scenes
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onCreateBlankScore && (
              <button
                type="button"
                onClick={() => {
                  onCreateBlankScore();
                  onClose();
                }}
                className={UI_TOKENS.button.actionPill}
                title="Create a new blank choreography score"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Blank</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close score library"
              className={UI_TOKENS.button.iconClose}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="px-5 py-3 border-b border-border-subtle bg-surface-subtle flex flex-wrap items-center justify-between gap-3">
          <div className={UI_TOKENS.button.segmentedGroup}>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={
                activeTab === 'all'
                  ? UI_TOKENS.button.segmentedItemActive
                  : UI_TOKENS.button.segmentedItem
              }
            >
              All ({catalog.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bundled')}
              className={
                activeTab === 'bundled'
                  ? UI_TOKENS.button.segmentedItemActive
                  : UI_TOKENS.button.segmentedItem
              }
            >
              Bundled ({bundledScores.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={
                activeTab === 'custom'
                  ? UI_TOKENS.button.segmentedItemActive
                  : UI_TOKENS.button.segmentedItem
              }
            >
              Custom ({customScores.length})
            </button>
          </div>

          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-text-faint absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search scores by title, note..."
              className={UI_TOKENS.input.search}
            />
          </div>
        </div>

        {/* Scores Grid */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-4 custom-scrollbar">
          {filteredScores.length === 0 ? (
            <div className="col-span-full py-16 text-center text-text-muted font-sans text-sm">
              No choreography scores found matching your criteria.
            </div>
          ) : (
            filteredScores.map((item) => (
              <ScoreLibraryCard
                key={item.id}
                item={item}
                isActive={item.id === activeSceneId}
                onSelect={() => {
                  onSelectScene(item.id);
                  onClose();
                }}
              />
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className={UI_TOKENS.modal.footer}>
          <div className="w-full flex items-center justify-between gap-3 text-xs font-sans">
            {onOpenManageScores && customScores.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  onOpenManageScores();
                  onClose();
                }}
                className="text-text-muted hover:text-text-main flex items-center gap-1.5 transition-colors cursor-pointer font-mono"
              >
                <FolderKanban className="w-3.5 h-3.5 text-text-muted" />
                <span>Manage Custom Scores ({customScores.length})</span>
              </button>
            ) : (
              <span className="text-[11px] font-mono text-text-faint">
                YAML is the Single Source of Truth
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              className={UI_TOKENS.button.secondary}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
