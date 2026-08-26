import { useState, useMemo, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar as CalendarIcon, BarChart3, Settings, LogOut, Menu, X,
  Moon, Sun, Bell, Rabbit as RabbitIcon, Sparkles, Crown, Clock,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useData } from '../lib/data';
import { useTheme } from '../lib/theme';
import { Wordmark } from './Logo';
import { generateAlerts } from '../lib/breeding';
import { notifyDueTodayAlerts } from '../lib/notifications';
import { AlertsPanel } from './AlertsPanel';
import { PaywallModal } from './Paywall';

interface ShellProps {
  children: React.ReactNode;
  onNavigate?: () => void;
}

const navItems = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/calendar', label: 'Calendar', icon: CalendarIcon },
  { to: '/app/reports', label: 'Reports', icon: BarChart3 },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

export function AppShell({ children }: ShellProps) {
  const { profile, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const { rabbits, records, entitlement } = useData();

  const doeMap = useMemo(() => {
    const m = new Map<string, string>();
    rabbits.filter((r) => r.category === 'doe').forEach((d) => m.set(d.id, d.name || d.rabbit_id));
    return m;
  }, [rabbits]);

  const alerts = useMemo(() => generateAlerts(records, doeMap), [records, doeMap]);
  const alertCount = alerts.length;

  // Fire a real OS notification for anything due today, once per alert —
  // this runs every time alerts recompute (e.g. new/changed records), but
  // notifyDueTodayAlerts internally skips anything already notified.
  useEffect(() => {
    notifyDueTodayAlerts(alerts);
  }, [alerts]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex overflow-x-hidden">
      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="h-16 px-5 flex items-center">
          <Wordmark size="sm" />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`
              }
            >
              <n.icon size={18} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          {profile?.family_access && (
            <div className="mb-2 rounded-xl bg-brand-50 dark:bg-brand-950/40 px-3 py-2 flex items-center gap-2 text-xs font-medium text-brand-700 dark:text-brand-300">
              <Sparkles size={14} /> Lifetime Premium
            </div>
          )}
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="h-9 w-9 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-700 dark:text-brand-300 font-semibold text-sm">
              {(profile?.full_name || profile?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{profile?.full_name || 'Farmer'}</div>
              <div className="text-xs text-slate-500 truncate">{profile?.email}</div>
            </div>
            <button onClick={handleSignOut} className="btn-ghost h-8 w-8 !p-0" title="Sign out"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 max-w-[80vw] bg-white dark:bg-slate-900 flex flex-col animate-slide-in">
            <div className="h-16 px-5 flex items-center justify-between">
              <Wordmark size="sm" />
              <button onClick={() => setMobileOpen(false)} className="btn-ghost h-9 w-9 !p-0"><X size={18} /></button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                      isActive ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`
                  }
                >
                  <n.icon size={18} /> {n.label}
                </NavLink>
              ))}
            </nav>
            <div className="p-3 border-t border-slate-200 dark:border-slate-800">
              <button onClick={handleSignOut} className="btn-secondary w-full py-2.5"><LogOut size={16} /> Sign out</button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden btn-ghost h-10 w-10 !p-0 shrink-0"><Menu size={20} /></button>
            <div className="lg:hidden shrink-0"><Wordmark size="sm" /></div>
            <div className="hidden lg:flex items-center gap-2 text-slate-400 min-w-0">
              <RabbitIcon size={18} className="text-brand-600 shrink-0" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 truncate">Herd Management</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={toggle} className="btn-ghost h-10 w-10 !p-0" title="Toggle theme">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button onClick={() => setAlertsOpen(true)} className="btn-ghost h-10 w-10 !p-0 relative" title="Alerts">
              <Bell size={18} />
              {alertCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </button>
            {entitlement !== 'PRO' && (
              <button
                onClick={() => setPaywallOpen(true)}
                className={`btn-ghost h-10 px-3 gap-1.5 text-sm font-semibold ${entitlement === 'PAYMENT_PENDING' ? 'text-amber-500' : 'text-amber-600'}`}
                title={entitlement === 'PAYMENT_PENDING' ? 'Payment pending verification' : 'Upgrade to Lifetime Pro'}
              >
                {entitlement === 'PAYMENT_PENDING' ? <Clock size={16} /> : <Crown size={16} />}
                <span className="hidden sm:inline">{entitlement === 'PAYMENT_PENDING' ? 'Pending' : 'Upgrade'}</span>
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      <AlertsPanel open={alertsOpen} onClose={() => setAlertsOpen(false)} alerts={alerts} />
      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </div>
  );
}
