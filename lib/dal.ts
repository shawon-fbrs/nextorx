import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { can, type RoleName } from "@/lib/rbac";
import { prisma } from "@/lib/db";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

const ADMIN_ROLES: RoleName[] = ["super_admin", "finance", "support", "risk"];

export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role as RoleName);
}

export async function verifySession(): Promise<SessionUser | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) return null;
    const user = session.user as unknown as SessionUser;
    return user;
  } catch {
    return null;
  }
}

export async function verifySessionFromCookies(
  cookieHeader: string,
): Promise<SessionUser | null> {
  try {
    const session = await auth.api.getSession({
      headers: new Headers({ cookie: cookieHeader }),
    });
    if (!session?.user) return null;
    return session.user as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionUser> {
  const user = await verifySession();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requirePermission(
  resource: Parameters<typeof can>[1],
  action: Parameters<typeof can>[2],
): Promise<SessionUser> {
  const user = await requireSession();
  if (!can(user.role, resource, action)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export function hasPermission(
  role: string,
  resource: Parameters<typeof can>[1],
  action: Parameters<typeof can>[2],
): boolean {
  return can(role, resource, action);
}
