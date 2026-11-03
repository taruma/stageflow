/**
 * Floating 3-Mode Label Visibility Toggle Overlay for the 3D Diorama Viewport.
 * Supports:
 *   - 'all': Displays actor/prop mannequins and Stage Camera labels
 *   - 'camera-only': Displays Stage Camera badge only
 *   - 'off': Completely hides all 3D labels for an unobstructed diorama view
 * Hotkey 'L' cycles through modes.
 */

import React from 'react';
import { EyeOff, Tag, Video } from 'lucide-react';
import type { LabelDisplayMode } from '../core/types';

export interface LabelDisplayModeToggleProps {
  labelMode: LabelDisplayMode;
  onSelectLabelMode: (mode: LabelDisplayMode) => void;
}

const MODES: Array<{
  mode: LabelDisplayMode;
  label: string;
  title: string;
  Icon: React.FC<{ className?: string }>;
}> = [
  {
    mode: 'all',
    label: 'All',
    title: 'Show Actor & Camera Labels (Actors auto-dim during playback) [Hotkey: L]',
    Icon: Tag,
  },
  {
    mode: 'camera-only',
    label: 'Cam',
    title: 'Show Stage Camera Label Only [Hotkey: L]',
    Icon: Video,
  },
  {
    mode: 'off',
    label: 'Off',
    title: 'Hide All 3D Labels [Hotkey: L]',
    Icon: EyeOff,
  },
];

export const LabelDisplayModeToggle: React.FC<LabelDisplayModeToggleProps> = ({
  labelMode,
  onSelectLabelMode,
}) => {
  return (
    <div className="absolute top-3 right-3 z-10 flex items-center gap-0.5 p-0.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-800/80 shadow-lg select-none">
      <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 pl-2 pr-1 hidden sm:inline">
        Labels
      </span>
      {MODES.map(({ mode, label, title, Icon }) => {
        const active = labelMode === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onSelectLabelMode(mode)}
            title={title}
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer ${
              active
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Icon className="w-3 h-3" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
};
