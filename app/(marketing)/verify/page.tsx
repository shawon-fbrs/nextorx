'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MIRRORED_PAIR_IDS } from '@/lib/mirror-feed';

const TICKS_PER_SECOND = 10;
const SECONDS_PER_DAY = 86400;
const SIGMA_PER_SECOND = 0.0002;

const JUMPS: Record<string, { lambda: number; min: number; max: number }> = {
  forex: { lambda: 0.005, min: 4, max: 8 },
  crypto: { lambda: 0.02, min: 3, max: 7 },
  commodities: { lambda: 0.008, min: 4, max: 8 },
  indices: { lambda: 0.008, min: 4, max: 8 },
  stocks: { lambda: 0.01, min: 4, max: 8 },
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

async function hmacSha512HexKey(seedHex: string, message: string): Promise<Uint8Array> {
  const keyBytes = new Uint8Array(seedHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return new Uint8Array(sig);
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

export default function VerifyPage() {
  const [seed, setSeed] = useState('');
  const [pairId, setPairId] = useState('EURUSD');
  const [day, setDay] = useState('');
  const [basePrice, setBasePrice] = useState('1.085');
  const [volatility, setVolatility] = useState('0.5');
  const [category, setCategory] = useState('forex');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<string>('');
  const [ok, setOk] = useState<boolean | null>(null);
  const [working, setWorking] = useState(false);

  const runVerify = async () => {
    setResult('');
    setOk(null);
    if (MIRRORED_PAIR_IDS.includes(pairId)) {
      setResult('This asset mirrors the live public market — compare it against public quotes, not the seed. Seed verification applies to synthetic assets.');
      setOk(false);
      return;
    }
    if (!seed || !file || !day || !basePrice || !volatility) {
      setResult('Fill in every field and attach the CSV.');
      setOk(false);
      return;
    }
    setWorking(true);
    try {
      const text = await file.text();
      const lines = text.trim().split('\n');
      if (lines.length < 2) throw new Error('CSV is empty');
      const rows: Candle[] = lines.slice(1).map((l) => {
        const [timestamp, open, high, low, close, ticks] = l.split(',');
        return { timestamp: Number(timestamp), open: Number(open), high: Number(high), low: Number(low), close: Number(close), ticks: Number(ticks) };
      });
      const base = Number(basePrice);
      const vol = Number(volatility);
      const jumps = JUMPS[category] ?? JUMPS.forex;
      const tol = 1e-8;
      let prevClose = rows[0].open;
      let checked = 0;
      for (const row of rows) {
        const secondOfDay = Math.floor(row.timestamp / 1000) % SECONDS_PER_DAY;
        const utcHour = new Date(row.timestamp).getUTCHours();
        const d = await hmacSha512HexKey(seed, `${pairId}:${day}:${secondOfDay}`);
        const sigma = vol * sessionMult(category, utcHour) * SIGMA_PER_SECOND;
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
          <h1 className="text-2xl font-black text-white">Verify Fairness</h1>
          <p className="text-sm text-text-dark mt-1">
            Re-run the market math in your own browser. This page makes zero network calls —
            paste the revealed seed, upload the candle CSV, and check every candle.
            Trade entries include a half-spread (shown on each pair); exits are the committed candle closes verified here.
          </p>
        </div>
        {result && (
          <div className={`p-4 rounded-xl border text-sm font-semibold ${ok ? 'bg-green/10 border-green/30 text-green' : 'bg-red/10 border-red/30 text-red'}`}>
            {result}
          </div>
        )}
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">Revealed Server Seed (hex)</label>
            <input value={seed} onChange={(e) => setSeed(e.target.value.trim())} placeholder="a1b2c3..." className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-blue" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">Asset</label>
              <input value={pairId} onChange={(e) => setPairId(e.target.value.trim().toUpperCase())} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-blue" />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">Day (UTC)</label>
              <input value={day} onChange={(e) => setDay(e.target.value.trim())} placeholder="2026-09-04" className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-blue" />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">Base Price</label>
              <input value={basePrice} onChange={(e) => setBasePrice(e.target.value.trim())} inputMode="decimal" className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-blue" />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">Volatility</label>
              <input value={volatility} onChange={(e) => setVolatility(e.target.value.trim())} inputMode="decimal" className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-blue" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue">
              <option value="forex">Forex</option>
              <option value="crypto">Crypto</option>
              <option value="commodities">Commodities</option>
              <option value="indices">Indices</option>
              <option value="stocks">Stocks</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">Candle CSV</label>
            <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm text-text-dark" />
          </div>
          <button onClick={runVerify} disabled={working} className="w-full bg-green hover:bg-green-hover text-white font-bold text-sm py-3 rounded-xl transition-colors disabled:opacity-50">
            {working ? 'Verifying...' : 'Verify History'}
          </button>
        </div>
      </div>
    </div>
  );
}
