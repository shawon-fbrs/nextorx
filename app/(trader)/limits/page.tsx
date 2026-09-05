'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const PERIODS = [1, 7, 30, 90, 180, 365];

export default function LimitsPage() {
  const [limit, setLimit] = useState('');
  const [savedLimit, setSavedLimit] = useState<number | null>(null);
  const [exclusion, setExclusion] = useState<{ excludedUntil: string } | null>(null);
  const [days, setDays] = useState(7);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/account/limits').then((r) => r.json()).catch(() => ({})),
      fetch('/api/account/self-exclusion').then((r) => r.json()).catch(() => ({})),
    ])
      .then(([l, e]) => {
        setSavedLimit(l.depositLimitDaily ?? null);
        setLimit(l.depositLimitDaily != null ? String((l.depositLimitDaily as number) / 100) : '');
        setExclusion(e.exclusion ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSaveLimit = async () => {
    setSaving(true);
    setMessage('');
    try {
      const value = limit.trim() === '' ? null : Math.round(parseFloat(limit) * 100);
      if (value !== null && (!Number.isFinite(value) || value < 0)) {
        setMessage('Enter a valid amount or leave empty for no limit');
        return;
      }
      const res = await fetch('/api/account/limits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depositLimitDaily: value }),
      });
      if (!res.ok) {
        setMessage('Failed to save limit');
      } else {
        setSavedLimit(value);
        setMessage('Daily deposit limit saved');
      }
    } catch {
      setMessage('Failed to save limit');
    } finally {
      setSaving(false);
    }
  };

  const handleExclude = async () => {
    if (!confirm(`Self-exclude for ${days} day(s)? This cannot be undone early.`)) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/account/self-exclusion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Failed to self-exclude');
      } else {
        setExclusion(data.exclusion);
        setMessage(`Self-exclusion active until ${new Date(data.exclusion.excludedUntil).toLocaleDateString()}`);
      }
    } catch {
      setMessage('Failed to self-exclude');
    } finally {
      setSaving(false);
    }
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
        <h1 className="text-xl font-bold text-white mt-2">Responsible Trading</h1>
        <p className="text-sm text-text-dark mt-1">Protect yourself with deposit limits and time-outs.</p>
        {message && <p className="text-xs text-orange mt-3">{message}</p>}

        <div className="mt-4 p-4 bg-surface border border-border rounded-xl space-y-3">
          <h2 className="text-sm font-bold text-white">Daily Deposit Limit</h2>
          <p className="text-xs text-text-dark">
            Current: {savedLimit != null ? `$${(savedLimit / 100).toFixed(2)}` : 'No limit'}
          </p>
          <input value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="Amount in USD (empty = no limit)" inputMode="decimal" className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-text-dark/50 focus:outline-none focus:border-blue" />
          <button onClick={handleSaveLimit} disabled={saving} className="w-full bg-blue text-white font-semibold rounded-xl py-3 text-sm disabled:opacity-50">
            Save Limit
          </button>
        </div>

        <div className="mt-4 p-4 bg-surface border border-red/30 rounded-xl space-y-3">
          <h2 className="text-sm font-bold text-white">Self-Exclusion</h2>
          {exclusion ? (
            <p className="text-xs text-red">Active until {new Date(exclusion.excludedUntil).toLocaleDateString()}. Trading and deposits are blocked.</p>
          ) : (
            <>
              <p className="text-xs text-text-dark">Block all trading for a fixed period. Cannot be undone early.</p>
              <div className="flex flex-wrap gap-2">
                {PERIODS.map((p) => (
                  <button key={p} onClick={() => setDays(p)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${days === p ? 'bg-red text-white border-red' : 'border-border text-text-dark'}`}>
                    {p}d
                  </button>
                ))}
              </div>
              <button onClick={handleExclude} disabled={saving} className="w-full bg-red text-white font-semibold rounded-xl py-3 text-sm disabled:opacity-50">
                Self-Exclude for {days} Day(s)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
