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

type Txn = {
  id: string;
  type: 'deposit' | 'withdrawal';
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  method: string;
  network: string | null;
  txHash: string | null;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
};

type Stats = {
  pendingDeposits: number;
  pendingWithdrawals: number;
  totalDeposits: number;
  totalWithdrawals: number;
};

export default function FinancePage() {
  const [txns, setTxns] = useState<Txn[]>([]);
  const [stats, setStats] = useState<Stats>({ pendingDeposits: 0, pendingWithdrawals: 0, totalDeposits: 0, totalWithdrawals: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedTxn, setSelectedTxn] = useState<Txn | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/finance');
      const data = await res.json();
      if (data.txns) setTxns(data.txns);
      if (data.stats) setStats(data.stats);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = txns.filter((t) => {
    if (search) {
      const s = search.toLowerCase();
      if (!t.userName.toLowerCase().includes(s) && !t.userEmail.toLowerCase().includes(s) && !t.id.toLowerCase().includes(s)) return false;
    }
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    return true;
  });

  const paginatedTxns = filtered.slice(
    pagination.pageIndex * pagination.pageSize,
    (pagination.pageIndex + 1) * pagination.pageSize
  );

  const totalPages = Math.ceil(filtered.length / pagination.pageSize);

  const handleAction = async (id: string, action: 'verify' | 'reject') => {
    try {
      const endpoint = action === 'verify' ? '/api/admin/deposits' : '/api/admin/withdrawals';
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id }),
      });
      setSelectedTxn(null);
      fetchData();
    } catch {
      // ignore
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedTxns.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(paginatedTxns.map((t) => t.id)));
  };

  const columns = [
    {
      key: 'select',
      header: () => (
        <input
          type="checkbox"
          checked={selectedIds.size === paginatedTxns.length && paginatedTxns.length > 0}
          onChange={toggleSelectAll}
          className="w-4 h-4 rounded border-border bg-background cursor-pointer accent-blue"
        />
      ),
      render: (t: Txn) => (
        <input
          type="checkbox"
          checked={selectedIds.has(t.id)}
          onChange={() => toggleSelect(t.id)}
          className="w-4 h-4 rounded border-border bg-background cursor-pointer accent-blue"
        />
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (t: Txn) => (
        <Badge variant={t.type === 'deposit' ? 'success' : 'info'}>
          {t.type === 'deposit' ? '↓ Deposit' : '↑ Withdrawal'}
        </Badge>
      ),
    },
    {
      key: 'userName',
      header: 'User',
      render: (t: Txn) => <span className="font-medium text-white">{t.userName}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (t: Txn) => <span className="font-medium text-white">${(t.amount / 100).toFixed(2)}</span>,
    },
    {
      key: 'method',
      header: 'Method',
      render: (t: Txn) => <span className="text-text">{t.method}{t.network ? ` (${t.network})` : ''}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (t: Txn) => (
        <Badge variant={
          t.status === 'verified' || t.status === 'approved' || t.status === 'paid' ? 'success' :
          t.status === 'rejected' ? 'danger' : 'warning'
        }>
          {t.status}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (t: Txn) => <span className="text-textDark text-[11px]">{new Date(t.createdAt).toLocaleString()}</span>,
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-7 w-20 mb-2" /><Skeleton className="h-4 w-44" /></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="bg-surface border border-border rounded-xl p-4 space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-6 w-20" /></div>)}
        </div>
        <Card><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Finance</h1>
        <p className="text-sm text-textDark">Manage deposits and withdrawals</p>
      </div>

      {stats.pendingWithdrawals > 0 && (
        <div className="bg-orange/10 border border-orange/20 rounded-xl p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm font-semibold text-orange">{stats.pendingWithdrawals} withdrawals pending approval</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Pending Deposits" value={stats.pendingDeposits} />
        <StatsCard title="Pending Withdrawals" value={stats.pendingWithdrawals} />
        <StatsCard title="Total Deposits" value={`$${(stats.totalDeposits / 100).toFixed(2)}`} />
        <StatsCard title="Total Withdrawals" value={`$${(stats.totalWithdrawals / 100).toFixed(2)}`} />
      </div>

      <div className="flex gap-2 mb-2">
        {['all', 'pending', 'verified', 'approved', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPagination({ ...pagination, pageIndex: 0 }); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === s ? 'bg-blue text-white' : 'bg-surface text-textDark hover:bg-surface-hover'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchInput placeholder="Search by user or ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="w-40">
              <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} options={[
                { value: 'all', label: 'All Types' },
                { value: 'deposit', label: 'Deposits' },
                { value: 'withdrawal', label: 'Withdrawals' },
              ]} />
            </div>
            <Button variant="secondary" size="sm" onClick={() => {
              const exportData = filtered.map(t => ({
                id: t.id, type: t.type, user: t.userName, amount: t.amount / 100, method: t.method, status: t.status, date: new Date(t.createdAt).toLocaleDateString(),
              }));
              import('@/lib/export').then(m => m.exportToCSV(exportData, 'transactions'));
            }}>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedIds.size > 0 && (
        <Card className="border-blue/50 bg-blue/5">
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">{selectedIds.size} item(s) selected</span>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setSelectedIds(new Set())}>Clear</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={paginatedTxns}
            pagination={pagination}
            onPaginationChange={setPagination}
            totalPages={totalPages}
            onRowClick={(txn) => setSelectedTxn(txn)}
          />
        </CardContent>
      </Card>

      <Dialog open={!!selectedTxn} onClose={() => setSelectedTxn(null)}>
        <DialogHeader onClose={() => setSelectedTxn(null)}>
          <h2 className="text-lg font-bold text-white">Transaction Details</h2>
        </DialogHeader>
        <DialogContent>
          {selectedTxn && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant={selectedTxn.type === 'deposit' ? 'success' : 'info'}>
                  {selectedTxn.type === 'deposit' ? '↓ Deposit' : '↑ Withdrawal'}
                </Badge>
                <Badge variant={
                  selectedTxn.status === 'verified' || selectedTxn.status === 'approved' ? 'success' :
                  selectedTxn.status === 'rejected' ? 'danger' : 'warning'
                }>
                  {selectedTxn.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-[11px] text-textDark uppercase">ID</p><p className="text-sm text-white font-mono">{selectedTxn.id}</p></div>
                <div><p className="text-[11px] text-textDark uppercase">User</p><p className="text-sm text-white">{selectedTxn.userName}</p></div>
                <div><p className="text-[11px] text-textDark uppercase">Amount</p><p className="text-lg font-bold text-white">${(selectedTxn.amount / 100).toFixed(2)}</p></div>
                <div><p className="text-[11px] text-textDark uppercase">Method</p><p className="text-sm text-white">{selectedTxn.method} {selectedTxn.network}</p></div>
                {selectedTxn.txHash && <div className="col-span-2"><p className="text-[11px] text-textDark uppercase">{selectedTxn.type === 'deposit' ? 'Tx Hash' : 'Wallet Address'}</p><p className="text-sm text-text font-mono break-all">{selectedTxn.txHash}</p></div>}
                <div><p className="text-[11px] text-textDark uppercase">Created</p><p className="text-sm text-text">{new Date(selectedTxn.createdAt).toLocaleString()}</p></div>
                {selectedTxn.reviewedAt && <div><p className="text-[11px] text-textDark uppercase">Reviewed</p><p className="text-sm text-text">{new Date(selectedTxn.reviewedAt).toLocaleString()}</p></div>}
              </div>
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setSelectedTxn(null)}>Close</Button>
          {selectedTxn?.status === 'pending' && selectedTxn.type === 'deposit' && (
            <>
              <Button variant="danger" onClick={() => selectedTxn && handleAction(selectedTxn.id, 'reject')}>Reject</Button>
              <Button onClick={() => selectedTxn && handleAction(selectedTxn.id, 'verify')}>Approve</Button>
            </>
          )}
        </DialogFooter>
      </Dialog>
    </div>
  );
}
