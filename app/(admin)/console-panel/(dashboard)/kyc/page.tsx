import { getAdminKyc } from '@/lib/queries';
import KycClient from './kyc-client';

export const dynamic = 'force-dynamic';

export default async function KycPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const data = await getAdminKyc(status);
  return <KycClient initialData={data} initialFilter={status ?? 'PENDING'} />;
}
