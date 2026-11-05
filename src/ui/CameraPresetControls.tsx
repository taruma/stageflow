/**
 * Directorial Camera Presets Floating Control.
 * Mounts in the top-right overlay of the 3D Diorama Viewport.
 * Provides 1-click angle snaps to:
 *   - Top (Plan View): 84° pitch, 0° yaw, 14m distance
 *   - Iso (45° Three-Quarter): 35.264° pitch, 45° yaw, 10m distance
 *   - Front (Proscenium): 12° pitch, 0° yaw, 8m distance
 *   - Side (Profile): 15° pitch, 90° yaw, 9m distance
 *   - Reset: Re-snaps to active shot's scripted observer transform
 */

import React from 'react';
import { RotateCcw } from 'lucide-react';
import {
  DIORAMA_CAMERA_PRESETS,
  type CameraPresetType,
} from '../stage/cameraPresets';

export interface CameraPresetControlsProps {
  onSelectPreset: (preset: CameraPresetType) => void;
  className?: string;
}

export const CameraPresetControls: React.FC<CameraPresetControlsProps> = ({
  onSelectPreset,
  className = '',
}) => {
  const presetKeys: Array<Exclude<CameraPresetType, 'reset'>> = [
    'top',
    'iso',
    'front',
    'side',
  ];

  return (
    <div
      className={`flex items-center bg-surface/90 backdrop-blur-md p-0.5 rounded-full border border-border-main text-[10.5px] font-mono shadow-md select-none pointer-events-auto ${className}`}
    >
      <span className="text-[9.5px] font-bold text-text-faint uppercase px-2 tracking-wider hidden sm:inline">
        View
      </span>

      {presetKeys.map((key) => {
        const item = DIORAMA_CAMERA_PRESETS[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelectPreset(key)}
            className="px-2 py-0.5 rounded-full text-text-muted hover:text-text-main hover:bg-surface-subtle transition-all cursor-pointer font-medium"
            title={item.description}
          >
            {item.shortLabel}
          </button>
        );
      })}

      <div className="w-[1px] h-3 bg-border-subtle mx-0.5" />

      <button
        type="button"
        onClick={() => onSelectPreset('reset')}
        className="px-2 py-0.5 rounded-full text-text-muted hover:text-text-main hover:bg-surface-subtle transition-all cursor-pointer flex items-center gap-1 font-medium"
        title="Reset camera to active shot's scripted observer angle"
      >
        <RotateCcw className="w-2.5 h-2.5 text-text-faint" />
        <span className="hidden sm:inline">Reset</span>
      </button>
    </div>
  );
};
