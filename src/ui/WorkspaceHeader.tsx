/**
 * Top Studio Header Bar for StageFlow.
 * Composes a balanced 3-wing layout:
 * - Left Wing: Brand Identity, File ▾ Dropdown, and Active Score Indicator
 * - Center Stage: Centered Split Layout Segmented Control
 * - Right Wing: Theme Mode Dropdown, Score Library Button, and YAML Drawer Toggle
 */

import React, { useState } from 'react';
import { Box, Book, RotateCcw } from 'lucide-react';
import type { ScoreCatalogItem } from '../core/scoreCatalog';
import type {
  AppThemeCategory,
  AppThemeMode,
  DioramaThemeMode,
  SplitPreset,
  StoragePersistenceStatus,
} from '../core/types';
import { UI_TOKENS } from './tokens/ui';
import { FileMenuDropdown } from './header/FileMenuDropdown';
import { LayoutSegmentedControl } from './header/LayoutSegmentedControl';
import { ActiveScoreIndicator } from './header/ActiveScoreIndicator';
import { ThemeSelectorDropdown } from './header/ThemeSelectorDropdown';
import type { FilterTab } from './ScoreLibraryModal';

export type { SplitPreset, StoragePersistenceStatus };

export interface WorkspaceHeaderProps {
  catalog: ScoreCatalogItem[];
  activeSceneId: string;
  splitPreset: SplitPreset;
  isEditMode: boolean;
  storageStatus?: StoragePersistenceStatus;
  isLibraryOpen?: boolean;
  themeMode?: AppThemeMode;
  effectiveThemeCategory?: AppThemeCategory;
  dioramaThemeMode?: DioramaThemeMode;
  effectiveDioramaCategory?: AppThemeCategory;
  onSelectScene: (sceneId: string) => void;
  onSelectSplitPreset: (preset: SplitPreset) => void;
  onToggleEditMode: () => void;
  onUploadFiles: (files: FileList) => void;
  onExportActiveScore: () => void;
  onOpenLibrary: (tab?: FilterTab) => void;
  onResetLayout?: () => void;
  onSelectThemeMode?: (mode: AppThemeMode) => void;
  onSelectDioramaThemeMode?: (mode: DioramaThemeMode) => void;
  onCreateBlankProject?: () => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  catalog,
  activeSceneId,
  splitPreset,
  isEditMode,
  storageStatus = 'bundled',
  isLibraryOpen = false,
  themeMode = 'dark',
  effectiveThemeCategory = 'dark',
  dioramaThemeMode = 'dark',
  effectiveDioramaCategory = 'dark',
  onSelectSplitPreset,
  onToggleEditMode,
  onUploadFiles,
  onExportActiveScore,
  onOpenLibrary,
  onResetLayout,
  onSelectThemeMode,
  onSelectDioramaThemeMode,
  onCreateBlankProject,
}) => {
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);

  const customScores = catalog.filter((item) => item.isCustom);

  return (
    <header className={UI_TOKENS.layout.appHeader}>
      {/* Left Wing: Brand Identity, File Menu & Active Score Indicator */}
      <div className="flex items-center gap-2.5 min-w-0 max-w-[calc(50%-80px)]">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-xl bg-surface-muted border border-border-main flex items-center justify-center text-text-main shadow-2xs">
            <Box className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black tracking-wider text-text-main uppercase leading-none font-sans">
              StageFlow
            </span>
            <span className="text-[8px] font-black text-text-faint tracking-[0.2em] uppercase mt-0.5 font-sans">
              3D Blocking Diorama
            </span>
          </div>
        </div>

        <div className="h-5 w-px bg-border-main shrink-0 hidden sm:block" />

        {/* Tiered File Dropdown Menu */}
        <FileMenuDropdown
          isOpen={isFileMenuOpen}
          customScoresCount={customScores.length}
          onToggle={() => setIsFileMenuOpen((prev) => !prev)}
          onClose={() => setIsFileMenuOpen(false)}
          onUploadFiles={onUploadFiles}
          onExportActiveScore={onExportActiveScore}
          onCreateBlankScore={onCreateBlankProject}
          onOpenLibrary={onOpenLibrary}
        />

        {/* Active Score Context Chip (Clickable Option A to Open Library) */}
        <ActiveScoreIndicator
          catalog={catalog}
          activeSceneId={activeSceneId}
          storageStatus={storageStatus}
          onOpenLibrary={() => onOpenLibrary()}
        />
      </div>

      {/* Center Stage: Mathematically Centered at 50% of Header Width */}
      <div className="absolute left-1/2 -translate-x-1/2 hidden lg:flex items-center pointer-events-auto">
        <LayoutSegmentedControl
          splitPreset={splitPreset}
          onSelectSplitPreset={onSelectSplitPreset}
          isEditMode={isEditMode}
          onToggleEditMode={onToggleEditMode}
        />
      </div>

      {/* Right Wing: Theme Mode Dropdown & Score Library Button */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Theme Mode Selector Dropdown */}
        {onSelectThemeMode && (
          <ThemeSelectorDropdown
            themeMode={themeMode}
            effectiveCategory={effectiveThemeCategory}
            onSelectThemeMode={onSelectThemeMode}
            dioramaThemeMode={dioramaThemeMode}
            effectiveDioramaCategory={effectiveDioramaCategory}
            onSelectDioramaThemeMode={onSelectDioramaThemeMode}
          />
        )}

        {/* Standalone Library Button */}
        <button
          type="button"
          onClick={() => onOpenLibrary()}
          className={
            isLibraryOpen
              ? UI_TOKENS.button.libraryPopActive
              : UI_TOKENS.button.libraryPop
          }
          title="Browse Choreography Score Library (Blueprints & Custom Scores)"
        >
          <Book className="w-3.5 h-3.5 shrink-0" />
          <span className="font-bold tracking-wide">Library</span>
        </button>

        {/* Reset Layout Dimensions Button */}
        {onResetLayout && (
          <button
            type="button"
            onClick={onResetLayout}
            className={UI_TOKENS.button.filePill}
            title="Reset workspace layout and split widths to default (30/40/30)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-text-muted" />
            <span className="hidden sm:inline">Reset Layout</span>
          </button>
        )}
      </div>
    </header>
  );
};
