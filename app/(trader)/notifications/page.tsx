'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=50');
      const data = await res.json();
      setNotifs(data.notifications ?? []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      setNotifs((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    } catch {}
  };

  const markRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
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
        <div className="flex items-center justify-between mt-2 mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Notifications</h1>
            <p className="text-sm text-text-dark mt-1">Deposits, withdrawals, security.</p>
          </div>
          <button onClick={markAllRead} className="text-[11px] text-blue hover:text-blue-hover font-bold">
            Mark all read
          </button>
        </div>

        <div className="space-y-2">
          {notifs.length === 0 ? (
            <p className="text-xs text-text-dark text-center py-8">No notifications yet.</p>
          ) : (
            notifs.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.readAt && markRead(n.id)}
                className={`w-full text-left p-4 bg-surface border rounded-xl transition-colors ${n.readAt ? 'border-border opacity-60' : 'border-blue/30 bg-blue/5'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">{n.title}</span>
                  <span className="text-[10px] text-text-dark">{new Date(n.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-xs text-text leading-relaxed">{n.body}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
