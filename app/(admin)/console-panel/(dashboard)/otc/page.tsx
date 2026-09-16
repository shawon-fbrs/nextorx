import { getAdminPairs } from '@/lib/queries';
import OtcClient from './otc-client';

export const dynamic = 'force-dynamic';

export default async function OtcPage() {
  const data = await getAdminPairs();
  return <OtcClient initialData={data.pairs} />;
}
