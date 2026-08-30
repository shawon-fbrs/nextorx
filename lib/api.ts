import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/db";

export type ApiSessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export async function getSessionUser(): Promise<ApiSessionUser | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) return null;
  const user = session.user as unknown as ApiSessionUser;
  return user;
}

export async function requireUser(): Promise<ApiSessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new ApiError(401, "Unauthorized");
  }
  return user;
}

export async function requirePermission(
  resource: Parameters<typeof can>[1],
  action: Parameters<typeof can>[2],
): Promise<ApiSessionUser> {
  const user = await requireUser();
  if (!can(user.role, resource, action)) {
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

export function toJsonError(e: unknown) {
  if (e instanceof ApiError) {
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
