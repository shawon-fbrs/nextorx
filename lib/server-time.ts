let offsetMs = 0;
let lastSyncAt = 0;

export function setServerOffset(serverNowMs: number, clientNowMs = Date.now()) {
  const newOffset = serverNowMs - clientNowMs;
  if (Math.abs(newOffset - offsetMs) > 120 || Date.now() - lastSyncAt > 15000) {
    offsetMs = newOffset;
    lastSyncAt = Date.now();
  } else {
    offsetMs = offsetMs * 0.7 + newOffset * 0.3;
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
    const samples: number[] = [];
    for (let i = 0; i < 3; i++) {
      const start = Date.now();
      const res = await fetch('/api/time', { cache: 'no-store' });
      const data = await res.json() as { now: number };
      const end = Date.now();
      const rtt = end - start;
      const serverNow = Number(data.now) + rtt / 2;
      samples.push(serverNow - end);
      if (i < 2) await new Promise(r => setTimeout(r, 80));
    }
    samples.sort((a, b) => a - b);
    const medianOffset = samples[1];
    const currentOffset = offsetMs;
    if (samples.some(s => Math.abs(s - medianOffset) > 400)) {
      setServerOffset(Date.now() + medianOffset, Date.now());
    } else {
      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      if (Math.abs(avg - currentOffset) > 120) setServerOffset(Date.now() + avg, Date.now());
      else setServerOffset(Date.now() + medianOffset, Date.now());
    }
  } catch {}
}
