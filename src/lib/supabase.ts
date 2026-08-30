import { createClient } from '@supabase/supabase-js';

// These are public Supabase client values. Environment variables remain preferred,
// while the fallback keeps static Cloudflare builds from failing before React mounts.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)
  || 'https://xdzekgbbvkoswqvnmbxr.supabase.co';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
  || 'sb_publishable_Mlkr4Nevda3OyLPyta_fhA_94ng1nlp';

const REMEMBER_KEY = 'rabbittrack-remember-me';

function rememberMeEnabled(): boolean {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== 'false';
  } catch {
    return true;
  }
}

function authStorage(): Storage {
  return rememberMeEnabled() ? window.localStorage : window.sessionStorage;
}

// Supabase Auth stores its session through this adapter. The checkbox controls
// whether the session goes into localStorage (survives browser restart) or
// sessionStorage (removed when the tab/browser session ends).
const storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
  getItem: (key) => authStorage().getItem(key),
  setItem: (key, value) => authStorage().setItem(key, value),
  removeItem: (key) => authStorage().removeItem(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage,
  },
});

export function setRememberPreference(remember: boolean) {
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? 'true' : 'false');
  } catch {
    // Ignore storage errors, such as private browsing restrictions.
  }
}

export function clearAuthStorage() {
  try {
    for (const store of [window.localStorage, window.sessionStorage]) {
      for (let i = store.length - 1; i >= 0; i -= 1) {
        const key = store.key(i);
        if (key?.startsWith('sb-')) store.removeItem(key);
      }
    }
  } catch {
    // Ignore storage errors.
  }
}
