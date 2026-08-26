import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { toast } from './Toast';
import { createBreedingRecord, updateBreedingRecord, deleteBreedingRecord } from '../lib/api';
import type { Rabbit, BreedingRecord } from '../types';
import {
  Heart, Egg, Baby, RefreshCw, Calendar, Plus, Trash2, Save, X, Calculator,
} from 'lucide-react';
import { calcNestingBox, calcKindling, calcWeaning, calcRemating, formatDate } from '../lib/breeding';

interface Props {
  open: boolean;
  onClose: () => void;
  doe: Rabbit | null;
  records: BreedingRecord[];
  onSaved: () => void;
}

const emptyRecord = (doeId: string): Partial<BreedingRecord> => ({
  doe_id: doeId,
  mating_date: null,
  nesting_box_date: null,
  kindling_date: null,
  kits_born: 0,
  kits_alive: 0,
  deaths: 0,
  remating_date: null,
  weaning_date: null,
  weaners_count: 0,
  weaners_transferred_to: null,
  notes: null,
});

export function BreedingRecords({ open, onClose, doe, records, onSaved }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Partial<BreedingRecord>>(emptyRecord(''));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) { setEditingId(null); setCreating(false); }
  }, [open]);

  if (!doe) return null;
  const doeRecords = records.filter((r) => r.doe_id === doe.id);

  const startCreate = () => {
    setDraft(emptyRecord(doe.id));
    setCreating(true);
    setEditingId(null);
  };
  const startEdit = (r: BreedingRecord) => {
    setDraft({ ...r });
    setEditingId(r.id);
    setCreating(false);
  };

  const set = (k: keyof BreedingRecord, v: string | number | null) => setDraft((p) => ({ ...p, [k]: v }));

  // Auto-calc helper: when mating date set, fill nesting/kindling
  const autoCalc = (mating: string) => {
    const newDraft = { ...draft, mating_date: mating };
    if (mating) {
      newDraft.nesting_box_date = calcNestingBox(mating);
      newDraft.kindling_date = calcKindling(mating);
      const k = newDraft.kindling_date;
      if (k) {
        newDraft.weaning_date = calcWeaning(k);
        newDraft.remating_date = calcRemating(k);
      }
    }
    setDraft(newDraft);
  };

  const save = async () => {
    setLoading(true);
    try {
      const payload = {
        doe_id: draft.doe_id!,
        mating_date: draft.mating_date || null,
        nesting_box_date: draft.nesting_box_date || null,
        kindling_date: draft.kindling_date || null,
        kits_born: Number(draft.kits_born) || 0,
        kits_alive: Number(draft.kits_alive) || 0,
        // Saved exactly as entered — you're in control of this field. A
        // warning shows in the form if it doesn't match Born minus Alive.
        deaths: Number(draft.deaths) || 0,
        remating_date: draft.remating_date || null,
        weaning_date: draft.weaning_date || null,
        weaners_count: Number(draft.weaners_count) || 0,
        weaners_transferred_to: draft.weaners_transferred_to || null,
        notes: draft.notes || null,
      };
      if (editingId) await updateBreedingRecord(editingId, payload);
      else await createBreedingRecord(payload);
      toast('success', 'Breeding record saved.');
      setEditingId(null);
      setCreating(false);
      onSaved();
    } catch (e) {
      toast('error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this breeding record?')) return;
    try { await deleteBreedingRecord(id); toast('success', 'Record deleted.'); onSaved(); }
    catch (e) { toast('error', (e as Error).message); }
  };

  const isEditing = creating || editingId !== null;

  return (
    <Modal open={open} onClose={onClose} title={`${doe.name || doe.rabbit_id} — Breeding Records`} size="xl">
      {/* Doe summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Breed', value: doe.breed || '—' },
          { label: 'Color', value: doe.color || '—' },
          { label: 'DOB', value: formatDate(doe.date_of_birth) },
          { label: 'Weight', value: doe.weight != null ? `${doe.weight} kg` : '—' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5">
            <div className="text-xs text-slate-500">{s.label}</div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">Breeding Cycles</h3>
        {!isEditing && (
          <button onClick={startCreate} className="btn-primary text-sm px-3 py-2"><Plus size={16} /> New Cycle</button>
        )}
      </div>

      {isEditing ? (
        <BreedingForm
          draft={draft}
          set={set}
          autoCalc={autoCalc}
          onSave={save}
          onCancel={() => { setCreating(false); setEditingId(null); }}
          loading={loading}
          isEdit={!!editingId}
        />
      ) : doeRecords.length === 0 ? (
        <div className="text-center py-10 rounded-xl bg-slate-50 dark:bg-slate-800/40">
          <Heart size={28} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">No breeding records yet. Click "New Cycle" to start.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {doeRecords.map((r) => (
            <div key={r.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 flex-1 min-w-0 text-sm">
                  <Field icon={Heart} label="Mating" value={formatDate(r.mating_date)} />
                  <Field icon={Egg} label="Nest Box" value={formatDate(r.nesting_box_date)} />
                  <Field icon={Baby} label="Kindling" value={formatDate(r.kindling_date)} />
                  <Field icon={Baby} label="Kits Born" value={String(r.kits_born)} />
                  <Field icon={Baby} label="Kits Alive" value={String(r.kits_alive)} />
                  <Field icon={X} label="Deaths" value={String(r.deaths)} />
                  <Field icon={Calendar} label="Weaning" value={formatDate(r.weaning_date)} />
                  <Field icon={RefreshCw} label="Remating" value={formatDate(r.remating_date)} />
                  <Field icon={Egg} label="Weaners" value={String(r.weaners_count)} />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(r)} className="btn-ghost h-8 w-8 !p-0" title="Edit"><Save size={14} /></button>
                  <button onClick={() => remove(r.id)} className="btn-ghost h-8 w-8 !p-0 text-rose-500 hover:bg-rose-50" title="Delete"><Trash2 size={14} /></button>
                </div>
              </div>
              {r.weaners_transferred_to && (
                <div className="mt-2 text-xs text-slate-500">Transferred to: {r.weaners_transferred_to}</div>
              )}
              {r.notes && <div className="mt-2 text-xs text-slate-500">{r.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function Field({ icon: Icon, label, value }: { icon: typeof Heart; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-xs text-slate-400">
        <Icon size={12} /> {label}
      </div>
      <div className="font-medium text-slate-700 dark:text-slate-200 truncate">{value}</div>
    </div>
  );
}

function BreedingForm({
  draft, set, autoCalc, onSave, onCancel, loading, isEdit,
}: {
  draft: Partial<BreedingRecord>;
  set: (k: keyof BreedingRecord, v: string | number | null) => void;
  autoCalc: (mating: string) => void;
  onSave: () => void;
  onCancel: () => void;
  loading: boolean;
  isEdit: boolean;
}) {
  const num = (k: keyof BreedingRecord) => (v: string) => set(k, v === '' ? 0 : Number(v));
  const today = new Date().toISOString().slice(0, 10);
  const computedDeaths = Math.max(0, (Number(draft.kits_born) || 0) - (Number(draft.kits_alive) || 0));

  // When Kits Alive changes, keep Weaners Count matching it automatically —
  // unless the user has already customized Weaners Count away from the old value.
  const onKitsAliveChange = (v: string) => {
    const newAlive = v === '' ? 0 : Number(v);
    const prevAlive = Number(draft.kits_alive) || 0;
    setDraft((p) => {
      const weanersMatchesOld = (Number(p.weaners_count) || 0) === prevAlive;
      return {
        ...p,
        kits_alive: newAlive,
        weaners_count: weanersMatchesOld ? newAlive : p.weaners_count,
      };
    });
  };

  return (
    <div className="rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50/40 dark:bg-brand-950/20 p-4 space-y-4 animate-fade-up">
      <div className="flex items-center gap-2 text-sm font-semibold text-brand-700 dark:text-brand-300">
        <Calculator size={16} /> {isEdit ? 'Edit breeding cycle' : 'New breeding cycle'}
        <span className="text-xs font-normal text-slate-500 ml-1">Enter mating date, then click auto-calc</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="label">Mating Date</label>
          <input type="date" max={today} className="input" value={draft.mating_date || ''} onChange={(e) => autoCalc(e.target.value)} />
        </div>
        <div>
          <label className="label">Nesting Box Date</label>
          <input type="date" className="input" value={draft.nesting_box_date || ''} onChange={(e) => set('nesting_box_date', e.target.value)} />
        </div>
        <div>
          <label className="label">Kindling Date</label>
          <input type="date" className="input" value={draft.kindling_date || ''} onChange={(e) => set('kindling_date', e.target.value)} />
        </div>
        <div>
          <label className="label">Kits Born</label>
          <input type="number" min="0" className="input" value={draft.kits_born ?? 0} onChange={(e) => num('kits_born')(e.target.value)} />
        </div>
        <div>
          <label className="label">Kits Alive</label>
          <input type="number" min="0" className="input" value={draft.kits_alive ?? 0} onChange={(e) => onKitsAliveChange(e.target.value)} />
        </div>
        <div>
          <label className="label">Deaths</label>
          <input type="number" min="0" className="input" value={draft.deaths ?? 0} onChange={(e) => num('deaths')(e.target.value)} />
          {Number(draft.deaths ?? 0) !== computedDeaths && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              ⚠ Doesn't match Born − Alive ({computedDeaths}). Reports use whatever you enter here.
            </p>
          )}
        </div>
        <div>
          <label className="label">Weaning Date</label>
          <input type="date" className="input" value={draft.weaning_date || ''} onChange={(e) => set('weaning_date', e.target.value)} />
        </div>
        <div>
          <label className="label">Remating Date</label>
          <input type="date" className="input" value={draft.remating_date || ''} onChange={(e) => set('remating_date', e.target.value)} />
        </div>
        <div>
          <label className="label">Weaners Count</label>
          <input type="number" min="0" className="input" value={draft.weaners_count ?? 0} onChange={(e) => num('weaners_count')(e.target.value)} />
        </div>
        <p className="col-span-2 sm:col-span-3 -mt-1 text-xs text-slate-400">Weaners Count auto-fills from Kits Alive — adjust it if any kits were lost before weaning.</p>
      </div>
      <div>
        <label className="label">Weaners Transferred To</label>
        <input className="input" value={draft.weaners_transferred_to || ''} onChange={(e) => set('weaners_transferred_to', e.target.value)} placeholder="e.g. Grow-out pen A" />
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="input min-h-[60px] resize-y" value={draft.notes || ''} onChange={(e) => set('notes', e.target.value)} placeholder="Notes for this cycle…" />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onSave} disabled={loading} className="btn-primary flex-1 py-2.5">{loading ? 'Saving…' : 'Save Record'}</button>
        <button onClick={onCancel} className="btn-secondary px-5 py-2.5">Cancel</button>
      </div>
    </div>
  );
}
