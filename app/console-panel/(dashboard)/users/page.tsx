'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/admin/ui/data-table';
import { SearchInput } from '@/components/admin/ui/search-input';
import { Badge } from '@/components/admin/ui/badge';
import { Card, CardContent } from '@/components/admin/ui/card';
import { Button } from '@/components/admin/ui/button';
import { Skeleton } from '@/components/admin/ui/skeleton';

type User = {
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
  createdAt: string;
  _count: { ledgerEntries: number; deposits: number; withdrawals: number; trades: number };
};

const columns = [
  {
    key: 'name',
    header: 'User',
    render: (user: User): ReactNode => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue/20 flex items-center justify-center">
          <span className="text-xs font-bold text-blue">{user.name.charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <p className="text-sm font-medium text-white">{user.name}</p>
          <p className="text-[11px] text-textDark">{user.email}</p>
        </div>
      </div>
    ),
  },
  {
    key: 'uid',
    header: 'UID',
    render: (user: User): ReactNode => (
      <span className="text-xs font-mono text-textDark">{user.uid ?? '—'}</span>
    ),
  },
  {
    key: 'balance',
    header: 'Balance',
    render: (user: User): ReactNode => (
      <span className="text-sm font-medium text-white">
        ${(user.balance / 100).toFixed(2)}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (user: User): ReactNode => (
      <Badge variant={user.banned ? 'danger' : 'success'}>
        {user.banned ? 'blocked' : 'active'}
      </Badge>
    ),
  },
  {
    key: 'kycStatus',
    header: 'KYC',
    render: (user: User): ReactNode => (
      <Badge
        variant={
          user.kycStatus === 'APPROVED' ? 'success' : user.kycStatus === 'PENDING' ? 'warning' : 'neutral'
        }
      >
        {user.kycStatus === 'NOT_SUBMITTED' ? 'none' : user.kycStatus.toLowerCase()}
      </Badge>
    ),
  },
  {
    key: 'role',
    header: 'Role',
    render: (user: User): ReactNode => (
      <span className="text-xs text-textDark capitalize">{user.role}</span>
    ),
  },
  {
    key: 'trades',
    header: 'Trades',
    render: (user: User): ReactNode => (
      <span className="text-xs text-textDark">{user._count.trades}</span>
    ),
  },
];

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users?limit=200');
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (search) {
      const q = search.toLowerCase();
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    }
    if (statusFilter === 'active') return !u.banned;
    if (statusFilter === 'blocked') return !!u.banned;
    return true;
  });

  const paginatedUsers = filteredUsers.slice(
    pagination.pageIndex * pagination.pageSize,
    (pagination.pageIndex + 1) * pagination.pageSize
  );

  const totalPages = Math.ceil(filteredUsers.length / pagination.pageSize);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-16 mb-2" />
          <Skeleton className="h-4 w-40" />
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
        <h1 className="text-xl font-bold text-white">Users</h1>
        <p className="text-sm text-textDark">Manage your platform users</p>
      </div>

      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchInput
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {['all', 'active', 'blocked'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    statusFilter === status
                      ? 'bg-blue text-white'
                      : 'bg-surface text-textDark hover:bg-surface-hover'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const exportData = filteredUsers.map(u => ({
                    id: u.id,
                    uid: u.uid,
                    name: u.name,
                    email: u.email,
                    role: u.role,
                    balance: u.balance / 100,
                    kyc: u.kycStatus,
                    banned: u.banned,
                    trades: u._count.trades,
                  }));
                  import('@/lib/export').then(m => m.exportToCSV(exportData, 'users'));
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

      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={paginatedUsers}
            pagination={pagination}
            onPaginationChange={setPagination}
            totalPages={totalPages}
            onRowClick={(user) => router.push(`/console-panel/users/${user.id}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
