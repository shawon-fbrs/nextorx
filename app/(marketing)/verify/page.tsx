'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MIRRORED_PAIR_IDS } from '@/lib/mirror-feed';

const TICKS_PER_SECOND = 10;
const SECONDS_PER_DAY = 86400;
// ENGINE PARAMS v2 — must match lib/pf-math.ts exactly, or verification fails.
const SIGMA_PER_SECOND = 0.00008;

const JUMPS: Record<string, { lambda: number; min: number; max: number }> = {
  forex: { lambda: 0.002, min: 4, max: 8 },
  crypto: { lambda: 0.008, min: 3, max: 7 },
  commodities: { lambda: 0.003, min: 4, max: 8 },
  indices: { lambda: 0.003, min: 4, max: 8 },
  stocks: { lambda: 0.004, min: 4, max: 8 },
};

function sessionMult(category: string, utcHour: number): number {
  if (category === 'stocks') {
    if (utcHour >= 14 && utcHour < 21) return 1.3;
    if (utcHour >= 12 && utcHour < 14) return 1.0;
    if (utcHour >= 0 && utcHour < 12) return 0.7;
    return 0.8;
  }
  if (category === 'crypto' || category === 'commodities') return 1.0;
  if (utcHour >= 12 && utcHour < 16) return 1.5;
  if (utcHour >= 7 && utcHour < 12) return 1.2;
  if (utcHour >= 16 && utcHour < 21) return 1.0;
  if (utcHour >= 0 && utcHour < 7) return 0.6;
  return 0.5;
}

async function hmacSha512ServerKey(seedHex: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(seedHex.trim()), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return new Uint8Array(sig);
}

function hexBytes(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function u64(d: Uint8Array, off: number): number {
  let v = 0;
  for (let i = 0; i < 8; i++) v = v * 256 + d[off + i];
  return v / 18446744073709551616;
}

function gauss(u1: number, u2: number): number {
  const a = Math.min(Math.max(u1, 1e-12), 1 - 1e-12);
  const b = Math.min(Math.max(u2, 1e-12), 1 - 1e-12);
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
}

type Candle = { timestamp: number; open: number; high: number; low: number; close: number; ticks: number };

interface PairInfo {
  id: string;
  name: string;
  basePrice: number | string;
  volatility: number | string;
  category: string;
  feed: string;
}

export default function VerifyPage() {
  const [seed, setSeed] = useState('');
  const [pairId, setPairId] = useState('');
  const [pairs, setPairs] = useState<PairInfo[]>([]);
  const [day, setDay] = useState(() => {
    const d = new Date(Date.now() - 86400000);
    return d.toISOString().slice(0, 10);
  });
  const [basePrice, setBasePrice] = useState('');
  const [volatility, setVolatility] = useState('');
  const [category, setCategory] = useState('forex');
  const [file, setFile] = useState<File | null>(null);
  const [regimeJson, setRegimeJson] = useState('');
  const [result, setResult] = useState<string>('');
  const [ok, setOk] = useState<boolean | null>(null);
  const [working, setWorking] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvMeta, setCsvMeta] = useState<{ day: string; asset: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/market/pairs')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { pairs?: PairInfo[] } | null) => {
        if (cancelled || !data?.pairs) return;
        setPairs(data.pairs);
        setPairId((cur) => {
          if (cur && data.pairs!.some((p) => p.id === cur)) return cur;
          const synth = data.pairs!.find((p) => p.feed !== 'mirror');
          return (synth ?? data.pairs![0])?.id ?? '';
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPair = pairs.find((p) => p.id === pairId) ?? null;
  const isMirror = selectedPair ? selectedPair.feed === 'mirror' : MIRRORED_PAIR_IDS.includes(pairId);

  const loadDayData = async () => {
    setResult('');
    setOk(null);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !pairId) {
      setResult('Enter the asset and the day first (YYYY-MM-DD).');
      setOk(false);
      return;
    }
    setLoadingDay(true);
    try {
      const asset = pairId.toUpperCase();
      const [seedRes, pairsRes, regimeRes, csvRes] = await Promise.all([
        fetch(`/api/market/seed/reveal?day=${encodeURIComponent(day)}`),
        fetch('/api/market/pairs'),
        fetch(`/api/market/verify/regime?asset=${encodeURIComponent(asset)}&date=${encodeURIComponent(day)}`),
        fetch(`/api/market/verify/download?asset=${encodeURIComponent(asset)}&date=${encodeURIComponent(day)}`),
      ]);
      let haveSeed = seed.trim().length > 0;
      if (seedRes.ok) {
        const data = await seedRes.json() as { seed?: string };
        if (data.seed) {
          setSeed(data.seed);
          haveSeed = true;
        }
      }
      if (pairsRes.ok) {
        const data = await pairsRes.json() as { pairs?: Array<{ id: string; basePrice: number | string; volatility: number | string; category: string }> };
        const found = (data.pairs ?? []).find(p => String(p.id).toUpperCase() === asset);
        if (found) {
          setBasePrice(String(found.basePrice));
          setVolatility(String(found.volatility));
          setCategory(found.category);
        }
      }
      if (regimeRes.ok) {
        const data = await regimeRes.json() as { regimes?: Array<{ hour: number; sigmaMult: number }> };
        if (data.regimes && data.regimes.length > 0) setRegimeJson(JSON.stringify({ regimes: data.regimes }));
      }
      let loaded = 0;
      if (csvRes.ok) {
        const text = await csvRes.text();
        if (text.trim().split('\n').length > 1) {
          setCsvText(text);
          setCsvMeta({ day, asset });
          loaded = text.trim().split('\n').length - 1;
        }
      }
      const missing: string[] = [];
      if (!haveSeed) {
        const errData = !seedRes.ok ? await seedRes.json().catch(() => ({})) as { error?: string } : {};
        missing.push(errData.error ?? 'seed (not revealed yet?)');
      }
      if (loaded === 0) missing.push('candles');
      if (missing.length > 0) {
        setResult(`Loaded what is available. Still missing: ${missing.join(', ')}.`);
        setOk(false);
      } else {
        setResult(`Loaded seed, pair info and ${loaded} candles for ${asset} on ${day}. Hit Verify.`);
        setOk(true);
      }
    } catch {
      setResult('Could not load day data. Please try again.');
      setOk(false);
    } finally {
      setLoadingDay(false);
    }
  };

  const runVerify = async () => {
    setResult('');
    setOk(null);
    if (isMirror) {
      setResult('This asset mirrors the live public market — compare it against public quotes, not the seed. Seed verification applies to synthetic assets.');
      setOk(false);
      return;
    }
    const useLoaded = csvText && csvMeta && csvMeta.day === day && csvMeta.asset === pairId;
    if (!seed || (!file && !useLoaded) || !day || !basePrice || !volatility) {
      setResult('Load the day data above or fill in every field and attach the CSV.');
      setOk(false);
      return;
    }
    setWorking(true);
    try {
      const text = useLoaded ? csvText : await file!.text();
      const lines = text.trim().split('\n');
      if (lines.length < 2) throw new Error('CSV is empty');
      const rows: Candle[] = lines.slice(1).map((l) => {
        const [timestamp, open, high, low, close, ticks] = l.split(',');
        return { timestamp: Number(timestamp), open: Number(open), high: Number(high), low: Number(low), close: Number(close), ticks: Number(ticks) };
      });
      const base = Number(basePrice);
      const vol = Number(volatility);
      const jumps = JUMPS[category] ?? JUMPS.forex;
      let regimeMap: Record<number, { mult: number; from: number }> = {};
      if (regimeJson.trim() !== '') {
        try {
          const parsed = JSON.parse(regimeJson) as { regimes?: Array<{ hour: number; sigmaMult: number; measuredAt?: string }> };
          for (const r of parsed.regimes ?? []) {
            if (Number.isFinite(r.hour) && Number.isFinite(r.sigmaMult)) {
              const from = r.measuredAt ? Date.parse(r.measuredAt) : NaN;
              regimeMap[r.hour] = { mult: r.sigmaMult, from: Number.isFinite(from) ? from : -Infinity };
            }
          }
        } catch {
          throw new Error('Volatility schedule is not valid JSON.');
        }
      }
      const hashRes = await fetch(`/api/market/seed/hash?day=${encodeURIComponent(day)}`);
      if (hashRes.ok) {
        const hashInfo = await hashRes.json() as { seedHash?: string };
        if (hashInfo.seedHash) {
          const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed.trim()));
          if (hexBytes(new Uint8Array(digest)) !== String(hashInfo.seedHash).toLowerCase()) {
            throw new Error('Seed does not match the published commitment hash for this day. Aborted.');
          }
        }
      }
      const tol = 1e-8;
      let prevClose = rows[0].open;
      let checked = 0;
      for (const row of rows) {
        const secondOfDay = Math.floor(row.timestamp / 1000) % SECONDS_PER_DAY;
        const utcHour = new Date(row.timestamp).getUTCHours();
        const d = await hmacSha512ServerKey(seed, `${pairId}:${day}:${secondOfDay}`);
        const sched = regimeMap[utcHour];
        const mult = sched && row.timestamp >= sched.from ? sched.mult : 1;
        const sigma = vol * mult * sessionMult(category, utcHour) * SIGMA_PER_SECOND;
        const z = gauss(u64(d, 0), u64(d, 8));
        let exp = sigma * z;
        if (u64(d, 16) < jumps.lambda) {
          const multiple = jumps.min + u64(d, 24) * (jumps.max - jumps.min);
          exp += (u64(d, 32) < 0.5 ? -1 : 1) * sigma * multiple;
        }
        const floor = Math.max(base * 0.5, 0.01);
        const ceiling = base * 2;
        const close = Math.min(ceiling, Math.max(floor, prevClose * Math.exp(exp)));
        const step = (close - prevClose) / TICKS_PER_SECOND;
        const range = Math.max(Math.abs(close - prevClose), prevClose * sigma * 0.25);
        let high = Math.max(prevClose, close);
        let low = Math.min(prevClose, close);
        for (let i = 1; i < TICKS_PER_SECOND; i++) {
          const wiggle = (d[32 + i] / 255 - 0.5) * range * 0.6 * Math.sin((Math.PI * i) / TICKS_PER_SECOND);
          const price = Math.min(ceiling, Math.max(floor, prevClose + step * i + wiggle));
          if (price > high) high = price;
          if (price < low) low = price;
        }
        const closeOk = Math.abs(close - row.close) <= tol * Math.max(1, Math.abs(row.close));
        const openOk = Math.abs(prevClose - row.open) <= tol * Math.max(1, Math.abs(row.open));
        const highOk = Math.abs(high - row.high) <= 1e-6 * Math.max(1, Math.abs(row.high));
        const lowOk = Math.abs(low - row.low) <= 1e-6 * Math.max(1, Math.abs(row.low));
        if (!closeOk || !openOk || !highOk || !lowOk) {
          setResult(`Mismatch at ${new Date(row.timestamp).toISOString()}: recomputed close ${close}, file has ${row.close}.`);
          setOk(false);
          setWorking(false);
          return;
        }
        prevClose = row.close;
        checked++;
      }
      setResult(`VERIFIED: ${checked} one-second candles regenerated exactly from the seed. No manipulation.`);
      setOk(true);
    } catch (e) {
      setResult(e instanceof Error ? e.message : 'Verification failed.');
      setOk(false);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text px-6 py-12">
      <div className="max-w-xl mx-auto space-y-6">
        <Link href="/" className="text-xs text-blue font-semibold">← Home</Link>
        <div>
          <h1 className="text-2xl font-black text-foreground">Verify Fairness</h1>
          <p className="text-sm text-text-dark mt-1">
            Pick an asset and a day, load everything with one click, and re-run the market math in your own browser.
            The page first compares the seed against the published commitment hash — mismatches abort.
            Trade entries include a half-spread (shown on each pair); exits are the committed candle closes verified here.
          </p>
        </div>
        {result && (
          <div className={`p-4 rounded-xl border text-sm font-semibold ${ok ? 'bg-green/10 border-green/30 text-green' : 'bg-red/10 border-red/30 text-red'}`}>
            {result}
          </div>
        )}
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
          <button
            type="button"
            onClick={loadDayData}
            disabled={loadingDay}
            className="w-full bg-blue hover:bg-blue/80 disabled:opacity-50 text-white text-sm font-bold py-3 rounded-xl transition-colors"
          >
            {loadingDay ? 'Loading day data…' : 'Load day data (seed + candles + pair info)'}
          </button>
          <div>
            <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">Revealed Server Seed (hex)</label>
            <input value={seed} onChange={(e) => setSeed(e.target.value.trim())} placeholder="a1b2c3..." className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground font-mono focus:outline-none focus:border-blue" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">Asset</label>
              <select value={pairId} onChange={(e) => setPairId(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-blue">
                {pairs.length === 0 && <option value="">Loading…</option>}
                {pairs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {(p as { name?: string }).name ?? p.id}{p.feed === 'mirror' ? ' · live' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">Day (UTC)</label>
              <input type="date" value={day} max={new Date(Date.now() - 86400000).toISOString().slice(0, 10)} onChange={(e) => setDay(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-blue [color-scheme:dark]" />
            </div>
          </div>
          {isMirror && pairId !== '' && (
            <p className="text-xs text-orange font-semibold bg-orange/10 border border-orange/30 rounded-xl px-4 py-3">
              Live-mirror asset — seeded check does not apply. Compare it against public market quotes instead.
            </p>
          )}
          {(basePrice !== '' || volatility !== '') && (
            <p className="text-[11px] text-text-dark font-mono">
              auto-detected · base {basePrice || '—'} · vol {volatility || '—'} · {category}{regimeJson !== '' ? ' · schedule on' : ''}
            </p>
          )}
          <div>
            <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">Candle CSV</label>
            {csvText && csvMeta && csvMeta.day === day && csvMeta.asset === pairId ? (
              <p className="text-xs text-green font-semibold bg-green/10 border border-green/30 rounded-xl px-4 py-3">
                {csvText.trim().split('\n').length - 1} candles loaded for {csvMeta.asset} on {csvMeta.day} — no file needed.
              </p>
            ) : (
              <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm text-text-dark" />
            )}
          </div>
          <button onClick={runVerify} disabled={working || isMirror} className="w-full bg-green hover:bg-green-hover text-white font-bold text-sm py-3 rounded-xl transition-colors disabled:opacity-50">
            {working ? 'Verifying...' : 'Verify History'}
          </button>
        </div>
      </div>
    </div>
  );
}