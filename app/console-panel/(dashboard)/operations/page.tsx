'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/admin/ui/card';
import { Badge } from '@/components/admin/ui/badge';
import { Button } from '@/components/admin/ui/button';
import { Tabs } from '@/components/admin/ui/tabs';
import { Progress } from '@/components/admin/ui/progress';
import { Alert } from '@/components/admin/ui/alert';
import { Skeleton } from '@/components/admin/ui/skeleton';
import { alerts, dailyOperations, userRisks, pnlHistory } from '@/lib/mock-data/treasury';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export default function OperationsPage() {
  const [activeTab, setActiveTab] = useState('alerts');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-28 mb-2" />
            <Skeleton className="h-4 w-60" />
          </div>
          <Skeleton className="h-6 w-28" />
        </div>
        <Skeleton className="h-10 w-[500px]" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent>
                <div className="flex items-start gap-3">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-72" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const unreadAlerts = alerts.filter((a) => !a.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Operations</h1>
          <p className="text-sm text-textDark">Alerts, workflows, risk scoring, and P&L</p>
        </div>
        {unreadAlerts > 0 && (
          <Badge variant="danger">{unreadAlerts} unread alerts</Badge>
        )}
      </div>

      <Tabs
        tabs={[
          { id: 'alerts', label: 'Alerts', count: unreadAlerts },
          { id: 'workflow', label: 'Daily Workflow' },
          { id: 'risk', label: 'User Risk' },
          { id: 'pnl', label: 'P&L' },
          { id: 'health', label: 'Health' },
        ]}
        onChange={setActiveTab}
      />

      {activeTab === 'alerts' && (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Card key={alert.id} className={alert.read ? 'opacity-60' : ''}>
              <CardContent>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {alert.type === 'critical' && <div className="w-3 h-3 bg-red rounded-full" />}
                    {alert.type === 'warning' && <div className="w-3 h-3 bg-orange rounded-full" />}
                    {alert.type === 'info' && <div className="w-3 h-3 bg-blue rounded-full" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-white">{alert.title}</h3>
                      <Badge variant={alert.type === 'critical' ? 'danger' : alert.type === 'warning' ? 'warning' : 'info'}>
                        {alert.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-text">{alert.message}</p>
                    <p className="text-[11px] text-textDark mt-1">{new Date(alert.timestamp).toLocaleString()}</p>
                  </div>
                  {!alert.read && (
                    <Button size="sm" variant="ghost">Mark Read</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'workflow' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Today's Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dailyOperations.map((op) => (
                  <div key={op.id} className="flex items-center gap-4 p-3 bg-background rounded-lg border border-border">
                    <div className="w-16 text-center">
                      <p className="text-sm font-mono font-medium text-white">{op.time}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{op.name}</p>
                      <p className="text-[11px] text-textDark">{op.details}</p>
                    </div>
                    <Badge
                      variant={
                        op.status === 'completed' ? 'success' :
                        op.status === 'pending' ? 'warning' : 'danger'
                      }
                    >
                      {op.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Operational Schedule</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { time: '06:00', name: 'Morning Check', tasks: ['Treasury balance', 'Payout calculation', 'Alert scan'] },
                  { time: '08:00', name: 'Withdrawal Review', tasks: ['Process queue', 'Check limits', 'Large requests'] },
                  { time: '12:00', name: 'Midday Monitor', tasks: ['Volume check', 'Win rate', 'Reserve level'] },
                  { time: '18:00', name: 'Evening Review', tasks: ['Daily P&L', 'Risk flags', 'Next day prep'] },
                ].map((slot) => (
                  <div key={slot.time} className="p-4 bg-background rounded-lg border border-border">
                    <p className="text-lg font-bold text-blue mb-1">{slot.time}</p>
                    <p className="text-sm font-medium text-white mb-2">{slot.name}</p>
                    <ul className="space-y-1">
                      {slot.tasks.map((task) => (
                        <li key={task} className="text-[11px] text-textDark flex items-center gap-1">
                          <span className="text-green">✓</span> {task}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'risk' && (
        <div className="space-y-4">
          <Alert variant="info" title="User Risk Scoring">
            Risk scores are calculated based on trading patterns, withdrawal behavior, and account flags. Score {'>'}70 requires manual review.
          </Alert>

          <Card>
            <CardHeader><CardTitle>User Risk Assessment</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-textDark uppercase">User</th>
                      <th className="px-4 py-3 text-center text-[10px] font-semibold text-textDark uppercase">Risk Score</th>
                      <th className="px-4 py-3 text-center text-[10px] font-semibold text-textDark uppercase">Level</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-textDark uppercase">Flags</th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold text-textDark uppercase">Volume</th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold text-textDark uppercase">Deposits</th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold text-textDark uppercase">Withdrawals</th>
                      <th className="px-4 py-3 text-center text-[10px] font-semibold text-textDark uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userRisks.map((user) => (
                      <tr key={user.userId} className="border-b border-border/50 hover:bg-surface-hover/50">
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-white">{user.userName}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <Progress
                              value={user.riskScore}
                              size="sm"
                              color={user.riskScore > 70 ? 'red' : user.riskScore > 40 ? 'orange' : 'green'}
                              className="w-16"
                            />
                            <span className="text-sm text-white">{user.riskScore}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant={
                              user.riskLevel === 'critical' ? 'danger' :
                              user.riskLevel === 'high' ? 'danger' :
                              user.riskLevel === 'medium' ? 'warning' : 'success'
                            }
                          >
                            {user.riskLevel}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {user.flags.map((flag) => (
                              <span key={flag} className="text-[10px] bg-surface px-1.5 py-0.5 rounded text-textDark">
                                {flag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-text text-right">${user.totalVolume.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-green text-right">${user.totalDeposits.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-red text-right">${user.totalWithdrawals.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <Button size="sm" variant="ghost">Review</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'pnl' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent>
                <p className="text-[10px] text-textDark uppercase">Total Expected</p>
                <p className="text-xl font-bold text-white">${pnlHistory.reduce((s, p) => s + p.expectedRevenue, 0).toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-[10px] text-textDark uppercase">Total Actual</p>
                <p className="text-xl font-bold text-green">${pnlHistory.reduce((s, p) => s + p.actualRevenue, 0).toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-[10px] text-textDark uppercase">Total Variance</p>
                <p className="text-xl font-bold text-red">${pnlHistory.reduce((s, p) => s + p.variance, 0).toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-[10px] text-textDark uppercase">Avg Variance</p>
                <p className="text-xl font-bold text-orange">
                  {(pnlHistory.reduce((s, p) => s + p.variancePercent, 0) / pnlHistory.length).toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Expected vs Actual Revenue (7 Days)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pnlHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#31394c" />
                    <XAxis dataKey="date" stroke="#525a6b" fontSize={10} tickFormatter={(v) => v.slice(5)} />
                    <YAxis stroke="#525a6b" fontSize={10} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: '#242a38', border: '1px solid #31394c', borderRadius: '8px', fontSize: '11px' }} formatter={(v) => [`$${Number(v).toLocaleString()}`]} />
                    <Bar dataKey="expectedRevenue" fill="#007aff" radius={[4, 4, 0, 0]} name="Expected" />
                    <Bar dataKey="actualRevenue" fill="#00c365" radius={[4, 4, 0, 0]} name="Actual" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Daily Variance</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-textDark uppercase">Date</th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold text-textDark uppercase">Expected</th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold text-textDark uppercase">Actual</th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold text-textDark uppercase">Variance</th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold text-textDark uppercase">Variance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pnlHistory.map((row) => (
                      <tr key={row.date} className="border-b border-border/50">
                        <td className="px-4 py-3 text-sm text-white">{row.date}</td>
                        <td className="px-4 py-3 text-sm text-text text-right">${row.expectedRevenue.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-green text-right">${row.actualRevenue.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-red text-right">${row.variance.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-orange text-right">{row.variancePercent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'health' && (
        <div className="space-y-6">
          {/* Status Overview */}
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
                  <div className="w-12 h-12 rounded-xl bg-orange/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] text-textDark uppercase">API Latency</p>
                    <p className="text-lg font-bold text-orange">124ms</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-green/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] text-textDark uppercase">Uptime</p>
                    <p className="text-lg font-bold text-green">99.97%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Service Status */}
          <Card>
            <CardHeader><CardTitle>Service Status</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Web Application', status: 'operational', latency: '45ms' },
                  { name: 'Trading Engine', status: 'operational', latency: '12ms' },
                  { name: 'Payment Processor', status: 'operational', latency: '89ms' },
                  { name: 'User Authentication', status: 'operational', latency: '23ms' },
                  { name: 'KYC Verification', status: 'degraded', latency: '342ms' },
                  { name: 'Email Service', status: 'operational', latency: '156ms' },
                  { name: 'Data Backup', status: 'operational', latency: '2.1s' },
                  { name: 'CDN', status: 'operational', latency: '8ms' },
                ].map((service) => (
                  <div key={service.name} className="flex items-center justify-between p-3 bg-background rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${service.status === 'operational' ? 'bg-green' : service.status === 'degraded' ? 'bg-orange animate-pulse' : 'bg-red'}`} />
                      <span className="text-sm font-medium text-white">{service.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[11px] text-textDark">{service.latency}</span>
                      <Badge variant={service.status === 'operational' ? 'success' : service.status === 'degraded' ? 'warning' : 'danger'}>
                        {service.status === 'operational' ? 'Operational' : service.status === 'degraded' ? 'Degraded' : 'Outage'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Server Resources */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>CPU Usage (24h)</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { server: 'API Server 1', usage: 34 },
                    { server: 'API Server 2', usage: 28 },
                    { server: 'Trading Engine', usage: 67 },
                    { server: 'Database Primary', usage: 45 },
                    { server: 'Database Replica', usage: 32 },
                  ].map((s) => (
                    <div key={s.server} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-textDark">{s.server}</span>
                        <span className="text-white font-medium">{s.usage}%</span>
                      </div>
                      <Progress value={s.usage} size="sm" color={s.usage > 70 ? 'red' : s.usage > 50 ? 'orange' : 'green'} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Memory Usage (24h)</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { server: 'API Server 1', usage: 56 },
                    { server: 'API Server 2', usage: 48 },
                    { server: 'Trading Engine', usage: 72 },
                    { server: 'Database Primary', usage: 61 },
                    { server: 'Database Replica', usage: 44 },
                  ].map((s) => (
                    <div key={s.server} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-textDark">{s.server}</span>
                        <span className="text-white font-medium">{s.usage}%</span>
                      </div>
                      <Progress value={s.usage} size="sm" color={s.usage > 70 ? 'red' : s.usage > 50 ? 'orange' : 'green'} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Incidents */}
          <Card>
            <CardHeader><CardTitle>Recent Incidents</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { date: 'Aug 26, 2026', title: 'KYC Service Degradation', duration: '12 min', status: 'resolved' },
                  { date: 'Aug 22, 2026', title: 'API Latency Spike', duration: '4 min', status: 'resolved' },
                  { date: 'Aug 15, 2026', title: 'Payment Processor Timeout', duration: '8 min', status: 'resolved' },
                ].map((incident) => (
                  <div key={incident.date} className="flex items-center gap-4 p-3 bg-background rounded-lg">
                    <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{incident.title}</p>
                      <p className="text-[11px] text-textDark">{incident.date} • Duration: {incident.duration}</p>
                    </div>
                    <Badge variant="success">Resolved</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
