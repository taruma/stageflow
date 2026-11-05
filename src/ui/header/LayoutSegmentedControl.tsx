/**
 * LayoutSegmentedControl Component for StageFlow Studio Header.
 * Houses the 2 workspace layout modes (Split | Full) in a SceneFlow-style centered segmented pill.
 */

import React from 'react';
import { Columns2, Maximize2 } from 'lucide-react';
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
      aria-label="Workspace Layout Modes"
      className="hidden lg:flex items-center bg-slate-950/90 p-0.5 rounded-lg border border-slate-800/90 text-[10px] font-mono shadow-inner"
    >
      <button
        type="button"
        role="button"
        aria-pressed={splitPreset === 'split'}
        onClick={() => onSelectSplitPreset('split')}
        className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
          splitPreset === 'split'
            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-xs font-semibold'
            : 'text-slate-400 hover:text-slate-200 border border-transparent'
        }`}
        title="Side-by-side Video and 3D Diorama Stage"
      >
        <Columns2 className="w-3 h-3" />
        <span>Split</span>
      </button>

      <button
        type="button"
        role="button"
        aria-pressed={splitPreset === 'full'}
        onClick={() => onSelectSplitPreset('full')}
        className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
          splitPreset === 'full'
            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-xs font-semibold'
            : 'text-slate-400 hover:text-slate-200 border border-transparent'
        }`}
        title="Full-Screen 3D Diorama Stage"
      >
        <Maximize2 className="w-3 h-3" />
        <span>Full</span>
      </button>
    </div>
  );
};
