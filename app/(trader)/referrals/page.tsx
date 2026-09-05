'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Referral = {
  id: string;
  bonusPaid: number;
  createdAt: string;
  user: { id: string; name: string; nickname: string | null } | null;
};

export default function ReferralsPage() {
  const [code, setCode] = useState<string | null>(null);
  const [totalEarned, setTotalEarned] = useState(0);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/account/referrals')
      .then((r) => r.json())
      .then((d) => {
        setCode(d.referralCode ?? null);
        setTotalEarned(d.totalEarned ?? 0);
        setReferrals(d.referrals ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const link = code && typeof window !== 'undefined'
    ? `${window.location.origin}/register?ref=${code}`
    : '';

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (loading) {
    return (
      <div className="bg-background text-text h-full flex items-center justify-center">
        <div className="text-text-dark text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-background text-text h-full overflow-y-auto">
      <div className="px-6 py-6 max-w-xl mx-auto">
        <Link href="/trade/demo" className="text-xs text-blue font-semibold">← Back</Link>
        <h1 className="text-xl font-bold text-white mt-2">Referrals</h1>
        <p className="text-sm text-text-dark mt-1">Earn a bonus when a friend makes their first deposit.</p>

        <div className="mt-4 p-4 bg-surface border border-border rounded-xl">
          <p className="text-xs text-text-dark uppercase tracking-wider mb-1">Your invite link</p>
          <div className="flex gap-2">
            <p className="flex-1 text-xs text-white font-mono bg-background border border-border rounded-lg px-3 py-2.5 truncate">{link || '—'}</p>
            <button onClick={copy} className="px-4 bg-blue text-white text-xs font-bold rounded-lg">
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          {code && <p className="text-[11px] text-text-dark mt-2">Or share your code: <span className="text-white font-mono font-bold">{code}</span></p>}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="p-4 bg-surface border border-border rounded-xl">
            <p className="text-xs text-text-dark uppercase tracking-wider">Friends</p>
            <p className="text-2xl font-bold text-white">{referrals.length}</p>
          </div>
          <div className="p-4 bg-surface border border-border rounded-xl">
            <p className="text-xs text-text-dark uppercase tracking-wider">Earned</p>
            <p className="text-2xl font-bold text-green">${(totalEarned / 100).toFixed(2)}</p>
          </div>
        </div>

        <h2 className="text-sm font-bold text-white mt-6 mb-3">Referred Friends</h2>
        {referrals.length === 0 ? (
          <p className="text-xs text-text-dark">Nobody yet. Share your link to start earning.</p>
        ) : (
          <div className="space-y-2">
            {referrals.map((r) => (
              <div key={r.id} className="p-3 bg-surface border border-border rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">{r.user?.nickname || r.user?.name || 'Friend'}</p>
                  <p className="text-[10px] text-text-dark">{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <p className={`text-xs font-bold ${r.bonusPaid > 0 ? 'text-green' : 'text-textDark'}`}>
                  {r.bonusPaid > 0 ? `+$${(r.bonusPaid / 100).toFixed(2)}` : 'No deposit yet'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
