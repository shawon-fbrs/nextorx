import { PrismaClient } from "@prisma/client";
import { auth } from "../lib/auth";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

// Volatility is a RELATIVE scale factor shared by the OTC engine, the admin
// pair form, and this seed (Track A, uncalibrated — see TRACK-B B1):
//   per-tick move ≈ price × volatility × 0.0006
// Ranges: forex 0.3-0.8, crypto 1.5-3.0, commodities 0.5-1.5, indices 0.5-1.2.
// Do NOT use absolute price units here.
const OTC_PAIRS = [
  // ── Forex Majors (7) ──
  { id: "EURUSD", name: "EUR/USD", symbol: "EUR/USD", category: "forex", basePrice: 1.0850, volatility: 0.50, payoutPercent: 82, spread: 0.00015, tags: ["major", "popular"], sortOrder: 1 },
  { id: "GBPUSD", name: "GBP/USD", symbol: "GBP/USD", category: "forex", basePrice: 1.2700, volatility: 0.55, payoutPercent: 80, spread: 0.00020, tags: ["major", "popular"], sortOrder: 2 },
  { id: "USDJPY", name: "USD/JPY", symbol: "USD/JPY", category: "forex", basePrice: 149.50, volatility: 0.50, payoutPercent: 84, spread: 0.015, tags: ["major", "popular"], sortOrder: 3 },
  { id: "USDCHF", name: "USD/CHF", symbol: "USD/CHF", category: "forex", basePrice: 0.8920, volatility: 0.45, payoutPercent: 79, spread: 0.00018, tags: ["major"], sortOrder: 4 },
  { id: "USDCAD", name: "USD/CAD", symbol: "USD/CAD", category: "forex", basePrice: 1.3650, volatility: 0.45, payoutPercent: 80, spread: 0.00020, tags: ["major"], sortOrder: 5 },
  { id: "AUDUSD", name: "AUD/USD", symbol: "AUD/USD", category: "forex", basePrice: 0.6580, volatility: 0.50, payoutPercent: 81, spread: 0.00018, tags: ["major"], sortOrder: 6 },
  { id: "NZDUSD", name: "NZD/USD", symbol: "NZD/USD", category: "forex", basePrice: 0.6050, volatility: 0.50, payoutPercent: 78, spread: 0.00022, tags: ["major"], sortOrder: 7 },

  // ── Forex Crosses (13) ──
  { id: "EURGBP", name: "EUR/GBP", symbol: "EUR/GBP", category: "forex", basePrice: 0.8540, volatility: 0.40, payoutPercent: 80, spread: 0.00015, tags: ["cross"], sortOrder: 8 },
  { id: "EURJPY", name: "EUR/JPY", symbol: "EUR/JPY", category: "forex", basePrice: 162.30, volatility: 0.60, payoutPercent: 82, spread: 0.018, tags: ["cross", "popular"], sortOrder: 9 },
  { id: "GBPJPY", name: "GBP/JPY", symbol: "GBP/JPY", category: "forex", basePrice: 190.00, volatility: 0.75, payoutPercent: 83, spread: 0.025, tags: ["cross", "volatile"], sortOrder: 10 },
  { id: "AUDJPY", name: "AUD/JPY", symbol: "AUD/JPY", category: "forex", basePrice: 98.40, volatility: 0.65, payoutPercent: 80, spread: 0.015, tags: ["cross"], sortOrder: 11 },
  { id: "CADJPY", name: "CAD/JPY", symbol: "CAD/JPY", category: "forex", basePrice: 109.50, volatility: 0.60, payoutPercent: 79, spread: 0.015, tags: ["cross"], sortOrder: 12 },
  { id: "CHFJPY", name: "CHF/JPY", symbol: "CHF/JPY", category: "forex", basePrice: 167.60, volatility: 0.60, payoutPercent: 78, spread: 0.020, tags: ["cross"], sortOrder: 13 },
  { id: "EURCHF", name: "EUR/CHF", symbol: "EUR/CHF", category: "forex", basePrice: 0.9680, volatility: 0.35, payoutPercent: 79, spread: 0.00015, tags: ["cross"], sortOrder: 14 },
  { id: "EURAUD", name: "EUR/AUD", symbol: "EUR/AUD", category: "forex", basePrice: 1.6490, volatility: 0.55, payoutPercent: 80, spread: 0.00030, tags: ["cross"], sortOrder: 15 },
  { id: "EURCAD", name: "EUR/CAD", symbol: "EUR/CAD", category: "forex", basePrice: 1.4810, volatility: 0.50, payoutPercent: 79, spread: 0.00025, tags: ["cross"], sortOrder: 16 },
  { id: "GBPCAD", name: "GBP/CAD", symbol: "GBP/CAD", category: "forex", basePrice: 1.7340, volatility: 0.55, payoutPercent: 80, spread: 0.00030, tags: ["cross"], sortOrder: 17 },
  { id: "GBPAUD", name: "GBP/AUD", symbol: "GBP/AUD", category: "forex", basePrice: 1.9300, volatility: 0.60, payoutPercent: 80, spread: 0.00035, tags: ["cross"], sortOrder: 18 },
  { id: "AUDCAD", name: "AUD/CAD", symbol: "AUD/CAD", category: "forex", basePrice: 0.8980, volatility: 0.45, payoutPercent: 79, spread: 0.00020, tags: ["cross"], sortOrder: 19 },
  { id: "AUDNZD", name: "AUD/NZD", symbol: "AUD/NZD", category: "forex", basePrice: 1.0870, volatility: 0.40, payoutPercent: 78, spread: 0.00025, tags: ["cross"], sortOrder: 20 },
  { id: "NZDCAD", name: "NZD/CAD", symbol: "NZD/CAD", category: "forex", basePrice: 0.8260, volatility: 0.45, payoutPercent: 78, spread: 0.00020, tags: ["cross"], sortOrder: 21 },

  // ── Crypto (10) ──
  { id: "BTCUSD", name: "BTC/USD", symbol: "BTC/USD", category: "crypto", basePrice: 67500.00, volatility: 2.20, payoutPercent: 90, spread: 25.00, tags: ["major", "popular", "volatile"], sortOrder: 22 },
  { id: "ETHUSD", name: "ETH/USD", symbol: "ETH/USD", category: "crypto", basePrice: 3450.00, volatility: 2.00, payoutPercent: 88, spread: 1.50, tags: ["major", "popular"], sortOrder: 23 },
  { id: "SOLUSD", name: "SOL/USD", symbol: "SOL/USD", category: "crypto", basePrice: 175.00, volatility: 2.60, payoutPercent: 91, spread: 0.40, tags: ["volatile"], sortOrder: 24 },
  { id: "XRPUSD", name: "XRP/USD", symbol: "XRP/USD", category: "crypto", basePrice: 0.62, volatility: 2.40, payoutPercent: 89, spread: 0.001, tags: ["popular"], sortOrder: 25 },
  { id: "DOGEUSD", name: "DOGE/USD", symbol: "DOGE/USD", category: "crypto", basePrice: 0.185, volatility: 3.00, payoutPercent: 90, spread: 0.0005, tags: ["meme", "volatile"], sortOrder: 26 },
  { id: "ADAUSD", name: "ADA/USD", symbol: "ADA/USD", category: "crypto", basePrice: 0.48, volatility: 2.20, payoutPercent: 87, spread: 0.001, tags: [], sortOrder: 27 },
  { id: "BNBUSD", name: "BNB/USD", symbol: "BNB/USD", category: "crypto", basePrice: 610.00, volatility: 1.80, payoutPercent: 88, spread: 1.50, tags: ["major"], sortOrder: 28 },
  { id: "DOTUSD", name: "DOT/USD", symbol: "DOT/USD", category: "crypto", basePrice: 7.80, volatility: 2.00, payoutPercent: 86, spread: 0.02, tags: [], sortOrder: 29 },
  { id: "AVAXUSD", name: "AVAX/USD", symbol: "AVAX/USD", category: "crypto", basePrice: 38.50, volatility: 2.40, payoutPercent: 88, spread: 0.10, tags: ["volatile"], sortOrder: 30 },
  { id: "MATICUSD", name: "POL/USD", symbol: "POL/USD", category: "crypto", basePrice: 0.72, volatility: 2.20, payoutPercent: 87, spread: 0.002, tags: [], sortOrder: 31 },

  // ── Commodities (8) ──
  { id: "XAUUSD", name: "Gold", symbol: "XAU/USD", category: "commodities", basePrice: 2350.00, volatility: 0.90, payoutPercent: 85, spread: 0.30, tags: ["major", "popular"], sortOrder: 32 },
  { id: "XAGUSD", name: "Silver", symbol: "XAG/USD", category: "commodities", basePrice: 29.50, volatility: 1.10, payoutPercent: 82, spread: 0.02, tags: ["major"], sortOrder: 33 },
  { id: "USOIL", name: "Crude Oil", symbol: "WTI/USD", category: "commodities", basePrice: 78.00, volatility: 1.20, payoutPercent: 84, spread: 0.05, tags: ["major", "popular"], sortOrder: 34 },
  { id: "XPTUSD", name: "Platinum", symbol: "XPT/USD", category: "commodities", basePrice: 1020.00, volatility: 0.80, payoutPercent: 80, spread: 0.80, tags: [], sortOrder: 35 },
  { id: "XPDUSD", name: "Palladium", symbol: "XPD/USD", category: "commodities", basePrice: 980.00, volatility: 0.90, payoutPercent: 79, spread: 1.00, tags: [], sortOrder: 36 },
  { id: "NATGAS", name: "Natural Gas", symbol: "NG/USD", category: "commodities", basePrice: 2.45, volatility: 1.50, payoutPercent: 81, spread: 0.005, tags: ["volatile"], sortOrder: 37 },
  { id: "COPPER", name: "Copper", symbol: "HG/USD", category: "commodities", basePrice: 4.25, volatility: 0.80, payoutPercent: 79, spread: 0.005, tags: [], sortOrder: 38 },
  { id: "WHEAT", name: "Wheat", symbol: "ZW/USD", category: "commodities", basePrice: 580.00, volatility: 1.00, payoutPercent: 78, spread: 2.00, tags: [], sortOrder: 39 },

  // ── Indices (7) ──
  { id: "SPX500", name: "S&P 500", symbol: "SPX", category: "indices", basePrice: 5250.00, volatility: 0.70, payoutPercent: 84, spread: 1.00, tags: ["major", "popular"], sortOrder: 40 },
  { id: "NAS100", name: "Nasdaq 100", symbol: "NDX", category: "indices", basePrice: 18400.00, volatility: 0.90, payoutPercent: 85, spread: 5.00, tags: ["major", "volatile"], sortOrder: 41 },
  { id: "DJ30", name: "Dow Jones 30", symbol: "DJI", category: "indices", basePrice: 39200.00, volatility: 0.60, payoutPercent: 83, spread: 3.00, tags: ["major"], sortOrder: 42 },
  { id: "UK100", name: "FTSE 100", symbol: "UKX", category: "indices", basePrice: 8150.00, volatility: 0.60, payoutPercent: 81, spread: 1.50, tags: [], sortOrder: 43 },
  { id: "DAX40", name: "DAX 40", symbol: "DAX", category: "indices", basePrice: 18200.00, volatility: 0.70, payoutPercent: 82, spread: 2.00, tags: ["popular"], sortOrder: 44 },
  { id: "NIKKEI225", name: "Nikkei 225", symbol: "NI225", category: "indices", basePrice: 38500.00, volatility: 0.80, payoutPercent: 83, spread: 15.00, tags: [], sortOrder: 45 },
  { id: "ASX200", name: "ASX 200", symbol: "XJO", category: "indices", basePrice: 7800.00, volatility: 0.60, payoutPercent: 80, spread: 1.00, tags: [], sortOrder: 46 },
];

async function main() {
  console.log("Seeding database...");

  // ── Admin user (PotShot pattern) ──
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

  // ── Volatility column type ──
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Pair" ALTER COLUMN "volatility" TYPE DECIMAL(12,6)`
  ).catch(() => {});

  // ── OTC pairs ──
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
        spread: pair.spread,
        tags: pair.tags,
        sortOrder: pair.sortOrder,
      },
      create: pair,
    });
  }
  console.log(`Created ${OTC_PAIRS.length} OTC pairs`);

  // ── Payment methods ──
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

  // ── Platform settings ──
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
