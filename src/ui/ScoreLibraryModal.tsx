/**
 * Accessible Score Library Modal for StageFlow (2-Column Master-Detail Layout).
 * Displays bundled factory blueprints and custom user scores with rich metadata,
 * procedural 2D SVG stage minimap, media engine classification, and unified project lifecycle management.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Clapperboard,
  Plus,
  X,
  Search,
  LayoutList,
  SlidersHorizontal,
} from 'lucide-react';
import type { ScoreCatalogItem } from '../core/scoreCatalog';
import { ScoreLibraryCard } from './library/ScoreLibraryCard';
import { ScoreInspectorPane } from './library/ScoreInspectorPane';
import { UI_TOKENS } from './tokens/ui';

export type FilterTab = 'all' | 'bundled' | 'custom';

export interface ScoreLibraryModalProps {
  isOpen: boolean;
  catalog: ScoreCatalogItem[];
  activeSceneId: string;
  initialTab?: FilterTab;
  onSelectScene: (sceneId: string) => void;
  onCreateBlankScore?: () => void;
  onForkScore?: (item: ScoreCatalogItem) => void;
  onDuplicateScore?: (id: string) => void;
  onExportScore?: (item: ScoreCatalogItem) => void;
  onRenameScore?: (id: string, newTitle: string) => Promise<boolean>;
  onDeleteScore?: (id: string) => Promise<boolean>;
  onClose: () => void;
}

export const ScoreLibraryModal: React.FC<ScoreLibraryModalProps> = ({
  isOpen,
  catalog,
  activeSceneId,
  initialTab = 'all',
  onSelectScene,
  onCreateBlankScore,
  onForkScore,
  onDuplicateScore,
  onExportScore,
  onRenameScore,
  onDeleteScore,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<FilterTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScoreId, setSelectedScoreId] = useState<string>(activeSceneId);
  const [mobileView, setMobileView] = useState<'list' | 'details'>('list');

  // Synchronize initialTab and selectedScoreId when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      setSelectedScoreId(activeSceneId);
      setMobileView('list');
    }
  }, [isOpen, initialTab, activeSceneId]);

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

  // Find currently selected score object, falling back to first filtered item
  const selectedScore = useMemo(() => {
    const found = catalog.find((item) => item.id === selectedScoreId);
    if (found) return found;
    return filteredScores[0] || catalog[0] || null;
  }, [catalog, selectedScoreId, filteredScores]);

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

        {/* Master-Detail Body Layout */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Column: Score List & Search (w-full on mobile, ~42% on md+) */}
          <div
            className={`w-full md:w-[42%] lg:w-[40%] flex flex-col border-r border-border-subtle bg-surface min-h-0 ${
              mobileView === 'details' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Filter Tabs & Search Bar */}
            <div className="p-3 border-b border-border-subtle bg-surface-subtle space-y-2.5 shrink-0">
              <div className="flex items-center justify-between gap-2">
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

                {/* Mobile View Toggle */}
                <div className="md:hidden flex items-center">
                  <button
                    type="button"
                    onClick={() => setMobileView('details')}
                    className="p-1.5 rounded-lg bg-surface border border-border-main text-text-muted hover:text-text-main text-xs font-mono flex items-center gap-1"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Inspector</span>
                  </button>
                </div>
              </div>

              {/* Search Field */}
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 text-text-faint absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search scores by title, note, or ID..."
                  className={UI_TOKENS.input.search}
                />
              </div>
            </div>

            {/* Scrollable Scores List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
              {filteredScores.length === 0 ? (
                <div className="py-16 text-center text-text-muted font-sans text-xs">
                  No choreography scores found matching your criteria.
                </div>
              ) : (
                filteredScores.map((item) => (
                  <ScoreLibraryCard
                    key={item.id}
                    item={item}
                    isActive={item.id === activeSceneId}
                    isSelected={item.id === selectedScore?.id}
                    onSelect={() => {
                      setSelectedScoreId(item.id);
                      setMobileView('details');
                    }}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right Column: Choreography Inspector Pane */}
          <div
            className={`flex-1 flex flex-col min-h-0 overflow-hidden bg-surface ${
              mobileView === 'list' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Mobile Header to return to list */}
            <div className="md:hidden p-2.5 border-b border-border-subtle bg-surface-subtle flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMobileView('list')}
                className="text-xs font-mono text-text-muted hover:text-text-main flex items-center gap-1"
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>← Back to Score List</span>
              </button>
            </div>

            {selectedScore ? (
              <ScoreInspectorPane
                item={selectedScore}
                isActive={selectedScore.id === activeSceneId}
                onSelectScore={() => {
                  onSelectScene(selectedScore.id);
                  onClose();
                }}
                onForkScore={onForkScore}
                onDuplicateScore={onDuplicateScore}
                onExportScore={onExportScore}
                onRenameScore={onRenameScore}
                onDeleteScore={onDeleteScore}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-text-muted">
                <Clapperboard className="w-10 h-10 stroke-1 text-text-faint mb-3" />
                <span className="text-sm font-sans font-medium">No score selected</span>
                <span className="text-xs text-text-faint mt-1">
                  Select a score from the list to inspect its staging and optical breakdown.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
