/**
 * ToastContext — Global animated toast notification system.
 * Usage: const { toast } = useToast();
 *        toast.success('Saved!');
 *        toast.error('Failed to load.');
 *        toast.warning('Check your input.');
 *        toast.info('Pipeline started.');
 */
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ── Context ──────────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

// ── Toast Config ─────────────────────────────────────────────────────────────
const TOAST_CONFIG = {
  success: {
    icon: CheckCircle,
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.22)',
    iconColor: '#22c55e',
    textColor: '#86efac',
  },
  error: {
    icon: XCircle,
    bg: 'rgba(239,68,68,0.09)',
    border: 'rgba(239,68,68,0.22)',
    iconColor: '#ef4444',
    textColor: '#fca5a5',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'rgba(245,158,11,0.09)',
    border: 'rgba(245,158,11,0.22)',
    iconColor: '#f59e0b',
    textColor: '#fcd34d',
  },
  info: {
    icon: Info,
    bg: 'rgba(59,130,246,0.09)',
    border: 'rgba(59,130,246,0.22)',
    iconColor: '#3b82f6',
    textColor: '#93c5fd',
  },
};

// ── Single Toast Component ────────────────────────────────────────────────────
function ToastItem({ id, type, message, onRemove }) {
  const cfg = TOAST_CONFIG[type] || TOAST_CONFIG.info;
  const Icon = cfg.icon;

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl text-xs font-semibold shadow-2xl"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        minWidth: 260,
        maxWidth: 380,
        animation: 'toastSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
      }}
    >
      <Icon size={15} className="flex-shrink-0 mt-0.5" style={{ color: cfg.iconColor }} />
      <p className="flex-1 leading-relaxed" style={{ color: cfg.textColor }}>
        {message}
      </p>
      <button
        onClick={() => onRemove(id)}
        className="flex-shrink-0 transition-opacity hover:opacity-100 opacity-50 ml-1"
        style={{ color: cfg.textColor }}
        aria-label="Dismiss notification"
      >
        <X size={13} />
      </button>
    </div>
  );
}

// ── Toast Container ───────────────────────────────────────────────────────────
function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null;
  return (
    <div
      className="fixed z-[9999] flex flex-col gap-2.5"
      style={{ bottom: '1.5rem', right: '1.5rem' }}
      aria-live="polite"
      aria-label="Notifications"
    >
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(20px) scale(0.96); }
          to   { opacity: 1; transform: translateX(0)   scale(1); }
        }
      `}</style>
      {toasts.map(t => (
        <ToastItem key={t.id} {...t} onRemove={onRemove} />
      ))}
    </div>
  );
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((type, message, duration = 4000) => {
    const id = ++counterRef.current;
    setToasts(prev => [...prev, { id, type, message }]);
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
    return id;
  }, [removeToast]);

  // Convenience helpers
  const toast = {
    success: (msg, dur) => addToast('success', msg, dur),
    error:   (msg, dur) => addToast('error',   msg, dur),
    warning: (msg, dur) => addToast('warning', msg, dur),
    info:    (msg, dur) => addToast('info',    msg, dur),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
