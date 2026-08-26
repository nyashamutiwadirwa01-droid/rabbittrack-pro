import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars. Check .env for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

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
const storage: Storage = {
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
