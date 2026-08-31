'use client';

import { useState, useEffect } from 'react';
import { DataTable } from '@/components/admin/ui/data-table';
import { SearchInput } from '@/components/admin/ui/search-input';
import { Badge } from '@/components/admin/ui/badge';
import { Card, CardContent } from '@/components/admin/ui/card';
import { Select } from '@/components/admin/ui/select';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from '@/components/admin/ui/dialog';
import { Button } from '@/components/admin/ui/button';
import { StatsCard } from '@/components/admin/ui/stats-card';
import { Skeleton } from '@/components/admin/ui/skeleton';

type Trade = {
  id: string;
  direction: string;
  amount: number;
  payoutPercent: string;
  durationSeconds: number;
  openPrice: string;
  closePrice: string | null;
  status: string;
  profit: number | null;
  settledAt: string | null;
  createdAt: string;
  pair: { id: string; name: string; category: string };
  user: { id: string; name: string; email: string; uid: string | null };
};

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    try {
      const res = await fetch('/api/admin/trades?limit=500');
      const data = await res.json();
      if (data.trades) setTrades(data.trades);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = trades.filter((t) => {
    if (search) {
      const s = search.toLowerCase();
      if (
        !t.user.name.toLowerCase().includes(s) &&
        !t.user.email.toLowerCase().includes(s) &&
        !t.pair.name.toLowerCase().includes(s) &&
        !t.id.toLowerCase().includes(s)
      ) return false;
    }
    if (statusFilter !== 'all' && t.status !== statusFilter.toUpperCase()) return false;
    if (typeFilter !== 'all' && t.direction !== typeFilter.toUpperCase()) return false;
    return true;
  });

  const stats = {
    total: trades.length,
    won: trades.filter((t) => t.status === 'WON').length,
    lost: trades.filter((t) => t.status === 'LOST').length,
    totalVolume: trades.reduce((sum, t) => sum + t.amount, 0),
    totalPayout: trades.filter((t) => t.status === 'WON').reduce((sum, t) => sum + (t.profit ?? 0), 0),
  };

  const paginatedTrades = filtered.slice(
    pagination.pageIndex * pagination.pageSize,
    (pagination.pageIndex + 1) * pagination.pageSize
  );

  const totalPages = Math.ceil(filtered.length / pagination.pageSize);

  const columns = [
    {
      key: 'user',
      header: 'User',
      render: (t: Trade) => (
        <div>
          <span className="font-medium text-white">{t.user.name}</span>
          <span className="text-[10px] text-textDark ml-1.5">{t.user.email}</span>
        </div>
      ),
    },
    { key: 'pair', header: 'Asset', render: (t: Trade) => <span className="text-sm">{t.pair.name}</span> },
    {
      key: 'direction',
      header: 'Dir',
      render: (t: Trade) => (
        <Badge variant={t.direction === 'UP' ? 'success' : 'danger'}>{t.direction}</Badge>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (t: Trade) => <span className="font-medium text-white">${(t.amount / 100).toFixed(2)}</span>,
    },
    {
      key: 'openPrice',
      header: 'Open',
      render: (t: Trade) => <span className="text-text">{Number(t.openPrice).toFixed(5)}</span>,
    },
    {
      key: 'closePrice',
      header: 'Close',
      render: (t: Trade) => <span className="text-text">{t.closePrice ? Number(t.closePrice).toFixed(5) : '—'}</span>,
    },
    {
      key: 'profit',
      header: 'Profit',
      render: (t: Trade) => t.profit !== null ? (
        <span className={t.profit >= 0 ? 'text-green font-medium' : 'text-red font-medium'}>
          {t.profit >= 0 ? '+' : ''}{(t.profit / 100).toFixed(2)}
        </span>
      ) : <span className="text-textDark">—</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (t: Trade) => (
        <Badge variant={t.status === 'WON' ? 'success' : t.status === 'LOST' ? 'danger' : 'neutral'}>
          {t.status.toLowerCase()}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (t: Trade) => <span className="text-textDark text-[11px]">{new Date(t.createdAt).toLocaleString()}</span>,
    },
  ];

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
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Trade Monitoring</h1>
        <p className="text-sm text-textDark">Monitor all platform trades in real-time</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard title="Total Trades" value={stats.total.toLocaleString()} />
        <StatsCard title="Won" value={stats.won.toLocaleString()} />
        <StatsCard title="Lost" value={stats.lost.toLocaleString()} />
        <StatsCard title="Total Volume" value={`$${(stats.totalVolume / 100).toLocaleString()}`} />
        <StatsCard title="Total Profit" value={`$${(stats.totalPayout / 100).toLocaleString()}`} />
      </div>

      <div className="flex gap-2 mb-2">
        {['all', 'ACTIVE', 'WON', 'LOST', 'PENDING'].map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatusFilter(s === 'all' ? 'all' : s.toLowerCase());
              setPagination({ ...pagination, pageIndex: 0 });
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              (s === 'all' && statusFilter === 'all') || statusFilter === s.toLowerCase()
                ? 'bg-blue text-white'
                : 'bg-surface text-textDark hover:bg-surface-hover'
            }`}
          >
            {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            <span className="ml-1 text-[10px] opacity-70">
              {s === 'all' ? trades.length : trades.filter((t) => t.status === s).length}
            </span>
          </button>
        ))}
      </div>

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

      <Dialog open={!!selectedTrade} onClose={() => setSelectedTrade(null)}>
        <DialogHeader onClose={() => setSelectedTrade(null)}>
          <h2 className="text-lg font-bold text-white">Trade Details</h2>
        </DialogHeader>
        <DialogContent>
          {selectedTrade && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant={selectedTrade.direction === 'UP' ? 'success' : 'danger'}>
                  {selectedTrade.direction}
                </Badge>
                <Badge variant={selectedTrade.status === 'WON' ? 'success' : selectedTrade.status === 'LOST' ? 'danger' : 'neutral'}>
                  {selectedTrade.status.toLowerCase()}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-textDark uppercase">Trade ID</p>
                  <p className="text-sm text-white font-mono">{selectedTrade.id}</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase">Asset</p>
                  <p className="text-sm text-white font-medium">{selectedTrade.pair.name}</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase">User</p>
                  <p className="text-sm text-white">{selectedTrade.user.name}</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase">Amount</p>
                  <p className="text-sm text-white font-medium">${(selectedTrade.amount / 100).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase">Open Price</p>
                  <p className="text-sm text-text">{Number(selectedTrade.openPrice).toFixed(5)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase">Close Price</p>
                  <p className="text-sm text-text">{selectedTrade.closePrice ? Number(selectedTrade.closePrice).toFixed(5) : 'Pending'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase">Profit</p>
                  <p className={`text-sm font-medium ${selectedTrade.profit !== null && selectedTrade.profit >= 0 ? 'text-green' : 'text-red'}`}>
                    {selectedTrade.profit !== null ? `$${(selectedTrade.profit / 100).toFixed(2)}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase">Duration</p>
                  <p className="text-sm text-text">{selectedTrade.durationSeconds}s</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase">Opened At</p>
                  <p className="text-sm text-text">{new Date(selectedTrade.createdAt).toLocaleString()}</p>
                </div>
                {selectedTrade.settledAt && (
                  <div>
                    <p className="text-[11px] text-textDark uppercase">Settled At</p>
                    <p className="text-sm text-text">{new Date(selectedTrade.settledAt).toLocaleString()}</p>
                  </div>
                )}
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
