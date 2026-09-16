import { getAdminTreasury } from '@/lib/queries';
import TreasuryClient from './treasury-client';

export const dynamic = 'force-dynamic';

export default async function TreasuryPage() {
  const data = await getAdminTreasury();
  return <TreasuryClient initialData={data} />;
}
