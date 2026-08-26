import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { DataProvider } from './lib/data';
import { ThemeProvider } from './lib/theme';
import { ToastHost } from './components/Toast';
import { Landing } from './components/Landing';
import { Auth } from './components/Auth';
import { AppShell } from './components/AppShell';
import { Dashboard } from './components/Dashboard';
import { CalendarPage } from './components/CalendarPage';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { AdminPanel } from './components/AdminPanel';
import type { ReactNode } from 'react';

function Protected({ children }: { children: ReactNode }) {
  const { session, profile, loading, signOut } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading…</div>;
  if (!session) return <Navigate to="/auth" state={{ mode: 'login' }} replace />;

  // Suspended accounts are blocked from using the app, but their data is
  // never touched — this is a UI gate only, nothing is deleted.
  if (profile?.suspended) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card max-w-sm w-full p-6 text-center">
          <h1 className="font-display text-lg font-bold text-slate-900 dark:text-white">Account Suspended</h1>
          <p className="mt-2 text-sm text-slate-500">
            {profile.suspended_reason ? `Reason: ${profile.suspended_reason}` : 'Your account has been suspended.'}
          </p>
          {profile.suspended_until && (
            <p className="mt-1 text-xs text-slate-400">Until {new Date(profile.suspended_until).toLocaleDateString()}</p>
          )}
          <button onClick={() => signOut()} className="btn-secondary mt-5 px-5 py-2">Sign Out</button>
        </div>
      </div>
    );
  }

  return (
    <DataProvider>
      <AppShell>{children}</AppShell>
    </DataProvider>
  );
}

// The root page remains public for logged-out visitors, but remembered users
// should go straight to the dashboard after the session is restored.
function RootRoute() {
  const { session, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading…</div>;
  if (session) return <Navigate to="/app" replace />;
  return <Landing />;
}

// The redirect below (in AdminGate) is a convenience, not the security
// boundary — every admin_* function called from AdminPanel independently
// re-checks profiles.role = 'admin' inside the database before doing anything.

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRoute />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/app" element={<Protected><Dashboard /></Protected>} />
            <Route path="/app/calendar" element={<Protected><CalendarPage /></Protected>} />
            <Route path="/app/reports" element={<Protected><Reports /></Protected>} />
            <Route path="/app/settings" element={<Protected><Settings /></Protected>} />
            <Route path="/app/admin" element={<Protected><AdminGate /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ToastHost />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

function AdminGate() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  if (profile?.role !== 'admin') return <Navigate to="/app" replace />;
  return <AdminPanel onBack={() => navigate('/app/settings')} />;
}

export default App;
