'use client';

import Link from 'next/link';
import { markAllNotificationsRead, markNotificationRead } from '@/lib/actions/admin';

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | Date | null;
  createdAt: string | Date;
};

export default function NotificationsClient({
  initialData,
  userId,
}: {
  initialData: Notif[];
  userId: string;
}) {
  const markAllRead = async () => {
    await markAllNotificationsRead(userId);
  };

  const markRead = async (id: string) => {
    await markNotificationRead(userId, [id]);
  };

  return (
    <div className="bg-background text-text h-full overflow-y-auto">
      <div className="px-6 py-6 max-w-xl mx-auto">
        <Link href="/trade/demo" className="text-xs text-blue font-semibold">← Back</Link>
        <div className="flex items-center justify-between mt-2 mb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Notifications</h1>
            <p className="text-sm text-text-dark mt-1">Deposits, withdrawals, security.</p>
          </div>
          <button onClick={markAllRead} className="text-[11px] text-blue hover:text-blue-hover font-bold">
            Mark all read
          </button>
        </div>

        <div className="space-y-2">
          {initialData.length === 0 ? (
            <p className="text-xs text-text-dark text-center py-8">No notifications yet.</p>
          ) : (
            initialData.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.readAt && markRead(n.id)}
                className={`w-full text-left p-4 bg-surface border rounded-xl transition-colors ${n.readAt ? 'border-border opacity-60' : 'border-blue/30 bg-blue/5'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-foreground">{n.title}</span>
                  <span className="text-[10px] text-text-dark">{new Date(n.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-xs text-text leading-relaxed">{n.body}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
