import { PrismaClient } from "@prisma/client";
import { auth } from "../lib/auth";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

// Launch set: 36 blueprint assets (21 forex, 6 crypto, 6 stocks, 3 commodities).
// Volatility uses the SHARED RELATIVE scale (see lib/pf-math.ts):
//   forex 0.3-0.8, crypto 1.5-3.0, stocks 1.0-1.6, commodities 0.5-1.5.
// All pairs trade 24/7 (synthetic market never closes).
// Admin panel remains sovereign: edit, disable, or delete any row;
// seed upserts only refresh these 36 definitions on deploy boot.
const OTC_PAIRS = [
  // ── Forex Majors (7) ──
  { id: "EURUSD", name: "EUR/USD", symbol: "EUR/USD", category: "forex", basePrice: 1.0850, volatility: 0.50, payoutPercent: 82, weekendPayout: 79, spread: 0.00015, tags: ["major", "popular"], sortOrder: 1 },
  { id: "GBPUSD", name: "GBP/USD", symbol: "GBP/USD", category: "forex", basePrice: 1.2700, volatility: 0.55, payoutPercent: 80, weekendPayout: 77, spread: 0.00020, tags: ["major", "popular"], sortOrder: 2 },
  { id: "USDJPY", name: "USD/JPY", symbol: "USD/JPY", category: "forex", basePrice: 149.50, volatility: 0.50, payoutPercent: 84, weekendPayout: 81, spread: 0.015, tags: ["major", "popular"], sortOrder: 3 },
  { id: "USDCHF", name: "USD/CHF", symbol: "USD/CHF", category: "forex", basePrice: 0.8920, volatility: 0.45, payoutPercent: 79, weekendPayout: 76, spread: 0.00018, tags: ["major"], sortOrder: 4 },
  { id: "AUDUSD", name: "AUD/USD", symbol: "AUD/USD", category: "forex", basePrice: 0.6580, volatility: 0.50, payoutPercent: 81, weekendPayout: 78, spread: 0.00018, tags: ["major"], sortOrder: 5 },
  { id: "USDCAD", name: "USD/CAD", symbol: "USD/CAD", category: "forex", basePrice: 1.3650, volatility: 0.45, payoutPercent: 80, weekendPayout: 77, spread: 0.00020, tags: ["major"], sortOrder: 6 },
  { id: "NZDUSD", name: "NZD/USD", symbol: "NZD/USD", category: "forex", basePrice: 0.6050, volatility: 0.50, payoutPercent: 78, weekendPayout: 75, spread: 0.00022, tags: ["major"], sortOrder: 7 },

  // ── Forex Crosses (9) ──
  { id: "EURGBP", name: "EUR/GBP", symbol: "EUR/GBP", category: "forex", basePrice: 0.8540, volatility: 0.40, payoutPercent: 80, weekendPayout: 77, spread: 0.00015, tags: ["cross"], sortOrder: 8 },
  { id: "EURJPY", name: "EUR/JPY", symbol: "EUR/JPY", category: "forex", basePrice: 162.30, volatility: 0.60, payoutPercent: 82, weekendPayout: 79, spread: 0.018, tags: ["cross", "popular"], sortOrder: 9 },
  { id: "EURCHF", name: "EUR/CHF", symbol: "EUR/CHF", category: "forex", basePrice: 0.9680, volatility: 0.35, payoutPercent: 79, weekendPayout: 76, spread: 0.00015, tags: ["cross"], sortOrder: 10 },
  { id: "GBPJPY", name: "GBP/JPY", symbol: "GBP/JPY", category: "forex", basePrice: 190.00, volatility: 0.75, payoutPercent: 83, weekendPayout: 80, spread: 0.025, tags: ["cross", "volatile"], sortOrder: 11 },
  { id: "AUDJPY", name: "AUD/JPY", symbol: "AUD/JPY", category: "forex", basePrice: 98.40, volatility: 0.65, payoutPercent: 80, weekendPayout: 77, spread: 0.015, tags: ["cross"], sortOrder: 12 },
  { id: "AUDNZD", name: "AUD/NZD", symbol: "AUD/NZD", category: "forex", basePrice: 1.0870, volatility: 0.40, payoutPercent: 78, weekendPayout: 75, spread: 0.00025, tags: ["cross"], sortOrder: 13 },
  { id: "CADJPY", name: "CAD/JPY", symbol: "CAD/JPY", category: "forex", basePrice: 109.50, volatility: 0.60, payoutPercent: 79, weekendPayout: 76, spread: 0.015, tags: ["cross"], sortOrder: 14 },
  { id: "CHFJPY", name: "CHF/JPY", symbol: "CHF/JPY", category: "forex", basePrice: 167.60, volatility: 0.60, payoutPercent: 78, weekendPayout: 75, spread: 0.020, tags: ["cross"], sortOrder: 15 },
  { id: "GBPAUD", name: "GBP/AUD", symbol: "GBP/AUD", category: "forex", basePrice: 1.9300, volatility: 0.60, payoutPercent: 80, weekendPayout: 77, spread: 0.00035, tags: ["cross"], sortOrder: 16 },

  // ── Forex Exotics (5) ──
  { id: "EURAUD", name: "EUR/AUD", symbol: "EUR/AUD", category: "forex", basePrice: 1.6490, volatility: 0.55, payoutPercent: 80, weekendPayout: 77, spread: 0.00030, tags: ["exotic"], sortOrder: 17 },
  { id: "EURCAD", name: "EUR/CAD", symbol: "EUR/CAD", category: "forex", basePrice: 1.4810, volatility: 0.50, payoutPercent: 79, weekendPayout: 76, spread: 0.00025, tags: ["exotic"], sortOrder: 18 },
  { id: "GBPCAD", name: "GBP/CAD", symbol: "GBP/CAD", category: "forex", basePrice: 1.7340, volatility: 0.55, payoutPercent: 80, weekendPayout: 77, spread: 0.00030, tags: ["exotic"], sortOrder: 19 },
  { id: "NZDJPY", name: "NZD/JPY", symbol: "NZD/JPY", category: "forex", basePrice: 90.50, volatility: 0.60, payoutPercent: 79, weekendPayout: 76, spread: 0.012, tags: ["exotic"], sortOrder: 20 },
  { id: "USDMXN", name: "USD/MXN", symbol: "USD/MXN", category: "forex", basePrice: 17.50, volatility: 0.70, payoutPercent: 82, weekendPayout: 79, spread: 0.004, tags: ["exotic", "volatile"], sortOrder: 21 },

  // ── Crypto (6) ──
  { id: "BTCUSD", name: "BTC/USD", symbol: "BTC/USD", category: "crypto", basePrice: 67500.00, volatility: 2.20, payoutPercent: 90, weekendPayout: 90, spread: 25.00, tags: ["major", "popular", "volatile"], sortOrder: 22 },
  { id: "ETHUSD", name: "ETH/USD", symbol: "ETH/USD", category: "crypto", basePrice: 3450.00, volatility: 2.00, payoutPercent: 88, weekendPayout: 88, spread: 1.50, tags: ["major", "popular"], sortOrder: 23 },
  { id: "SOLUSD", name: "SOL/USD", symbol: "SOL/USD", category: "crypto", basePrice: 175.00, volatility: 2.60, payoutPercent: 91, weekendPayout: 91, spread: 0.40, tags: ["volatile"], sortOrder: 24 },
  { id: "XRPUSD", name: "XRP/USD", symbol: "XRP/USD", category: "crypto", basePrice: 0.62, volatility: 2.40, payoutPercent: 89, weekendPayout: 89, spread: 0.001, tags: ["popular"], sortOrder: 25 },
  { id: "BNBUSD", name: "BNB/USD", symbol: "BNB/USD", category: "crypto", basePrice: 610.00, volatility: 1.80, payoutPercent: 88, weekendPayout: 88, spread: 1.50, tags: ["major"], sortOrder: 26 },
  { id: "DOGEUSD", name: "DOGE/USD", symbol: "DOGE/USD", category: "crypto", basePrice: 0.185, volatility: 3.00, payoutPercent: 90, weekendPayout: 90, spread: 0.0005, tags: ["meme", "volatile"], sortOrder: 27 },

  // ── Stocks (6, synthetic 24/7) ──
  { id: "TSLAUSD", name: "Tesla", symbol: "TSLA/USD", category: "stocks", basePrice: 250.00, volatility: 1.50, payoutPercent: 84, weekendPayout: 81, spread: 0.10, tags: ["volatile", "popular"], sortOrder: 28 },
  { id: "AAPLUSD", name: "Apple", symbol: "AAPL/USD", category: "stocks", basePrice: 230.00, volatility: 1.00, payoutPercent: 82, weekendPayout: 79, spread: 0.08, tags: ["major"], sortOrder: 29 },
  { id: "AMZNUSD", name: "Amazon", symbol: "AMZN/USD", category: "stocks", basePrice: 200.00, volatility: 1.10, payoutPercent: 82, weekendPayout: 79, spread: 0.08, tags: ["major"], sortOrder: 30 },
  { id: "NVDAUSD", name: "NVIDIA", symbol: "NVDA/USD", category: "stocks", basePrice: 130.00, volatility: 1.60, payoutPercent: 85, weekendPayout: 82, spread: 0.06, tags: ["volatile", "popular"], sortOrder: 31 },
  { id: "GOOGLUSD", name: "Google", symbol: "GOOGL/USD", category: "stocks", basePrice: 175.00, volatility: 1.00, payoutPercent: 82, weekendPayout: 79, spread: 0.07, tags: ["major"], sortOrder: 32 },
  { id: "METAUSD", name: "Meta", symbol: "META/USD", category: "stocks", basePrice: 550.00, volatility: 1.20, payoutPercent: 83, weekendPayout: 80, spread: 0.20, tags: ["major"], sortOrder: 33 },

  // ── Commodities (3) ──
  { id: "XAUUSD", name: "Gold", symbol: "XAU/USD", category: "commodities", basePrice: 2350.00, volatility: 0.90, payoutPercent: 85, weekendPayout: 82, spread: 0.30, tags: ["major", "popular"], sortOrder: 34 },
  { id: "XAGUSD", name: "Silver", symbol: "XAG/USD", category: "commodities", basePrice: 29.50, volatility: 1.10, payoutPercent: 82, weekendPayout: 79, spread: 0.02, tags: ["major"], sortOrder: 35 },
  { id: "USOIL", name: "Crude Oil", symbol: "WTI/USD", category: "commodities", basePrice: 78.00, volatility: 1.20, payoutPercent: 84, weekendPayout: 81, spread: 0.05, tags: ["major", "popular"], sortOrder: 36 },
];

async function main() {
  console.log("Seeding database...");

  const adminEmail = process.env.ADMIN_EMAIL || "admin@nextorx.app";
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    throw new Error("ADMIN_PASSWORD environment variable is required");
  }

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    const hash = await hashPassword(adminPassword);
    await prisma.account.updateMany({
      where: { userId: existing.id, providerId: "credential" },
      data: { password: hash },
    });
    if (existing.role !== "super_admin") {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { role: "super_admin", emailVerified: true },
      });
      console.log(`Promoted ${adminEmail} to super_admin, password reset`);
    } else {
      console.log(`Admin ensured: ${adminEmail}, password reset`);
    }
  } else {
    const signUp = await auth.api.signUpEmail({
      body: { email: adminEmail, password: adminPassword, name: "Admin" },
    });

    await prisma.user.update({
      where: { email: adminEmail },
      data: { role: "super_admin", emailVerified: true },
    });

    console.log(`Created super_admin: ${adminEmail}`);
    void signUp;
  }

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Pair" ALTER COLUMN "volatility" TYPE DECIMAL(12,6)`
  ).catch(() => {});

  for (const pair of OTC_PAIRS) {
    await prisma.pair.upsert({
      where: { id: pair.id },
      update: {
        name: pair.name,
        symbol: pair.symbol,
        category: pair.category,
        basePrice: pair.basePrice,
        volatility: pair.volatility,
        payoutPercent: pair.payoutPercent,
        weekendPayout: pair.weekendPayout,
        spread: pair.spread,
        tags: pair.tags,
        sortOrder: pair.sortOrder,
      },
      create: pair,
    });
  }
  console.log(`Created ${OTC_PAIRS.length} OTC pairs`);

  await prisma.paymentMethod.upsert({
    where: { name_networkName: { name: "USDT", networkName: "TRC20" } },
    update: {},
    create: { name: "USDT", label: "USDT (Tether)", networkName: "TRC20", minDeposit: 1000, maxDeposit: 10000000, minWithdraw: 500, maxWithdraw: 10000000 },
  });
  await prisma.paymentMethod.upsert({
    where: { name_networkName: { name: "USDT", networkName: "ERC20" } },
    update: {},
    create: { name: "USDT", label: "USDT (Ethereum)", networkName: "ERC20", minDeposit: 2000, maxDeposit: 10000000, minWithdraw: 1000, maxWithdraw: 10000000 },
  });
  console.log("Created payment methods");

  const settings = [
    { key: "bonusTurnoverMultiplier", value: 30, label: "Bonus turnover multiplier" },
    { key: "bonusValidityDays", value: 30, label: "Bonus validity (days)" },
    { key: "maxBonusBet", value: 1000, label: "Max stake while bonus active (cents)" },
    { key: "defaultPayoutPercent", value: 80, label: "Default payout percent" },
    { key: "minTradeAmount", value: 100, label: "Min trade amount (cents)" },
    { key: "maxTradeAmount", value: 500000, label: "Max trade amount (cents)" },
  ];
  for (const setting of settings) {
    await prisma.platformSetting.upsert({ where: { key: setting.key }, update: {}, create: setting });
  }
  console.log("Created platform settings");

  console.log("Seeding complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
