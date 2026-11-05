/**
 * Accessible Project Management Modal dialog.
 * Lists all custom projects stored in IndexedDB with actions to switch, rename,
 * export (download .yaml), and delete projects with confirmation.
 * Styled with SceneFlow tactile modal design tokens.
 */

import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  Plus,
  Play,
  Pencil,
  Trash2,
  Download,
  X,
  AlertTriangle,
  Check,
} from 'lucide-react';
import type { ScoreCatalogItem } from '../core/scoreCatalog';
import { UI_TOKENS } from './tokens/ui';

export interface ManageProjectsModalProps {
  isOpen: boolean;
  customProjects: ScoreCatalogItem[];
  activeSceneId: string;
  onSelectProject: (id: string) => void;
  onRenameProject: (id: string, newTitle: string) => Promise<boolean>;
  onDeleteProject: (id: string) => Promise<boolean>;
  onCreateBlankProject: () => void;
  onClose: () => void;
}

export const ManageProjectsModal: React.FC<ManageProjectsModalProps> = ({
  isOpen,
  customProjects,
  activeSceneId,
  onSelectProject,
  onRenameProject,
  onDeleteProject,
  onCreateBlankProject,
  onClose,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deletingId) {
          setDeletingId(null);
        } else if (editingId) {
          setEditingId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, editingId, deletingId, onClose]);

  if (!isOpen) return null;

  const handleStartRename = (project: ScoreCatalogItem) => {
    setEditingId(project.id);
    setEditTitle(project.title);
    setDeletingId(null);
  };

  const handleSaveRename = async (id: string) => {
    if (editTitle.trim()) {
      await onRenameProject(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleDownloadYaml = (project: ScoreCatalogItem) => {
    const blob = new Blob([project.rawYaml], {
      type: 'text/yaml;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.id}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-projects-title"
      className={UI_TOKENS.modal.overlay}
      onClick={onClose}
    >
      <div
        className={UI_TOKENS.modal.containerMd}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={UI_TOKENS.modal.header}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-surface-muted border border-border-main flex items-center justify-center text-text-main shrink-0 shadow-2xs">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="manage-projects-title"
                className="text-sm font-bold font-sans text-text-main leading-none"
              >
                Custom Scores
              </h2>
              <span className="text-[11px] font-sans text-text-muted mt-1 block">
                {customProjects.length} custom score{customProjects.length === 1 ? '' : 's'} stored in browser IndexedDB
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onCreateBlankProject();
                onClose();
              }}
              className={UI_TOKENS.button.actionPill}
              title="Create a new blank choreography score"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Blank</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className={UI_TOKENS.button.iconClose}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3 custom-scrollbar">
          {customProjects.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-center text-text-muted font-sans text-xs">
              <FolderKanban className="w-10 h-10 text-text-faint stroke-1" />
              <span className="font-semibold text-text-main">No custom scores yet.</span>
              <p className="text-[11px] text-text-muted max-w-sm">
                Drop your own <code className="font-mono text-text-main">.yaml</code> file into the viewport, or click <strong>New Blank</strong> above, or <strong>Fork</strong> any factory blueprint from the YAML drawer.
              </p>
            </div>
          ) : (
            customProjects.map((project) => {
              const isActive = project.id === activeSceneId;
              const isEditing = editingId === project.id;
              const isConfirmingDelete = deletingId === project.id;

              return (
                <div
                  key={project.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col gap-2.5 shadow-2xs ${
                    isActive
                      ? 'bg-surface-subtle border-border-main ring-2 ring-text-main/20'
                      : 'bg-surface border-border-main hover:bg-surface-subtle'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Project Title & Metadata */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(project.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            className="flex-1 bg-surface-subtle text-text-main text-xs font-mono px-3 py-1.5 rounded-lg border border-border-main focus:outline-none focus:border-text-main"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(project.id)}
                            className="p-1.5 rounded-lg bg-btn-primary-bg text-btn-primary-text cursor-pointer shadow-xs"
                            title="Save Title"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1.5 rounded-lg bg-surface-muted hover:bg-surface-hover text-text-muted cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-text-main truncate">
                            {project.title}
                          </span>
                          {isActive && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono bg-btn-primary-bg text-btn-primary-text uppercase font-bold shadow-2xs">
                              Active
                            </span>
                          )}
                        </div>
                      )}

                      <div className="text-[10px] font-mono text-text-muted truncate mt-0.5">
                        ID: <span className="text-text-main">{project.id}</span>
                        {project.subtitle && ` · ${project.subtitle}`}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectProject(project.id);
                            onClose();
                          }}
                          className={UI_TOKENS.button.actionPill}
                          title="Open scene in diorama"
                        >
                          <Play className="w-3 h-3" />
                          <span>Open</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleStartRename(project)}
                        disabled={isEditing}
                        className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border-main text-text-muted hover:text-text-main cursor-pointer transition-all shadow-2xs"
                        title="Rename Project"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadYaml(project)}
                        className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border-main text-text-muted hover:text-text-main cursor-pointer transition-all shadow-2xs"
                        title="Export YAML File"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingId(project.id)}
                        className="p-1.5 rounded-lg bg-surface hover:bg-red-500/15 border border-border-main text-text-muted hover:text-red-500 cursor-pointer transition-all shadow-2xs"
                        title="Delete Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Inline Delete Confirmation */}
                  {isConfirmingDelete && (
                    <div className="mt-1 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-between gap-3 text-xs font-mono text-red-600 dark:text-red-300 animate-in fade-in duration-100">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                        <span>Delete "{project.title}" from IndexedDB?</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={async () => {
                            await onDeleteProject(project.id);
                            setDeletingId(null);
                          }}
                          className={UI_TOKENS.button.danger}
                        >
                          Confirm Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(null)}
                          className={UI_TOKENS.button.secondary}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className={UI_TOKENS.modal.footer}>
          <button
            type="button"
            onClick={onClose}
            className={UI_TOKENS.button.secondary}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
