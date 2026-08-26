import type { AlertItem } from './breeding';

// Fires actual OS-level notifications (via the browser's Notification API)
// for alerts that are due TODAY — not just an in-app badge, a real
// notification the person sees even if the tab isn't focused. Requires the
// browser's permission prompt, which only shows once and only if the person
// allows it — if they deny it, this silently does nothing, no error, no nag.

const NOTIFIED_KEY = 'rtp-notified-alert-ids';

function getNotifiedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveNotifiedIds(ids: Set<string>) {
  try {
    // Keep this from growing forever — only the most recent 200 IDs matter.
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(Array.from(ids).slice(-200)));
  } catch {
    // ignore storage errors
  }
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  return Notification.requestPermission();
}

// Call this whenever alerts are (re)computed. It only actually notifies for
// alerts due today, and only ever once per alert ID (tracked in localStorage
// so it survives closing and reopening the tab, and won't re-fire the next
// time this function runs with the same alerts).
export function notifyDueTodayAlerts(alerts: AlertItem[]) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;

  const today = new Date().toISOString().slice(0, 10);
  const dueToday = alerts.filter((a) => a.date === today && (a.type === 'kindling' || a.type === 'weaning'));
  if (dueToday.length === 0) return;

  const notified = getNotifiedIds();
  const toNotify = dueToday.filter((a) => !notified.has(a.id));
  if (toNotify.length === 0) return;

  for (const alert of toNotify) {
    new Notification('RabbitTrack Pro', {
      body: alert.message,
      tag: alert.id,
      icon: '/apple-touch-icon.png',
    });
    notified.add(alert.id);
  }
  saveNotifiedIds(notified);
}
