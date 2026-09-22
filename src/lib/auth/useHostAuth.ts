import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Local, PIN-based gate for /admin and host controls. This is a pragmatic
 * stand-in for the spec's Supabase Auth roles (admin/quizmaster/viewer) —
 * there's no live Supabase project yet to authenticate against (see
 * supabase/migrations/0003_roles_and_rls.sql for the schema that's ready for
 * that later pass). The default PIN is intentionally simple since it's only
 * meant to keep the quiz builder off the audience's screen, not secure a
 * multi-tenant system.
 */

const DEFAULT_PIN = '1611'; // 1 Kings 1:1, easy for a host to remember/change

interface HostAuthState {
  pin: string;
  unlocked: boolean;
  setPin: (pin: string) => void;
  unlock: (attempt: string) => boolean;
  lock: () => void;
}

export const useHostAuth = create<HostAuthState>()(
  persist(
    (set, get) => ({
      pin: DEFAULT_PIN,
      unlocked: false,
      setPin: (pin) => set({ pin }),
      unlock: (attempt) => {
        const ok = attempt === get().pin;
        if (ok) set({ unlocked: true });
        return ok;
      },
      lock: () => set({ unlocked: false }),
    }),
    { name: 'bbntcog-host-auth' },
  ),
);
