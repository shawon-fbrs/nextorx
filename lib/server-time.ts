let offsetMs = 0;
let lastSyncAt = 0;

export function setServerOffset(serverNowMs: number, clientNowMs = Date.now()) {
  const newOffset = serverNowMs - clientNowMs;
  if (Math.abs(newOffset - offsetMs) > 500 || Date.now() - lastSyncAt > 30000) {
    offsetMs = newOffset;
    lastSyncAt = Date.now();
  } else {
    offsetMs = offsetMs * 0.8 + newOffset * 0.2;
    lastSyncAt = Date.now();
  }
}

export function getServerNow(): number {
  return Date.now() + offsetMs;
}

export function getServerOffset(): number {
  return offsetMs;
}

export async function syncWithServer(): Promise<void> {
  try {
    const start = Date.now();
    const res = await fetch('/api/time', { cache: 'no-store' });
    const data = await res.json() as { now: number };
    const end = Date.now();
    const rtt = end - start;
    const serverNow = Number(data.now) + rtt / 2;
    setServerOffset(serverNow, end);
  } catch {}
}
