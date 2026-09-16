import { getAdminDashboardStats } from '@/lib/queries';
import OperationsClient from './operations-client';

export const dynamic = 'force-dynamic';

export default async function OperationsPage() {
  const stats = await getAdminDashboardStats();
  return <OperationsClient initialStats={stats} />;
}
