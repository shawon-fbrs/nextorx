'use client';

import { useState, useEffect } from 'react';
import { SearchInput } from '@/components/admin/ui/search-input';
import { Badge } from '@/components/admin/ui/badge';
import { Card, CardContent } from '@/components/admin/ui/card';
import { StatsCard } from '@/components/admin/ui/stats-card';
import { Skeleton } from '@/components/admin/ui/skeleton';

type AuditLog = {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  meta: any;
  ipAddress: string | null;
  createdAt: string;
  actor: { id: string; name: string; email: string } | null;
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit');
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
    } catch {} finally { setIsLoading(false); }
  };

  const filtered = logs.filter((l) => {
    if (search) {
      const s = search.toLowerCase();
      return (
        l.action.toLowerCase().includes(s) ||
        l.entity.toLowerCase().includes(s) ||
        l.entityId.toLowerCase().includes(s) ||
        (l.actor?.name ?? '').toLowerCase().includes(s) ||
        (l.actor?.email ?? '').toLowerCase().includes(s)
      );
    }
    return true;
  });

  const getActionBadge = (action: string) => {
    if (action.includes('verify') || action.includes('approve')) return <Badge variant="success">{action}</Badge>;
    if (action.includes('reject') || action.includes('ban')) return <Badge variant="danger">{action}</Badge>;
    return <Badge variant="info">{action}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-7 w-24 mb-2" /><Skeleton className="h-4 w-56" /></div>
        <Card><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Audit Logs</h1>
        <p className="text-sm text-textDark">Track all admin actions</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Actions" value={logs.length} />
      </div>

      <Card>
        <CardContent>
          <SearchInput placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-textDark uppercase">Time</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-textDark uppercase">Admin</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-textDark uppercase">Action</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-textDark uppercase">Entity</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-textDark uppercase">IP</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-sm text-textDark">No audit logs yet</td></tr>
                ) : (
                  filtered.map((log) => (
                    <tr key={log.id} className="border-b border-border/50 hover:bg-surface-hover/50">
                      <td className="px-3 py-2 text-[11px] text-text">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-2 text-sm font-medium text-white">{log.actor?.name ?? 'System'}</td>
                      <td className="px-3 py-2">{getActionBadge(log.action)}</td>
                      <td className="px-3 py-2 text-sm text-text">{log.entity}:{log.entityId.slice(0, 8)}</td>
                      <td className="px-3 py-2 text-[11px] text-textDark font-mono">{log.ipAddress ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
