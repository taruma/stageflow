/**
 * Top Studio Header Bar for StageFlow.
 * Composes a balanced 3-wing layout:
 * - Left Wing: Brand Identity, File ▾ Dropdown, and Active Score Indicator
 * - Center Stage: Centered Split Layout Segmented Control
 * - Right Wing: Dedicated Score Library Button and YAML Drawer Toggle
 */

import React, { useState } from 'react';
import { Box, Code2, Book } from 'lucide-react';
import type { ScoreCatalogItem } from '../core/scoreCatalog';
import type { SplitPreset, StoragePersistenceStatus } from '../core/types';
import { FileMenuDropdown } from './header/FileMenuDropdown';
import { LayoutSegmentedControl } from './header/LayoutSegmentedControl';
import { ActiveScoreIndicator } from './header/ActiveScoreIndicator';

export type { SplitPreset, StoragePersistenceStatus };

export interface WorkspaceHeaderProps {
  catalog: ScoreCatalogItem[];
  activeSceneId: string;
  splitPreset: SplitPreset;
  isYamlDrawerOpen: boolean;
  storageStatus?: StoragePersistenceStatus;
  isLibraryOpen?: boolean;
  onSelectScene: (sceneId: string) => void;
  onSelectSplitPreset: (preset: SplitPreset) => void;
  onToggleYamlDrawer: () => void;
  onUploadFiles: (files: FileList) => void;
  onExportActiveScore: () => void;
  onOpenLibrary: () => void;
  onOpenManageProjects?: () => void;
  onCreateBlankProject?: () => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  catalog,
  activeSceneId,
  splitPreset,
  isYamlDrawerOpen,
  storageStatus = 'bundled',
  isLibraryOpen = false,
  onSelectSplitPreset,
  onToggleYamlDrawer,
  onUploadFiles,
  onExportActiveScore,
  onOpenLibrary,
  onOpenManageProjects,
  onCreateBlankProject,
}) => {
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);

  const customScores = catalog.filter((item) => item.isCustom);

  return (
    <header className="relative z-30 h-12 shrink-0 px-3 bg-[#0a0f1d] border-b border-slate-800/90 flex items-center justify-between gap-3 select-none">
      {/* Left Wing: Brand Identity, File Menu & Active Score Indicator */}
      <div className="flex items-center gap-2.5 min-w-0 max-w-[calc(50%-80px)]">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-400/40 flex items-center justify-center text-sky-400 shadow-inner">
            <Box className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-mono font-bold tracking-wider text-slate-100 uppercase leading-none">
              StageFlow
            </span>
            <span className="text-[9px] font-mono text-sky-400/80 tracking-widest uppercase mt-0.5">
              3D Blocking Diorama
            </span>
          </div>
        </div>

        <div className="h-5 w-px bg-slate-800 shrink-0 hidden sm:block" />

        {/* Tiered File Dropdown Menu */}
        <FileMenuDropdown
          isOpen={isFileMenuOpen}
          customScoresCount={customScores.length}
          onToggle={() => setIsFileMenuOpen((prev) => !prev)}
          onClose={() => setIsFileMenuOpen(false)}
          onUploadFiles={onUploadFiles}
          onExportActiveScore={onExportActiveScore}
          onCreateBlankScore={onCreateBlankProject}
          onOpenManageScores={onOpenManageProjects}
          onOpenLibrary={onOpenLibrary}
        />

        {/* Active Score Context Chip (Clickable Option A to Open Library) */}
        <ActiveScoreIndicator
          catalog={catalog}
          activeSceneId={activeSceneId}
          storageStatus={storageStatus}
          onOpenLibrary={onOpenLibrary}
        />
      </div>

      {/* Center Stage: Mathematically Centered at 50% of Header Width */}
      <div className="absolute left-1/2 -translate-x-1/2 hidden lg:flex items-center pointer-events-auto">
        <LayoutSegmentedControl
          splitPreset={splitPreset}
          onSelectSplitPreset={onSelectSplitPreset}
        />
      </div>

      {/* Right Wing: Dedicated Score Library Button & Live YAML Drawer Toggle */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Standalone Amber Library Button */}
        <button
          type="button"
          onClick={onOpenLibrary}
          className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer border ${
            isLibraryOpen
              ? 'bg-amber-500/25 border-amber-400/70 text-amber-200 shadow-sm'
              : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/40 hover:border-amber-400/60'
          }`}
          title="Browse Choreography Score Library (Blueprints & Custom Scores)"
        >
          <Book className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-bold tracking-wide">Library</span>
        </button>

        {/* Live YAML Inspector Drawer Toggle */}
        <button
          type="button"
          onClick={onToggleYamlDrawer}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono transition-all cursor-pointer ${
            isYamlDrawerOpen
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
          }`}
          title="Open live YAML score inspector and editor"
        >
          <Code2 className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">YAML Score</span>
        </button>
      </div>
    </header>
  );
};
