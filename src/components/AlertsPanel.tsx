import { AlertTriangle, Bell, Baby, Heart, XCircle, RefreshCw } from 'lucide-react';
import { Modal } from './Modal';
import { formatDate } from '../lib/breeding';
import type { AlertItem } from '../lib/breeding';

const config: Record<AlertItem['type'], { icon: typeof Bell; color: string; bg: string; label: string }> = {
  kindling: { icon: Baby, color: 'text-brand-600', bg: 'bg-brand-50 dark:bg-brand-950/40', label: "Today's Kindling" },
  weaning: { icon: Heart, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30', label: "Today's Weaning" },
  mating: { icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/30', label: "Today's Mating" },
  'late-weaning': { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', label: 'Late Weaning' },
  'missed-kindling': { icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/30', label: 'Missed Kindling' },
  remating: { icon: RefreshCw, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-950/30', label: 'Upcoming Remating' },
};

export function AlertsPanel({ open, onClose, alerts }: { open: boolean; onClose: () => void; alerts: AlertItem[] }) {
  return (
    <Modal open={open} onClose={onClose} title={`Alerts${alerts.length ? ` (${alerts.length})` : ''}`} size="md">
      {alerts.length === 0 ? (
        <div className="text-center py-10">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-950/40 text-brand-600">
            <Bell size={26} />
          </div>
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No active alerts. Your herd is on track.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {alerts.map((a) => {
            const c = config[a.type];
            return (
              <div key={a.id} className={`flex items-start gap-3 rounded-xl ${c.bg} px-4 py-3`}>
                <c.icon size={18} className={`${c.color} mt-0.5 shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${c.color}`}>{c.label}</span>
                    <span className="text-xs text-slate-400">· {formatDate(a.date)}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-200">{a.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

export function AlertBadge({ alerts }: { alerts: AlertItem[] }) {
  if (!alerts.length) return null;
  const top = alerts[0];
  const c = config[top.type];
  return (
    <div className={`flex items-center gap-2 rounded-xl ${c.bg} px-3 py-2`}>
      <c.icon size={16} className={c.color} />
      <span className="text-sm text-slate-700 dark:text-slate-200 truncate">{top.message}</span>
    </div>
  );
}
