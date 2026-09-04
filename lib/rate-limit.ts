const buckets = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitRule {
  max: number;
  windowMs: number;
}

export function checkRateLimit(key: string, rule: RateLimitRule, now = Date.now()): boolean {
  const entry = buckets.get(key);
  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
    return true;
  }
  if (entry.count >= rule.max) return false;
  entry.count += 1;
  return true;
}

export function rateLimitRemaining(key: string, rule: RateLimitRule, now = Date.now()): number {
  const entry = buckets.get(key);
  if (!entry || now > entry.resetAt) return rule.max;
  return Math.max(0, rule.max - entry.count);
}
