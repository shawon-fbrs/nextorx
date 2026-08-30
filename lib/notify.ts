import { prisma } from "@/lib/db";

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
) {
  await prisma.notification.create({ data: { userId, type, title, body } });
}
