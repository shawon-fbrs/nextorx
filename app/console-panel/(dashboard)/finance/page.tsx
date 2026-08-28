'use client';

import { useState, useMemo } from 'react';
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

export default function FinancePage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedTxn, setSelectedTxn] = useState<MockTransaction | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [activeTab, setActiveTab] = useState('all');

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

  const columns = [
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
          </div>
        </CardContent>
      </Card>

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
