import { useState, useRef } from 'react';
import {
  Moon, Sun, Database, Download, Upload, FileText, FileSpreadsheet,
  Shield, User, LogOut, Sparkles, Check, AlertTriangle, Crown,
  Link as LinkIcon, Mail, ShieldCheck as ShieldIcon, KeyRound, Lock,
} from 'lucide-react';
import { useTheme } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { useData } from '../lib/data';
import { supabase } from '../lib/supabase';
import { exportCSV, exportJSON } from '../lib/breeding';
import { toast } from '../components/Toast';
import { useNavigate } from 'react-router-dom';
import { PaywallModal } from '../components/Paywall';
import { redeemFamilyCode } from '../lib/api';
import { isNotificationSupported, getNotificationPermission, requestNotificationPermission } from '../lib/notifications';

export function Settings() {
  const { theme, toggle } = useTheme();
  const { profile, signOut, refreshProfile } = useAuth();
  const { rabbits, records, refresh, entitlement } = useData();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [restoring, setRestoring] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [familyCodeInput, setFamilyCodeInput] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [notifPermission, setNotifPermission] = useState(getNotificationPermission());

  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
    if (result === 'granted') toast('success', 'Notifications enabled — you\'ll get an alert on the day a kindling or weaning is due.');
    else if (result === 'denied') toast('error', 'Notifications blocked. You can re-enable them in your browser\'s site settings.');
  };

  const handleRedeemFamilyCode = async () => {
    if (!familyCodeInput.trim()) return;
    setRedeeming(true);
    try {
      const result = await redeemFamilyCode(familyCodeInput);
      toast(result.success ? 'success' : 'error', result.message);
      if (result.success) {
        setFamilyCodeInput('');
        await refreshProfile();
        await refresh();
      }
    } catch (e) {
      toast('error', (e as Error).message);
    } finally {
      setRedeeming(false);
    }
  };

  // Backup/restore and CSV/PDF export are Pro features. This wraps any of
  // those actions so Free users see the paywall instead of the action running.
  const requirePro = (fn: () => void) => () => {
    if (entitlement !== 'PRO') { setPaywallOpen(true); return; }
    fn();
  };

  const handleBackup = () => {
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      exportJSON(`rabbittrack-backup-${stamp}.json`, { rabbits, breeding_records: records, exported_at: new Date().toISOString() });
      toast('success', 'Backup downloaded.');
    } catch (e) {
      toast('error', (e as Error).message);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Restore will add the backup data to your current herd. Continue?')) { e.target.value = ''; return; }
    setRestoring(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as { rabbits?: any[]; breeding_records?: any[] };
      const backupRabbits = data.rabbits;
      if (!backupRabbits || !Array.isArray(backupRabbits)) throw new Error('Invalid backup file.');
      const uid = profile?.id;
      // Restore rabbits (strip ids so new rows are created)
      const rabbitRows = backupRabbits.map((r) => ({
        rabbit_id: r.rabbit_id,
        name: r.name,
        category: r.category,
        breed: r.breed,
        color: r.color,
        date_of_birth: r.date_of_birth,
        status: r.status,
        weight: r.weight,
        archived: r.archived || false,
        notes: r.notes,
        user_id: uid,
      }));
      const { data: inserted, error: rErr } = await supabase.from('rabbits').insert(rabbitRows).select('id, rabbit_id');
      if (rErr) throw new Error(rErr.message);
      // Map old rabbit ids to new for breeding records (by rabbit_id)
      const idMap = new Map<string, string>();
      (inserted || []).forEach((nr: any) => idMap.set(nr.rabbit_id, nr.id));
      if (data.breeding_records?.length) {
        const breedingRows = data.breeding_records
          .map((b) => ({ ...b, id: undefined, user_id: uid, doe_id: idMap.get(backupRabbits.find((r) => r.id === b.doe_id)?.rabbit_id) || null }))
          .filter((b) => b.doe_id);
        if (breedingRows.length) {
          const { error: bErr } = await supabase.from('breeding_records').insert(breedingRows);
          if (bErr) throw new Error(bErr.message);
        }
      }
      toast('success', `Restored ${rabbitRows.length} rabbits.`);
      await refresh();
    } catch (err) {
      toast('error', (err as Error).message);
    } finally {
      setRestoring(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleExportRabbitsCSV = () => {
    try {
      exportCSV('rabbits.csv', rabbits.map((r) => ({
        id: r.rabbit_id, name: r.name || '', category: r.category, breed: r.breed || '',
        color: r.color || '', date_of_birth: r.date_of_birth || '', status: r.status,
        weight: r.weight ?? '', archived: r.archived, notes: r.notes || '',
      })));
      toast('success', 'Rabbits CSV exported.');
    } catch (e) { toast('error', (e as Error).message); }
  };

  const handleExportBreedingCSV = () => {
    try {
      const doeMap = new Map(rabbits.map((r) => [r.id, r.name || r.rabbit_id]));
      exportCSV('breeding_records.csv', records.map((r) => ({
        doe: doeMap.get(r.doe_id) || '', mating_date: r.mating_date || '',
        nesting_box_date: r.nesting_box_date || '', kindling_date: r.kindling_date || '',
        kits_born: r.kits_born, kits_alive: r.kits_alive, deaths: r.deaths,
        weaning_date: r.weaning_date || '', weaners_count: r.weaners_count,
        remating_date: r.remating_date || '', weaners_transferred_to: r.weaners_transferred_to || '',
        notes: r.notes || '',
      })));
      toast('success', 'Breeding CSV exported.');
    } catch (e) { toast('error', (e as Error).message); }
  };

  const handleExportPDF = async () => {
    // Use browser print to PDF
    window.print();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage your account, appearance, and data.</p>
      </div>

      {/* Account */}
      <Section icon={User} title="Account">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-700 dark:text-brand-300 font-bold text-lg">
            {(profile?.full_name || profile?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-slate-800 dark:text-slate-100">{profile?.full_name || 'Farmer'}</div>
            <div className="text-sm text-slate-500 truncate">{profile?.email}</div>
          </div>
          {profile?.family_access && (
            <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"><Sparkles size={12} /> Family Access</span>
          )}
          {profile?.premium && !profile?.family_access && (
            <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Premium</span>
          )}
        </div>
        <button onClick={handleSignOut} className="btn-secondary mt-4 px-4 py-2"><LogOut size={16} /> Sign out</button>
      </Section>

      {/* Appearance */}
      <Section icon={theme === 'light' ? Moon : Sun} title="Appearance">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-slate-800 dark:text-slate-100">Dark Mode</div>
            <div className="text-sm text-slate-500">Switch between light and dark themes.</div>
          </div>
          <button
            onClick={toggle}
            className={`relative h-7 w-12 rounded-full transition-colors ${theme === 'dark' ? 'bg-brand-600' : 'bg-slate-300'}`}
            aria-label="Toggle theme"
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </Section>

      {/* Data */}
      <Section icon={Database} title="Data Management">
        <div className="grid sm:grid-cols-2 gap-3">
          <ActionCard icon={Download} title="Backup Database" desc="Download all your data as JSON." action={requirePro(handleBackup)} />
          <ActionCard icon={Upload} title="Restore Database" desc="Import a backup JSON file." action={requirePro(() => fileRef.current?.click())} loading={restoring} />
          <ActionCard icon={FileSpreadsheet} title="Export Rabbits CSV" desc="Export rabbit records." action={requirePro(handleExportRabbitsCSV)} />
          <ActionCard icon={FileSpreadsheet} title="Export Breeding CSV" desc="Export breeding records." action={requirePro(handleExportBreedingCSV)} />
        </div>
        <div className="mt-3">
          <ActionCard icon={FileText} title="Export PDF" desc="Print or save as PDF via your browser." action={requirePro(handleExportPDF)} />
        </div>
        {entitlement !== 'PRO' && <p className="mt-3 text-xs text-slate-400">Backup, restore, and export are Pro features.</p>}
        <input ref={fileRef} type="file" accept="application/json" onChange={handleRestore} className="hidden" />
      </Section>

      {/* Notifications */}
      {isNotificationSupported() && (
        <Section icon={Sparkles} title="Notifications">
          {notifPermission === 'granted' ? (
            <div className="flex items-center gap-2 text-sm text-brand-700 dark:text-brand-300">
              <Check size={16} /> Enabled — you'll be notified the day a kindling or weaning is due.
            </div>
          ) : notifPermission === 'denied' ? (
            <p className="text-sm text-slate-500">Blocked in your browser. Re-enable via your browser's site settings (click the lock icon next to the address bar).</p>
          ) : (
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">Get a real notification the day a kindling or weaning is due, even if this tab isn't open.</p>
              <button onClick={handleEnableNotifications} className="btn-primary px-5 py-2">Enable Notifications</button>
            </div>
          )}
        </Section>
      )}

      {/* Family Access */}
      <Section icon={KeyRound} title="Family Access">
        {entitlement === 'PRO' ? (
          <div className="flex items-center gap-2 text-sm text-brand-700 dark:text-brand-300">
            <Check size={16} /> Pro is already active on this account — no code needed.
          </div>
        ) : (
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">Have a code from a family member? Enter it here to unlock Pro on your account.</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="input pl-9"
                  placeholder="Enter Family Access Code"
                  value={familyCodeInput}
                  onChange={(e) => setFamilyCodeInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRedeemFamilyCode(); }}
                  autoComplete="off"
                />
              </div>
              <button onClick={handleRedeemFamilyCode} disabled={redeeming} className="btn-primary px-5 shrink-0">
                {redeeming ? 'Checking…' : 'Redeem'}
              </button>
            </div>
          </div>
        )}
      </Section>

      {/* Security */}
      <Section icon={Shield} title="Security">
        <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
          <div className="flex items-center gap-2"><Check size={16} className="text-brand-600" /> Your data is protected with row-level security.</div>
          <div className="flex items-center gap-2"><Check size={16} className="text-brand-600" /> Only you can access your herd records.</div>
          <div className="flex items-center gap-2"><AlertTriangle size={16} className="text-amber-500" /> Keep your password safe. Reset via the login screen if needed.</div>
        </div>
      </Section>

      {/* Quick Links */}
      <Section icon={LinkIcon} title="Quick Links">
        <div className="space-y-1">
          <a href="mailto:support@rabbittrackpro.app" className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-brand-600 py-1.5">
            <Mail size={15} /> Contact Support
          </a>
          {profile?.role === 'admin' && (
            <button onClick={() => navigate('/app/admin')} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-brand-600 py-1.5">
              <ShieldIcon size={15} /> Admin
            </button>
          )}
        </div>
      </Section>

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof User; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} className="text-brand-600" />
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ActionCard({ icon: Icon, title, desc, action, loading }: { icon: typeof Download; title: string; desc: string; action: () => void; loading?: boolean }) {
  return (
    <button onClick={action} disabled={loading} className="text-left rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:border-brand-300 hover:bg-brand-50/30 dark:hover:bg-brand-950/20 transition-colors group">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-brand-50 dark:bg-brand-950/40 text-brand-600 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-800 dark:text-slate-100 text-sm">{loading ? 'Working…' : title}</div>
          <div className="text-xs text-slate-500">{desc}</div>
        </div>
      </div>
    </button>
  );
}
