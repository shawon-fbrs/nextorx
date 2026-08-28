'use client';

import { useState, useMemo, useEffect } from 'react';
import { mockAuditLogs, MockAuditLog } from '@/lib/mock-data/audit-logs';
import { SearchInput } from '@/components/admin/ui/search-input';
import { Badge } from '@/components/admin/ui/badge';
import { Card, CardContent } from '@/components/admin/ui/card';
import { Select } from '@/components/admin/ui/select';
import { DataTable } from '@/components/admin/ui/data-table';
import { StatsCard } from '@/components/admin/ui/stats-card';
import { Skeleton } from '@/components/admin/ui/skeleton';

export default function AuditPage() {
  const [search, setSearch] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('all');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-24 mb-2" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-4 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </div>
        <Card>
          <CardContent>
            <div className="flex gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-36" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredLogs = useMemo(() => {
    let result = [...mockAuditLogs];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.adminName.toLowerCase().includes(s) ||
          l.action.toLowerCase().includes(s) ||
          l.target.toLowerCase().includes(s) ||
          l.details.toLowerCase().includes(s)
      );
    }
    if (targetTypeFilter !== 'all') result = result.filter((l) => l.targetType === targetTypeFilter);
    return result;
  }, [search, targetTypeFilter]);

  const paginatedLogs = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return filteredLogs.slice(start, start + pagination.pageSize);
  }, [filteredLogs, pagination]);

  const totalPages = Math.ceil(filteredLogs.length / pagination.pageSize);

  const getActionBadge = (action: string) => {
    if (action.includes('approve')) return <Badge variant="success">{action}</Badge>;
    if (action.includes('reject') || action.includes('ban')) return <Badge variant="danger">{action}</Badge>;
    if (action.includes('flag')) return <Badge variant="warning">{action}</Badge>;
    return <Badge variant="info">{action}</Badge>;
  };

  const getTargetBadge = (type: string) => {
    const colors: Record<string, string> = {
      user: 'bg-blue/10 text-blue',
      trade: 'bg-orange/10 text-orange',
      asset: 'bg-green/10 text-green',
      finance: 'bg-purple-400/10 text-purple-400',
      system: 'bg-textDark/10 text-textDark',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${colors[type] || ''}`}>
        {type}
      </span>
    );
  };

  const columns = [
    {
      key: 'timestamp',
      header: 'Time',
      render: (l: MockAuditLog) => (
        <span className="text-[11px] text-text">{new Date(l.timestamp).toLocaleString()}</span>
      ),
    },
    {
      key: 'adminName',
      header: 'Admin',
      render: (l: MockAuditLog) => <span className="font-medium text-white">{l.adminName}</span>,
    },
    {
      key: 'action',
      header: 'Action',
      render: (l: MockAuditLog) => getActionBadge(l.action),
    },
    {
      key: 'target',
      header: 'Target',
      render: (l: MockAuditLog) => <span className="text-text">{l.target}</span>,
    },
    {
      key: 'targetType',
      header: 'Type',
      render: (l: MockAuditLog) => getTargetBadge(l.targetType),
    },
    {
      key: 'details',
      header: 'Details',
      render: (l: MockAuditLog) => (
        <span className="text-textDark text-[11px] max-w-[200px] truncate block">{l.details}</span>
      ),
    },
    {
      key: 'ip',
      header: 'IP',
      render: (l: MockAuditLog) => <span className="text-textDark text-[11px] font-mono">{l.ip}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Audit Logs</h1>
        <p className="text-sm text-textDark">Track all admin actions and system events</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Actions" value={mockAuditLogs.length} />
        <StatsCard title="Today" value={mockAuditLogs.filter((l) => new Date(l.timestamp).toDateString() === new Date().toDateString()).length} />
        <StatsCard title="User Actions" value={mockAuditLogs.filter((l) => l.targetType === 'user').length} />
        <StatsCard title="Finance Actions" value={mockAuditLogs.filter((l) => l.targetType === 'finance').length} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchInput
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-40">
              <Select
                value={targetTypeFilter}
                onChange={(e) => setTargetTypeFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'user', label: 'User' },
                  { value: 'trade', label: 'Trade' },
                  { value: 'asset', label: 'Asset' },
                  { value: 'finance', label: 'Finance' },
                  { value: 'system', label: 'System' },
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={paginatedLogs}
            pagination={pagination}
            onPaginationChange={setPagination}
            totalPages={totalPages}
          />
        </CardContent>
      </Card>
    </div>
  );
}
