import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Heart, Egg, Baby, RefreshCw, List } from 'lucide-react';
import { useData } from '../lib/data';
import { generateEvents, formatDate, todayStr, type EventType } from '../lib/breeding';

const eventConfig: Record<EventType, { icon: typeof Heart; color: string; bg: string; label: string }> = {
  mating: { icon: Heart, color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/40', label: 'Mating' },
  nesting: { icon: Egg, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/40', label: 'Nest Box' },
  kindling: { icon: Baby, color: 'text-brand-600', bg: 'bg-brand-100 dark:bg-brand-900/40', label: 'Kindling' },
  weaning: { icon: Baby, color: 'text-sky-600', bg: 'bg-sky-100 dark:bg-sky-900/40', label: 'Weaning' },
  remating: { icon: RefreshCw, color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/40', label: 'Remating' },
};

export function CalendarPage() {
  const { rabbits, records } = useData();
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [view, setView] = useState<'month' | 'list'>('month');

  const doeMap = useMemo(() => {
    const m = new Map<string, string>();
    rabbits.forEach((r) => { if (r.category === 'doe') m.set(r.id, r.name || r.rabbit_id); });
    return m;
  }, [rabbits]);

  const events = useMemo(() => generateEvents(records, doeMap), [records, doeMap]);
  const today = todayStr();

  const monthEvents = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const last = new Date(cursor.y, cursor.m + 1, 0);
    const fs = first.toISOString().slice(0, 10);
    const ls = last.toISOString().slice(0, 10);
    return events.filter((e) => e.date >= fs && e.date <= ls);
  }, [events, cursor]);

  const upcoming = useMemo(() => {
    return events.filter((e) => e.date >= today).slice(0, 12);
  }, [events, today]);

  const grid = useMemo(() => {
    const firstDay = new Date(cursor.y, cursor.m, 1).getDay();
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const m = new Map<number, typeof monthEvents>();
    monthEvents.forEach((e) => {
      const day = new Date(e.date + 'T00:00:00').getDate();
      if (!m.has(day)) m.set(day, []);
      m.get(day)!.push(e);
    });
    return m;
  }, [monthEvents]);

  const monthName = new Date(cursor.y, cursor.m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const todayDate = new Date();
  const isCurrentMonth = cursor.y === todayDate.getFullYear() && cursor.m === todayDate.getMonth();

  const prevMonth = () => setCursor((c) => c.m === 0 ? { y: c.y - 1, m: 11 } : { ...c, m: c.m - 1 });
  const nextMonth = () => setCursor((c) => c.m === 11 ? { y: c.y + 1, m: 0 } : { ...c, m: c.m + 1 });
  const goToday = () => setCursor({ y: todayDate.getFullYear(), m: todayDate.getMonth() });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Calendar</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Auto-calculated reminders for nesting, kindling, weaning, and remating.</p>
        </div>
        <div className="flex gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 p-0.5">
            <button onClick={() => setView('month')} className={`px-3 py-1.5 text-sm rounded-lg ${view === 'month' ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}><CalIcon size={14} className="inline mr-1" />Month</button>
            <button onClick={() => setView('list')} className={`px-3 py-1.5 text-sm rounded-lg ${view === 'list' ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}><List size={14} className="inline mr-1" />Upcoming</button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(eventConfig) as EventType[]).map((t) => {
          const c = eventConfig[t];
          return (
            <span key={t} className={`badge ${c.bg} ${c.color}`}><c.icon size={12} /> {c.label}</span>
          );
        })}
      </div>

      {view === 'month' ? (
        <div className="card p-3 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">{monthName}</h2>
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="btn-ghost h-9 w-9 !p-0"><ChevronLeft size={18} /></button>
              {!isCurrentMonth && <button onClick={goToday} className="btn-ghost text-sm px-3 h-9">Today</button>}
              <button onClick={nextMonth} className="btn-ghost h-9 w-9 !p-0"><ChevronRight size={18} /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {grid.map((day, i) => {
              if (day === null) return <div key={i} className="cal-cell" />;
              const dayEvents = eventsByDay.get(day) || [];
              const isToday = isCurrentMonth && day === todayDate.getDate();
              return (
                <div key={i} className={`cal-cell rounded-lg border p-1.5 sm:p-2 ${isToday ? 'border-brand-400 bg-brand-50/50 dark:bg-brand-950/30' : 'border-slate-100 dark:border-slate-800'}`}>
                  <div className={`text-xs font-medium ${isToday ? 'text-brand-700 dark:text-brand-300' : 'text-slate-500'}`}>{day}</div>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 3).map((e) => {
                      const c = eventConfig[e.type];
                      return (
                        <div key={e.id} className={`flex items-center gap-1 rounded px-1 py-0.5 text-[10px] sm:text-xs ${c.bg} ${c.color} truncate`} title={`${c.label}: ${e.doeName}`}>
                          <c.icon size={10} />
                          <span className="truncate hidden sm:inline">{e.doeName}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && <div className="text-[10px] text-slate-400 px-1">+{dayEvents.length - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card p-4 sm:p-5">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white mb-4">Upcoming Events</h2>
          {upcoming.length === 0 ? (
            <div className="text-center py-10 text-sm text-slate-500">No upcoming events scheduled.</div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((e) => {
                const c = eventConfig[e.type];
                const days = Math.ceil((new Date(e.date + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000);
                return (
                  <div key={e.id} className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                    <div className={`h-10 w-10 rounded-xl ${c.bg} ${c.color} flex items-center justify-center shrink-0`}>
                      <c.icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 dark:text-slate-100">{c.label}: {e.doeName}</div>
                      <div className="text-xs text-slate-500">{formatDate(e.date)} · {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `in ${days} days`}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
