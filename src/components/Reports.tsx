import { useMemo, useState } from 'react';
import { BarChart3, TrendingUp, Heart, Baby, Award, Download, FileText, Crown } from 'lucide-react';
import { useData } from '../lib/data';
import { toast } from '../components/Toast';
import { exportCSV } from '../lib/breeding';
import { PaywallModal } from '../components/Paywall';

export function Reports() {
  const { rabbits, records, loading, entitlement } = useData();
  const [paywallOpen, setPaywallOpen] = useState(false);

  const doeMap = useMemo(() => {
    const m = new Map<string, string>();
    rabbits.forEach((r) => { if (r.category === 'doe') m.set(r.id, r.name || r.rabbit_id); });
    return m;
  }, [rabbits]);

  const stats = useMemo(() => {
    const totalBorn = records.reduce((s, r) => s + (r.kits_born || 0), 0);
    const totalAlive = records.reduce((s, r) => s + (r.kits_alive || 0), 0);
    // Uses whatever was actually typed into each record's Deaths field —
    // you're in control of that number, this just totals it up.
    const totalDeaths = records.reduce((s, r) => s + (r.deaths || 0), 0);
    const totalWeaners = records.reduce((s, r) => s + (r.weaners_count || 0), 0);
    const survivalRate = totalBorn > 0 ? Math.round((totalAlive / totalBorn) * 100) : 0;
    const mortalityRate = totalBorn > 0 ? Math.round((totalDeaths / totalBorn) * 100) : 0;
    const avgLitter = records.length > 0 ? (totalBorn / records.length).toFixed(1) : '0.0';

    // Births/deaths/weanings by month (last 6 months)
    const months: { label: string; births: number; deaths: number; weanings: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('en-US', { month: 'short' });
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthRecords = records.filter((r) => r.kindling_date && r.kindling_date.startsWith(ym));
      const births = monthRecords.reduce((s, r) => s + (r.kits_born || 0), 0);
      const deaths = monthRecords.reduce((s, r) => s + (r.deaths || 0), 0);
      const weanings = records.filter((r) => r.weaning_date && r.weaning_date.startsWith(ym)).reduce((s, r) => s + (r.weaners_count || 0), 0);
      months.push({ label, births, deaths, weanings });
    }

    // Top producing does
    const doeStats = new Map<string, { born: number; alive: number; cycles: number }>();
    records.forEach((r) => {
      const cur = doeStats.get(r.doe_id) || { born: 0, alive: 0, cycles: 0 };
      cur.born += r.kits_born || 0;
      cur.alive += r.kits_alive || 0;
      cur.cycles += 1;
      doeStats.set(r.doe_id, cur);
    });
    const topDoes = [...doeStats.entries()]
      .map(([id, s]) => ({ name: doeMap.get(id) || 'Unknown', ...s }))
      .sort((a, b) => b.born - a.born)
      .slice(0, 5);

    // Breed performance
    const breedStats = new Map<string, { born: number; alive: number; count: number }>();
    records.forEach((r) => {
      const doe = rabbits.find((rb) => rb.id === r.doe_id);
      const breed = doe?.breed || 'Unknown';
      const cur = breedStats.get(breed) || { born: 0, alive: 0, count: 0 };
      cur.born += r.kits_born || 0;
      cur.alive += r.kits_alive || 0;
      cur.count += 1;
      breedStats.set(breed, cur);
    });
    const breeds = [...breedStats.entries()].map(([breed, s]) => ({ breed, ...s, survival: s.born > 0 ? Math.round((s.alive / s.born) * 100) : 0 }));

    return { totalBorn, totalAlive, totalDeaths, totalWeaners, survivalRate, mortalityRate, avgLitter, months, topDoes, breeds };
  }, [rabbits, records, doeMap]);

  const maxMonthly = Math.max(1, ...stats.months.map((m) => Math.max(m.births, m.deaths, m.weanings)));
  const maxTopBorn = Math.max(1, ...stats.topDoes.map((d) => d.born));

  const handleExportBreeding = () => {
    const rows = records.map((r) => ({
      doe: doeMap.get(r.doe_id) || 'Unknown',
      mating_date: r.mating_date || '',
      nesting_box_date: r.nesting_box_date || '',
      kindling_date: r.kindling_date || '',
      kits_born: r.kits_born,
      kits_alive: r.kits_alive,
      deaths: r.deaths,
      weaning_date: r.weaning_date || '',
      weaners_count: r.weaners_count,
      remating_date: r.remating_date || '',
      weaners_transferred_to: r.weaners_transferred_to || '',
      notes: r.notes || '',
    }));
    exportCSV('breeding_report.csv', rows);
    toast('success', 'Breeding report exported.');
  };

  if (loading) return <div className="card p-10 text-center text-slate-500">Loading reports…</div>;

  if (entitlement !== 'PRO') {
    return (
      <div className="card p-10 text-center max-w-md mx-auto">
        <Crown className="mx-auto text-amber-500" size={36} />
        <h2 className="mt-3 font-display text-lg font-bold text-slate-900 dark:text-white">Reports is a Pro feature</h2>
        <p className="mt-2 text-sm text-slate-500">Upgrade to Lifetime Pro to unlock breeding analytics, charts, and CSV/PDF export.</p>
        <button onClick={() => setPaywallOpen(true)} className="btn-primary mt-5 px-6 py-2.5">Upgrade to Pro</button>
        <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Reports</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Insights into your herd's breeding performance.</p>
        </div>
        <button onClick={handleExportBreeding} className="btn-secondary px-4 py-2.5"><Download size={16} /> Export Breeding CSV</button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { icon: Baby, label: 'Kits Born', value: stats.totalBorn, color: 'text-brand-600', bg: 'bg-brand-50 dark:bg-brand-950/40' },
          { icon: Heart, label: 'Kits Alive', value: stats.totalAlive, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/30' },
          { icon: TrendingUp, label: 'Survival Rate', value: `${stats.survivalRate}%`, color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-950/30' },
          { icon: BarChart3, label: 'Avg Litter Size', value: stats.avgLitter, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' },
        ].map((s) => (
          <div key={s.label} className="card p-4 sm:p-5">
            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${s.bg} ${s.color}`}><s.icon size={20} /></div>
            <div className="mt-3 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{s.value}</div>
            <div className="text-xs sm:text-sm text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Monthly chart */}
      <div className="card p-5">
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white mb-1">Births, Deaths & Weanings</h2>
        <p className="text-sm text-slate-500 mb-5">Last 6 months</p>
        <div className="flex items-end justify-between gap-2 sm:gap-4 h-48">
          {stats.months.map((m) => (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center gap-1 h-40">
                <Bar value={m.births} max={maxMonthly} color="bg-brand-500" label="Born" />
                <Bar value={m.deaths} max={maxMonthly} color="bg-rose-400" label="Deaths" />
                <Bar value={m.weanings} max={maxMonthly} color="bg-sky-400" label="Weaners" />
              </div>
              <div className="text-xs text-slate-500 mt-1">{m.label}</div>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-4 mt-4">
          <Legend color="bg-brand-500" label="Births" />
          <Legend color="bg-rose-400" label="Deaths" />
          <Legend color="bg-sky-400" label="Weaners" />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Top does */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award size={18} className="text-amber-500" />
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Top Producing Does</h2>
          </div>
          {stats.topDoes.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No breeding data yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.topDoes.map((d, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {i === 0 && '🥇 '}{i === 1 && '🥈 '}{i === 2 && '🥉 '}{d.name}
                    </span>
                    <span className="text-slate-500">{d.born} kits · {d.cycles} cycle{d.cycles !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all" style={{ width: `${(d.born / maxTopBorn) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Breed performance */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={18} className="text-brand-600" />
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Breed Performance</h2>
          </div>
          {stats.breeds.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No breed data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <th className="pb-2 font-medium">Breed</th>
                    <th className="pb-2 font-medium text-right">Cycles</th>
                    <th className="pb-2 font-medium text-right">Born</th>
                    <th className="pb-2 font-medium text-right">Survival</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.breeds.map((b) => (
                    <tr key={b.breed} className="border-b border-slate-100 dark:border-slate-800/50">
                      <td className="py-2.5 font-medium text-slate-700 dark:text-slate-200">{b.breed}</td>
                      <td className="py-2.5 text-right text-slate-600 dark:text-slate-300">{b.count}</td>
                      <td className="py-2.5 text-right text-slate-600 dark:text-slate-300">{b.born}</td>
                      <td className="py-2.5 text-right">
                        <span className={`badge ${b.survival >= 80 ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300' : b.survival >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'}`}>{b.survival}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Mortality summary */}
      <div className="card p-5">
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white mb-4">Mortality Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Total Born" value={stats.totalBorn} />
          <Stat label="Total Deaths" value={stats.totalDeaths} />
          <Stat label="Mortality Rate" value={`${stats.mortalityRate}%`} />
          <Stat label="Total Weaners" value={stats.totalWeaners} />
        </div>
      </div>
    </div>
  );
}

function Bar({ value, max, color }: { value: number; max: number; color: string; label: string }) {
  const h = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-3 sm:w-5 rounded-t-md transition-all duration-500" style={{ height: `${Math.max(h, value > 0 ? 4 : 0)}%` }} title={`${value}`}>
      <div className={`w-full h-full ${color} rounded-t-md`} />
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <div className="flex items-center gap-1.5 text-xs text-slate-500"><span className={`h-2.5 w-2.5 rounded-sm ${color}`} /> {label}</div>;
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}
