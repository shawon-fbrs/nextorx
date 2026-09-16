import { getAdminResources } from '@/lib/queries';
import ResourcesClient from './resources-client';

export const dynamic = 'force-dynamic';

export default async function ResourcesPage() {
  const data = await getAdminResources();
  return <ResourcesClient initialData={data.categories} />;
}
