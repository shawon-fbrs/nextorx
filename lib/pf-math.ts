import { createHmac } from "crypto";

export const TICKS_PER_SECOND = 10;
export const SECONDS_PER_DAY = 86400;

export interface JumpParams {
  lambdaPerSecond: number;
  minMultiple: number;
  maxMultiple: number;
}

export const CATEGORY_JUMPS: Record<string, JumpParams> = {
  forex: { lambdaPerSecond: 0.005, minMultiple: 4, maxMultiple: 8 },
  crypto: { lambdaPerSecond: 0.02, minMultiple: 3, maxMultiple: 7 },
  commodities: { lambdaPerSecond: 0.008, minMultiple: 4, maxMultiple: 8 },
  indices: { lambdaPerSecond: 0.008, minMultiple: 4, maxMultiple: 8 },
  stocks: { lambdaPerSecond: 0.01, minMultiple: 4, maxMultiple: 8 },
};

const SIGMA_PER_SECOND = 0.0002;

export function sessionMultiplier(category: string, utcHour: number): number {
  if (category === "stocks") {
    if (utcHour >= 14 && utcHour < 21) return 1.3;
    if (utcHour >= 12 && utcHour < 14) return 1.0;
    if (utcHour >= 0 && utcHour < 12) return 0.7;
    return 0.8;
  }
  if (category === "crypto" || category === "commodities") return 1.0;
  if (utcHour >= 12 && utcHour < 16) return 1.5;
  if (utcHour >= 7 && utcHour < 12) return 1.2;
  if (utcHour >= 16 && utcHour < 21) return 1.0;
  if (utcHour >= 0 && utcHour < 7) return 0.6;
  return 0.5;
}

export function digestForSecond(
  serverSeed: string,
  pairId: string,
  day: string,
  secondOfDay: number,
): Buffer {
  return createHmac("sha512", serverSeed)
    .update(`${pairId}:${day}:${secondOfDay}`, "utf8")
    .digest();
}

function u64(digest: Buffer, offset: number): number {
  const slice = digest.subarray(offset, offset + 8);
  let value = 0;
  for (const byte of slice) value = value * 256 + byte;
  return value / 18446744073709551616;
}

function boxMuller(u1: number, u2: number): number {
  const a = Math.min(Math.max(u1, 1e-12), 1 - 1e-12);
  const b = Math.min(Math.max(u2, 1e-12), 1 - 1e-12);
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
}

export interface SecondResult {
  close: number;
  high: number;
  low: number;
  volume: number;
  ticks: number[];
  jumped: boolean;
}

export function computeSecond(
  serverSeed: string,
  pairId: string,
  day: string,
  secondOfDay: number,
  prevClose: number,
  basePrice: number,
  volatility: number,
  category: string,
  utcHour: number,
): SecondResult {
  const digest = digestForSecond(serverSeed, pairId, day, secondOfDay);
  const sigma = volatility * sessionMultiplier(category, utcHour) * SIGMA_PER_SECOND;

  const z = boxMuller(u64(digest, 0), u64(digest, 8));
  let exponent = sigma * z;

  const jumps = CATEGORY_JUMPS[category] ?? CATEGORY_JUMPS.forex;
  const uJump = u64(digest, 16);
  let jumped = false;
  if (uJump < jumps.lambdaPerSecond) {
    const uSize = u64(digest, 24);
    const uSign = u64(digest, 32);
    const multiple = jumps.minMultiple + uSize * (jumps.maxMultiple - jumps.minMultiple);
    exponent += (uSign < 0.5 ? -1 : 1) * sigma * multiple;
    jumped = true;
  }

  const floor = Math.max(basePrice * 0.5, 0.01);
  const ceiling = basePrice * 2;
  const close = Math.min(ceiling, Math.max(floor, prevClose * Math.exp(exponent)));

  const step = (close - prevClose) / TICKS_PER_SECOND;
  const range = Math.max(Math.abs(close - prevClose), prevClose * sigma * 0.25);
  const ticks: number[] = [];
  let high = Math.max(prevClose, close);
  let low = Math.min(prevClose, close);
  for (let i = 1; i < TICKS_PER_SECOND; i++) {
    const wiggle = (digest[32 + i] / 255 - 0.5) * range * 0.6 * Math.sin((Math.PI * i) / TICKS_PER_SECOND);
    const price = Math.min(ceiling, Math.max(floor, prevClose + step * i + wiggle));
    ticks.push(price);
    if (price > high) high = price;
    if (price < low) low = price;
  }
  ticks.push(close);

  let volume = 0;
  for (let i = 0; i < TICKS_PER_SECOND; i++) volume += (digest[42 + i] % 90) + 10;

  return { close, high, low, volume, ticks, jumped };
}

export function dayStringUTC(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function secondOfDayUTC(timestampMs: number): number {
  return Math.floor(timestampMs / 1000) % SECONDS_PER_DAY;
}

export function secondStartMs(day: string, secondOfDay: number): number {
  return Date.parse(`${day}T00:00:00.000Z`) + secondOfDay * 1000;
}
