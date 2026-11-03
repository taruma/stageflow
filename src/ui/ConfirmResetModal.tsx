/**
 * Accessible confirmation dialog modal before resetting a scene score draft.
 * Informs the user that any edits stored in IndexedDB will be discarded.
 */

import React, { useEffect } from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';

export interface ConfirmResetModalProps {
  isOpen: boolean;
  sceneTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmResetModal: React.FC<ConfirmResetModalProps> = ({
  isOpen,
  sceneTitle,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-reset-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-[#0a0f1d] border border-slate-700/80 rounded-xl shadow-2xl p-5 flex flex-col gap-4 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="confirm-reset-title"
                className="text-sm font-semibold font-mono text-slate-100"
              >
                Reset Scene Blueprint?
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                {sceneTitle}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close dialog"
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          This will delete your draft stored in <span className="text-sky-400 font-mono">IndexedDB</span> and revert the choreography score back to its pristine bundled baseline. This action cannot be undone.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-xs font-mono text-slate-300 hover:text-white hover:bg-slate-800/80 cursor-pointer border border-slate-700/60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-white bg-rose-600 hover:bg-rose-500 cursor-pointer flex items-center gap-1.5 shadow-sm shadow-rose-900/40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Confirm Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};
