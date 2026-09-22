import { useState, type ReactNode, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import { useHostAuth } from '../../lib/auth/useHostAuth';
import { AppShell } from '../layout/AppShell';
import { ChurchLogo } from '../brand/ChurchLogo';

export function RequireHostAuth({ children }: { children: ReactNode }) {
  const { unlocked, unlock } = useHostAuth();
  const [attempt, setAttempt] = useState('');
  const [error, setError] = useState(false);

  if (unlocked) return <>{children}</>;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (unlock(attempt)) {
      setError(false);
    } else {
      setError(true);
    }
  }

  return (
    <AppShell theme="light">
      <div className="game-safe-area tv-safe-area flex flex-col items-center justify-center gap-6 min-h-[70vh] text-center">
        <ChurchLogo size="lg" />
        <div className="flex items-center gap-2 text-bb-navy">
          <Lock size={20} />
          <h1 className="font-display text-2xl font-bold">Host Access</h1>
        </div>
        <p className="text-bb-navy/60 max-w-sm">Enter the host PIN to manage quizzes and admin tools.</p>
        <form onSubmit={onSubmit} className="flex flex-col items-center gap-3">
          <input
            type="password"
            inputMode="numeric"
            value={attempt}
            onChange={(e) => {
              setAttempt(e.target.value);
              setError(false);
            }}
            autoFocus
            className="w-48 text-center text-2xl tracking-[0.4em] rounded-xl border border-bb-navy/20 bg-white py-3 outline-none focus:border-bb-blue"
            placeholder="••••"
          />
          {error && <p className="text-bb-red text-sm">Incorrect PIN — try again.</p>}
          <button type="submit" className="rounded-full bg-bb-blue px-8 py-2.5 font-bold text-white">
            Unlock
          </button>
        </form>
        <p className="text-xs text-bb-navy/40">Default PIN is 1611 — change it any time in Settings.</p>
      </div>
    </AppShell>
  );
}
