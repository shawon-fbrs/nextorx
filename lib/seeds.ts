import { createHash, randomBytes, createCipheriv, createDecipheriv } from "crypto";
import { prisma } from "./db";
import { logAudit } from "./services/audit";

export interface SeedInfo {
  day: string;
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

async function publishSeedHashExternally(day: string, seedHash: string): Promise<{ id: string; url: string } | null> {
  const { writeFile, mkdir } = await import("fs/promises");
  const { join } = await import("path");
  try {
    const dir = join(process.cwd(), "public", "seeds");
    await mkdir(dir, { recursive: true });
    const filename = `nextorx-seed-${day}.json`;
    const payload = JSON.stringify({
      platform: "nextorx",
      version: 1,
      day,
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

export async function ensureSeedDay(day: string): Promise<SeedInfo> {
  const seed = randomBytes(32).toString("hex");
  const seedHash = createHash("sha256").update(seed, "utf8").digest("hex");
  const seedEnc = encryptSeed(seed);

  // Capture regime snapshot at seed creation time
  const regimeSnapshot = await captureRegimeSnapshot();

  const row = await prisma.serverSeed.upsert({
    where: { day },
    update: {},
    create: {
      day,
      seedHash,
      seed: seedEnc ? null : seed,
      seedEnc: seedEnc ?? null,
      revealed: false,
      regimeSnapshot: regimeSnapshot != null ? (regimeSnapshot as any) : undefined,
    },
  });
  if (row.seedHash === seedHash) {
    // Publish to external commitment (public JSON file)
    const commitResult = await publishSeedHashExternally(day, seedHash);

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
      await logAudit(null, "seed.minted", "ServerSeed", day, {
        seedHash,
        encrypted: !!seedEnc,
        committed: !!commitResult,
        gistUrl: commitResult?.url,
      });
    } catch {}
  }
  return { day, seedHash: row.seedHash, revealed: row.revealed, gistUrl: row.gistUrl };
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

export async function getDaySeed(day: string): Promise<string | null> {
  const row = await prisma.serverSeed.findUnique({ where: { day } });
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

export async function getDaySeedHash(day: string): Promise<SeedInfo> {
  return ensureSeedDay(day);
}

export async function getDaySeedReveal(day: string): Promise<{ day: string; seed: string } | null> {
  const row = await prisma.serverSeed.findUnique({ where: { day } });
  if (!row || !row.revealed) return null;
  const seed = await readSeedValue(row);
  if (!seed) return null;
  return { day, seed };
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
