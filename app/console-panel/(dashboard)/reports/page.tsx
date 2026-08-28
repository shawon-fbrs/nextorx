'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/admin/ui/card';
import { StatsCard } from '@/components/admin/ui/stats-card';
import { Tabs } from '@/components/admin/ui/tabs';
import { Button } from '@/components/admin/ui/button';
import { Select } from '@/components/admin/ui/select';
import { dashboardStats, revenueData, weeklyRevenueData, dailyRevenueData, topAssets } from '@/lib/mock-data/stats';
import { exportToCSV } from '@/lib/export';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#007aff', '#00c365', '#ff4954', '#ff8c00', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'];

export default function ReportsPage() {
  const [period, setPeriod] = useState('monthly');
  const [activeTab, setActiveTab] = useState('revenue');

  const pieData = topAssets.slice(0, 6).map((a, i) => ({
    name: a.name,
    value: a.volume,
    color: COLORS[i],
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Reports & Analytics</h1>
          <p className="text-sm text-textDark">Platform performance and user analytics</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportToCSV(topAssets, 'asset_report')}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" className="mr-1.5">
            <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Revenue" value={`$${dashboardStats.totalRevenue.toLocaleString()}`} change={dashboardStats.revenueGrowth} />
        <StatsCard title="Total Trades" value={dashboardStats.todayTrades.toLocaleString()} change={dashboardStats.tradeGrowth} />
        <StatsCard title="Avg Trade Size" value={`$${dashboardStats.avgTradeSize}`} />
        <StatsCard title="House Win Rate" value={`${(100 - dashboardStats.winRate).toFixed(1)}%`} />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'revenue', label: 'Revenue' },
          { id: 'users', label: 'Users' },
          { id: 'assets', label: 'Assets' },
        ]}
        onChange={setActiveTab}
      />

      {activeTab === 'revenue' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Revenue Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#007aff" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#007aff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#31394c" />
                    <XAxis dataKey="date" stroke="#525a6b" fontSize={11} />
                    <YAxis stroke="#525a6b" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#242a38', border: '1px solid #31394c', borderRadius: '8px', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="revenue" stroke="#007aff" fillOpacity={1} fill="url(#revGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Revenue */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#31394c" />
                    <XAxis dataKey="day" stroke="#525a6b" fontSize={11} />
                    <YAxis stroke="#525a6b" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#242a38', border: '1px solid #31394c', borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="revenue" fill="#00c365" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Daily Revenue */}
          <Card>
            <CardHeader>
              <CardTitle>Hourly Revenue (Today)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#31394c" />
                    <XAxis dataKey="hour" stroke="#525a6b" fontSize={11} />
                    <YAxis stroke="#525a6b" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#242a38', border: '1px solid #31394c', borderRadius: '8px', fontSize: '12px' }} />
                    <Line type="monotone" dataKey="revenue" stroke="#ff8c00" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Volume Pie */}
          <Card>
            <CardHeader>
              <CardTitle>Volume by Asset</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#242a38', border: '1px solid #31394c', borderRadius: '8px', fontSize: '12px' }} />
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
        </div>
      )}

      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>User Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00c365" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00c365" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#31394c" />
                    <XAxis dataKey="date" stroke="#525a6b" fontSize={11} />
                    <YAxis stroke="#525a6b" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#242a38', border: '1px solid #31394c', borderRadius: '8px', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="trades" stroke="#00c365" fillOpacity={1} fill="url(#userGrad)" name="Active Users" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Segments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: 'VIP (>$10k volume)', count: 156, pct: 12.5, color: 'bg-orange' },
                  { label: 'Active (>$1k volume)', count: 423, pct: 34.0, color: 'bg-blue' },
                  { label: 'Regular', count: 589, pct: 47.3, color: 'bg-green' },
                  { label: 'Inactive (30d+)', count: 77, pct: 6.2, color: 'bg-textDark' },
                ].map((seg) => (
                  <div key={seg.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white">{seg.label}</span>
                      <span className="text-sm text-textDark">{seg.count} ({seg.pct}%)</span>
                    </div>
                    <div className="h-2 bg-border rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${seg.color}`} style={{ width: `${seg.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'assets' && (
        <Card>
          <CardHeader>
            <CardTitle>Top Assets Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-textDark uppercase">Asset</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-textDark uppercase">Trades</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-textDark uppercase">Volume</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-textDark uppercase">Win Rate</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-textDark uppercase">House Edge</th>
                  </tr>
                </thead>
                <tbody>
                  {topAssets.map((asset) => (
                    <tr key={asset.name} className="border-b border-border/50 hover:bg-surface-hover/50">
                      <td className="px-4 py-3 text-sm font-medium text-white">{asset.name}</td>
                      <td className="px-4 py-3 text-sm text-text">{asset.trades.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-text">${asset.volume.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={asset.winRate >= 49 ? 'text-green' : 'text-orange'}>{asset.winRate}%</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-green font-medium">{(100 - asset.winRate).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
