/**
 * LayoutSegmentedControl Component for StageFlow Studio Header.
 * Houses the 2 workspace layout modes (Split | Full) in a SceneFlow-style centered segmented pill.
 */

import React from 'react';
import { Columns2, Maximize2 } from 'lucide-react';
import type { SplitPreset } from '../../core/types';
import { UI_TOKENS } from '../tokens/ui';

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
      className={UI_TOKENS.button.segmentedGroup}
    >
      <button
        type="button"
        role="button"
        aria-pressed={splitPreset === 'split'}
        onClick={() => onSelectSplitPreset('split')}
        className={
          splitPreset === 'split'
            ? UI_TOKENS.button.segmentedItemActive
            : UI_TOKENS.button.segmentedItem
        }
        title="Side-by-side Video and 3D Diorama Stage"
      >
        <Columns2 className="w-3.5 h-3.5" />
        <span>Split</span>
      </button>

      <button
        type="button"
        role="button"
        aria-pressed={splitPreset === 'full'}
        onClick={() => onSelectSplitPreset('full')}
        className={
          splitPreset === 'full'
            ? UI_TOKENS.button.segmentedItemActive
            : UI_TOKENS.button.segmentedItem
        }
        title="Full-Screen 3D Diorama Stage"
      >
        <Maximize2 className="w-3.5 h-3.5" />
        <span>Full</span>
      </button>
    </div>
  );
};
