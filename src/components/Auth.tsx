import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, Check, Users, Sparkles } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { redeemFamilyCode } from '../lib/api';
import { Wordmark } from './Logo';
import { toast } from './Toast';

type Mode = 'login' | 'signup' | 'reset';

export function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signIn, signUp, resetPassword } = useAuth();
  const initialMode = (location.state as { mode?: Mode } | null)?.mode === 'signup' ? 'signup' : 'login';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  // A code entered on the landing page (before signing up) is remembered here
  // and only actually checked server-side once the account exists — the
  // browser never decides on its own whether a code is valid.
  const pendingFamilyCode = sessionStorage.getItem('rtp-family-code');

  useEffect(() => {
    const m = (location.state as { mode?: Mode } | null)?.mode;
    if (m === 'signup' || m === 'login' || m === 'reset') setMode(m);
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password, remember);
        if (error) toast('error', error);
        else { toast('success', 'Welcome back!'); navigate('/app'); }
      } else if (mode === 'signup') {
        if (password.length < 6) { toast('error', 'Password must be at least 6 characters.'); setLoading(false); return; }
        const { error } = await signUp(email, password, fullName);
        if (error) { toast('error', error); setLoading(false); return; }
        if (pendingFamilyCode) {
          // Sign in first so the redemption call is authenticated, then
          // validate the code for real, server-side.
          await signIn(email, password, remember);
          try {
            const result = await redeemFamilyCode(pendingFamilyCode);
            toast(result.success ? 'success' : 'error', result.success ? 'Account created — Family Access unlocked!' : `Account created, but: ${result.message}`);
          } catch {
            toast('success', 'Account created!');
          }
          sessionStorage.removeItem('rtp-family-code');
        } else {
          toast('success', 'Account created!');
        }
        navigate('/app');
      } else if (mode === 'reset') {
        const { error } = await resetPassword(email);
        if (error) toast('error', error);
        else { setResetSent(true); toast('success', 'Password reset link sent to your email.'); }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <header className="h-16 px-4 sm:px-6 flex items-center justify-between">
        <Link to="/"><Wordmark size="sm" /></Link>
        <Link to="/" className="btn-ghost text-sm px-3 py-2"><ArrowLeft size={16} /> Back</Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="card p-6 sm:p-8 animate-fade-up">
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset password'}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              {mode === 'login' ? 'Sign in to manage your herd.' : mode === 'signup' ? 'Start tracking your rabbits today.' : 'We’ll email you a reset link.'}
            </p>

            {pendingFamilyCode && mode === 'signup' && (
              <div className="mt-4 rounded-xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 px-3.5 py-2.5 flex items-center gap-2 text-sm text-brand-700 dark:text-brand-300">
                <Sparkles size={16} /> Family Access code will be checked after your account is created
              </div>
            )}

            {resetSent ? (
              <div className="mt-6 rounded-xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 p-4 text-center">
                <Check size={24} className="mx-auto text-brand-600" />
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">Check your email for a reset link.</p>
                <button onClick={() => { setMode('login'); setResetSent(false); }} className="btn-secondary mt-4 px-4 py-2 text-sm">Back to login</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="label">Full Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input className="input pl-9" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Farmer" required />
                    </div>
                  </div>
                )}
                <div>
                  <label className="label">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="email" className="input pl-9" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                  </div>
                </div>
                {mode !== 'reset' && (
                  <div>
                    <label className="label">Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type={showPass ? 'text' : 'password'} className="input pl-9 pr-9" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                      <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                {mode === 'login' && (
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                      <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                      Remember me
                    </label>
                    <button type="button" onClick={() => setMode('reset')} className="text-sm text-brand-600 hover:text-brand-700 font-medium">Forgot password?</button>
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                  {loading ? 'Please wait…' : mode === 'login' ? 'Log In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
                </button>
              </form>
            )}

            {mode !== 'reset' && !resetSent && (
              <div className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
                {mode === 'login' ? (
                  <>Don't have an account? <button onClick={() => setMode('signup')} className="text-brand-600 hover:text-brand-700 font-semibold">Sign up</button></>
                ) : (
                  <>Already have an account? <button onClick={() => setMode('login')} className="text-brand-600 hover:text-brand-700 font-semibold">Log in</button></>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 text-center">
            <Link to="/" className="text-sm text-slate-400 hover:text-slate-600 inline-flex items-center gap-1.5">
              <Users size={14} /> Have a Family Access code? Enter it on the home page.
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
