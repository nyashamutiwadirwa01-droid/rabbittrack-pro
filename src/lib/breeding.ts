import type { BreedingRecord } from '../types';
import { KINDLING_DAYS, NESTING_BOX_DAYS, REMATING_DAYS, WEANING_DAYS } from '../types';

export function addDays(dateStr: string | null, days: number): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysBetween(a: string | null, b: string = todayStr()): number | null {
  if (!a) return null;
  const d1 = new Date(a + 'T00:00:00').getTime();
  const d2 = new Date(b + 'T00:00:00').getTime();
  if (isNaN(d1) || isNaN(d2)) return null;
  return Math.round((d2 - d1) / 86400000);
}

export function formatDate(d: string | null): string {
  if (!d) return '—';
  const date = new Date(d + 'T00:00:00');
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function calcNestingBox(mating: string | null): string | null {
  return addDays(mating, NESTING_BOX_DAYS);
}

export function calcKindling(mating: string | null): string | null {
  return addDays(mating, KINDLING_DAYS);
}

export function calcWeaning(kindling: string | null): string | null {
  return addDays(kindling, WEANING_DAYS);
}

export function calcRemating(kindling: string | null): string | null {
  return addDays(kindling, REMATING_DAYS);
}

export type EventType = 'mating' | 'nesting' | 'kindling' | 'weaning' | 'remating';

export interface CalendarEvent {
  id: string;
  date: string;
  type: EventType;
  doeId: string;
  doeName: string;
  recordId: string;
}

export function generateEvents(records: BreedingRecord[], doeMap: Map<string, string>): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const r of records) {
    const doeName = doeMap.get(r.doe_id) || 'Unknown Doe';
    if (r.mating_date) events.push({ id: `${r.id}-mating`, date: r.mating_date, type: 'mating', doeId: r.doe_id, doeName, recordId: r.id });
    if (r.nesting_box_date) events.push({ id: `${r.id}-nesting`, date: r.nesting_box_date, type: 'nesting', doeId: r.doe_id, doeName, recordId: r.id });
    if (r.kindling_date) events.push({ id: `${r.id}-kindling`, date: r.kindling_date, type: 'kindling', doeId: r.doe_id, doeName, recordId: r.id });
    if (r.weaning_date) events.push({ id: `${r.id}-weaning`, date: r.weaning_date, type: 'weaning', doeId: r.doe_id, doeName, recordId: r.id });
    if (r.remating_date) events.push({ id: `${r.id}-remating`, date: r.remating_date, type: 'remating', doeId: r.doe_id, doeName, recordId: r.id });
  }
  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export interface AlertItem {
  id: string;
  type: 'kindling' | 'weaning' | 'mating' | 'late-weaning' | 'missed-kindling' | 'remating';
  doeName: string;
  date: string;
  message: string;
  severity: 'info' | 'warning' | 'danger';
}

export function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => {
      const v = r[h];
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    }).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function generateAlerts(records: BreedingRecord[], doeMap: Map<string, string>): AlertItem[] {
  const today = todayStr();
  const alerts: AlertItem[] = [];

  for (const r of records) {
    const doeName = doeMap.get(r.doe_id) || 'Unknown Doe';
    // Today's kindlings (skip if birth data already entered — already done).
    // Requires mating_date to still be set: kindling_date is only ever a
    // value derived from mating_date, so if mating_date has been cleared
    // (e.g. record edited/corrected) a leftover kindling_date must not
    // still trigger an alert.
    if (r.mating_date && r.kindling_date === today && (r.kits_born || 0) === 0) {
      alerts.push({ id: `${r.id}-tk`, type: 'kindling', doeName, date: today, message: `${doeName} is due to kindle today`, severity: 'info' });
    }
    // Today's weanings (skip if weaners already recorded — already done).
    // Same reasoning: weaning_date is derived from kindling_date which is
    // derived from mating_date, so require both upstream dates to still
    // be present before trusting a leftover weaning_date.
    if (r.mating_date && r.kindling_date && r.weaning_date === today && (r.weaners_count || 0) === 0) {
      alerts.push({ id: `${r.id}-tw`, type: 'weaning', doeName, date: today, message: `${doeName} is due for weaning today`, severity: 'info' });
    }
    // Today's mating
    if (r.mating_date === today) {
      alerts.push({ id: `${r.id}-tm`, type: 'mating', doeName, date: today, message: `${doeName} is scheduled for mating today`, severity: 'info' });
    }
    // Missed kindling: mating happened, expected kindling date has passed, but no
    // birth data has actually been entered yet (kits_born is still 0). We check
    // kits_born rather than "kindling_date is empty" because kindling_date gets
    // auto-filled with a predicted date as soon as mating_date is set.
    if (r.mating_date) {
      const expected = calcKindling(r.mating_date);
      if (expected && expected < today && (r.kits_born || 0) === 0) {
        alerts.push({ id: `${r.id}-mk`, type: 'missed-kindling', doeName, date: expected, message: `${doeName} missed kindling (expected ${formatDate(expected)}) — no birth data entered yet`, severity: 'danger' });
      }
    }
    // Late weaning: kindling actually happened (kits_born > 0), expected weaning
    // date has passed, but no weaners have actually been recorded yet. Same
    // reasoning as above — weaning_date is a prediction, not a confirmation.
    if ((r.kits_born || 0) > 0 && r.kindling_date) {
      const expectedWean = calcWeaning(r.kindling_date);
      if (expectedWean && expectedWean < today && (r.weaners_count || 0) === 0) {
        alerts.push({ id: `${r.id}-lw`, type: 'late-weaning', doeName, date: expectedWean, message: `${doeName} weaning is overdue (due ${formatDate(expectedWean)}) — no weaners recorded yet`, severity: 'warning' });
      }
    }
    // Upcoming remating (within next 7 days)
    if (r.remating_date) {
      const diff = daysBetween(today, r.remating_date);
      if (diff !== null && diff >= 0 && diff <= 7) {
        alerts.push({ id: `${r.id}-ur`, type: 'remating', doeName, date: r.remating_date, message: `${doeName} remating scheduled in ${diff} day${diff === 1 ? '' : 's'}`, severity: diff === 0 ? 'info' : 'warning' });
      }
    }
  }
  return alerts.sort((a, b) => a.date.localeCompare(b.date));
}
