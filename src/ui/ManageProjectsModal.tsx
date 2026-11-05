/**
 * Accessible Project Management Modal dialog.
 * Lists all custom projects stored in IndexedDB with actions to switch, rename,
 * export (download .yaml), and delete projects with confirmation.
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#0a0f1d] border border-slate-700/80 rounded-xl shadow-2xl flex flex-col max-h-[85vh] text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="manage-projects-title"
                className="text-sm font-semibold font-mono text-slate-100"
              >
                Custom Scores
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
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
              className="px-2.5 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Create a new blank choreography score"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Blank</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
          {customProjects.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-center text-slate-400 font-mono text-xs">
              <FolderKanban className="w-10 h-10 text-slate-600 stroke-1" />
              <span>No custom scores yet.</span>
              <p className="text-[11px] text-slate-500 max-w-sm">
                Drop your own <code className="text-sky-300">.yaml</code> file into the viewport, or click <strong>New Blank</strong> above, or <strong>Fork</strong> any factory blueprint from the YAML drawer.
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
                  className={`p-3.5 rounded-lg border transition-all flex flex-col gap-2.5 ${
                    isActive
                      ? 'bg-sky-950/20 border-sky-500/40'
                      : 'bg-slate-900/60 border-slate-800/90 hover:border-slate-700'
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
                            className="flex-1 bg-slate-950 text-slate-100 text-xs font-mono px-2 py-1 rounded border border-sky-400 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(project.id)}
                            className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                            title="Save Title"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-200 truncate">
                            {project.title}
                          </span>
                          {isActive && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-sky-500/20 border border-sky-400/40 text-sky-300 uppercase">
                              Active
                            </span>
                          )}
                        </div>
                      )}

                      <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                        ID: <span className="text-slate-300">{project.id}</span>
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
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-sky-600 text-slate-300 hover:text-white text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
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
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
                        title="Rename Project"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadYaml(project)}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
                        title="Export YAML File"
                      >
                        <Download className="w-3 h-3" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingId(project.id)}
                        className="p-1.5 rounded bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 cursor-pointer transition-colors"
                        title="Delete Project"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Inline Delete Confirmation */}
                  {isConfirmingDelete && (
                    <div className="mt-1 p-2.5 rounded bg-rose-950/60 border border-rose-500/40 flex items-center justify-between gap-3 text-xs font-mono text-rose-200 animate-in fade-in duration-100">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>Delete "{project.title}" from IndexedDB?</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={async () => {
                            await onDeleteProject(project.id);
                            setDeletingId(null);
                          }}
                          className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-mono text-[10px] cursor-pointer"
                        >
                          Confirm Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(null)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] cursor-pointer"
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
        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
