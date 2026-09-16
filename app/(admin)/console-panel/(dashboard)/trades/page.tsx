import { getAdminTrades } from '@/lib/queries';
import TradesClient from './trades-client';

export const dynamic = 'force-dynamic';

export default async function TradesPage() {
  const data = await getAdminTrades({ limit: 500 });
  return <TradesClient initialData={data.trades} />;
}
