import { useState, useMemo } from 'react';
import {
  Search, Plus, Filter, ArrowUpDown, Heart, Egg, Baby, Rabbit as RabbitIcon,
  Archive, Copy, Pencil, Trash2, FileText,
} from 'lucide-react';
import { duplicateRabbit, archiveRabbit, deleteRabbit } from '../lib/api';
import type { RabbitCategory, Rabbit } from '../types';
import { CATEGORY_LABELS } from '../types';
import { RabbitForm } from '../components/RabbitForm';
import { BreedingRecords } from '../components/BreedingRecords';
import { Modal } from '../components/Modal';
import { toast } from '../components/Toast';
import { generateAlerts, formatDate } from '../lib/breeding';
import { AlertBadge } from '../components/AlertsPanel';
import { useAuth } from '../lib/auth';
import { useData } from '../lib/data';
import { PaywallModal } from '../components/Paywall';

const FREE_DOE_LIMIT = 12;

const categories: RabbitCategory[] = ['doe', 'buck', 'grower', 'weaner'];

type SortKey = 'name' | 'created' | 'weight' | 'dob';
type SortDir = 'asc' | 'desc';

export function Dashboard() {
  const { profile } = useAuth();
  const { rabbits, records, loading, refresh, entitlement } = useData();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<RabbitCategory | 'all'>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('created');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Rabbit | null>(null);
  const [defaultCat, setDefaultCat] = useState<RabbitCategory>('doe');
  const [breedingDoe, setBreedingDoe] = useState<Rabbit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Rabbit | null>(null);

  const doeMap = useMemo(() => {
    const m = new Map<string, string>();
    rabbits.forEach((r) => { if (r.category === 'doe') m.set(r.id, r.name || r.rabbit_id); });
    return m;
  }, [rabbits]);

  const alerts = useMemo(() => generateAlerts(records, doeMap), [records, doeMap]);

  const filtered = useMemo(() => {
    let list = rabbits.filter((r) => showArchived ? r.archived : !r.archived);
    if (filterCat !== 'all') list = list.filter((r) => r.category === filterCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.rabbit_id.toLowerCase().includes(q) ||
        (r.name || '').toLowerCase().includes(q) ||
        (r.breed || '').toLowerCase().includes(q) ||
        (r.color || '').toLowerCase().includes(q)
      );
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      let av: string | number = '', bv: string | number = '';
      if (sortKey === 'name') { av = (a.name || a.rabbit_id).toLowerCase(); bv = (b.name || b.rabbit_id).toLowerCase(); }
      else if (sortKey === 'created') { av = a.created_at; bv = b.created_at; }
      else if (sortKey === 'weight') { av = a.weight ?? 0; bv = b.weight ?? 0; }
      else if (sortKey === 'dob') { av = a.date_of_birth || ''; bv = b.date_of_birth || ''; }
      return av < bv ? -dir : av > bv ? dir : 0;
    });
    return list;
  }, [rabbits, filterCat, search, showArchived, sortKey, sortDir]);

  const grouped = useMemo(() => {
    const g: Record<RabbitCategory, Rabbit[]> = { doe: [], buck: [], grower: [], weaner: [] };
    filtered.forEach((r) => g[r.category].push(r));
    return g;
  }, [filtered]);

  const counts = useMemo(() => {
    const c: Record<RabbitCategory, number> = { doe: 0, buck: 0, grower: 0, weaner: 0 };
    rabbits.filter((r) => !r.archived).forEach((r) => { c[r.category]++; });
    return c;
  }, [rabbits]);

  const totalKits = records.reduce((s, r) => s + (r.kits_born || 0), 0);
  const totalAlive = records.reduce((s, r) => s + (r.kits_alive || 0), 0);
  const totalWeaned = records.reduce((s, r) => s + (r.weaners_count || 0), 0);
  const survivalRate = totalKits > 0 ? Math.round((totalAlive / totalKits) * 100) : 0;

  const openCreate = (cat: RabbitCategory) => {
    // Free plan is capped at 12 does specifically — other categories
    // (bucks, growers, weaners) aren't limited. Lifetime Pro removes the cap entirely.
    if (cat === 'doe' && entitlement !== 'PRO') {
      const activeDoeCount = rabbits.filter((r) => !r.archived && r.category === 'doe').length;
      if (activeDoeCount >= FREE_DOE_LIMIT) {
        setPaywallOpen(true);
        return;
      }
    }
    setEditTarget(null);
    setDefaultCat(cat);
    setFormOpen(true);
  };
  const openEdit = (r: Rabbit) => {
    setEditTarget(r);
    setFormOpen(true);
  };

  const handleDuplicate = async (r: Rabbit) => {
    try { await duplicateRabbit(r); toast('success', 'Rabbit duplicated.'); refresh(); }
    catch (e) { toast('error', (e as Error).message); }
  };
  const handleArchive = async (r: Rabbit) => {
    try { await archiveRabbit(r.id, !r.archived); toast('success', r.archived ? 'Restored.' : 'Archived.'); refresh(); }
    catch (e) { toast('error', (e as Error).message); }
  };
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await deleteRabbit(deleteTarget.id); toast('success', 'Rabbit deleted.'); setDeleteTarget(null); refresh(); }
    catch (e) { toast('error', (e as Error).message); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Welcome back, {profile?.full_name || 'Farmer'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Here's what's happening with your herd today.</p>
        </div>
        <button onClick={() => openCreate('doe')} className="btn-primary px-4 py-2.5 self-start sm:self-auto">
          <Plus size={18} /> Add Rabbit
        </button>
      </div>

      {/* Alerts banner */}
      {alerts.length > 0 && (
        <section className="card p-4 sm:p-5" aria-labelledby="active-alerts-heading">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="active-alerts-heading" className="text-sm font-semibold text-slate-900 dark:text-white">Active alerts</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Items that need your attention</p>
            </div>
            <span className="badge w-fit bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">{alerts.length} active alert{alerts.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {alerts.slice(0, 6).map((a) => (
              <div key={a.id} className="min-w-0">
                <AlertBadge alerts={[a]} />
              </div>
            ))}
          </div>
          {alerts.length > 6 && (
            <p className="mt-2 text-xs text-slate-400">+{alerts.length - 6} more — open Alerts to see all</p>
          )}
        </section>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { icon: Heart, label: 'Does', value: counts.doe, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/30' },
          { icon: RabbitIcon, label: 'Bucks', value: counts.buck, color: 'text-brand-600', bg: 'bg-brand-50 dark:bg-brand-950/40' },
          { icon: Baby, label: 'Growers', value: counts.grower, color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-950/30' },
          { icon: Egg, label: 'Weaners', value: totalWeaned, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' },
        ].map((s) => (
          <div key={s.label} className="card p-4 sm:p-5">
            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${s.bg} ${s.color}`}>
              <s.icon size={20} />
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{s.value}</div>
            <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Total Rabbits', value: rabbits.filter((r) => !r.archived).length },
          { label: 'Breeding Cycles', value: records.length },
          { label: 'Kits Born (all-time)', value: totalKits },
          { label: 'Survival Rate', value: `${survivalRate}%` },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className="text-xs text-slate-500">{s.label}</div>
            <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search by ID, name, breed, color…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select className="input pl-8 pr-8" value={filterCat} onChange={(e) => setFilterCat(e.target.value as RabbitCategory | 'all')}>
                <option value="all">All Categories</option>
                {categories.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <select className="input" value={`${sortKey}:${sortDir}`} onChange={(e) => { const [k, d] = e.target.value.split(':'); setSortKey(k as SortKey); setSortDir(d as SortDir); }}>
              <option value="created:desc">Newest first</option>
              <option value="created:asc">Oldest first</option>
              <option value="name:asc">Name A–Z</option>
              <option value="name:desc">Name Z–A</option>
              <option value="weight:desc">Weight: High→Low</option>
              <option value="dob:asc">Age: Oldest</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer select-none px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
              Archived
            </label>
          </div>
        </div>
      </div>

      {/* Groups */}
      {loading ? (
        <div className="card p-10 text-center text-slate-500">Loading your herd…</div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <RabbitIcon size={32} className="mx-auto text-slate-300" />
          <p className="mt-3 text-slate-500">{search || filterCat !== 'all' ? 'No rabbits match your filters.' : 'No rabbits yet. Add your first one!'}</p>
          {!search && filterCat === 'all' && <button onClick={() => openCreate('doe')} className="btn-primary mt-4 px-4 py-2"><Plus size={16} /> Add Rabbit</button>}
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => grouped[cat].length === 0 ? null : (
            <div key={cat}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {CATEGORY_LABELS[cat]} <span className="text-sm font-normal text-slate-400">({grouped[cat].length})</span>
                </h2>
                <button onClick={() => openCreate(cat)} className="btn-ghost text-sm px-2 py-1.5"><Plus size={14} /> Add {cat}</button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {grouped[cat].map((r) => (
                  <RabbitCard
                    key={r.id}
                    rabbit={r}
                    recordCount={records.filter((rec) => rec.doe_id === r.id).length}
                    onEdit={() => openEdit(r)}
                    onDuplicate={() => handleDuplicate(r)}
                    onArchive={() => handleArchive(r)}
                    onDelete={() => setDeleteTarget(r)}
                    onBreeding={cat === 'doe' ? () => setBreedingDoe(r) : undefined}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <RabbitForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={refresh} rabbit={editTarget} defaultCategory={defaultCat} />
      <BreedingRecords open={!!breedingDoe} onClose={() => setBreedingDoe(null)} doe={breedingDoe} records={records} onSaved={refresh} />
      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete rabbit?" size="sm">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This will permanently delete <strong>{deleteTarget?.name || deleteTarget?.rabbit_id}</strong> and all its breeding records.
        </p>
        <div className="flex gap-2 mt-5">
          <button onClick={handleDelete} className="btn-danger flex-1 py-2.5">Delete</button>
          <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1 py-2.5">Cancel</button>
        </div>
      </Modal>
    </div>
  );
}

function RabbitCard({
  rabbit, recordCount, onEdit, onDuplicate, onArchive, onDelete, onBreeding,
}: {
  rabbit: Rabbit;
  recordCount: number;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onBreeding?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="card p-4 hover:shadow-card transition-shadow group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{rabbit.name || rabbit.rabbit_id}</h3>
            {rabbit.archived && <span className="badge bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">Archived</span>}
          </div>
          <div className="text-xs text-slate-400">{rabbit.rabbit_id}</div>
        </div>
        <div className="relative">
          <button onClick={() => setMenuOpen((o) => !o)} className="btn-ghost h-8 w-8 !p-0" title="More">
            <ArrowUpDown size={14} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-9 z-20 w-44 card p-1 animate-scale-in">
                <MenuItem icon={Pencil} label="Edit" onClick={() => { setMenuOpen(false); onEdit(); }} />
                <MenuItem icon={Copy} label="Duplicate" onClick={() => { setMenuOpen(false); onDuplicate(); }} />
                <MenuItem icon={Archive} label={rabbit.archived ? 'Restore' : 'Archive'} onClick={() => { setMenuOpen(false); onArchive(); }} />
                {onBreeding && <MenuItem icon={FileText} label="Breeding Records" onClick={() => { setMenuOpen(false); onBreeding(); }} />}
                <MenuItem icon={Trash2} label="Delete" danger onClick={() => { setMenuOpen(false); onDelete(); }} />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <Info label="Breed" value={rabbit.breed || '—'} />
        <Info label="Color" value={rabbit.color || '—'} />
        <Info label="DOB" value={formatDate(rabbit.date_of_birth)} />
        <Info label="Weight" value={rabbit.weight != null ? `${rabbit.weight} kg` : '—'} />
        <Info label="Status" value={<span className="capitalize">{rabbit.status}</span>} />
        {rabbit.category === 'doe' && <Info label="Cycles" value={String(recordCount)} />}
      </div>

      {rabbit.category === 'doe' && onBreeding && (
        <button onClick={onBreeding} className="btn-secondary w-full mt-3 py-2 text-sm">
          <FileText size={14} /> View Breeding Records
        </button>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-slate-400">{label}</div>
      <div className="text-slate-700 dark:text-slate-200 font-medium">{value}</div>
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: typeof Pencil; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm ${danger ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
      <Icon size={14} /> {label}
    </button>
  );
}
