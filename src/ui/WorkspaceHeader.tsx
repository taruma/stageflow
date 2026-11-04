/**
 * Top Studio Header Bar for StageFlow.
 * Houses the Scene Catalog Selector, File Upload trigger, Layout Split Presets,
 * and Live YAML Score Drawer toggle.
 */

import React, { useRef } from 'react';
import {
  Box,
  Code2,
  Columns2,
  Film,
  Maximize2,
  PanelLeft,
  PanelRight,
  Upload,
} from 'lucide-react';
import type { ScoreCatalogItem } from '../core/scoreCatalog';
import type { SplitPreset, StoragePersistenceStatus } from '../core/types';
import { StorageStatusBadge } from './StorageStatusBadge';

export type { SplitPreset, StoragePersistenceStatus };

export interface WorkspaceHeaderProps {
  catalog: ScoreCatalogItem[];
  activeSceneId: string;
  splitPreset: SplitPreset;
  isYamlDrawerOpen: boolean;
  storageStatus?: StoragePersistenceStatus;
  onSelectScene: (sceneId: string) => void;
  onSelectSplitPreset: (preset: SplitPreset) => void;
  onToggleYamlDrawer: () => void;
  onUploadFiles: (files: FileList) => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  catalog,
  activeSceneId,
  splitPreset,
  isYamlDrawerOpen,
  storageStatus = 'bundled',
  onSelectScene,
  onSelectSplitPreset,
  onToggleYamlDrawer,
  onUploadFiles,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <header className="h-12 shrink-0 px-3 bg-[#0a0f1d] border-b border-slate-800/90 flex items-center justify-between gap-3 select-none z-20">
      {/* Left: Brand Identity & Scene Catalog Selector */}
      <div className="flex items-center gap-3 min-w-0">
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

        {/* Scene Switcher */}
        <div className="flex items-center gap-1.5 min-w-0">
          <Film className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:block" />
          <select
            value={activeSceneId}
            onChange={(e) => onSelectScene(e.target.value)}
            className="bg-slate-900/90 hover:bg-slate-800/90 text-slate-200 text-xs font-mono px-2.5 py-1 rounded-md border border-slate-700/80 focus:outline-none focus:border-sky-400 transition-colors truncate max-w-[240px] sm:max-w-[300px] cursor-pointer"
            title="Switch active choreography score"
          >
            {catalog.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
                {item.isCustom ? ' (Custom)' : ''}
              </option>
            ))}
          </select>
          <StorageStatusBadge
            status={storageStatus}
            className="hidden sm:inline-flex shrink-0"
          />
        </div>

        {/* Upload / Drop .MP4 + .YAML Trigger */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".yaml,.yml,.json,.mp4,.webm,.mov,video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onUploadFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-sky-300 border border-slate-800 hover:border-sky-500/40 text-[11px] font-mono transition-colors cursor-pointer shrink-0"
          title="Load local .yaml score and/or .mp4 video file"
        >
          <Upload className="w-3.5 h-3.5 text-sky-400" />
          <span>Load Video / YAML</span>
        </button>
      </div>

      {/* Right: Layout Split Presets & YAML Score Drawer Toggle */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Split Layout Presets */}
        <div className="hidden lg:flex items-center bg-slate-950/90 p-0.5 rounded-lg border border-slate-800/90 text-[10px] font-mono">
          <button
            type="button"
            onClick={() => onSelectSplitPreset('50-50')}
            className={`px-2 py-1 rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
              splitPreset === '50-50'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="50% Video / 50% 3D Stage"
          >
            <Columns2 className="w-3 h-3" />
            <span>50/50</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectSplitPreset('30-70')}
            className={`px-2 py-1 rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
              splitPreset === '30-70'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="30% Video / 70% 3D Diorama Focus"
          >
            <PanelLeft className="w-3 h-3" />
            <span>70/30 Stage</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectSplitPreset('70-30')}
            className={`px-2 py-1 rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
              splitPreset === '70-30'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="70% Video / 30% 3D Stage"
          >
            <PanelRight className="w-3 h-3" />
            <span>70/30 Video</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectSplitPreset('0-100')}
            className={`px-2 py-1 rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
              splitPreset === '0-100'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="100% Full-Screen 3D Diorama Stage"
          >
            <Maximize2 className="w-3 h-3" />
            <span>100% Stage</span>
          </button>
        </div>

        {/* Live YAML Inspector Drawer Toggle */}
        <button
          type="button"
          onClick={onToggleYamlDrawer}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
            isYamlDrawerOpen
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
          }`}
          title="Open live YAML score inspector and editor"
        >
          <Code2 className="w-3.5 h-3.5 text-amber-400" />
          <span>YAML Score</span>
        </button>
      </div>
    </header>
  );
};
