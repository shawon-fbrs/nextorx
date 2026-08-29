'use client';

import { useState, useMemo, useEffect } from 'react';
import { mockTransactions, MockTransaction } from '@/lib/mock-data/transactions';
import { DataTable } from '@/components/admin/ui/data-table';
import { SearchInput } from '@/components/admin/ui/search-input';
import { Badge } from '@/components/admin/ui/badge';
import { Card, CardContent } from '@/components/admin/ui/card';
import { Select } from '@/components/admin/ui/select';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from '@/components/admin/ui/dialog';
import { Button } from '@/components/admin/ui/button';
import { StatsCard } from '@/components/admin/ui/stats-card';
import { Tabs } from '@/components/admin/ui/tabs';
import { Alert } from '@/components/admin/ui/alert';
import { Textarea } from '@/components/admin/ui/textarea';
import { Skeleton } from '@/components/admin/ui/skeleton';

export default function FinancePage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedTxn, setSelectedTxn] = useState<MockTransaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rejectReason, setRejectReason] = useState('');
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
          <Skeleton className="h-7 w-20 mb-2" />
          <Skeleton className="h-4 w-44" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-4 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-20" />
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

  const allTxns = useMemo(() => {
    let result = [...mockTransactions];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.userName.toLowerCase().includes(s) ||
          t.reference.toLowerCase().includes(s)
      );
    }
    if (statusFilter !== 'all') result = result.filter((t) => t.status === statusFilter);
    if (typeFilter !== 'all') result = result.filter((t) => t.type === typeFilter);
    return result;
  }, [search, statusFilter, typeFilter]);

  const stats = useMemo(() => ({
    pendingDeposits: mockTransactions.filter((t) => t.type === 'deposit' && t.status === 'pending').length,
    pendingWithdrawals: mockTransactions.filter((t) => t.type === 'withdrawal' && t.status === 'pending').length,
    totalDeposits: mockTransactions.filter((t) => t.type === 'deposit' && t.status === 'completed').reduce((s, t) => s + t.amount, 0),
    totalWithdrawals: mockTransactions.filter((t) => t.type === 'withdrawal' && (t.status === 'completed' || t.status === 'approved')).reduce((s, t) => s + t.amount, 0),
  }), []);

  const paginatedTxns = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return allTxns.slice(start, start + pagination.pageSize);
  }, [allTxns, pagination]);

  const totalPages = Math.ceil(allTxns.length / pagination.pageSize);

  const handleApprove = (txn: MockTransaction) => {
    alert(`Approved ${txn.reference}`);
    setSelectedTxn(null);
  };

  const handleReject = (txn: MockTransaction) => {
    alert(`Rejected ${txn.reference}: ${rejectReason}`);
    setRejectReason('');
    setSelectedTxn(null);
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedTxns.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedTxns.map(t => t.reference)));
    }
  };

  const handleBulkApprove = () => {
    alert(`Approved ${selectedIds.size} transactions`);
    setSelectedIds(new Set());
  };

  const handleBulkReject = () => {
    alert(`Rejected ${selectedIds.size} transactions`);
    setSelectedIds(new Set());
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
      render: (t: MockTransaction) => (
        <input
          type="checkbox"
          checked={selectedIds.has(t.reference)}
          onChange={() => toggleSelect(t.reference)}
          className="w-4 h-4 rounded border-border bg-background cursor-pointer accent-blue"
        />
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (t: MockTransaction) => (
        <Badge variant={t.type === 'deposit' ? 'success' : 'info'}>
          {t.type === 'deposit' ? '↓ Deposit' : '↑ Withdrawal'}
        </Badge>
      ),
    },
    {
      key: 'userName',
      header: 'User',
      render: (t: MockTransaction) => <span className="font-medium text-white">{t.userName}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (t: MockTransaction) => <span className="font-medium text-white">${t.amount.toLocaleString()}</span>,
    },
    {
      key: 'method',
      header: 'Method',
      render: (t: MockTransaction) => (
        <span className="text-text capitalize">{t.method.replace('_', ' ')}</span>
      ),
    },
    {
      key: 'details',
      header: 'Details',
      render: (t: MockTransaction) => <span className="text-textDark text-[11px]">{t.details}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (t: MockTransaction) => (
        <Badge
          variant={
            t.status === 'completed' ? 'success' : t.status === 'approved' ? 'success' : t.status === 'rejected' ? 'danger' : 'warning'
          }
        >
          {t.status}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (t: MockTransaction) => <span className="text-textDark text-[11px]">{new Date(t.createdAt).toLocaleString()}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Finance</h1>
        <p className="text-sm text-textDark">Manage deposits and withdrawals</p>
      </div>

      {/* Pending Alerts */}
      {stats.pendingWithdrawals > 0 && (
        <Alert variant="warning" title={`${stats.pendingWithdrawals} withdrawals pending approval`}>
          Review and process pending withdrawal requests.
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Pending Deposits" value={stats.pendingDeposits} />
        <StatsCard title="Pending Withdrawals" value={stats.pendingWithdrawals} />
        <StatsCard title="Total Deposits" value={`$${stats.totalDeposits.toLocaleString()}`} />
        <StatsCard title="Total Withdrawals" value={`$${stats.totalWithdrawals.toLocaleString()}`} />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'all', label: 'All', count: mockTransactions.length },
          { id: 'pending', label: 'Pending', count: mockTransactions.filter((t) => t.status === 'pending').length },
          { id: 'completed', label: 'Completed', count: mockTransactions.filter((t) => t.status === 'completed' || t.status === 'approved').length },
          { id: 'rejected', label: 'Rejected', count: mockTransactions.filter((t) => t.status === 'rejected').length },
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
                placeholder="Search by user or reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <div className="w-40">
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Types' },
                    { value: 'deposit', label: 'Deposits' },
                    { value: 'withdrawal', label: 'Withdrawals' },
                  ]}
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const exportData = allTxns.map(t => ({
                    reference: t.reference,
                    type: t.type,
                    user: t.userName,
                    amount: t.amount,
                    method: t.method,
                    status: t.status,
                    date: new Date(t.createdAt).toLocaleDateString(),
                  }));
                  import('@/lib/export').then(m => m.exportToCSV(exportData, 'transactions'));
                }}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <Card className="border-blue/50 bg-blue/5">
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue/20 flex items-center justify-center">
                  <span className="text-blue font-bold">{selectedIds.size}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{selectedIds.size} item(s) selected</p>
                  <p className="text-[11px] text-textDark">Bulk actions will apply to all selected items</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setSelectedIds(new Set())}>
                  Clear
                </Button>
                <Button variant="danger" size="sm" onClick={handleBulkReject}>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Reject All
                </Button>
                <Button size="sm" onClick={handleBulkApprove}>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Approve All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
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

      {/* Transaction Detail Modal */}
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
                <Badge
                  variant={
                    selectedTxn.status === 'completed' ? 'success' : selectedTxn.status === 'approved' ? 'success' : selectedTxn.status === 'rejected' ? 'danger' : 'warning'
                  }
                >
                  {selectedTxn.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-textDark uppercase">Reference</p>
                  <p className="text-sm text-white font-mono">{selectedTxn.reference}</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase">User</p>
                  <p className="text-sm text-white">{selectedTxn.userName}</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase">Amount</p>
                  <p className="text-lg font-bold text-white">${selectedTxn.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase">Method</p>
                  <p className="text-sm text-white capitalize">{selectedTxn.method.replace('_', ' ')}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[11px] text-textDark uppercase">Details</p>
                  <p className="text-sm text-text">{selectedTxn.details}</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase">Created</p>
                  <p className="text-sm text-text">{new Date(selectedTxn.createdAt).toLocaleString()}</p>
                </div>
                {selectedTxn.processedAt && (
                  <div>
                    <p className="text-[11px] text-textDark uppercase">Processed</p>
                    <p className="text-sm text-text">{new Date(selectedTxn.processedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>

              {selectedTxn.status === 'pending' && selectedTxn.type === 'withdrawal' && (
                <div className="pt-4 border-t border-border space-y-3">
                  <Textarea
                    label="Rejection Reason (if rejecting)"
                    placeholder="Enter reason for rejection..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setSelectedTxn(null)}>Close</Button>
          {selectedTxn?.status === 'pending' && (
            <>
              <Button variant="danger" onClick={() => selectedTxn && handleReject(selectedTxn)}>Reject</Button>
              <Button onClick={() => selectedTxn && handleApprove(selectedTxn)}>Approve</Button>
            </>
          )}
        </DialogFooter>
      </Dialog>
    </div>
  );
}
