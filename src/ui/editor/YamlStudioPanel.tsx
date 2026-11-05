/**
 * Studio Editor Panel for StageFlow's 3-Column Directorial Workspace.
 * Hosts the CodeMirror 6 YAML editor canvas, theme synchronizer,
 * sticky diagnostics banner, and streamlined action toolbar.
 * Wrapped in React.memo to ensure zero re-render overhead during 60fps WebGL playback.
 */

import React, { useRef, useCallback, useState } from 'react';
import type { ScoreDiagnostic } from '../../core/types';
import {
  loadStoredEditorWordWrap,
  saveStoredEditorWordWrap,
} from '../../core/storage/localStorageUi';
import type { StoragePersistenceStatus } from '../StorageStatusBadge';
import { YamlEditorHeader } from './YamlEditorHeader';
import { YamlDiagnosticsBanner } from './YamlDiagnosticsBanner';
import { YamlEditorCanvas, type YamlEditorHandle } from './YamlEditorCanvas';

export interface YamlStudioPanelProps {
  isOpen: boolean;
  rawYaml: string;
  parseError: string | null;
  parseWarning?: string | null;
  diagnostics?: ScoreDiagnostic[];
  storageStatus?: StoragePersistenceStatus;
  isBundled?: boolean;
  effectiveTheme?: 'dark' | 'warm' | 'light';
  onChangeYaml: (newYaml: string) => void;
  onForkScore?: () => void;
  onClose: () => void;
}

export const YamlStudioPanel: React.FC<YamlStudioPanelProps> = React.memo(
  ({
    isOpen,
    rawYaml,
    parseError,
    parseWarning,
    diagnostics,
    storageStatus = 'bundled',
    isBundled = false,
    effectiveTheme = 'dark',
    onChangeYaml,
    onForkScore,
    onClose,
  }) => {
    const editorCanvasRef = useRef<YamlEditorHandle | null>(null);

    const [wordWrap, setWordWrap] = useState<boolean>(() => {
      return loadStoredEditorWordWrap() ?? true;
    });

    const handleToggleWordWrap = useCallback(() => {
      setWordWrap((prev) => {
        const next = !prev;
        saveStoredEditorWordWrap(next);
        return next;
      });
    }, []);

    const handleJumpToLine = useCallback((line: number, column?: number) => {
      editorCanvasRef.current?.jumpToLine(line, column);
    }, []);

    if (!isOpen) return null;

    return (
      <aside
        aria-label="Choreography Score Editor"
        className="w-full h-full bg-surface border-l border-border-main flex flex-col text-text-main overflow-hidden select-none"
      >
        {/* 1. Action Header Toolbar */}
        <YamlEditorHeader
          rawYaml={rawYaml}
          isBundled={isBundled}
          wordWrap={wordWrap}
          onToggleWordWrap={handleToggleWordWrap}
          onClose={onClose}
        />

        {/* 2. Sticky Diagnostics & Status Banner */}
        <YamlDiagnosticsBanner
          isBundled={isBundled}
          parseError={parseError}
          parseWarning={parseWarning}
          diagnostics={diagnostics}
          storageStatus={storageStatus}
          onForkScore={onForkScore}
          onJumpToLine={handleJumpToLine}
        />

        {/* 3. CodeMirror 6 Editor Canvas */}
        <YamlEditorCanvas
          ref={editorCanvasRef}
          rawYaml={rawYaml}
          isBundled={isBundled}
          effectiveTheme={effectiveTheme}
          wordWrap={wordWrap}
          onChangeYaml={onChangeYaml}
        />
      </aside>
    );
  }
);
