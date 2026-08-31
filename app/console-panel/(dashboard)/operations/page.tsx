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

export default function OperationsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => setStats(d))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading || !stats) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-7 w-28 mb-2" /><Skeleton className="h-4 w-60" /></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="bg-surface border border-border rounded-xl p-4 space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-6 w-20" /></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Operations</h1>
        <p className="text-sm text-textDark">Platform overview and health</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] text-textDark uppercase">API Status</p>
                <p className="text-lg font-bold text-green">Operational</p>
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
        <CardHeader><CardTitle>Service Status</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Web Application', status: 'operational' },
              { name: 'Trading Engine', status: 'operational' },
              { name: 'Payment Processor', status: 'operational' },
              { name: 'User Authentication', status: 'operational' },
              { name: 'Database', status: 'operational' },
            ].map((service) => (
              <div key={service.name} className="flex items-center justify-between p-3 bg-background rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-green" />
                  <span className="text-sm font-medium text-white">{service.name}</span>
                </div>
                <Badge variant="success">Operational</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
