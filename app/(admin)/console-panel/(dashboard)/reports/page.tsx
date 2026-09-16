import { getAdminDashboardStats, getAdminPnl, getAdminExposure } from '@/lib/queries';
import ReportsClient from './reports-client';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const [stats, pnl, exposureData] = await Promise.all([
    getAdminDashboardStats(),
    getAdminPnl(30).catch(() => null),
    getAdminExposure().catch(() => null),
  ]);
  return <ReportsClient initialStats={stats} initialPnl={pnl} initialExposure={exposureData?.exposure ?? null} />;
}
