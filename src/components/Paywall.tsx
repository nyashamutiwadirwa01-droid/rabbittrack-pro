import { useState } from 'react';
import { Crown, Copy, Check, Clock, ShieldCheck, Sparkles, CalendarClock, Infinity as InfinityIcon, Users } from 'lucide-react';
import { Modal } from './Modal';
import { Logo } from './Logo';
import { toast } from './Toast';
import { useData } from '../lib/data';
import { submitPaymentRequest } from '../lib/api';
import { LIFETIME_PRO_PRICE_USD, PRO_MONTHLY_PRICE_USD, FAMILY_PRICE_USD, ECOCASH_NUMBER } from '../types';
import type { PlanType } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Step = 'offer' | 'instructions' | 'form' | 'submitted';

const PRO_FEATURES = [
  'Unlimited does (Free is capped at 12)',
  'Reports & breeding analytics',
  'Data backup & CSV/PDF export',
];

const PLAN_INFO: Record<PlanType, { label: string; price: number; period: string; icon: typeof CalendarClock; note: string }> = {
  pro_monthly: { label: 'Pro Monthly', price: PRO_MONTHLY_PRICE_USD, period: '/month', icon: CalendarClock, note: 'Renews every 30 days — pay and submit a new reference each month.' },
  lifetime: { label: 'Lifetime', price: LIFETIME_PRO_PRICE_USD, period: 'one-time', icon: InfinityIcon, note: 'Pay once, never pay again — includes a permanent code you can share with family.' },
  family: { label: 'Family', price: FAMILY_PRICE_USD, period: '/month', icon: Users, note: 'Get a code to share — everyone who redeems it gets Pro too, as long as it stays renewed.' },
};

export function PaywallModal({ open, onClose }: Props) {
  const { entitlement, paymentSubmissions, refresh } = useData();
  const [step, setStep] = useState<Step>('offer');
  const [plan, setPlan] = useState<PlanType>('lifetime');
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', ecocash_reference: '', family_code_name: '' });
  const [loading, setLoading] = useState(false);

  const pendingSubmission = paymentSubmissions.find((p) => p.status === 'pending');
  const price = PLAN_INFO[plan].price;

  const copyNumber = () => {
    navigator.clipboard.writeText(ECOCASH_NUMBER).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.full_name.trim() || !form.phone.trim() || !form.ecocash_reference.trim()) {
      toast('error', 'Name, phone, and EcoCash reference are required.');
      return;
    }
    setLoading(true);
    try {
      await submitPaymentRequest({
        full_name: form.full_name,
        phone: form.phone,
        email: form.email,
        ecocash_reference: form.ecocash_reference,
        plan,
        desired_family_code: plan !== 'pro_monthly' ? form.family_code_name : null,
      });
      await refresh();
      setStep('submitted');
    } catch (e) {
      toast('error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    onClose();
    setTimeout(() => setStep('offer'), 200);
  };

  if (entitlement === 'PRO') {
    return (
      <Modal open={open} onClose={close} title="RabbitTrack Pro" size="sm">
        <div className="text-center py-6">
          <Crown className="mx-auto text-amber-500" size={40} />
          <p className="mt-3 font-display text-lg font-bold text-slate-900 dark:text-white">You're already Pro</p>
          <p className="mt-1 text-sm text-slate-500">Your Pro access is active on this account.</p>
          <button onClick={close} className="btn-primary mt-5 px-6 py-2.5">Close</button>
        </div>
      </Modal>
    );
  }

  if (entitlement === 'PAYMENT_PENDING' && step !== 'submitted' && pendingSubmission) {
    return (
      <Modal open={open} onClose={close} title="Payment Pending Verification" size="sm">
        <div className="text-center py-6">
          <Clock className="mx-auto text-amber-500" size={40} />
          <p className="mt-3 font-display text-lg font-bold text-slate-900 dark:text-white">Awaiting verification</p>
          <p className="mt-2 text-sm text-slate-500">
            We've received your {PLAN_INFO[pendingSubmission.plan].label} payment reference <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{pendingSubmission.ecocash_reference}</span>.
            Your account stays on the Free plan until this is manually verified.
          </p>
          <button onClick={close} className="btn-secondary mt-5 px-6 py-2.5">Close</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={close} title="RabbitTrack Pro" size="sm">
      {step === 'offer' && (
        <div>
          <div className="text-center">
            <Logo size="lg" className="mx-auto" />
            <h3 className="mt-3 font-display text-xl font-bold text-slate-900 dark:text-white">Choose your plan</h3>
            <p className="text-xs text-slate-500 mt-1">All plans pay via EcoCash.</p>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {(['pro_monthly', 'lifetime', 'family'] as PlanType[]).map((p) => {
              const info = PLAN_INFO[p];
              const selected = plan === p;
              return (
                <button
                  key={p}
                  onClick={() => setPlan(p)}
                  className={`text-left rounded-xl border-2 p-2.5 transition-colors ${selected ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/30' : 'border-slate-200 dark:border-slate-700'}`}
                >
                  <info.icon size={16} className={selected ? 'text-brand-600' : 'text-slate-400'} />
                  <div className="mt-1 text-xs font-semibold text-slate-900 dark:text-white leading-tight">{info.label}</div>
                  <div className="mt-0.5 flex items-baseline gap-0.5">
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">${info.price}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">{info.period}</div>
                </button>
              );
            })}
          </div>
          <p className="mt-2.5 text-xs text-slate-400">{PLAN_INFO[plan].note}</p>

          <ul className="mt-4 space-y-2">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                <Sparkles size={15} className="text-amber-500 mt-0.5 shrink-0" /> {f}
              </li>
            ))}
          </ul>
          <button onClick={() => setStep('instructions')} className="btn-primary w-full mt-6 py-2.5">Continue with {PLAN_INFO[plan].label}</button>
          <button onClick={close} className="btn-ghost w-full mt-2 py-2">Maybe later</button>
        </div>
      )}

      {step === 'instructions' && (
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Pay ${price} via EcoCash</p>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
            <div>
              <div className="text-xs text-slate-500">EcoCash Number</div>
              <div className="text-lg font-mono font-bold text-slate-900 dark:text-white">{ECOCASH_NUMBER}</div>
            </div>
            <button onClick={copyNumber} className="btn-ghost h-9 w-9 !p-0" title="Copy number">
              {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
            </button>
          </div>
          <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <p>1. Send <strong>exactly ${price}</strong> to the EcoCash number above.</p>
            <p>2. EcoCash will text you a confirmation with a transaction/reference number — keep it.</p>
            <p>3. Come back here and submit your details so we can verify and activate your plan.</p>
            {plan !== 'lifetime' && <p className="text-amber-600 dark:text-amber-400">This plan renews every 30 days — you'll repeat this process to renew.</p>}
            {plan === 'family' && <p>Once verified, find your shareable code in Settings — anyone who enters it gets Pro too.</p>}
          </div>
          <div className="flex gap-2 mt-6">
            <button onClick={() => setStep('form')} className="btn-primary flex-1 py-2.5">I've paid — Submit reference</button>
          </div>
          <button onClick={() => setStep('offer')} className="btn-ghost w-full mt-2 py-2">Back</button>
        </div>
      )}

      {step === 'form' && (
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">Enter the details from your EcoCash payment so we can verify it against {ECOCASH_NUMBER}.</p>
          <div className="space-y-3">
            <div>
              <label className="label">Full Name *</label>
              <input className="input" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <label className="label">Phone Number *</label>
              <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="e.g. 077xxxxxxx" />
            </div>
            <div>
              <label className="label">EcoCash Transaction/Reference Number *</label>
              <input className="input" value={form.ecocash_reference} onChange={(e) => set('ecocash_reference', e.target.value)} placeholder="From your EcoCash confirmation SMS" />
            </div>
            <div>
              <label className="label">Email <span className="text-slate-400 font-normal">(optional)</span></label>
              <input type="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.com" />
            </div>
            {plan !== 'pro_monthly' && (
              <div>
                <label className="label">Family Code Name <span className="text-slate-400 font-normal">(optional — leave blank to auto-generate)</span></label>
                <input className="input" value={form.family_code_name} onChange={(e) => set('family_code_name', e.target.value)} placeholder="e.g. MUTIWADIRWA-FAMILY" />
                <p className="mt-1 text-xs text-slate-400">This is the code you'll share with family — anyone who enters it gets Pro too.</p>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-6">
            <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1 py-2.5">{loading ? 'Submitting…' : 'Submit for Verification'}</button>
          </div>
          <button onClick={() => setStep('instructions')} className="btn-ghost w-full mt-2 py-2">Back</button>
        </div>
      )}

      {step === 'submitted' && (
        <div className="text-center py-4">
          <ShieldCheck className="mx-auto text-emerald-500" size={40} />
          <p className="mt-3 font-display text-lg font-bold text-slate-900 dark:text-white">Payment submitted — awaiting verification</p>
          <p className="mt-2 text-sm text-slate-500">
            Your account stays on the Free plan until we manually confirm this payment against EcoCash {ECOCASH_NUMBER}.
          </p>
          <button onClick={close} className="btn-primary mt-5 px-6 py-2.5">Done</button>
        </div>
      )}
    </Modal>
  );
}
