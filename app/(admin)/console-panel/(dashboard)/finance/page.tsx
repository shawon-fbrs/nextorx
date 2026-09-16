import { getAdminFinance } from '@/lib/queries';
import FinanceClient from './finance-client';

export const dynamic = 'force-dynamic';

export default async function FinancePage() {
  const data = await getAdminFinance();
  return <FinanceClient initialData={data} />;
}
