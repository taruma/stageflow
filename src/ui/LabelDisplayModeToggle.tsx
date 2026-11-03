/**
 * Floating Viewport Overlay Controls for the 3D Diorama.
 * Houses:
 *   1. 3-Mode Label Visibility Toggle ('all' | 'camera-only' | 'off') [Hotkey: L]
 *   2. Viewfinder Composition Guides Toggle (90% safe-action, rule-of-thirds, reticle) [Hotkey: G]
 */

import React from 'react';
import { EyeOff, Grid3X3, Tag, Video } from 'lucide-react';
import type { CameraViewMode, LabelDisplayMode } from '../core/types';

export interface LabelDisplayModeToggleProps {
  labelMode: LabelDisplayMode;
  onSelectLabelMode: (mode: LabelDisplayMode) => void;
  showGuides?: boolean;
  onToggleGuides?: () => void;
  cameraMode?: CameraViewMode;
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
  showGuides = true,
  onToggleGuides,
  cameraMode,
}) => {
  const isStagePov = cameraMode === 'stage-pov';

  return (
    <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 pointer-events-auto select-none">
      {/* 1. 3D Labels Visibility Toggle */}
      <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-800/80 shadow-lg">
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

      {/* 2. Composition Guides Toggle (Hotkey: G) */}
      {onToggleGuides && (
        <div className="flex items-center p-0.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-800/80 shadow-lg">
          <button
            type="button"
            onClick={onToggleGuides}
            title={`Toggle Composition Guides (90% Safe-Action, Rule-of-Thirds, Reticle) [Hotkey: G] — Currently ${
              showGuides ? 'ON' : 'OFF'
            }`}
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer border ${
              showGuides
                ? isStagePov
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                  : 'bg-slate-800/80 text-slate-200 border-slate-700 font-medium'
                : 'text-slate-500 hover:text-slate-300 border-transparent'
            }`}
          >
            <Grid3X3 className="w-3 h-3" />
            <span className="hidden sm:inline">Guides</span>
          </button>
        </div>
      )}
    </div>
  );
};
