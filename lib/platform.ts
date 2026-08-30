import { prisma } from "@/lib/db";

export const PLATFORM_ACCOUNT_ID = "00000000-0000-7000-0000-000000000000";
export const PLATFORM_ACCOUNT_EMAIL = "platform@nextorx.internal";

export async function ensurePlatformAccount() {
  const existing = await prisma.user.findUnique({
    where: { id: PLATFORM_ACCOUNT_ID },
  });
  if (existing) return;
  await prisma.user.create({
    data: {
      id: PLATFORM_ACCOUNT_ID,
      name: "Platform Treasury",
      email: PLATFORM_ACCOUNT_EMAIL,
      emailVerified: true,
      role: "super_admin",
    },
  });
}
