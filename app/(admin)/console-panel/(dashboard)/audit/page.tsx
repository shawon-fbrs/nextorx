import { getAdminAuditLogs } from '@/lib/queries';
import AuditClient from './audit-client';

export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  const data = await getAdminAuditLogs();
  return <AuditClient initialData={data.logs} />;
}
