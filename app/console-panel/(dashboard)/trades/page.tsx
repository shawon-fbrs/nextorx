'use client';

import { useState, useMemo, useEffect } from 'react';
import { mockTrades, MockTrade } from '@/lib/mock-data/trades';
import { DataTable } from '@/components/admin/ui/data-table';
import { SearchInput } from '@/components/admin/ui/search-input';
import { Badge } from '@/components/admin/ui/badge';
import { Card, CardContent } from '@/components/admin/ui/card';
import { Select } from '@/components/admin/ui/select';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from '@/components/admin/ui/dialog';
import { Button } from '@/components/admin/ui/button';
import { StatsCard } from '@/components/admin/ui/stats-card';
import { Tabs } from '@/components/admin/ui/tabs';
import { Skeleton } from '@/components/admin/ui/skeleton';

export default function TradesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedTrade, setSelectedTrade] = useState<MockTrade | null>(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [activeTab, setActiveTab] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-32 mb-2" />
          <Skeleton className="h-4 w-52" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-4 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
        <Card>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
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

  const allTrades = useMemo(() => {
    let result = [...mockTrades];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.userName.toLowerCase().includes(s) ||
          t.symbol.toLowerCase().includes(s) ||
          t.id.toLowerCase().includes(s)
      );
    }
    if (statusFilter !== 'all') result = result.filter((t) => t.status === statusFilter);
    if (typeFilter !== 'all') result = result.filter((t) => t.type === typeFilter);
    return result;
  }, [search, statusFilter, typeFilter]);

  const stats = useMemo(() => ({
    total: mockTrades.length,
    won: mockTrades.filter((t) => t.status === 'won').length,
    lost: mockTrades.filter((t) => t.status === 'lost').length,
    totalVolume: mockTrades.reduce((sum, t) => sum + t.amount, 0),
    totalPayout: mockTrades.filter((t) => t.status === 'won').reduce((sum, t) => sum + t.payout, 0),
  }), []);

  const paginatedTrades = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return allTrades.slice(start, start + pagination.pageSize);
  }, [allTrades, pagination]);

  const totalPages = Math.ceil(allTrades.length / pagination.pageSize);

  const columns = [
    { key: 'id', header: 'ID' },
    {
      key: 'userName',
      header: 'User',
      render: (t: MockTrade) => (
        <span className="font-medium text-white">{t.userName}</span>
      ),
    },
    { key: 'symbol', header: 'Asset' },
    {
      key: 'type',
      header: 'Type',
      render: (t: MockTrade) => (
        <Badge variant={t.type === 'up' ? 'success' : 'danger'}>{t.type.toUpperCase()}</Badge>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (t: MockTrade) => <span className="font-medium text-white">${t.amount}</span>,
    },
    {
      key: 'openPrice',
      header: 'Open',
      render: (t: MockTrade) => <span className="text-text">{t.openPrice}</span>,
    },
    {
      key: 'closePrice',
      header: 'Close',
      render: (t: MockTrade) => <span className="text-text">{t.closePrice || '-'}</span>,
    },
    {
      key: 'profit',
      header: 'Profit',
      render: (t: MockTrade) => (
        <span className={t.profit && t.profit >= 0 ? 'text-green font-medium' : 'text-red font-medium'}>
          {t.profit ? `$${t.profit}` : '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (t: MockTrade) => (
        <Badge variant={t.status === 'won' ? 'success' : t.status === 'lost' ? 'danger' : 'neutral'}>
          {t.status}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (t: MockTrade) => <span className="text-textDark text-[11px]">{new Date(t.createdAt).toLocaleString()}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Trade Monitoring</h1>
        <p className="text-sm text-textDark">Monitor all platform trades in real-time</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard title="Total Trades" value={stats.total} />
        <StatsCard title="Won" value={stats.won} />
        <StatsCard title="Lost" value={stats.lost} />
        <StatsCard title="Total Volume" value={`$${stats.totalVolume.toLocaleString()}`} />
        <StatsCard title="Total Payout" value={`$${stats.totalPayout.toLocaleString()}`} />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'all', label: 'All Trades', count: mockTrades.length },
          { id: 'won', label: 'Won', count: mockTrades.filter((t) => t.status === 'won').length },
          { id: 'lost', label: 'Lost', count: mockTrades.filter((t) => t.status === 'lost').length },
          { id: 'pending', label: 'Pending', count: mockTrades.filter((t) => t.status === 'pending').length },
        ]}
        onChange={(id) => {
          setStatusFilter(id === 'all' ? 'all' : id);
          setPagination({ ...pagination, pageIndex: 0 });
        }}
      />

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchInput
                placeholder="Search by user, asset, or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-40">
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'up', label: 'Up (Call)' },
                  { value: 'down', label: 'Down (Put)' },
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={paginatedTrades}
            pagination={pagination}
            onPaginationChange={setPagination}
            totalPages={totalPages}
            onRowClick={(trade) => setSelectedTrade(trade)}
          />
        </CardContent>
      </Card>

      {/* Trade Detail Modal */}
      <Dialog open={!!selectedTrade} onClose={() => setSelectedTrade(null)}>
        <DialogHeader onClose={() => setSelectedTrade(null)}>
          <h2 className="text-lg font-bold text-white">Trade Details</h2>
        </DialogHeader>
        <DialogContent>
          {selectedTrade && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant={selectedTrade.type === 'up' ? 'success' : 'danger'}>
                  {selectedTrade.type.toUpperCase()}
                </Badge>
                <Badge variant={selectedTrade.status === 'won' ? 'success' : selectedTrade.status === 'lost' ? 'danger' : 'neutral'}>
                  {selectedTrade.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-textDark uppercase">Trade ID</p>
                  <p className="text-sm text-white font-mono">{selectedTrade.id}</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase">Asset</p>
                  <p className="text-sm text-white font-medium">{selectedTrade.symbol}</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase">User</p>
                  <p className="text-sm text-white">{selectedTrade.userName}</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase">Amount</p>
                  <p className="text-sm text-white font-medium">${selectedTrade.amount}</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase">Open Price</p>
                  <p className="text-sm text-text">{selectedTrade.openPrice}</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase">Close Price</p>
                  <p className="text-sm text-text">{selectedTrade.closePrice || 'Pending'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase">Payout</p>
                  <p className="text-sm text-green">${selectedTrade.payout}</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase">Profit</p>
                  <p className={`text-sm font-medium ${selectedTrade.profit && selectedTrade.profit >= 0 ? 'text-green' : 'text-red'}`}>
                    {selectedTrade.profit ? `$${selectedTrade.profit}` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase">Opened At</p>
                  <p className="text-sm text-text">{new Date(selectedTrade.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase">Expires At</p>
                  <p className="text-sm text-text">{new Date(selectedTrade.expiresAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setSelectedTrade(null)}>Close</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
