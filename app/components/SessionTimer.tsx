'use client';

import { useState, useEffect } from 'react';

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function SessionTimer() {
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const elapsed = now - start;
  const overHour = elapsed >= 60 * 60 * 1000;

  return (
    <div
      title={overHour ? 'You have been trading for over an hour. Consider taking a break.' : 'Session time'}
      className={`text-[11px] font-mono px-2 py-1 rounded-lg border ${overHour ? 'text-orange border-orange/30 bg-orange/10' : 'text-text-dark border-border'}`}
    >
      {formatElapsed(elapsed)}
    </div>
  );
}
