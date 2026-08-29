'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { mockUsers, MockUser } from '@/lib/mock-data/users';
import { mockTrades } from '@/lib/mock-data/trades';
import { Badge } from '@/components/admin/ui/badge';
import { Button } from '@/components/admin/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/admin/ui/card';
import { StatsCard } from '@/components/admin/ui/stats-card';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from '@/components/admin/ui/dialog';
import { Textarea } from '@/components/admin/ui/textarea';
import { Input } from '@/components/admin/ui/input';

type Tab = 'overview' | 'trades' | 'deposits' | 'withdrawals';

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [adjustBalanceOpen, setAdjustBalanceOpen] = useState(false);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentNote, setAdjustmentNote] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');

  const user = mockUsers.find((u) => u.id === params.id);
  const userTrades = mockTrades.filter((t) => t.userId === params.id);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-textDark mb-4">User not found</p>
        <Button onClick={() => router.push('/console-panel/users')}>
          Back to Users
        </Button>
      </div>
    );
  }

  const handleAdjustBalance = () => {
    const amount = parseFloat(adjustmentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (!adjustmentNote.trim()) {
      alert('Please provide a reason for this adjustment');
      return;
    }
    alert(`Balance ${adjustmentType === 'add' ? 'added' : 'subtracted'}: $${amount}\nReason: ${adjustmentNote}`);
    setAdjustBalanceOpen(false);
    setAdjustmentAmount('');
    setAdjustmentNote('');
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'trades', label: 'Trades' },
    { id: 'deposits', label: 'Deposits' },
    { id: 'withdrawals', label: 'Withdrawals' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push('/console-panel/users')}
            className="text-sm text-textDark hover:text-white mb-2 flex items-center gap-1"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Users
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue/20 flex items-center justify-center">
              <span className="text-lg font-bold text-blue">{user.name.charAt(0)}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{user.name}</h1>
              <p className="text-sm text-textDark">{user.email}</p>
            </div>
            <Badge
              variant={
                user.status === 'active' ? 'success' : user.status === 'blocked' ? 'danger' : 'neutral'
              }
            >
              {user.status}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAdjustBalanceOpen(true)}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Adjust Balance
          </Button>
          <Button variant="outline" size="sm">Edit</Button>
          <Button variant="danger" size="sm">Ban User</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'text-blue border-blue'
                  : 'text-textDark border-transparent hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Balance"
              value={`$${user.balance.toLocaleString()}`}
            />
            <StatsCard
              title="Total Trades"
              value={user.totalTrades.toString()}
            />
            <StatsCard
              title="Total Deposits"
              value={`$${user.totalDeposits.toLocaleString()}`}
            />
            <StatsCard
              title="Total Withdrawals"
              value={`$${user.totalWithdrawals.toLocaleString()}`}
            />
          </div>

          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-textDark uppercase tracking-wider mb-1">Country</p>
                  <p className="text-sm text-white">{user.country}</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase tracking-wider mb-1">Phone</p>
                  <p className="text-sm text-white">{user.phone}</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase tracking-wider mb-1">KYC Status</p>
                  <Badge
                    variant={
                      user.kyc === 'approved' ? 'success' : user.kyc === 'pending' ? 'warning' : 'danger'
                    }
                  >
                    {user.kyc}
                  </Badge>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase tracking-wider mb-1">Verified</p>
                  <Badge variant={user.verified ? 'success' : 'warning'}>
                    {user.verified ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase tracking-wider mb-1">Joined</p>
                  <p className="text-sm text-white">{user.createdAt}</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase tracking-wider mb-1">Last Login</p>
                  <p className="text-sm text-white">{user.lastLogin}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[11px] text-textDark uppercase tracking-wider mb-1">Address</p>
                  <p className="text-sm text-white">{user.address}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Trades */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Trades</CardTitle>
            </CardHeader>
            <CardContent>
              {userTrades.length === 0 ? (
                <p className="text-sm text-textDark text-center py-4">No trades yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left text-[10px] font-semibold text-textDark uppercase">Asset</th>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold text-textDark uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold text-textDark uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold text-textDark uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userTrades.slice(0, 5).map((trade) => (
                        <tr key={trade.id} className="border-b border-border/50">
                          <td className="px-4 py-3 text-sm text-white">{trade.symbol}</td>
                          <td className="px-4 py-3 text-sm">
                            <Badge variant={trade.type === 'up' ? 'success' : 'danger'}>
                              {trade.type.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-white">${trade.amount}</td>
                          <td className="px-4 py-3 text-sm">
                            <Badge
                              variant={
                                trade.status === 'won'
                                  ? 'success'
                                  : trade.status === 'lost'
                                  ? 'danger'
                                  : 'neutral'
                              }
                            >
                              {trade.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'trades' && (
        <Card>
          <CardContent>
            {userTrades.length === 0 ? (
              <p className="text-sm text-textDark text-center py-8">No trades found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-textDark uppercase">ID</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-textDark uppercase">Asset</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-textDark uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-textDark uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-textDark uppercase">Open Price</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-textDark uppercase">Close Price</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-textDark uppercase">Profit</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-textDark uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-textDark uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userTrades.map((trade) => (
                      <tr key={trade.id} className="border-b border-border/50 hover:bg-surface-hover/50">
                        <td className="px-4 py-3 text-sm text-text">{trade.id}</td>
                        <td className="px-4 py-3 text-sm font-medium text-white">{trade.symbol}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant={trade.type === 'up' ? 'success' : 'danger'}>
                            {trade.type.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-white">${trade.amount}</td>
                        <td className="px-4 py-3 text-sm text-text">{trade.openPrice}</td>
                        <td className="px-4 py-3 text-sm text-text">{trade.closePrice || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={trade.profit && trade.profit >= 0 ? 'text-green' : 'text-red'}>
                            {trade.profit ? `$${trade.profit}` : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Badge
                            variant={
                              trade.status === 'won' ? 'success' : trade.status === 'lost' ? 'danger' : 'neutral'
                            }
                          >
                            {trade.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-text">{trade.createdAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'deposits' && (
        <Card>
          <CardContent>
            <p className="text-sm text-textDark text-center py-8">No deposits found</p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'withdrawals' && (
        <Card>
          <CardContent>
            <p className="text-sm text-textDark text-center py-8">No withdrawals found</p>
          </CardContent>
        </Card>
      )}

      {/* Balance Adjustment Dialog */}
      <Dialog open={adjustBalanceOpen} onClose={() => setAdjustBalanceOpen(false)}>
        <DialogHeader onClose={() => setAdjustBalanceOpen(false)}>
          <h2 className="text-lg font-bold text-white">Adjust User Balance</h2>
        </DialogHeader>
        <DialogContent className="space-y-4">
          <div className="p-3 bg-orange/10 border border-orange/20 rounded-lg">
            <p className="text-sm text-orange font-medium">Current Balance: ${user.balance.toLocaleString()}</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setAdjustmentType('add')}
              className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                adjustmentType === 'add'
                  ? 'bg-green text-white'
                  : 'bg-background text-textDark hover:text-white'
              }`}
            >
              + Add Funds
            </button>
            <button
              onClick={() => setAdjustmentType('subtract')}
              className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                adjustmentType === 'subtract'
                  ? 'bg-red text-white'
                  : 'bg-background text-textDark hover:text-white'
              }`}
            >
              - Subtract Funds
            </button>
          </div>

          <Input
            label="Amount ($)"
            type="number"
            placeholder="Enter amount"
            value={adjustmentAmount}
            onChange={(e) => setAdjustmentAmount(e.target.value)}
            min={1}
          />

          <Textarea
            label="Reason / Note (required)"
            placeholder="Enter reason for this adjustment (e.g., 'Customer support credit', 'Correction for duplicate charge')"
            value={adjustmentNote}
            onChange={(e) => setAdjustmentNote(e.target.value)}
            rows={3}
          />

          <div className="p-3 bg-background rounded-lg border border-border">
            <p className="text-[11px] text-textDark">
              <span className="font-semibold text-orange">Warning:</span> This action will be logged in the audit trail with timestamp and admin ID.
            </p>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setAdjustBalanceOpen(false)}>Cancel</Button>
          <Button onClick={handleAdjustBalance}>
            {adjustmentType === 'add' ? 'Add Funds' : 'Subtract Funds'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
