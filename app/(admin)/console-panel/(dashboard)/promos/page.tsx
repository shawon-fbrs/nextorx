import { getAdminPromos } from '@/lib/queries';
import PromosClient from './promos-client';

export const dynamic = 'force-dynamic';

export default async function PromosPage() {
  const data = await getAdminPromos();
  return <PromosClient initialData={data.promos} />;
}
