import { prisma } from "@/lib/db";

export async function getActiveExclusion(userId: string) {
  const exclusion = await prisma.selfExclusion.findUnique({ where: { userId } });
  if (!exclusion) return null;
  if (exclusion.excludedUntil.getTime() <= Date.now()) {
    await prisma.selfExclusion.delete({ where: { userId } }).catch(() => {});
    return null;
  }
  return exclusion;
}

export async function isExcluded(userId: string): Promise<boolean> {
  return (await getActiveExclusion(userId)) !== null;
}
