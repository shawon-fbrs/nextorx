import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { can, type RoleName } from "@/lib/rbac";
import { prisma } from "@/lib/db";

export type ApiSessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export async function getSessionUser(): Promise<ApiSessionUser | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) return null;
    const user = session.user as unknown as ApiSessionUser;
    return user;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<ApiSessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new ApiError(401, "Unauthorized");
  }
  const [ban, exclusion] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { banned: true, banExpires: true } }),
    import("@/lib/self-exclusion").then((m) => m.isExcluded(user.id)),
  ]);
  if (ban?.banned && (!ban.banExpires || ban.banExpires.getTime() > Date.now())) {
    throw new ApiError(403, "Account has been banned. Contact support.");
  }
  if (exclusion) {
    throw new ApiError(403, "Account is self-excluded. Contact support when the exclusion period ends.");
  }
  return user;
}

export async function requirePermission(
  resource: Parameters<typeof can>[1],
  action: Parameters<typeof can>[2],
): Promise<ApiSessionUser> {
  const user = await requireUser();
  if (!can(user.role as RoleName, resource, action)) {
    throw new ApiError(403, "Forbidden");
  }
  return user;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function parseListQuery(
  url: URL,
  allowedStatuses?: readonly string[],
  maxLimit = 200,
): { status?: string; limit: number } {
  const rawLimit = Number(url.searchParams.get("limit") ?? 50);
  if (!Number.isFinite(rawLimit) || rawLimit <= 0) {
    throw new ApiError(400, "Invalid limit");
  }
  const limit = Math.min(Math.floor(rawLimit), maxLimit);
  const status = url.searchParams.get("status") ?? undefined;
  if (status && allowedStatuses && !allowedStatuses.includes(status)) {
    throw new ApiError(400, "Invalid status");
  }
  return { status, limit };
}

export function toJsonError(e: unknown) {  if (e instanceof ApiError) {
    return Response.json({ error: e.message }, { status: e.status });
  }
  const message = e instanceof Error ? e.message : "Internal server error";
  const status = e instanceof Error && "status" in e ? 400 : 500;
  return Response.json({ error: message }, { status });
}

export async function getUserWithProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      uid: true,
      name: true,
      email: true,
      role: true,
      balance: true,
      bonusBalance: true,
      referralCode: true,
      kycStatus: true,
      phone: true,
      country: true,
      createdAt: true,
    },
  });
}
