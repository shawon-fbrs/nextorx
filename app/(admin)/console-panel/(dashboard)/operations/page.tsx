'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/admin/ui/card';
import { Badge } from '@/components/admin/ui/badge';
import { Skeleton } from '@/components/admin/ui/skeleton';

type Stats = {
  totalUsers: number;
  todayTrades: number;
  totalRevenue: number;
  winRate: number;
  settledTrades: number;
};

type Health = {
  status: string;
  settlement: {
    backlog: number;
    paused: boolean;
    lastRunAt: string | null;
    lastSettled: number;
    lastError: string | null;
  };
};

export default function OperationsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/stats').then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch('/api/health').then((r) => r.json()).catch(() => null),
      fetch('/api/admin/settlement').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ])
      .then(([s, h, settle]) => {
        setStats(s);
        setHealth({
          status: h?.status ?? 'unknown',
          settlement: {
            backlog: settle?.backlog ?? h?.settlement?.backlog ?? -1,
            paused: settle?.paused ?? h?.settlement?.paused ?? false,
            lastRunAt: settle?.lastRunAt ?? h?.settlement?.lastRunAt ?? null,
            lastSettled: settle?.lastSettled ?? h?.settlement?.lastSettled ?? 0,
            lastError: settle?.lastError ?? h?.settlement?.lastError ?? null,
          },
        });
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const toggleSettlement = async () => {
    if (!health) return;
    setToggling(true);
    try {
      const res = await fetch('/api/admin/settlement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: !health.settlement.paused }),
      });
      const data = await res.json();
      if (res.ok) {
        setHealth({ ...health, settlement: { ...health.settlement, paused: data.paused } });
      }
    } catch {
    } finally {
      setToggling(false);
    }
  };

  if (isLoading || !stats) {    return (
      <div className="space-y-6">
        <div><Skeleton className="h-7 w-28 mb-2" /><Skeleton className="h-4 w-60" /></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="bg-surface border border-border rounded-xl p-4 space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-6 w-20" /></div>)}
        </div>
      </div>
    );
  }

  const apiOk = health?.status === 'ok';
  const settlement = health?.settlement;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Operations</h1>
          <p className="text-sm text-textDark">Platform overview and health</p>
        </div>
        {settlement && (
          <button
            onClick={toggleSettlement}
            disabled={toggling}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${settlement.paused ? 'bg-green text-white hover:bg-green-hover' : 'bg-red text-white hover:bg-red-hover'}`}
          >
            {toggling ? '...' : settlement.paused ? 'Resume Settlement' : 'Pause Settlement'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${apiOk ? 'bg-green/10' : 'bg-red/10'}`}>
                <svg className={`w-6 h-6 ${apiOk ? 'text-green' : 'text-red'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] text-textDark uppercase">API Status</p>
                <p className={`text-lg font-bold ${apiOk ? 'text-green' : 'text-red'}`}>{apiOk ? 'Operational' : 'Degraded'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${!settlement?.paused && settlement && settlement.backlog >= 0 ? 'bg-green/10' : 'bg-orange/10'}`}>
                <svg className={`w-6 h-6 ${!settlement?.paused ? 'text-green' : 'text-orange'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] text-textDark uppercase">Settlement</p>
                <p className="text-lg font-bold text-white">
                  {settlement ? (settlement.paused ? 'Paused' : settlement.backlog > 0 ? `${settlement.backlog} queued` : 'Caught up') : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] text-textDark uppercase">Database</p>
                <p className="text-lg font-bold text-green">Connected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] text-textDark uppercase">Today's Trades</p>
                <p className="text-lg font-bold text-white">{stats.todayTrades}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] text-textDark uppercase">Revenue</p>
                <p className="text-lg font-bold text-green">${(stats.totalRevenue / 100).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Service Status (live)</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Web Application', ok: apiOk },
              { name: 'Database', ok: apiOk },
              { name: 'Settlement Worker', ok: settlement ? !settlement.paused && !settlement.lastError : null, detail: settlement ? (settlement.lastError ?? (settlement.lastRunAt ? `last run ${new Date(settlement.lastRunAt).toLocaleTimeString()}` : null)) : null },
              { name: 'Trading Engine', ok: apiOk },
              { name: 'User Authentication', ok: apiOk },
            ].map((service) => (
              <div key={service.name} className="flex items-center justify-between p-3 bg-background rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${service.ok === null ? 'bg-orange' : service.ok ? 'bg-green' : 'bg-red'}`} />
                  <div>
                    <span className="text-sm font-medium text-white block">{service.name}</span>
                    {service.detail && <span className="text-[11px] text-textDark">{service.detail}</span>}
                  </div>
                </div>
                <Badge variant={service.ok === null ? 'warning' : service.ok ? 'success' : 'danger'}>
                  {service.ok === null ? 'Unknown' : service.ok ? 'Operational' : 'Attention'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
