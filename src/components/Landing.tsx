import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Rabbit, Calendar, BarChart3, Bell, Shield, Database, Check, ArrowRight,
  Heart, Egg, Baby, Sparkles, Lock, Users,
} from 'lucide-react';
import { Wordmark } from './Logo';
import { toast } from './Toast';

export function Landing() {
  const navigate = useNavigate();
  const [familyCode, setFamilyCode] = useState('');

  // The code is only remembered here, not validated — real validation only
  // ever happens server-side, after the person creates an account. This
  // page can't grant anything by itself, unlike the old version.
  const handleFamily = (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyCode.trim()) return;
    sessionStorage.setItem('rtp-family-code', familyCode.trim());
    toast('success', 'Got it — create your account and we\'ll check that code right after.');
    navigate('/auth', { state: { mode: 'signup' } });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 dark:border-slate-800/70 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Wordmark />
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/auth" state={{ mode: 'login' }} className="btn-ghost text-sm px-3 sm:px-4 py-2">Log In</Link>
            <Link to="/auth" state={{ mode: 'signup' }} className="btn-primary text-sm px-3 sm:px-4 py-2">Sign Up</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-200/40 dark:bg-brand-900/20 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/4 w-80 h-80 bg-emerald-200/30 dark:bg-emerald-900/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 px-4 py-1.5 text-sm font-medium text-brand-700 dark:text-brand-300 mb-6 animate-fade-up">
            <Sparkles size={14} /> Built for modern rabbit farmers
          </div>
          <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-[1.05] animate-fade-up">
            Track every litter. <span className="text-brand-600">Grow your farm.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto animate-fade-up">
            RabbitTrack Pro is the all-in-one breeding management system that helps you record matings,
            predict kindlings, manage weaners, and make data-driven decisions for a healthier, more
            productive herd.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-up">
            <Link to="/auth" state={{ mode: 'signup' }} className="btn-primary px-6 py-3 text-base">
              Start free <ArrowRight size={18} />
            </Link>
            <Link to="/auth" state={{ mode: 'login' }} className="btn-secondary px-6 py-3 text-base">
              Log In
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No credit card required · Free plan available</p>
        </div>

        {/* Hero preview card */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
          <div className="card p-4 sm:p-6 shadow-lift animate-fade-up">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {[
                { icon: Heart, label: 'Active Does', value: '24', color: 'text-rose-500' },
                { icon: Baby, label: 'Kits Born', value: '186', color: 'text-brand-600' },
                { icon: Egg, label: 'Weaners', value: '42', color: 'text-amber-500' },
                { icon: BarChart3, label: 'Survival Rate', value: '94%', color: 'text-sky-500' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4">
                  <s.icon size={20} className={s.color} />
                  <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{s.value}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Everything you need to manage your herd</h2>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Powerful tools designed specifically for rabbit breeding operations.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: Rabbit, title: 'Herd Records', desc: 'Track does, bucks, growers, and weaners with detailed profiles, weights, and lineage.' },
            { icon: Calendar, title: 'Smart Calendar', desc: 'Auto-calculated nesting, kindling, weaning, and remating reminders based on mating dates.' },
            { icon: Bell, title: 'Daily Alerts', desc: 'Never miss a kindling, weaning, or remating. Get notified about overdue events instantly.' },
            { icon: BarChart3, title: 'Reports & Charts', desc: 'Breeding performance, kit survival, mortality, and top-producing does — all visualized.' },
            { icon: Database, title: 'Backup & Export', desc: 'One-click backup, restore, CSV and PDF export. Your data is always yours to keep.' },
            { icon: Shield, title: 'Secure & Private', desc: 'Role-based authentication. Each farmer sees only their own herd data, always encrypted.' },
          ].map((f) => (
            <div key={f.title} className="card p-6 hover:shadow-lift transition-shadow duration-300 group">
              <div className="h-12 w-12 rounded-xl bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center text-brand-600 group-hover:scale-110 transition-transform">
                <f.icon size={24} />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-slate-900 dark:text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Simple, honest pricing</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300">Start free. Upgrade when your herd grows.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              { name: 'Free', price: '$0', period: 'forever', features: ['Up to 12 does', 'Basic breeding records', 'Daily alerts', 'Calendar view'], cta: 'Get Started', highlight: false },
              { name: 'Pro', price: '$12', period: 'per month', features: ['Unlimited does', 'Full breeding records', 'Reports & charts', 'CSV & PDF export', 'Backup & restore'], cta: 'Start Pro', highlight: true },
              { name: 'Family', price: '$30', period: 'per month', features: ['Everything in Pro', 'A shareable code', 'Everyone who redeems it gets Pro too', 'Renews monthly'], cta: 'Get Family', highlight: false },
              { name: 'Lifetime', price: '$49.99', period: 'one-time', features: ['Everything in Pro', 'Pay once, never again', 'No recurring fees', 'Includes a permanent family code'], cta: 'Get Lifetime', highlight: false },
            ].map((p) => (
              <div key={p.name} className={`card p-6 flex flex-col relative ${p.highlight ? 'ring-2 ring-brand-500 shadow-lift' : ''}`}>
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs font-semibold px-3 py-1 rounded-full">Most Popular</div>
                )}
                <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">{p.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{p.price}</span>
                  <span className="text-sm text-slate-500">/ {p.period}</span>
                </div>
                <ul className="mt-5 space-y-2.5 flex-1">
                  {p.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <Check size={16} className="text-brand-600 mt-0.5 shrink-0" /> {feat}
                    </li>
                  ))}
                </ul>
                <Link to="/auth" state={{ mode: 'signup' }} className={`mt-6 ${p.highlight ? 'btn-primary' : 'btn-secondary'} w-full py-2.5`}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Family Access */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="card p-6 sm:p-8 text-center bg-gradient-to-br from-brand-50 to-white dark:from-brand-950/30 dark:to-slate-900 border-brand-200 dark:border-brand-900">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-soft">
            <Users size={26} />
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">Family Access</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Have a Family Access code? Enter it below to unlock lifetime premium access — no payment required.
            You'll still create your own account and sign in normally.
          </p>
          {(
            <form onSubmit={handleFamily} className="mt-6 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <div className="relative flex-1">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={familyCode}
                  onChange={(e) => setFamilyCode(e.target.value)}
                  placeholder="Enter Family Access Code"
                  className="input pl-9"
                  autoComplete="off"
                />
              </div>
              <button type="submit" className="btn-primary px-6 py-2.5">Continue</button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Wordmark size="sm" />
          <p className="text-sm text-slate-500 dark:text-slate-400">© {new Date().getFullYear()} RabbitTrack Pro. Built for rabbit farmers.</p>
        </div>
      </footer>
    </div>
  );
}
