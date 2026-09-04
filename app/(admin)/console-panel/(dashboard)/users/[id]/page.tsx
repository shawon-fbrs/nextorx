'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/admin/ui/badge';
import { Button } from '@/components/admin/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/admin/ui/card';
import { StatsCard } from '@/components/admin/ui/stats-card';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from '@/components/admin/ui/dialog';
import { Textarea } from '@/components/admin/ui/textarea';
import { Input } from '@/components/admin/ui/input';
import { Select } from '@/components/admin/ui/select';
import { Skeleton } from '@/components/admin/ui/skeleton';

type UserData = {
  id: string;
  uid: string | null;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string;
  balance: number;
  bonusBalance: number;
  kycStatus: string;
  banned: boolean | null;
  banReason: string | null;
  twoFactorEnabled: boolean;
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

const ROLES = [
  { value: 'player', label: 'Player' },
  { value: 'finance', label: 'Finance' },
  { value: 'support', label: 'Support' },
  { value: 'risk', label: 'Risk' },
  { value: 'super_admin', label: 'Super Admin' },
];

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adjustBalanceOpen, setAdjustBalanceOpen] = useState(false);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentNote, setAdjustmentNote] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [banOpen, setBanOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [role, setRole] = useState('');
  const [acting, setActing] = useState(false);

  useEffect(() => {
    params.then((p) => setUserId(p.id));
  }, [params]);

  const fetchDetail = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUser(data.user);
      setTrades(data.trades ?? []);
      setRole(data.user.role);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const postAction = async (body: Record<string, unknown>) => {
    setActing(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) fetchDetail();
    } catch {
    } finally {
      setActing(false);
    }
  };

  const handleAdjustBalance = async () => {
    const amount = parseFloat(adjustmentAmount);
    if (isNaN(amount) || amount <= 0) return;
    if (!adjustmentNote.trim()) return;
    if (!userId) return;

    await postAction({
      action: 'adjust-balance',
      userId,
      amountUsd: adjustmentType === 'add' ? amount : -amount,
      note: adjustmentNote,
    });
    setAdjustBalanceOpen(false);
    setAdjustmentAmount('');
    setAdjustmentNote('');
  };

  const handleBanToggle = async () => {
    if (!userId || !user) return;
    if (user.banned) {
      await postAction({ action: 'unban', userId });
    } else {
      if (banReason.trim().length < 3) return;
      await postAction({ action: 'ban', userId, reason: banReason.trim() });
    }
    setBanOpen(false);
    setBanReason('');
  };

  const handleRoleChange = async (next: string) => {
    if (!userId || next === user?.role) return;
    setRole(next);
    await postAction({ action: 'set-role', userId, role: next });
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
            {!user.emailVerified && <Badge variant="warning">unverified</Badge>}
            {user.twoFactorEnabled && <Badge variant="info">2fa</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAdjustBalanceOpen(true)}>Adjust Balance</Button>
          <Button variant={user.banned ? 'secondary' : 'danger'} size="sm" onClick={() => setBanOpen(true)}>
            {user.banned ? 'Unban User' : 'Ban User'}
          </Button>
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
            <div>
              <p className="text-[11px] text-textDark uppercase mb-1">Role</p>
              <Select value={role} onChange={(e) => handleRoleChange(e.target.value)} options={ROLES} />
            </div>
            <div><p className="text-[11px] text-textDark uppercase">KYC</p><Badge variant={user.kycStatus === 'TIER_1' ? 'success' : 'warning'}>{user.kycStatus.toLowerCase()}</Badge></div>
            <div><p className="text-[11px] text-textDark uppercase">Referral Code</p><p className="text-sm text-white font-mono">{user.referralCode}</p></div>
            <div><p className="text-[11px] text-textDark uppercase">Phone</p><p className="text-sm text-white">{user.phone ?? '—'}</p></div>
            <div><p className="text-[11px] text-textDark uppercase">Country</p><p className="text-sm text-white">{user.country ?? '—'}</p></div>
            <div><p className="text-[11px] text-textDark uppercase">Joined</p><p className="text-sm text-white">{new Date(user.createdAt).toLocaleDateString()}</p></div>
            {user.banned && user.banReason && (
              <div><p className="text-[11px] text-textDark uppercase">Ban Reason</p><p className="text-sm text-red">{user.banReason}</p></div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Trades ({trades.length})</CardTitle></CardHeader>
        <CardContent>
          {trades.length === 0 ? (
            <p className="text-sm text-textDark text-center py-6">No trades yet.</p>
          ) : (
            <div className="space-y-2">
              {trades.map((t) => (
                <div key={t.id} className="flex items-center gap-4 p-2.5 bg-background rounded-lg border border-border text-sm">
                  <span className="text-white font-semibold">{t.pair.name}</span>
                  <Badge variant={t.direction === 'UP' ? 'success' : 'danger'}>{t.direction}</Badge>
                  <span className="text-textDark">${(t.amount / 100).toFixed(2)}</span>
                  <span className="ml-auto text-textDark text-xs">{new Date(t.createdAt).toLocaleString()}</span>
                  <Badge variant={t.status === 'WON' ? 'success' : t.status === 'LOST' ? 'danger' : 'warning'}>{t.status}</Badge>
                </div>
              ))}
            </div>
          )}
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

      <Dialog open={banOpen} onClose={() => { setBanOpen(false); setBanReason(''); }}>
        <DialogHeader onClose={() => { setBanOpen(false); setBanReason(''); }}>
          <h2 className="text-lg font-bold text-white">{user.banned ? 'Unban User' : 'Ban User'}</h2>
        </DialogHeader>
        <DialogContent className="space-y-4">
          {user.banned ? (
            <p className="text-sm text-textDark">This will restore {user.email} to full access immediately.</p>
          ) : (
            <Textarea label="Ban reason (required)" value={banReason} onChange={(e) => setBanReason(e.target.value)} rows={3} placeholder="Fraud, abuse, chargeback..." />
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="secondary" onClick={() => { setBanOpen(false); setBanReason(''); }}>Cancel</Button>
          <Button variant="danger" isLoading={acting} onClick={handleBanToggle}>
            {user.banned ? 'Confirm Unban' : 'Confirm Ban'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
