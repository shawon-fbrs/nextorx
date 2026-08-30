import { prisma } from "@/lib/db";

export const SETTING_DEFAULTS: Record<string, { value: number; label: string }> = {
  bonusTurnoverMultiplier: { value: 30, label: "Bonus turnover multiplier" },
  bonusValidityDays: { value: 30, label: "Bonus validity (days)" },
  maxBonusBet: { value: 1000, label: "Max stake while bonus active (cents)" },
  defaultPayoutPercent: { value: 80, label: "Default payout percent" },
  minTradeAmount: { value: 100, label: "Min trade amount (cents)" },
  maxTradeAmount: { value: 500000, label: "Max trade amount (cents)" },
  balanceMultiplierDay1: { value: 150, label: "Balance multiplier day 1 (x100)" },
  balanceMultiplierDay30: { value: 200, label: "Balance multiplier day 30 (x100)" },
  balanceMultiplierDay90: { value: 300, label: "Balance multiplier day 90 (x100)" },
};

export type SettingKey = keyof typeof SETTING_DEFAULTS;

export async function getSettings(): Promise<Record<string, number>> {
  const rows = await prisma.platformSetting.findMany();
  const found = new Map(rows.map((r: any) => [r.key, r.value]));
  const missing = Object.keys(SETTING_DEFAULTS).filter((k) => !found.has(k));
  if (missing.length > 0) {
    await prisma.platformSetting.createMany({
      data: missing.map((k) => ({
        key: k,
        value: SETTING_DEFAULTS[k].value,
        label: SETTING_DEFAULTS[k].label,
      })),
      skipDuplicates: true,
    });
    for (const k of missing) found.set(k, SETTING_DEFAULTS[k].value);
  }
  return Object.fromEntries(found);
}

export async function getSetting(key: SettingKey): Promise<number> {
  const row = await prisma.platformSetting.findUnique({ where: { key } });
  if (row) return row.value;
  const def = SETTING_DEFAULTS[key];
  await prisma.platformSetting.upsert({
    where: { key },
    create: { key, value: def.value, label: def.label },
    update: {},
  });
  return def.value;
}
