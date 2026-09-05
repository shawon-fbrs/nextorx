import { prisma } from "@/lib/db";
import { credit, debit } from "@/lib/ledger";
import { PLATFORM_ACCOUNT_ID, ensurePlatformAccount } from "@/lib/platform";
import type { LedgerType } from "@prisma/client";

export const VAULT_ACCOUNT_ID = PLATFORM_ACCOUNT_ID;

const SYSTEM_USER_IDS = [VAULT_ACCOUNT_ID];

const REAL_USER_FILTER = {
  id: { notIn: SYSTEM_USER_IDS },
  deposits: { some: { status: "VERIFIED" as const } },
};

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
      where: REAL_USER_FILTER,
      _sum: { balance: true },
    }),
    prisma.user.aggregate({
      where: REAL_USER_FILTER,
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

export const MIN_RESERVE_PERCENT = 20;

export interface VaultSnapshot {
  totalLiabilities: number;
  activeExposure: number;
  pendingWithdrawals: number;
  availableReserve: number;
  reservePercent: number;
  coverageWeeks: number | null;
}

export async function getVaultSnapshot(): Promise<VaultSnapshot> {
  const [balanceAgg, exposureAgg, pendingAgg, recentPaid] = await Promise.all([
    prisma.user.aggregate({
      where: REAL_USER_FILTER,
      _sum: { balance: true },
    }),
    prisma.trade.aggregate({ where: { status: "ACTIVE" }, _sum: { amount: true } }),
    prisma.withdrawalRequest.aggregate({
      where: { status: "PENDING" },
      _sum: { amount: true },
    }),
    prisma.withdrawalRequest.aggregate({
      where: {
        status: { in: ["APPROVED", "PAID"] },
        createdAt: { gte: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000) },
      },
      _sum: { amount: true },
    }),
  ]);
  const totalLiabilities = balanceAgg._sum.balance ?? 0;
  const activeExposure = exposureAgg._sum.amount ?? 0;
  const pendingWithdrawals = pendingAgg._sum.amount ?? 0;
  const availableReserve = totalLiabilities - activeExposure - pendingWithdrawals;
  const reservePercent = totalLiabilities > 0 ? (availableReserve / totalLiabilities) * 100 : 100;
  const weeklyOutflow = Number(recentPaid._sum.amount ?? 0) / 4;
  const coverageWeeks =
    weeklyOutflow > 0 ? Math.floor((availableReserve / weeklyOutflow) * 10) / 10 : null;
  return {
    totalLiabilities,
    activeExposure,
    pendingWithdrawals,
    availableReserve,
    reservePercent,
    coverageWeeks,
  };
}

export async function canProcessWithdrawal(
  amount: number,
): Promise<{ allowed: boolean; reason?: string }> {
  const snapshot = await getVaultSnapshot();
  if (snapshot.totalLiabilities <= 0) {
    return { allowed: false, reason: "Treasury has no funds" };
  }
  const afterReserve = ((snapshot.availableReserve - amount) / snapshot.totalLiabilities) * 100;
  if (afterReserve < MIN_RESERVE_PERCENT) {
    return {
      allowed: false,
      reason: `Withdrawal would breach the ${MIN_RESERVE_PERCENT}% reserve requirement`,
    };
  }
  return { allowed: true };
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
