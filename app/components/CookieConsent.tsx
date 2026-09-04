'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const KEY = 'nextorx-cookie-consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const accept = () => {
    try {
      localStorage.setItem(KEY, new Date().toISOString());
    } catch {}
    setVisible(false);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm z-[200] bg-surface border border-border rounded-xl p-4 shadow-2xl">
      <p className="text-xs text-text leading-relaxed">
        We use strictly necessary cookies for sign-in and security. See our <Link href="/privacy" className="text-blue font-semibold">Privacy Policy</Link>.
      </p>
      <button onClick={accept} className="mt-3 w-full bg-blue text-white text-xs font-bold py-2 rounded-lg">
        Accept
      </button>
    </div>
  );
}
