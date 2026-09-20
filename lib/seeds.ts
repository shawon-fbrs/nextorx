import { createHash, randomBytes, createCipheriv, createDecipheriv } from "crypto";
import { prisma } from "./db";
import { logAudit } from "./services/audit";

export interface SeedInfo {
  day: string;
  pairId: string;
  seedHash: string;
  revealed: boolean;
  gistUrl?: string | null;
}

function encKey(): Buffer | null {
  const raw = process.env.SEED_ENC_KEY;
  if (!raw) return null;
  const hex = raw.trim().toLowerCase();
  if (/^[0-9a-f]{64}$/.test(hex)) return Buffer.from(hex, "hex");
  if (raw.trim().length >= 32) return createHash("sha256").update(raw.trim(), "utf8").digest();
  return null;
}

export function encryptSeed(seed: string): string | null {
  const key = encKey();
  if (!key) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(seed, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `gcm1:${iv.toString("hex")}:${tag.toString("hex")}:${ct.toString("hex")}`;
}

export function decryptSeed(payload: string): string | null {
  try {
    const key = encKey();
    if (!key) return null;
    const [v, ivHex, tagHex, ctHex] = payload.split(":");
    if (v !== "gcm1" || !ivHex || !tagHex || !ctHex) return null;
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return Buffer.concat([decipher.update(Buffer.from(ctHex, "hex")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export async function readSeedValue(row: { seed: string | null; seedEnc: string | null }): Promise<string | null> {
  if (row.seedEnc) {
    const dec = decryptSeed(row.seedEnc);
    if (dec) return dec;
  }
  return row.seed;
}

async function publishSeedHashExternally(day: string, pairId: string, seedHash: string): Promise<{ id: string; url: string } | null> {
  const { writeFile, mkdir } = await import("fs/promises");
  const { join } = await import("path");
  try {
    const dir = join(process.cwd(), "public", "seeds");
    await mkdir(dir, { recursive: true });
    const filename = `nextorx-seed-${day}-${pairId}.json`;
    const payload = JSON.stringify({
      platform: "nextorx",
      version: 1,
      day,
      pairId,
      seedHash,
      committedAt: new Date().toISOString(),
      algorithm: "HMAC-SHA512",
      description: "Provably fair seed commitment. Verify at /verify",
    }, null, 2);
    await writeFile(join(dir, filename), payload, "utf8");
    return { id: filename, url: `/seeds/${filename}` };
  } catch {
    return null;
  }
}

export async function ensureSeedDay(day: string, pairId: string): Promise<SeedInfo> {
  const { dayStringUTC } = await import("./pf-math");
  const today = dayStringUTC(new Date());
  if (day < today) {
    // Seeds are born at day start. NEVER mint retroactive seeds: any candles
    // already persisted for that day were generated with a different (lost)
    // seed, and a fresh seed would fail verification against them.
    const existing = await prisma.serverSeed.findUnique({ where: { day_pairId: { day, pairId } } });
    if (!existing) throw new Error(`No seed exists for past day ${day} (pair ${pairId})`);
    return { day, pairId, seedHash: existing.seedHash, revealed: existing.revealed, gistUrl: existing.gistUrl };
  }
  const seed = randomBytes(32).toString("hex");
  const seedHash = createHash("sha256").update(seed, "utf8").digest("hex");
  const seedEnc = encryptSeed(seed);

  // Capture regime snapshot at seed creation time
  const regimeSnapshot = await captureRegimeSnapshot();

  // Capture frozen daily candle-math inputs (first-writer-wins per day).
  // Engine generation AND the verify tool both use these, so mid-day admin
  // edits to Pair params can never break verification of persisted candles.
  await captureDayParams(day, pairId).catch(() => {});

  const row = await prisma.serverSeed.upsert({
    where: { day_pairId: { day, pairId } },
    update: {},
    create: {
      day,
      pairId,
      seedHash,
      seed: seedEnc ? null : seed,
      seedEnc: seedEnc ?? null,
      revealed: false,
      regimeSnapshot: regimeSnapshot != null ? (regimeSnapshot as any) : undefined,
    },
  });
  if (row.seedHash === seedHash) {
    // Publish to external commitment (public JSON file)
    const commitResult = await publishSeedHashExternally(day, pairId, seedHash);

    if (commitResult) {
      await prisma.serverSeed.update({
        where: { id: row.id },
        data: {
          gistId: commitResult.id,
          gistUrl: commitResult.url,
          committedAt: new Date(),
        },
      }).catch(() => {});
    }

    try {
      await logAudit(null, "seed.minted", "ServerSeed", `${day}:${pairId}`, {
        seedHash,
        pairId,
        encrypted: !!seedEnc,
        committed: !!commitResult,
        gistUrl: commitResult?.url,
      });
    } catch {}
  }
  return { day, pairId, seedHash: row.seedHash, revealed: row.revealed, gistUrl: row.gistUrl };
}

async function captureRegimeSnapshot(): Promise<Record<string, unknown> | null> {
  try {
    const { dayStringUTC } = await import("./pf-math");
    const today = dayStringUTC(new Date());
    const regimes = await prisma.pairVolRegime.findMany({
      where: { day: today },
      select: { pairId: true, sigmaMult: true, hour: true, measuredAt: true },
    });
    if (regimes.length === 0) return null;
    return { regimes, capturedAt: new Date().toISOString() };
  } catch {
    return null;
  }
}

export interface DayParams {
  basePrice: number;
  volatility: number;
  category: string;
}

// Freeze the day's candle-math inputs. First-writer-wins via upsert with
// empty update — whoever captures first (seed creation) fixes the values for
// the whole day. Later admin edits land in the Pair row and take effect for
// generation starting next day.
async function captureDayParams(day: string, pairId: string): Promise<void> {
  const pair = await prisma.pair.findUnique({
    where: { id: pairId },
    select: { basePrice: true, volatility: true, category: true },
  });
  if (!pair) return;
  await prisma.pairDayParams.upsert({
    where: { day_pairId: { day, pairId } },
    update: {},
    create: {
      day,
      pairId,
      basePrice: pair.basePrice,
      volatility: pair.volatility,
      category: pair.category,
    },
  });
}

export async function getDayParams(day: string, pairId: string): Promise<DayParams | null> {
  const row = await prisma.pairDayParams.findUnique({ where: { day_pairId: { day, pairId } } });
  if (!row) return null;
  return {
    basePrice: Number(row.basePrice),
    volatility: Number(row.volatility),
    category: row.category,
  };
}

export async function getDaySeed(day: string, pairId: string): Promise<string | null> {
  const row = await prisma.serverSeed.findUnique({ where: { day_pairId: { day, pairId } } });
  if (!row) return null;
  const value = await readSeedValue(row);
  if (value && row.seed && !row.seedEnc && encKey()) {
    const enc = encryptSeed(value);
    if (enc) {
      await prisma.serverSeed.update({ where: { id: row.id }, data: { seedEnc: enc, seed: null } }).catch(() => {});
    }
  }
  return value;
}

export async function getDaySeedHash(day: string, pairId: string): Promise<SeedInfo> {
  return ensureSeedDay(day, pairId);
}

export async function getDaySeedReveal(day: string, pairId: string): Promise<{ day: string; pairId: string; seed: string } | null> {
  const row = await prisma.serverSeed.findUnique({ where: { day_pairId: { day, pairId } } });
  if (!row) return null;
  const { dayStringUTC } = await import("./pf-math");
  const today = dayStringUTC(new Date());
  if (!row.revealed && day < today) {
    await prisma.serverSeed.update({
      where: { id: row.id },
      data: { revealed: true, revealedAt: new Date() },
    });
  }
  const updated = await prisma.serverSeed.findUnique({ where: { id: row.id } });
  if (!updated || !updated.revealed) return null;
  const seed = await readSeedValue(updated);
  if (!seed) return null;
  return { day, pairId, seed };
}

export async function revealDueSeeds(now = new Date()): Promise<string[]> {
  const { dayStringUTC } = await import("./pf-math");
  const today = dayStringUTC(now);
  const revealed: string[] = [];
  const pending = await prisma.serverSeed.findMany({ where: { revealed: false } });
  for (const row of pending) {
    if (row.day < today) {
      await prisma.serverSeed.update({
        where: { id: row.id },
        data: { revealed: true, revealedAt: now },
      });
      revealed.push(row.day);
    }
  }
  return revealed;
}
