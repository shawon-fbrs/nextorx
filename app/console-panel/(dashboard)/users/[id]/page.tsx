'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/admin/ui/badge';
import { Button } from '@/components/admin/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/admin/ui/card';
import { StatsCard } from '@/components/admin/ui/stats-card';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from '@/components/admin/ui/dialog';
import { Textarea } from '@/components/admin/ui/textarea';
import { Input } from '@/components/admin/ui/input';
import { Skeleton } from '@/components/admin/ui/skeleton';

type UserData = {
  id: string;
  uid: string | null;
  name: string;
  email: string;
  role: string;
  balance: number;
  bonusBalance: number;
  kycStatus: string;
  banned: boolean | null;
  referralCode: string | null;
  phone: string | null;
  country: string | null;
  createdAt: string;
  _count: { ledgerEntries: number; deposits: number; withdrawals: number; trades: number };
};

type Trade = {
  id: string;
  direction: string;
  amount: number;
  status: string;
  profit: number | null;
  createdAt: string;
  pair: { name: string };
};

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adjustBalanceOpen, setAdjustBalanceOpen] = useState(false);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentNote, setAdjustmentNote] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/users?limit=200`).then(r => r.json()),
      fetch(`/api/admin/trades?limit=200`).then(r => r.json()),
    ]).then(([userData, tradeData]) => {
      const found = userData.users?.find((u: UserData) => u.id === params.id);
      setUser(found || null);
      if (tradeData.trades) {
        setTrades(tradeData.trades.filter((t: Trade) => t.id && userData.users?.find((u: UserData) => u.id === params.id)));
      }
    }).catch(() => {}).finally(() => setIsLoading(false));
  }, [params.id]);

  const handleAdjustBalance = async () => {
    const amount = parseFloat(adjustmentAmount);
    if (isNaN(amount) || amount <= 0) return;
    if (!adjustmentNote.trim()) return;

    try {
      await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust-balance',
          userId: params.id,
          amountUsd: adjustmentType === 'add' ? amount : -amount,
          note: adjustmentNote,
        }),
      });
      setAdjustBalanceOpen(false);
      setAdjustmentAmount('');
      setAdjustmentNote('');
      window.location.reload();
    } catch {}
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-textDark mb-4">User not found</p>
        <Button onClick={() => router.push('/console-panel/users')}>Back to Users</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.push('/console-panel/users')} className="text-sm text-textDark hover:text-white mb-2 flex items-center gap-1">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Back to Users
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue/20 flex items-center justify-center">
              <span className="text-lg font-bold text-blue">{user.name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{user.name}</h1>
              <p className="text-sm text-textDark">{user.email}</p>
            </div>
            <Badge variant={user.banned ? 'danger' : 'success'}>{user.banned ? 'blocked' : 'active'}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAdjustBalanceOpen(true)}>Adjust Balance</Button>
          <Button variant="danger" size="sm">Ban User</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Balance" value={`$${(user.balance / 100).toFixed(2)}`} />
        <StatsCard title="Total Trades" value={user._count.trades.toString()} />
        <StatsCard title="Deposits" value={user._count.deposits.toString()} />
        <StatsCard title="Withdrawals" value={user._count.withdrawals.toString()} />
      </div>

      <Card>
        <CardHeader><CardTitle>User Information</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-[11px] text-textDark uppercase">UID</p><p className="text-sm text-white font-mono">{user.uid}</p></div>
            <div><p className="text-[11px] text-textDark uppercase">Role</p><p className="text-sm text-white capitalize">{user.role}</p></div>
            <div><p className="text-[11px] text-textDark uppercase">KYC</p><Badge variant={user.kycStatus === 'APPROVED' ? 'success' : 'warning'}>{user.kycStatus.toLowerCase()}</Badge></div>
            <div><p className="text-[11px] text-textDark uppercase">Referral Code</p><p className="text-sm text-white font-mono">{user.referralCode}</p></div>
            <div><p className="text-[11px] text-textDark uppercase">Joined</p><p className="text-sm text-white">{new Date(user.createdAt).toLocaleDateString()}</p></div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={adjustBalanceOpen} onClose={() => setAdjustBalanceOpen(false)}>
        <DialogHeader onClose={() => setAdjustBalanceOpen(false)}>
          <h2 className="text-lg font-bold text-white">Adjust Balance</h2>
        </DialogHeader>
        <DialogContent className="space-y-4">
          <p className="text-sm text-orange">Current: ${(user.balance / 100).toFixed(2)}</p>
          <div className="flex gap-2">
            <button onClick={() => setAdjustmentType('add')} className={`flex-1 py-2.5 rounded-lg text-sm font-medium ${adjustmentType === 'add' ? 'bg-green text-white' : 'bg-background text-textDark'}`}>+ Add</button>
            <button onClick={() => setAdjustmentType('subtract')} className={`flex-1 py-2.5 rounded-lg text-sm font-medium ${adjustmentType === 'subtract' ? 'bg-red text-white' : 'bg-background text-textDark'}`}>- Subtract</button>
          </div>
          <Input label="Amount ($)" type="number" value={adjustmentAmount} onChange={(e) => setAdjustmentAmount(e.target.value)} />
          <Textarea label="Reason" value={adjustmentNote} onChange={(e) => setAdjustmentNote(e.target.value)} rows={3} />
        </DialogContent>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setAdjustBalanceOpen(false)}>Cancel</Button>
          <Button onClick={handleAdjustBalance}>Confirm</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
