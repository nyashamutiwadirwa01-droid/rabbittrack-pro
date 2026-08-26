import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { toast } from './Toast';
import { createRabbit, updateRabbit } from '../lib/api';
import type { Rabbit, RabbitCategory } from '../types';
import { CATEGORY_SINGULAR } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  rabbit?: Rabbit | null;
  defaultCategory?: RabbitCategory;
}

export function RabbitForm({ open, onClose, onSaved, rabbit, defaultCategory = 'doe' }: Props) {
  const isEdit = !!rabbit;
  const [form, setForm] = useState({
    rabbit_id: '',
    name: '',
    category: 'doe' as RabbitCategory,
    breed: '',
    color: '',
    date_of_birth: '',
    status: 'active',
    weight: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (rabbit) {
      setForm({
        rabbit_id: rabbit.rabbit_id,
        name: rabbit.name || '',
        category: rabbit.category,
        breed: rabbit.breed || '',
        color: rabbit.color || '',
        date_of_birth: rabbit.date_of_birth || '',
        status: rabbit.status,
        weight: rabbit.weight != null ? String(rabbit.weight) : '',
        notes: rabbit.notes || '',
      });
    } else {
      setForm({
        rabbit_id: `R-${Date.now().toString().slice(-6)}`,
        name: '',
        category: defaultCategory,
        breed: '',
        color: '',
        date_of_birth: '',
        status: 'active',
        weight: '',
        notes: '',
      });
    }
  }, [rabbit, defaultCategory, open]);

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.rabbit_id.trim()) { toast('error', 'Rabbit ID is required.'); return; }
    setLoading(true);
    try {
      const payload = {
        rabbit_id: form.rabbit_id.trim(),
        name: form.name.trim() || null,
        category: form.category,
        breed: form.breed.trim() || null,
        color: form.color.trim() || null,
        date_of_birth: form.date_of_birth || null,
        status: form.status,
        weight: form.weight ? parseFloat(form.weight) : null,
        notes: form.notes.trim() || null,
      };
      if (isEdit && rabbit) await updateRabbit(rabbit.id, payload);
      else await createRabbit(payload);
      toast('success', isEdit ? 'Rabbit updated.' : 'Rabbit added.');
      onSaved();
      onClose();
    } catch (err) {
      toast('error', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? `Edit ${CATEGORY_SINGULAR[form.category]}` : `Add ${CATEGORY_SINGULAR[form.category]}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Rabbit ID *</label>
            <input className="input" value={form.rabbit_id} onChange={(e) => set('rabbit_id', e.target.value)} required />
          </div>
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={(e) => set('category', e.target.value)}>
              <option value="doe">Doe</option>
              <option value="buck">Buck</option>
              <option value="grower">Grower</option>
              <option value="weaner">Weaner</option>
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="resting">Resting</option>
              <option value="breeding">Breeding</option>
              <option value="nursing">Nursing</option>
              <option value="pregnant">Pregnant</option>
              <option value="sold">Sold</option>
              <option value="deceased">Deceased</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Breed</label>
            <input className="input" value={form.breed} onChange={(e) => set('breed', e.target.value)} placeholder="e.g. New Zealand White" />
          </div>
          <div>
            <label className="label">Color</label>
            <input className="input" value={form.color} onChange={(e) => set('color', e.target.value)} placeholder="e.g. Black" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date of Birth</label>
            <input type="date" className="input" value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} />
          </div>
          <div>
            <label className="label">Weight (kg)</label>
            <input type="number" step="0.01" min="0" className="input" value={form.weight} onChange={(e) => set('weight', e.target.value)} placeholder="0.00" />
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input min-h-[80px] resize-y" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Any notes about this rabbit…" />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={loading} className="btn-primary flex-1 py-2.5">{loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Rabbit'}</button>
          <button type="button" onClick={onClose} className="btn-secondary px-5 py-2.5">Cancel</button>
        </div>
      </form>
    </Modal>
  );
}


