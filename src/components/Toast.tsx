import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export interface Toast { id: string; type: ToastType; message: string; }

let listeners: ((t: Toast) => void)[] = [];

export function toast(type: ToastType, message: string) {
  const t: Toast = { id: Math.random().toString(36).slice(2), type, message };
  listeners.forEach((l) => l(t));
}

export function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    const l = (t: Toast) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 4000);
    };
    listeners.push(l);
    return () => { listeners = listeners.filter((x) => x !== l); };
  }, []);

  const icons = {
    success: <CheckCircle2 size={18} className="text-brand-600" />,
    error: <XCircle size={18} className="text-rose-600" />,
    warning: <AlertTriangle size={18} className="text-amber-500" />,
    info: <Info size={18} className="text-sky-500" />,
  };

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100vw-2rem)] sm:w-auto sm:max-w-sm">
      {toasts.map((t) => (
        <div key={t.id} className="card px-4 py-3 flex items-start gap-3 animate-slide-in shadow-lift">
          <div className="mt-0.5">{icons[t.type]}</div>
          <p className="text-sm text-slate-700 dark:text-slate-200 flex-1 min-w-0 break-words">{t.message}</p>
          <button onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
