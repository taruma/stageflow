/**
 * LayoutSegmentedControl Component for StageFlow Studio Header.
 * Houses the 4 workspace split presets in a SceneFlow-style centered segmented pill.
 */

import React from 'react';
import { Columns2, PanelLeft, PanelRight, Maximize2 } from 'lucide-react';
import type { SplitPreset } from '../../core/types';

export interface LayoutSegmentedControlProps {
  splitPreset: SplitPreset;
  onSelectSplitPreset: (preset: SplitPreset) => void;
}

export const LayoutSegmentedControl: React.FC<LayoutSegmentedControlProps> = ({
  splitPreset,
  onSelectSplitPreset,
}) => {
  return (
    <div
      role="group"
      aria-label="Workspace Split Layout Presets"
      className="hidden lg:flex items-center bg-slate-950/90 p-0.5 rounded-lg border border-slate-800/90 text-[10px] font-mono shadow-inner"
    >
      <button
        type="button"
        role="button"
        aria-pressed={splitPreset === '50-50'}
        onClick={() => onSelectSplitPreset('50-50')}
        className={`px-2 py-1 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
          splitPreset === '50-50'
            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-xs font-semibold'
            : 'text-slate-400 hover:text-slate-200 border border-transparent'
        }`}
        title="50% Video / 50% 3D Stage"
      >
        <Columns2 className="w-3 h-3" />
        <span>50/50</span>
      </button>

      <button
        type="button"
        role="button"
        aria-pressed={splitPreset === '30-70'}
        onClick={() => onSelectSplitPreset('30-70')}
        className={`px-2 py-1 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
          splitPreset === '30-70'
            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-xs font-semibold'
            : 'text-slate-400 hover:text-slate-200 border border-transparent'
        }`}
        title="30% Video / 70% 3D Diorama Focus"
      >
        <PanelLeft className="w-3 h-3" />
        <span>70/30 Stage</span>
      </button>

      <button
        type="button"
        role="button"
        aria-pressed={splitPreset === '70-30'}
        onClick={() => onSelectSplitPreset('70-30')}
        className={`px-2 py-1 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
          splitPreset === '70-30'
            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-xs font-semibold'
            : 'text-slate-400 hover:text-slate-200 border border-transparent'
        }`}
        title="70% Video / 30% 3D Stage"
      >
        <PanelRight className="w-3 h-3" />
        <span>70/30 Video</span>
      </button>

      <button
        type="button"
        role="button"
        aria-pressed={splitPreset === '0-100'}
        onClick={() => onSelectSplitPreset('0-100')}
        className={`px-2 py-1 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
          splitPreset === '0-100'
            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-xs font-semibold'
            : 'text-slate-400 hover:text-slate-200 border border-transparent'
        }`}
        title="100% Full-Screen 3D Diorama Stage"
      >
        <Maximize2 className="w-3 h-3" />
        <span>100% Stage</span>
      </button>
    </div>
  );
};
