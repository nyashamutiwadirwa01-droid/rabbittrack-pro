import { createContext, useContext, useCallback, useEffect, useState, useMemo, type ReactNode } from 'react';
import { fetchRabbits, fetchBreedingRecords, fetchMyPaymentSubmissions } from './api';
import type { Rabbit, BreedingRecord, PaymentSubmission, Entitlement } from '../types';
import { useAuth } from './auth';

interface DataContextValue {
  rabbits: Rabbit[];
  records: BreedingRecord[];
  paymentSubmissions: PaymentSubmission[];
  entitlement: Entitlement;
  loading: boolean;
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

// Shared data source for the whole app. Every screen (Dashboard, the alert bell,
// Calendar, Reports, the paywall) reads from this same place instead of fetching on
// its own, so the moment any one of them saves a change, everyone sees it immediately —
// no more stale alerts, numbers, or entitlement state that only updates after a manual refresh.
export function DataProvider({ children }: { children: ReactNode }) {
  const { session, profile } = useAuth();
  const [rabbits, setRabbits] = useState<Rabbit[]>([]);
  const [records, setRecords] = useState<BreedingRecord[]>([]);
  const [paymentSubmissions, setPaymentSubmissions] = useState<PaymentSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [r, b] = await Promise.all([fetchRabbits(), fetchBreedingRecords()]);
      setRabbits(r);
      setRecords(b);
    } finally {
      setLoading(false);
    }
    // Fetched separately and swallowed on failure: if the payment_submissions
    // table hasn't been created yet (migration not run), the rest of the app
    // must keep working normally — entitlement just falls back to FREE/PRO
    // based on profile.premium alone until the table exists.
    try {
      const p = await fetchMyPaymentSubmissions();
      setPaymentSubmissions(p);
    } catch {
      setPaymentSubmissions([]);
    }
  }, []);

  useEffect(() => {
    if (session) refresh();
  }, [session, refresh]);

  // Entitlement is ALWAYS derived, never set directly by any button in this app:
  // - PRO only if profile.premium is true AND (it's lifetime — premium_until is
  //   null — OR premium_until hasn't passed yet). A Pro Monthly or Family plan
  //   that isn't renewed simply falls back to FREE on its own.
  // - PAYMENT_PENDING if there's a submitted-but-not-yet-verified payment request.
  // - FREE otherwise.
  const entitlement: Entitlement = useMemo(() => {
    const isActivePro = !!profile?.premium && (!profile.premium_until || new Date(profile.premium_until) > new Date());
    if (isActivePro) return 'PRO';
    const hasPending = paymentSubmissions.some((p) => p.status === 'pending');
    if (hasPending) return 'PAYMENT_PENDING';
    return 'FREE';
  }, [profile?.premium, profile?.premium_until, paymentSubmissions]);

  return (
    <DataContext.Provider value={{ rabbits, records, paymentSubmissions, entitlement, loading, refresh }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

