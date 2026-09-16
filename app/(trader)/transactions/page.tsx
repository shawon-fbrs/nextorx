import { requireUser } from '@/lib/api';
import { prisma } from '@/lib/db';
import TransactionsClient from './transactions-client';

export const dynamic = 'force-dynamic';

export default async function TransactionsPage() {
  const user = await requireUser();
  const history = await prisma.ledgerEntry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return <TransactionsClient initialData={history} />;
}
