import { prisma } from "@/lib/db";
import { credit, debit } from "@/lib/ledger";
import { PLATFORM_ACCOUNT_ID, ensurePlatformAccount } from "@/lib/platform";
import type { LedgerType } from "@prisma/client";

export const VAULT_ACCOUNT_ID = PLATFORM_ACCOUNT_ID;

const SYSTEM_USER_IDS = [VAULT_ACCOUNT_ID];

export interface VaultStats {
  treasury: number;
  owed: number;
  bonus: number;
  balance: number;
}

export async function getVaultStats(): Promise<VaultStats> {
  const [deposits, paidWithdrawals, real, bonus] = await Promise.all([
    prisma.depositRequest.aggregate({
      where: { status: "VERIFIED" },
      _sum: { amount: true },
    }),
    prisma.ledgerEntry.aggregate({
      where: { userId: VAULT_ACCOUNT_ID, type: "WITHDRAWAL_DEBIT" },
      _sum: { amount: true },
    }),
    prisma.user.aggregate({
      where: { id: { notIn: SYSTEM_USER_IDS } },
      _sum: { balance: true },
    }),
    prisma.user.aggregate({
      where: { id: { notIn: SYSTEM_USER_IDS } },
      _sum: { bonusBalance: true },
    }),
  ]);
  const t = (deposits._sum.amount ?? 0) + (paidWithdrawals._sum.amount ?? 0);
  const o = real._sum.balance ?? 0;
  const b = bonus._sum.bonusBalance ?? 0;
  return { treasury: t, owed: o, bonus: b, balance: t - o - b };
}

export async function getVaultLedger(limit = 100) {
  await ensurePlatformAccount();
  return prisma.ledgerEntry.findMany({
    where: { userId: VAULT_ACCOUNT_ID },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function creditVault(input: {
  type: LedgerType;
  amount: number;
  referenceId?: string;
  description?: string;
}) {
  await ensurePlatformAccount();
  return credit({
    userId: VAULT_ACCOUNT_ID,
    ...input,
  });
}

export async function debitVault(input: {
  type: LedgerType;
  amount: number;
  referenceId?: string;
  description?: string;
}) {
  await ensurePlatformAccount();
  return debit({
    userId: VAULT_ACCOUNT_ID,
    ...input,
    allowNegative: true,
  });
}
