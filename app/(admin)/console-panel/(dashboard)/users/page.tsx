import { getAdminUsers } from '@/lib/queries';
import UsersClient from './users-client';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const data = await getAdminUsers({ limit: 200 });
  return <UsersClient initialData={data.users} />;
}
