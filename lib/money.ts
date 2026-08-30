export function usdToCents(usd: number): number {
  if (!Number.isFinite(usd) || usd < 0) {
    throw new Error("Invalid amount");
  }
  return Math.round(usd * 100);
}

export function centsToUsd(cents: number): number {
  return cents / 100;
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
