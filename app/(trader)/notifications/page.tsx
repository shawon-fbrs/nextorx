import { requireUser } from '@/lib/api';
import { prisma } from '@/lib/db';
import NotificationsClient from './notifications-client';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const user = await requireUser();
  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, type: true, title: true, body: true, readAt: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  return <NotificationsClient initialData={notifications} userId={user.id} />;
}
