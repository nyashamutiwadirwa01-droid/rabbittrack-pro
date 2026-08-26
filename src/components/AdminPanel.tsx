import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Users, Clock, Crown, Ban, CheckCircle2, XCircle, Search,
  RefreshCw, FileText as FileTextIcon, ScrollText, ChevronLeft, KeyRound, Copy, Plus,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { toast } from './Toast';
import type { AdminStats, AdminRevenueStats, AdminPaymentSubmission, AuditLogEntry, Profile, FamilyCode } from '../types';
import {
  adminStats, adminRevenueStats, adminSearchUsers, adminListPaymentSubmissions, adminVerifyPayment,
  adminGrantPro, adminGrantProMonthly, adminRevokePro, adminSuspendUser, adminRestoreUser, adminListAuditLog,
  adminCreateFamilyCode, adminListFamilyCodes, adminSetFamilyCodeActive,
} from '../lib/api';

type Tab = 'overview' | 'payments' | 'users' | 'family' | 'audit';

// This screen is only reachable at all if AdminRoute (in App.tsx) already
// confirmed profile.role === 'admin' client-side. Every action below still
// goes through a server-side admin_* Postgres function that independently
// re-checks the caller is an admin — so this screen has no privileged
// access of its own, it just calls functions that enforce it themselves.
export function AdminPanel({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={onBack} className="btn-ghost h-9 w-9 !p-0"><ChevronLeft size={18} /></button>
        <Shield className="text-brand-600" size={22} />
        <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Admin Panel</h1>
      </div>

      <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
        {([
          ['overview', 'Overview', Users],
          ['payments', 'Payment Verification', CheckCircle2],
          ['users', 'Manage Users', Search],
          ['family', 'Family Codes', KeyRound],
          ['audit', 'Audit Log', ScrollText],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${tab === key ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'}`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'payments' && <PaymentsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'family' && <FamilyCodesTab />}
      {tab === 'audit' && <AuditTab />}
    </div>
  );
}

function OverviewTab() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [revenue, setRevenue] = useState<AdminRevenueStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([adminStats(), adminRevenueStats()]);
      setStats(s);
      setRevenue(r);
    } catch (e) { toast('error', (e as Error).message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="card p-8 text-center text-slate-500">Loading stats…</div>;
  if (!stats) return null;

  const cards = [
    { label: 'Total Users', value: stats.total_users, icon: Users, color: 'text-slate-600' },
    { label: 'Free Users', value: stats.free_users, icon: Users, color: 'text-slate-500' },
    { label: 'Pending Payments', value: stats.pending_payments, icon: Clock, color: 'text-amber-500' },
    { label: 'Pro Users', value: stats.pro_users, icon: Crown, color: 'text-brand-600' },
    { label: 'Suspended', value: stats.suspended_users, icon: Ban, color: 'text-rose-500' },
  ];

  const planBreakdown = revenue ? [
    { label: 'Pro Monthly', value: revenue.revenue_pro_monthly, color: 'bg-brand-500' },
    { label: 'Lifetime', value: revenue.revenue_lifetime, color: 'bg-amber-500' },
    { label: 'Family', value: revenue.revenue_family, color: 'bg-sky-500' },
  ] : [];
  const maxPlanValue = Math.max(1, ...planBreakdown.map((p) => p.value));

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <c.icon className={c.color} size={18} />
            <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{c.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {revenue && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <div className="card p-5 bg-gradient-to-br from-brand-600 to-brand-700 text-white">
              <div className="text-xs opacity-80">Total Revenue (all-time, verified)</div>
              <div className="mt-1 text-3xl font-extrabold">${revenue.total_revenue.toFixed(2)}</div>
            </div>
            <div className="card p-5">
              <div className="text-xs text-slate-500">Estimated MRR</div>
              <div className="mt-1 text-3xl font-extrabold text-slate-900 dark:text-white">${revenue.mrr_estimate.toFixed(2)}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Active Pro Monthly + Family, per month</div>
            </div>
            <div className="card p-5">
              <div className="text-xs text-slate-500">Verified Payments</div>
              <div className="mt-1 text-3xl font-extrabold text-slate-900 dark:text-white">{revenue.verified_count}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{revenue.pending_count} awaiting verification</div>
            </div>
          </div>

          <div className="card p-5">
            <div className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Revenue by Plan</div>
            <div className="space-y-3">
              {planBreakdown.map((p) => (
                <div key={p.label}>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>{p.label}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">${p.value.toFixed(2)}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className={`h-full rounded-full ${p.color}`} style={{ width: `${(p.value / maxPlanValue) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentsTab() {
  const [items, setItems] = useState<AdminPaymentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await adminListPaymentSubmissions()); } catch (e) { toast('error', (e as Error).message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, approve: boolean) => {
    const notes = approve ? undefined : window.prompt('Reason for rejecting (optional):') || undefined;
    setBusyId(id);
    try {
      await adminVerifyPayment(id, approve, notes);
      toast('success', approve ? 'Payment verified — Pro activated.' : 'Payment rejected.');
      await load();
    } catch (e) { toast('error', (e as Error).message); } finally { setBusyId(null); }
  };

  if (loading) return <div className="card p-8 text-center text-slate-500">Loading payment submissions…</div>;
  if (items.length === 0) return <div className="card p-8 text-center text-slate-500">No payment submissions yet.</div>;

  return (
    <div className="space-y-3">
      {items.map((p) => (
        <div key={p.id} className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 dark:text-white truncate">{p.full_name}</div>
              <div className="text-xs text-slate-500 truncate">{p.user_email}</div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
                {p.plan === 'pro_monthly' ? 'Pro Monthly' : p.plan === 'family' ? 'Family' : 'Lifetime'}
              </span>
              <StatusPill status={p.status} />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 mt-3 text-sm">
            <InfoField label="Phone" value={p.phone} />
            <InfoField label="Email" value={p.email || '—'} />
            <InfoField label="Amount" value={`$${p.amount_usd}`} />
            <InfoField label="EcoCash Ref" value={p.ecocash_reference} />
            <InfoField label="Submitted" value={new Date(p.created_at).toLocaleString()} />
            {p.admin_notes && <InfoField label="Notes" value={p.admin_notes} />}
          </div>
          {p.status === 'pending' && (
            <div className="flex gap-2 mt-4">
              <button onClick={() => act(p.id, true)} disabled={busyId === p.id} className="btn-primary flex-1 py-2 text-sm">
                {busyId === p.id ? 'Working…' : 'Verify Payment'}
              </button>
              <button onClick={() => act(p.id, false)} disabled={busyId === p.id} className="btn-secondary flex-1 py-2 text-sm text-rose-600">Reject</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function UsersTab() {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try { setUsers(await adminSearchUsers(q)); } catch (e) { toast('error', (e as Error).message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(''); }, [load]);

  const grantPro = async (u: Profile) => {
    setBusyId(u.id);
    try { await adminGrantProMonthly(u.id, 'Manually granted by admin (30 days)'); toast('success', `Pro (30 days) granted to ${u.email}.`); await load(query); }
    catch (e) { toast('error', (e as Error).message); } finally { setBusyId(null); }
  };

  const grantLifetime = async (u: Profile) => {
    setBusyId(u.id);
    try { await adminGrantPro(u.id, 'Manually granted by admin (lifetime)'); toast('success', `Lifetime Pro granted to ${u.email}.`); await load(query); }
    catch (e) { toast('error', (e as Error).message); } finally { setBusyId(null); }
  };

  const revokePro = async (u: Profile) => {
    const reason = window.prompt(`Reason for revoking Pro from ${u.email}? (required)`);
    if (!reason) return;
    setBusyId(u.id);
    try { await adminRevokePro(u.id, reason); toast('success', `Pro revoked from ${u.email}.`); await load(query); }
    catch (e) { toast('error', (e as Error).message); } finally { setBusyId(null); }
  };

  const suspend = async (u: Profile) => {
    const reason = window.prompt(`Reason for suspending ${u.email}? (required)`);
    if (!reason) return;
    setBusyId(u.id);
    try { await adminSuspendUser(u.id, reason); toast('success', `${u.email} suspended.`); await load(query); }
    catch (e) { toast('error', (e as Error).message); } finally { setBusyId(null); }
  };

  const restore = async (u: Profile) => {
    setBusyId(u.id);
    try { await adminRestoreUser(u.id, 'Restored by admin'); toast('success', `${u.email} restored.`); await load(query); }
    catch (e) { toast('error', (e as Error).message); } finally { setBusyId(null); }
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          className="input flex-1"
          placeholder="Search by name or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') load(query); }}
        />
        <button onClick={() => load(query)} className="btn-secondary px-4"><Search size={16} /></button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-slate-500">Loading users…</div>
      ) : users.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">No users found.</div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-white truncate">{u.full_name || u.email}</div>
                  <div className="text-xs text-slate-500 truncate">{u.email}</div>
                </div>
                <div className="flex gap-1.5">
                  {u.suspended && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">Suspended</span>}
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${u.premium ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                    {u.premium ? 'Pro' : 'Free'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm">
                <InfoField label="Pro Activated" value={u.pro_activated_at ? new Date(u.pro_activated_at).toLocaleDateString() : '—'} />
                <InfoField label="Joined" value={new Date(u.created_at).toLocaleDateString()} />
                {u.suspended && <InfoField label="Suspension Reason" value={u.suspended_reason || '—'} />}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {!u.premium
                  ? (
                    <>
                      <button onClick={() => grantPro(u)} disabled={busyId === u.id} className="btn-secondary text-sm px-3 py-1.5">Grant Pro (30d)</button>
                      <button onClick={() => grantLifetime(u)} disabled={busyId === u.id} className="btn-secondary text-sm px-3 py-1.5">Grant Lifetime Pro</button>
                    </>
                  )
                  : <button onClick={() => revokePro(u)} disabled={busyId === u.id} className="btn-secondary text-sm px-3 py-1.5 text-rose-600">Revoke Pro</button>}
                {!u.suspended
                  ? <button onClick={() => suspend(u)} disabled={busyId === u.id} className="btn-secondary text-sm px-3 py-1.5 text-rose-600">Suspend</button>
                  : <button onClick={() => restore(u)} disabled={busyId === u.id} className="btn-secondary text-sm px-3 py-1.5">Restore</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FamilyCodesTab() {
  const [items, setItems] = useState<FamilyCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newCode, setNewCode] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await adminListFamilyCodes()); } catch (e) { toast('error', (e as Error).message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    const code = newCode.trim() || `FAM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    setCreating(true);
    try {
      await adminCreateFamilyCode(code);
      toast('success', `Code "${code}" created.`);
      setNewCode('');
      await load();
    } catch (e) { toast('error', (e as Error).message); } finally { setCreating(false); }
  };

  const toggle = async (c: FamilyCode) => {
    setBusyId(c.id);
    try {
      await adminSetFamilyCodeActive(c.id, !c.active);
      toast('success', c.active ? `"${c.code}" deactivated.` : `"${c.code}" reactivated.`);
      await load();
    } catch (e) { toast('error', (e as Error).message); } finally { setBusyId(null); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast('success', 'Code copied.');
  };

  return (
    <div>
      <div className="card p-4 mb-4">
        <p className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Create a new code</p>
        <p className="text-xs text-slate-500 mb-3">Leave blank to auto-generate. Admin-created codes never expire unless you deactivate them — they're separate from the $30/month codes customers earn by paying (those come from Payment Verification and renew automatically when verified).</p>
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="Optional custom code" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
          <button onClick={create} disabled={creating} className="btn-primary px-4 shrink-0"><Plus size={16} /> Create</button>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-slate-500">Loading codes…</div>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">No family codes yet.</div>
      ) : (
        <div className="space-y-3">
          {items.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">{c.code}</span>
                  <button onClick={() => copyCode(c.code)} className="btn-ghost h-7 w-7 !p-0 shrink-0"><Copy size={13} /></button>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${c.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                  {c.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mt-3 text-sm">
                <InfoField label="Owner" value={c.owner_email || 'Admin-created'} />
                <InfoField label="Members" value={String(c.member_count)} />
                <InfoField label="Expires" value={c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Never'} />
              </div>
              <div className="mt-4">
                <button onClick={() => toggle(c)} disabled={busyId === c.id} className={`btn-secondary text-sm px-3 py-1.5 ${c.active ? 'text-rose-600' : ''}`}>
                  {c.active ? 'Deactivate' : 'Reactivate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AuditTab() {
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await adminListAuditLog()); } catch (e) { toast('error', (e as Error).message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="card p-8 text-center text-slate-500">Loading audit log…</div>;
  if (items.length === 0) return <div className="card p-8 text-center text-slate-500">No admin actions recorded yet.</div>;

  return (
    <div className="card divide-y divide-slate-100 dark:divide-slate-800">
      {items.map((a) => (
        <div key={a.id} className="p-4 text-sm">
          <span className="font-semibold text-slate-900 dark:text-white">{a.admin_email}</span>{' '}
          <span className="text-slate-600 dark:text-slate-300">{describeAction(a.action)}</span>
          {a.target_email && <span className="text-slate-900 dark:text-white font-medium"> {a.target_email}</span>}
          {a.reason && <span className="text-slate-500"> — "{a.reason}"</span>}
          <div className="text-xs text-slate-400 mt-1">{new Date(a.created_at).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

function describeAction(action: string): string {
  switch (action) {
    case 'verify_payment': return 'verified payment for';
    case 'reject_payment': return 'rejected payment for';
    case 'grant_pro': return 'granted Lifetime Pro to';
    case 'grant_pro_monthly': return 'granted Pro (30 days) to';
    case 'revoke_pro': return 'revoked Pro for';
    case 'suspend': return 'suspended';
    case 'restore': return 'restored';
    case 'create_family_code': return 'created family code for';
    case 'deactivate_family_code': return 'deactivated a family code';
    case 'reactivate_family_code': return 'reactivated a family code';
    default: return action;
  }
}

function StatusPill({ status }: { status: 'pending' | 'verified' | 'rejected' }) {
  const map = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    verified: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  };
  return <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${map[status]}`}>{status}</span>;
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="font-medium text-slate-700 dark:text-slate-200 truncate">{value}</div>
    </div>
  );
}
