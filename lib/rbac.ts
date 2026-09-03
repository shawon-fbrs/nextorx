import { createAccessControl } from "better-auth/plugins/access";

export const statements = {
  user: ["create", "read", "list", "update", "delete", "ban", "impersonate"],
  session: ["list", "revoke"],
  deposit: ["list", "verify", "reject"],
  withdrawal: ["list", "approve", "reject", "mark_paid"],
  kyc: ["list", "approve", "reject"],
  ledger: ["read", "adjust"],
  settings: ["read", "manage"],
  promo: ["read", "manage"],
  payment: ["list", "manage"],
    pair: ["create", "read", "list", "update", "delete"],
  trade: ["read", "cancel"],
  audit: ["read"],
} as const;

export const ac = createAccessControl(statements);

export const roles = {
  player: ac.newRole({
    user: ["create"],
    session: ["list", "revoke"],
  }),
  finance: ac.newRole({
    user: ["list", "read"],
    deposit: ["list", "verify", "reject"],
    withdrawal: ["list", "approve", "reject", "mark_paid"],
    ledger: ["read"],
    settings: ["read"],
    payment: ["list"],
  }),
  support: ac.newRole({
    user: ["list", "read"],
  }),
  risk: ac.newRole({
    user: ["list", "read", "ban", "update"],
    kyc: ["list", "approve", "reject"],
    trade: ["read", "cancel"],
  }),
  super_admin: ac.newRole({
    user: ["create", "read", "list", "update", "delete", "ban", "impersonate"],
    session: ["list", "revoke"],
    deposit: ["list", "verify", "reject"],
    withdrawal: ["list", "approve", "reject", "mark_paid"],
    kyc: ["list", "approve", "reject"],
    ledger: ["read", "adjust"],
    settings: ["read", "manage"],
    promo: ["read", "manage"],
    payment: ["list", "manage"],
  pair: ["create", "read", "list", "update", "delete"],
    trade: ["read", "cancel"],
    audit: ["read"],
  }),
} satisfies Record<string, ReturnType<typeof ac.newRole>>;

export type RoleName = keyof typeof roles;

export function can(
  role: string,
  resource: keyof typeof statements,
  action: string,
): boolean {
  const roleDef = roles[role as RoleName];
  if (!roleDef) return false;
  return roleDef.authorize({ [resource]: [action] }).success;
}
