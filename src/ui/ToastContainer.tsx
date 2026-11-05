/**
 * Lightweight floating Toast Notification container for StageFlow.
 * Displays temporary feedback banners for file imports, forking, and project actions.
 */

import React from 'react';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import type { ToastNotification } from '../core/types';

export interface ToastContainerProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-14 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => {
        const type = toast.type ?? 'info';
        const isSuccess = type === 'success';
        const isWarning = type === 'warning';
        const isError = type === 'error';

        const borderColor = isSuccess
          ? 'border-emerald-500/40 bg-emerald-950/90 text-emerald-200'
          : isWarning
          ? 'border-amber-500/40 bg-amber-950/90 text-amber-200'
          : isError
          ? 'border-rose-500/40 bg-rose-950/90 text-rose-200'
          : 'border-sky-500/40 bg-slate-900/95 text-slate-100';

        const Icon = isSuccess
          ? CheckCircle2
          : isWarning
          ? AlertTriangle
          : isError
          ? XCircle
          : Info;

        const iconColor = isSuccess
          ? 'text-emerald-400'
          : isWarning
          ? 'text-amber-400'
          : isError
          ? 'text-rose-400'
          : 'text-sky-400';

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-lg border shadow-xl backdrop-blur-md text-xs font-mono transition-all animate-in fade-in slide-in-from-top-2 duration-200 ${borderColor}`}
          >
            <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 min-w-0 break-words leading-relaxed">
              {toast.message}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
