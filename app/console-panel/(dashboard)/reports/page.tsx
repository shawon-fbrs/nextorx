'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/admin/ui/card';
import { StatsCard } from '@/components/admin/ui/stats-card';
import { Skeleton } from '@/components/admin/ui/skeleton';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#007aff', '#00c365', '#ff4954', '#ff8c00', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'];

type Stats = {
  totalUsers: number;
  todayTrades: number;
  totalRevenue: number;
  winRate: number;
  settledTrades?: number;
  monthlyRevenue: { date: string; revenue: number; trades: number }[];
  topAssets: { name: string; trades: number; volume: number; winRate: number }[];
};

export default function ReportsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading || !stats) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-7 w-44 mb-2" /><Skeleton className="h-4 w-56" /></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="bg-surface border border-border rounded-xl p-4 space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-6 w-24" /></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => <Card key={i}><CardHeader><Skeleton className="h-5 w-28" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>)}
        </div>
      </div>
    );
  }

  const pieData = stats.topAssets.slice(0, 6).map((a, i) => ({
    name: a.name,
    value: a.volume,
    color: COLORS[i],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Reports & Analytics</h1>
        <p className="text-sm text-textDark">Platform performance and analytics</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Revenue" value={`$${(stats.totalRevenue / 100).toFixed(2)}`} />
        <StatsCard title="Total Trades" value={(stats.settledTrades ?? 0).toLocaleString()} />
        <StatsCard title="Win Rate" value={`${stats.winRate}%`} />
        <StatsCard title="Total Users" value={stats.totalUsers.toLocaleString()} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Revenue Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.monthlyRevenue}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#007aff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#007aff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#31394c" />
                  <XAxis dataKey="date" stroke="#525a6b" fontSize={11} />
                  <YAxis stroke="#525a6b" fontSize={11} tickFormatter={(v) => `$${(v / 100).toFixed(0)}`} />
                  <Tooltip contentStyle={{ backgroundColor: '#242a38', border: '1px solid #31394c', borderRadius: '8px', fontSize: '12px' }} formatter={(v) => [`$${(Number(v) / 100).toFixed(2)}`, 'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke="#007aff" fillOpacity={1} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Trades Volume</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#31394c" />
                  <XAxis dataKey="date" stroke="#525a6b" fontSize={11} />
                  <YAxis stroke="#525a6b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#242a38', border: '1px solid #31394c', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="trades" fill="#00c365" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {pieData.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Volume by Asset</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#242a38', border: '1px solid #31394c', borderRadius: '8px', fontSize: '12px' }} formatter={(v) => [`$${(Number(v) / 100).toFixed(2)}`]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 mt-2">
                {pieData.map((entry, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-[10px] text-textDark">{entry.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Top Assets</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-textDark uppercase">Asset</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-textDark uppercase">Trades</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-textDark uppercase">Volume</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-textDark uppercase">Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topAssets.map((a) => (
                    <tr key={a.name} className="border-b border-border/50">
                      <td className="px-3 py-2 text-sm font-medium text-white">{a.name}</td>
                      <td className="px-3 py-2 text-sm text-text text-right">{a.trades}</td>
                      <td className="px-3 py-2 text-sm text-text text-right">${(a.volume / 100).toFixed(2)}</td>
                      <td className="px-3 py-2 text-sm text-right"><span className={a.winRate >= 49 ? 'text-green' : 'text-orange'}>{a.winRate}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
