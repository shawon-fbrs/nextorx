import { getAdminUserDetail } from '@/lib/queries';
import { notFound } from 'next/navigation';
import UserDetailClient from './user-detail-client';

export const dynamic = 'force-dynamic';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getAdminUserDetail(id);
  if (!data) notFound();
  return <UserDetailClient initialData={data} />;
}
