/**
 * Accessible Score Library Modal for StageFlow.
 * Displays bundled factory blueprints and custom user scores with rich metadata
 * (duration, shot count, aspect ratio, persistence status) and 1-click loading.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Book,
  Plus,
  FolderKanban,
  X,
  Check,
  Clock,
  Video,
  Layers,
  Search,
} from 'lucide-react';
import type { ScoreCatalogItem } from '../core/scoreCatalog';

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-[#0a0f1d] border border-slate-700/80 rounded-xl shadow-2xl flex flex-col max-h-[85vh] text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <Book className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="score-library-title"
                className="text-sm font-semibold font-mono text-slate-100 flex items-center gap-2"
              >
                <span>Choreography Score Library</span>
              </h2>
              <span className="text-[11px] font-mono text-slate-400 truncate block">
                Explore bundled blueprint scores and custom saved scores
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
                className="px-2.5 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
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
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-amber-500/20 text-amber-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({catalog.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bundled')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                activeTab === 'bundled'
                  ? 'bg-amber-500/20 text-amber-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Bundled ({bundledScores.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                activeTab === 'custom'
                  ? 'bg-amber-500/20 text-amber-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Custom ({customScores.length})
            </button>
          </div>

          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search scores..."
              className="w-full pl-8 pr-3 py-1 bg-slate-900/90 border border-slate-800 rounded-md text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400/60"
            />
          </div>
        </div>

        {/* Scores Grid / List */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredScores.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 font-mono text-xs">
              No choreography scores found matching your criteria.
            </div>
          ) : (
            filteredScores.map((item) => {
              const isActive = item.id === activeSceneId;
              const durationSec = item.score?.durationSec ?? 0;
              const shotCount = item.score?.shots?.length ?? 0;
              const aspectRatio = item.score?.aspectRatio ?? '16:9';

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectScene(item.id);
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    isActive
                      ? 'border-amber-500/70 bg-amber-500/10 ring-1 ring-amber-500/40 shadow-lg'
                      : 'border-slate-800/90 bg-slate-900/60 hover:bg-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-mono font-bold text-slate-100 leading-snug">
                        {item.title}
                      </span>
                      {isActive ? (
                        <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 font-bold">
                          <Check className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md border shrink-0 ${
                            item.isCustom
                              ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700/80'
                          }`}
                        >
                          {item.isCustom ? 'Custom' : 'Bundled'}
                        </span>
                      )}
                    </div>

                    {item.subtitle && (
                      <p className="text-[11px] font-mono text-slate-400 line-clamp-2 leading-relaxed">
                        {item.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Metadata Row */}
                  <div className="flex items-center gap-3 pt-2 border-t border-slate-800/70 text-[10px] font-mono text-slate-400">
                    <div className="flex items-center gap-1" title="Duration">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{durationSec.toFixed(1)}s</span>
                    </div>
                    <div className="flex items-center gap-1" title="Shot Count">
                      <Layers className="w-3 h-3 text-slate-500" />
                      <span>
                        {shotCount} Shot{shotCount === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1" title="Aspect Ratio">
                      <Video className="w-3 h-3 text-slate-500" />
                      <span>{aspectRatio}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3 text-xs font-mono">
          {onOpenManageScores && customScores.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                onOpenManageScores();
                onClose();
              }}
              className="text-slate-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FolderKanban className="w-3.5 h-3.5 text-amber-400" />
              <span>Manage Custom Scores ({customScores.length})</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-500">
              YAML is the Single Source of Truth
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
