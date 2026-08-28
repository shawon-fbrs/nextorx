'use client';

import { useState, useMemo, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { mockUsers, MockUser } from '@/lib/mock-data/users';
import { DataTable } from '@/components/admin/ui/data-table';
import { SearchInput } from '@/components/admin/ui/search-input';
import { Badge } from '@/components/admin/ui/badge';
import { Card, CardContent } from '@/components/admin/ui/card';

const columns = [
  {
    key: 'name',
    header: 'User',
    render: (user: MockUser): ReactNode => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue/20 flex items-center justify-center">
          <span className="text-xs font-bold text-blue">{user.name.charAt(0)}</span>
        </div>
        <div>
          <p className="text-sm font-medium text-white">{user.name}</p>
          <p className="text-[11px] text-textDark">{user.email}</p>
        </div>
      </div>
    ),
  },
  {
    key: 'country',
    header: 'Country',
  },
  {
    key: 'balance',
    header: 'Balance',
    render: (user: MockUser): ReactNode => (
      <span className="text-sm font-medium text-white">
        ${user.balance.toLocaleString()}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (user: MockUser): ReactNode => (
      <Badge
        variant={
          user.status === 'active' ? 'success' : user.status === 'blocked' ? 'danger' : 'neutral'
        }
      >
        {user.status}
      </Badge>
    ),
  },
  {
    key: 'kyc',
    header: 'KYC',
    render: (user: MockUser): ReactNode => (
      <Badge
        variant={
          user.kyc === 'approved' ? 'success' : user.kyc === 'pending' ? 'warning' : 'danger'
        }
      >
        {user.kyc}
      </Badge>
    ),
  },
  {
    key: 'verified',
    header: 'Verified',
    render: (user: MockUser): ReactNode => (
      <Badge variant={user.verified ? 'success' : 'warning'}>
        {user.verified ? 'Yes' : 'No'}
      </Badge>
    ),
  },
  {
    key: 'lastLogin',
    header: 'Last Login',
  },
];

export default function UsersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const filteredUsers = useMemo(() => {
    let result = [...mockUsers];

    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(lowerSearch) ||
          u.email.toLowerCase().includes(lowerSearch)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((u) => u.status === statusFilter);
    }

    return result;
  }, [search, statusFilter]);

  const paginatedUsers = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return filteredUsers.slice(start, start + pagination.pageSize);
  }, [filteredUsers, pagination]);

  const totalPages = Math.ceil(filteredUsers.length / pagination.pageSize);

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
              {['all', 'active', 'blocked', 'pending'].map((status) => (
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
