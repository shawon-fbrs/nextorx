import { getAdminDashboardStats } from '@/lib/queries';
import DashboardClient from './dashboard-client';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const stats = await getAdminDashboardStats();
  return <DashboardClient initialData={stats} />;
}
