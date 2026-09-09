'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import type { ChartHandle, ActiveIndicator } from '../../../components/Chart';
import { readStoredIndicators, writeStoredIndicators, type StoredIndicator } from '@/lib/indicator-store';
const Chart = dynamic(() => import('../../../components/Chart').then(m => m.Chart), { ssr: false });
import { TradingPanel } from '../../../components/TradingPanel';
import { usePairWS, type CandleData } from '@/lib/use-ws';
import { getServerNow, syncWithServer } from '@/lib/server-time';
import { useTheme } from '@/lib/theme';
import {
  TrendingUp, Square, ArrowUpRight,
  Minus, MoveHorizontal, ChevronRight,
  GitBranch, Pencil, Activity, Trash2, Maximize2, CandlestickChart,
  PenLine, ArrowRight, Eye, EyeOff, Settings, X,
} from 'lucide-react';

interface PairDef {
  id: string;
  name: string;
  category: string;
  payoutPercent: number;
  basePrice: number;
  spread: number;
  minTrade: number;
  maxTrade: number;
}

interface Trade {
  id: string;
  symbol: string;
  pairId?: string;
  type: 'up' | 'down';
  amount: number;
  payout: number;
  profit: number;
  time: string;
  timestamp: number;
  status: 'active' | 'won' | 'lost';
  openPrice?: number;
  closePrice?: number;
  payoutPercent?: number;
  expiresAt?: number;
}

const TF_MS: Record<string, number> = { '5s': 5000, '30s': 30000, '1m': 60000, '5m': 300000, '15m': 900000, '30m': 1800000, '1h': 3600000, '4h': 14400000 };

const markerEndMs = (entryMs: number, expiresAt: number, tf: string) =>
  Math.max(expiresAt, entryMs + Math.min(5 * (TF_MS[tf] ?? 60000), 3600000));

const toolOverlayMap: Record<string, string> = {
  'Trend Line': 'segment',
  'Horizontal Line': 'horizontalStraightLine',
  'Horizontal Ray': 'horizontalRayLine',
  'Horizontal Segment': 'horizontalSegment',
  'Ray Line': 'rayLine',
  'Extended Line': 'straightLine',
  'Fibonacci Retracement': 'fibBox',
  'Rectangle': 'rect',
  'Brush': 'brush',
  'Arrow Marker': 'arrowMarker',
};

function TopBar({
  pairs,
  visibleIds,
  activePair,
  effectivePayout,
  payoutMap,
  payoutDetails,
  trades,
  currentPrice,
  onSelect,
  onClose,
}: {
  pairs: PairDef[];
  visibleIds: string[];
  activePair: PairDef | null;
  effectivePayout: number | null;
  payoutMap: Record<string, number>;
  payoutDetails: Record<string, { base: number; payout: number; adjustments: { reason: string; delta: number }[] }>;
  trades: Trade[];
  currentPrice: number | null;
  onSelect: (p: PairDef) => void;
  onClose: (id: string) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [lastPnL, setLastPnL] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!activePair || currentPrice == null) return;
    const activeTrades = trades.filter((t) => t.status === 'active' && t.pairId === activePair.id);
    if (activeTrades.length === 0) {
      setLastPnL((prev) => {
        if (prev[activePair.id] === undefined) return prev;
        const next = { ...prev };
        delete next[activePair.id];
        return next;
      });
      return;
    }
    let sum = 0;
    for (const t of activeTrades) {
      if (t.openPrice == null) continue;
      const win = (t.type === 'up' && currentPrice > t.openPrice) || (t.type === 'down' && currentPrice < t.openPrice);
      const pct = (t as unknown as { payout?: number }).payout ?? payoutMap[activePair.id] ?? activePair.payoutPercent;
      sum += win ? t.amount * pct / 100 : -t.amount;
    }
    setLastPnL((prev) => ({ ...prev, [activePair.id]: sum }));
  }, [trades, currentPrice, activePair, payoutMap]);

  return (
    <div className="h-14 flex items-center gap-2 px-3 bg-surface border-b border-border flex-shrink-0 relative z-50">
      <div className="relative">
        <button onClick={() => { setAddOpen(!addOpen); setSearch(''); }}
          className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 ${addOpen ? 'bg-foreground text-background rotate-45' : 'bg-blue text-white hover:bg-blue/80'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
          </svg>
        </button>
        <div className={`absolute top-full left-0 mt-2 w-[420px] bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 origin-top z-50 ${addOpen ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-0 -translate-y-2 pointer-events-none'}`}>
          <div className="p-4 pb-3">
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <input type="text" placeholder="Search assets..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder-text-dark focus:outline-none focus:border-blue/50 transition-colors" />
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto px-2 pb-2">
            {pairs.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(pair => {
              const isActive = pair.id === activePair?.id;
              const isOpen = visibleIds.includes(pair.id);
              const shownPayout = payoutMap[pair.id] ?? pair.payoutPercent;
              const detail = payoutDetails[pair.id];
              const title = detail ? `Base ${detail.base}%${detail.adjustments.length ? ' ' + detail.adjustments.map((a) => `${a.reason} ${a.delta > 0 ? '+' : ''}${a.delta}%`).join(' ') : ''} => ${detail.payout}%` : `${shownPayout}%`;
              return (
                <button key={pair.id} onClick={() => { onSelect(pair); setAddOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all mb-0.5 ${isActive ? 'bg-blue/10 border border-blue/30' : 'hover:bg-surface-hover border border-transparent'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-blue/20' : 'bg-background'}`}>
                    <span className="text-xs font-bold text-foreground">{pair.name.replace('/', '').slice(0, 3)}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-sm font-bold text-foreground">{pair.name}</span>
                    {isOpen && <span className="text-[10px] text-blue ml-2">open</span>}
                  </div>
                  <span className="text-sm font-bold text-green" title={title}>{shownPayout}%</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {pairs.filter((pair) => visibleIds.includes(pair.id)).slice(0, 7).map((pair) => {
        const isActive = pair.id === activePair?.id;
        const shownPayout = payoutMap[pair.id] ?? pair.payoutPercent;
        const pairActiveTrades = trades.filter((t) => t.status === 'active' && t.pairId === pair.id);
        const liveUnrealized = (() => {
          if (pairActiveTrades.length === 0 || currentPrice == null || pair.id !== activePair?.id) return null;
          let sum = 0;
          for (const t of pairActiveTrades) {
            if (t.openPrice == null) continue;
            const win = (t.type === 'up' && currentPrice > t.openPrice) || (t.type === 'down' && currentPrice < t.openPrice);
            const pct = t.payout ?? payoutMap[pair.id] ?? pair.payoutPercent;
            sum += win ? t.amount * pct / 100 : -t.amount;
          }
          return sum;
        })();
        const unrealized = liveUnrealized ?? lastPnL[pair.id] ?? null;
        const showLive = liveUnrealized !== null;
        return (
          <button key={pair.id} onClick={() => onSelect(pair)}
            className={`h-11 w-40 min-w-0 flex-shrink rounded-xl flex items-center pl-4 pr-7 gap-2.5 cursor-pointer transition-all shadow-lg relative ${isActive ? 'bg-background/90 border border-blue/50 shadow-blue/10' : 'bg-surface/90 border border-border/50 hover:bg-surface-hover/90 backdrop-blur-sm'}`}>
            <span onClick={(e) => { e.stopPropagation(); onClose(pair.id); }}
              className="absolute top-0 right-0 w-5 h-5 bg-red rounded-bl-xl flex items-center justify-center hover:bg-red-hover transition-colors">
              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
              </svg>
            </span>
            {isActive && <div className="w-0.5 h-6 bg-blue rounded-full" />}
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-xs font-bold text-foreground leading-tight truncate">{pair.name}</span>
              <div className="flex items-center gap-1 leading-tight">
                <span className="text-[10px] font-bold text-orange" title={(() => { const d = payoutDetails[pair.id]; return d ? `Base ${d.base}%${d.adjustments.length ? ' ' + d.adjustments.map((a) => `${a.reason} ${a.delta > 0 ? '+' : ''}${a.delta}%`).join(' ') : ''} => ${d.payout}%` : `${shownPayout}%`; })()}>{shownPayout}%</span>
                {unrealized !== null ? (
                  <span className={`text-[10px] font-bold ${!showLive ? 'opacity-60' : ''} ${unrealized >= 0 ? 'text-green' : 'text-red'}`}>• {unrealized >= 0 ? '+' : ''}{unrealized.toFixed(2)}$</span>
                ) : pairActiveTrades.length > 0 ? (
                  <span className="text-[10px] font-bold text-blue">• {pairActiveTrades.length} open</span>
                ) : null}
              </div>
            </div>
          </button>
        );
      })}
      <div className="flex-1" />
    </div>
  );
}

function SideToolbar({ timeframe, onTimeframeChange, chartType, onChartTypeChange, sentiment, onIndToggle, onDrawTool, onRemoveDrawings }: { timeframe: string; onTimeframeChange: (tf: string) => void; chartType: 'candle' | 'line' | 'area'; onChartTypeChange: (t: 'candle' | 'line' | 'area') => void; sentiment: { upPct: number; total: number } | null; onIndToggle: () => void; onDrawTool: (toolName: string) => void; onRemoveDrawings: () => void }) {
  const [drawOpen, setDrawOpen] = useState(false);
  const [ctOpen, setCtOpen] = useState(false);
  const [tfOpen, setTfOpen] = useState(false);

  const toolIcons: Record<string, React.ReactNode> = {
    'Trend Line': <TrendingUp size={14} />,
    'Horizontal Line': <Minus size={14} />,
    'Horizontal Ray': <MoveHorizontal size={14} />,
    'Horizontal Segment': <MoveHorizontal size={14} />,
    'Ray Line': <ArrowRight size={14} />,
    'Extended Line': <ChevronRight size={14} />,
    'Fibonacci Retracement': <GitBranch size={14} />,
    'Rectangle': <Square size={14} />,
    'Brush': <Pencil size={14} />,
    'Arrow Marker': <ArrowUpRight size={14} />,
  };

  const drawSections = [
    { name: 'Line', items: ['Trend Line', 'Horizontal Line', 'Horizontal Ray', 'Horizontal Segment', 'Ray Line', 'Extended Line'] },
    { name: 'Fibonacci', items: ['Fibonacci Retracement'] },
    { name: 'Shapes', items: ['Rectangle', 'Brush', 'Arrow Marker'] },
  ];

  const upPct = sentiment?.upPct ?? 50;
  const hasSentiment = (sentiment?.total ?? 0) > 0;

  return (
    <div className="absolute left-3 bottom-3 z-40 flex flex-col items-center py-2 gap-1 w-11 rounded-2xl bg-background/70 backdrop-blur-xl border border-border/60 shadow-2xl">
      <div className="flex flex-col items-center gap-1 px-1" title={hasSentiment ? `${upPct}% buyers · ${100 - upPct}% sellers` : 'No open trades yet'}>
        <span className={`text-[9px] font-bold font-mono tabular-nums ${hasSentiment ? 'text-green' : 'text-text-dark'}`}>{upPct}%</span>
        <div className="w-1.5 h-20 rounded-full overflow-hidden flex flex-col" style={{ backgroundColor: 'rgba(255,73,84,0.35)' }}>
          <div className="w-full rounded-full" style={{ height: `${upPct}%`, backgroundColor: hasSentiment ? '#00c365' : '#5c677f' }} />
        </div>
        <span className={`text-[9px] font-bold font-mono tabular-nums ${hasSentiment ? 'text-red' : 'text-text-dark'}`}>{100 - upPct}%</span>
      </div>

      <div className="w-6 h-px bg-border my-1" />

      <div className="relative">
        <button title="Drawing Tools" onClick={() => setDrawOpen(!drawOpen)}
          className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${drawOpen ? 'bg-surface-hover text-foreground' : 'text-text hover:bg-surface-hover hover:text-foreground'}`}>
          <PenLine size={20} />
        </button>
        {drawOpen && (
          <div className="absolute left-full top-0 ml-1 w-52 max-h-[320px] overflow-y-auto bg-surface border border-border rounded-xl shadow-2xl p-1.5 z-50">
            {drawSections.map(sec => (
              <div key={sec.name} className="mb-1 last:mb-0">
                <div className="px-2.5 py-1.5 text-[9px] font-bold text-text-dark uppercase tracking-wider">{sec.name}</div>
                {sec.items.map(item => (
                  <button key={item} onClick={() => { setDrawOpen(false); onDrawTool(item); }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[11px] font-medium text-text hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors text-left">
                    <span className="text-text-dark">{toolIcons[item]}</span>
                    {item}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="w-6 h-px bg-border my-1" />

      <div className="relative">
        <button title="Chart Type" onClick={() => setCtOpen(!ctOpen)}
          className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${ctOpen ? 'bg-surface-hover text-foreground' : 'text-text hover:bg-surface-hover hover:text-foreground'}`}>
          <CandlestickChart size={20} />
        </button>
        {ctOpen && (
          <div className="absolute left-full top-0 ml-1 w-32 bg-surface border border-border rounded-lg shadow-2xl p-1.5 z-50">
            {(['candle', 'line', 'area'] as const).map(t => (
              <button key={t} onClick={() => { onChartTypeChange(t); setCtOpen(false); }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-semibold rounded-md transition-all capitalize ${chartType === t ? 'bg-blue-500 text-white' : 'text-text hover:bg-surface-hover hover:text-foreground'}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <button title="Timeframe" onClick={() => setTfOpen(!tfOpen)}
          className={`w-9 h-9 flex items-center justify-center rounded-lg text-[10px] font-bold font-mono transition-all ${tfOpen ? 'bg-surface-hover text-foreground' : 'text-text hover:bg-surface-hover hover:text-foreground'}`}>
          {timeframe}
        </button>
        {tfOpen && (
          <div className="absolute left-full top-0 ml-1 w-40 bg-surface border border-border rounded-lg shadow-2xl p-1.5 z-50">
            <div className="text-[9px] font-bold text-text-dark uppercase tracking-wider mb-1.5 px-1">Timeframe</div>
            <div className="grid grid-cols-3 gap-1">
              {['5s', '30s', '1m', '5m', '15m', '30m', '1h', '4h'].map(tf => (
                <button key={tf} onClick={() => { onTimeframeChange(tf); setTfOpen(false); }}
                  className={`py-1.5 text-[11px] font-semibold rounded-md transition-all ${timeframe === tf ? 'bg-blue-500 text-white' : 'text-text hover:bg-surface-hover hover:text-foreground'}`}>
                  {tf}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-6 h-px bg-border my-1" />

      <button title="Indicators" onClick={onIndToggle}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-text hover:bg-surface-hover hover:text-foreground transition-all">
        <Activity size={20} />
      </button>

      <div className="w-6 h-px bg-border my-1" />

      <button title="Remove Drawings" onClick={onRemoveDrawings}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-text hover:bg-surface-hover hover:text-red transition-all">
        <Trash2 size={20} />
      </button>

      <button title="Fullscreen" onClick={() => {
        const el = document.querySelector('[data-chart-area]') as HTMLElement;
        if (el) { document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen(); }
      }}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-text hover:bg-surface-hover hover:text-foreground transition-all">
        <Maximize2 size={20} />
      </button>
    </div>
  );
}

function InsufficientDialog({ open, isDemo, onClose }: { open: boolean; isDemo: boolean; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  if (!open) return null;

  const topUpDemo = async () => {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/trade/demo-balance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance: 10000 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || 'Top-up failed. Please try again.');
        return;
      }
      window.dispatchEvent(new Event('balance-refresh'));
      onClose();
    } catch {
      setMsg('Top-up failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-[380px] max-w-[calc(100%-2rem)] p-6 text-center" onClick={e => e.stopPropagation()}>
        <div className="w-14 h-14 rounded-2xl bg-red/10 border border-red/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-red" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 8v4m0 4h.01" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-foreground mb-1.5">Insufficient balance</h3>
        <p className="text-xs text-text-dark mb-5">
          {isDemo ? 'Your demo balance is too low for this trade. Top up to $10,000 instantly and keep practicing.' : 'Your real balance is too low for this trade. Deposit funds to continue trading.'}
        </p>
        {msg && <p className="text-xs text-red font-semibold mb-3">{msg}</p>}
        {isDemo ? (
          <button onClick={topUpDemo} disabled={busy}
            className="w-full bg-green hover:bg-green-hover disabled:opacity-50 text-white text-sm font-bold py-3 rounded-xl transition-colors mb-2">
            {busy ? 'Topping up…' : 'Top up demo to $10,000'}
          </button>
        ) : (
          <Link href="/deposit" className="block w-full bg-green hover:bg-green-hover text-white text-sm font-bold py-3 rounded-xl transition-colors mb-2 text-center">
            Deposit now
          </Link>
        )}
        <button onClick={onClose} className="w-full text-text hover:text-foreground text-xs font-semibold py-2 transition-colors">
          Close
        </button>
      </div>
    </div>
  );
}

function TradeFailDialog({ open, message, onClose }: { open: boolean; message: string; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-[380px] max-w-[calc(100%-2rem)] p-6 text-center" onClick={e => e.stopPropagation()}>
        <div className="w-14 h-14 rounded-2xl bg-red/10 border border-red/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-red" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-foreground mb-1.5">Trade failed</h3>
        <p className="text-xs text-text-dark mb-5">{message || 'Trade failed. Please try again.'}</p>
        <button onClick={onClose} className="w-full bg-surface-hover hover:bg-border text-foreground text-sm font-bold py-3 rounded-xl transition-colors">
          Close
        </button>
      </div>
    </div>
  );
}

interface CatalogInd {
  label: string;
  name: string;
  overlay: boolean;
  cat: string;
}

const INDICATOR_CATALOG: CatalogInd[] = [
  { label: 'Moving Average', name: 'MA', overlay: true, cat: 'Trend' },
  { label: 'Exponential MA', name: 'EMA', overlay: true, cat: 'Trend' },
  { label: 'Smoothed MA', name: 'SMA', overlay: true, cat: 'Trend' },
  { label: 'Bollinger Bands', name: 'BOLL', overlay: true, cat: 'Trend' },
  { label: 'Parabolic SAR', name: 'SAR', overlay: true, cat: 'Trend' },
  { label: 'VWAP', name: 'VWAP', overlay: true, cat: 'Trend' },
  { label: 'TRIX', name: 'TRIX', overlay: false, cat: 'Trend' },
  { label: 'DMA', name: 'DMA', overlay: false, cat: 'Trend' },
  { label: 'MACD', name: 'MACD', overlay: false, cat: 'Oscillators' },
  { label: 'RSI', name: 'RSI', overlay: false, cat: 'Oscillators' },
  { label: 'KDJ', name: 'KDJ', overlay: false, cat: 'Oscillators' },
  { label: 'Stochastic', name: 'STOCH', overlay: false, cat: 'Oscillators' },
  { label: 'CCI', name: 'CCI', overlay: false, cat: 'Oscillators' },
  { label: 'Williams %R', name: 'WR', overlay: false, cat: 'Oscillators' },
  { label: 'BIAS', name: 'BIAS', overlay: false, cat: 'Oscillators' },
  { label: 'ROC', name: 'ROC', overlay: false, cat: 'Oscillators' },
  { label: 'Momentum', name: 'MTM', overlay: false, cat: 'Oscillators' },
  { label: 'BRAR', name: 'BRAR', overlay: false, cat: 'Oscillators' },
  { label: 'CR', name: 'CR', overlay: false, cat: 'Oscillators' },
  { label: 'PSY', name: 'PSY', overlay: false, cat: 'Oscillators' },
  { label: 'DMI', name: 'DMI', overlay: false, cat: 'Oscillators' },
  { label: 'ATR', name: 'ATR', overlay: false, cat: 'Volatility' },
  { label: 'Volume', name: 'VOL', overlay: false, cat: 'Volume' },
  { label: 'OBV', name: 'OBV', overlay: false, cat: 'Volume' },
  { label: 'EMV', name: 'EMV', overlay: false, cat: 'Volume' },
  { label: 'PVT', name: 'PVT', overlay: false, cat: 'Volume' },
  { label: 'VR', name: 'VR', overlay: false, cat: 'Volume' },
];

const DEFAULT_LINE_COLORS = ['#FF9600', '#935EBD', '#1677FF', '#E11D74', '#01C5C4'];

interface PageActiveInd {
  id: string;
  name: string;
  label: string;
  calcParams: number[];
  visible: boolean;
  overlay: boolean;
  colors: string[];
}

function IndDialog({ open, onClose, supported, active, onAdd, onToggle, onSettings, onRemove }: {
  open: boolean;
  onClose: () => void;
  supported: string[];
  active: PageActiveInd[];
  onAdd: (name: string) => void;
  onToggle: (id: string) => void;
  onSettings: (ind: PageActiveInd) => void;
  onRemove: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  if (!open) return null;

  const allowed = supported.length > 0 ? new Set(supported) : null;
  const activeNames = new Set(active.map(a => a.name));
  const cats: Array<{ cat: string; items: CatalogInd[] }> = [];
  for (const c of INDICATOR_CATALOG) {
    if (allowed && !allowed.has(c.name)) continue;
    if (!c.label.toLowerCase().includes(search.toLowerCase())) continue;
    let g = cats.find(g => g.cat === c.cat);
    if (!g) {
      g = { cat: c.cat, items: [] };
      cats.push(g);
    }
    g.items.push(c);
  }

  return (
    <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-[420px] max-h-[480px] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground">Indicators</h3>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-text hover:text-foreground rounded-lg hover:bg-surface-hover transition-colors">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <input type="text" placeholder="Search indicators..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-text-dark/50 focus:outline-none focus:border-blue/50 transition-colors" autoFocus />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {active.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] font-bold text-text-dark uppercase tracking-wider mb-1.5">Active ({active.length})</div>
              <div className="space-y-0.5">
                {active.map(a => (
                  <div key={a.id} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border/50">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: a.visible ? '#00c365' : '#5c677f' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-foreground truncate">{a.label}</div>
                      {a.calcParams.length > 0 && <div className="text-[10px] text-text-dark font-mono truncate">{a.calcParams.join(' · ')}</div>}
                    </div>
                    <button title={a.visible ? 'Hide' : 'Show'} onClick={() => onToggle(a.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-text-dark hover:text-foreground hover:bg-surface-hover transition-colors">
                      {a.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button title="Settings" onClick={() => onSettings(a)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-text-dark hover:text-foreground hover:bg-surface-hover transition-colors">
                      <Settings size={14} />
                    </button>
                    <button title="Remove" onClick={() => onRemove(a.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-text-dark hover:text-red hover:bg-red/10 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {cats.map(group => (
            <div key={group.cat} className="mb-3">
              <div className="text-[10px] font-bold text-text-dark uppercase tracking-wider mb-1.5">{group.cat}</div>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const added = activeNames.has(item.name);
                  return (
                    <button key={item.name} onClick={() => { if (!added) onAdd(item.name); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors group text-left">
                      <div className="w-7 h-7 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-text-dark group-hover:text-blue transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path d="M7 12l3-3 3 3 4-4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <span className="flex-1 text-[12px] font-medium text-text group-hover:text-foreground transition-colors">{item.label}</span>
                      {added && <span className="text-[10px] font-bold text-green">ADDED</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {cats.length === 0 && active.length === 0 && <div className="text-center py-8 text-text-dark text-sm">No indicators found</div>}
        </div>
      </div>
    </div>
  );
}

function IndSettingsDialog({ ind, onClose, onSave }: {
  ind: PageActiveInd;
  onClose: () => void;
  onSave: (id: string, patch: { calcParams: number[]; colors: string[] }) => void;
}) {
  const [params, setParams] = useState<string[]>(ind.calcParams.map(String));
  const [colors, setColors] = useState<string[]>(() =>
    ind.calcParams.map((_, i) => ind.colors[i] ?? DEFAULT_LINE_COLORS[i % DEFAULT_LINE_COLORS.length]),
  );
  const [error, setError] = useState('');

  const save = () => {
    const nums = params.map(p => Number(p));
    if (nums.length === 0 || nums.some(n => !Number.isFinite(n) || n <= 0)) {
      setError('Periods must be positive numbers.');
      return;
    }
    onSave(ind.id, { calcParams: nums, colors: colors.slice(0, nums.length) });
  };

  return (
    <div className="absolute inset-0 z-[160] flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-[360px] max-w-[calc(100%-2rem)] max-h-[440px] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">{ind.label} settings</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-text hover:text-foreground rounded-lg hover:bg-surface-hover transition-colors">
            <X size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
          <div>
            <div className="text-[10px] font-bold text-text-dark uppercase tracking-wider mb-2">Periods</div>
            <div className="grid grid-cols-3 gap-2">
              {params.map((p, i) => (
                <div key={i}>
                  <div className="text-[10px] text-text-dark mb-1">Length {i + 1}</div>
                  <input type="number" value={p} min={1} step="any"
                    onChange={e => setParams(prev => prev.map((v, j) => (j === i ? e.target.value : v)))}
                    className="w-full bg-background border border-border rounded-lg px-2 py-2 text-foreground font-mono text-sm text-center focus:outline-none focus:border-blue [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-text-dark uppercase tracking-wider mb-2">Line colors</div>
            <div className="flex items-center gap-2 flex-wrap">
              {colors.map((c, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <input type="color" value={c} onChange={e => setColors(prev => prev.map((v, j) => (j === i ? e.target.value : v)))}
                    className="w-9 h-9 rounded-lg bg-background border border-border cursor-pointer p-1" />
                  <span className="text-[9px] text-text-dark font-mono">L{i + 1}</span>
                </div>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-red font-semibold">{error}</p>}
          <button onClick={save} className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold py-2.5 rounded-xl transition-colors">
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TradingPage() {
  const params = useParams();
  const accountType = (params.accountType as string) || 'demo';
  const [indOpen, setIndOpen] = useState(false);

  const [pairs, setPairs] = useState<PairDef[]>([]);
  const [activePair, setActivePair] = useState<PairDef | null>(null);
  const [effectivePayout, setEffectivePayout] = useState<number | null>(null);
  const [payoutMap, setPayoutMap] = useState<Record<string, number>>({});
  const [visibleIds, setVisibleIds] = useState<string[] | null>(null);
  const [seed, setSeed] = useState<{ pairId: string; bars: CandleData[] } | null>(null);
  const [timeframe, setTimeframe] = useState('1m');
  const [chartType, setChartType] = useState<'candle' | 'line' | 'area'>(() => {
    try {
      const v = localStorage.getItem('nextorx:chart-type');
      return v === 'line' || v === 'area' ? v : 'candle';
    } catch {
      return 'candle';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('nextorx:chart-type', chartType);
    } catch {}
    chartRef.current?.setChartType(chartType);
  }, [chartType]);
  const prevActiveRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!activePair) {
      setSeed(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/market/pairs/${activePair.id}/candles?limit=300&interval=${encodeURIComponent(timeframe)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const bars = ((data.candles ?? []) as CandleData[]).sort((a, b) => a.timestamp - b.timestamp);
        setSeed({ pairId: activePair.id, bars });
      })
      .catch(() => {
        if (!cancelled) setSeed(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activePair, timeframe]);

  const [sentiment, setSentiment] = useState<{ upPct: number; total: number } | null>(null);

  useEffect(() => {
    if (!activePair) {
      setSentiment(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/market/sentiment?pairId=${activePair.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setSentiment({ upPct: data.upPct ?? 50, total: data.total ?? 0 });
      } catch {}
    };
    load();
    const timer = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activePair]);

  const readStoredTabs = (): string[] | null => {
    try {
      const raw = localStorage.getItem('nextorx-visible-pairs');
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;
      if (!Array.isArray(parsed)) return null;
      return parsed.filter((v): v is string => typeof v === 'string');
    } catch {
      return null;
    }
  };
  const [investment, setInvestment] = useState(1);
  const [timeMinutes, setTimeMinutes] = useState(1);
  const [timeSeconds, setTimeSeconds] = useState(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tradeError, setTradeError] = useState('');
  const [insufficientOpen, setInsufficientOpen] = useState(false);
  const [hoverDir, setHoverDir] = useState<'up' | 'down' | null>(null);
  const [viewSeq, setViewSeq] = useState(0);
  const [offLive, setOffLive] = useState(false);
  const { theme } = useTheme();
  const handleViewChange = useCallback(() => {
    try {
      setOffLive(!(chartRef.current?.isAtRealTime() ?? true));
    } catch {}
    setViewSeq((s) => (s + 1) % 1000000);
  }, []);

  useEffect(() => {
    try {
      chartRef.current?.setTheme(theme === 'light' ? 'light' : 'dark');
    } catch {}
  }, [theme]);
  const [expiryMarks, setExpiryMarks] = useState<Array<{ id: string; x: number; y: number; left: string; amount?: string; dir?: 'up' | 'down'; stack?: number; kind?: 'pill' | 'dot'; ex?: number; ex2?: number }>>([]);
  const [results, setResults] = useState<Array<{ id: string; x: number; y: number; text: string; atPrice: string; won: boolean }>>([]);
  const priceRef = useRef(0);
  const markerRef = useRef<Map<string, string[]>>(new Map());
  const [mounted, setMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [panelPos, setPanelPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const chartRef = useRef<ChartHandle>(null);
  const [supportedInds, setSupportedInds] = useState<string[]>([]);
  const [activeInds, setActiveInds] = useState<PageActiveInd[]>(() => {
    try {
      return readStoredIndicators().map(s => {
        const cat = INDICATOR_CATALOG.find(c => c.name === s.name);
        return {
          id: '',
          name: s.name,
          label: cat?.label ?? s.name,
          calcParams: s.calcParams ?? [],
          visible: s.visible !== false,
          overlay: cat?.overlay ?? s.overlay ?? false,
          colors: s.colors ?? [],
        };
      });
    } catch {
      return [];
    }
  });
  const [indSettings, setIndSettings] = useState<PageActiveInd | null>(null);

  const persistIndStore = useCallback((list: PageActiveInd[]) => {
    const stored: StoredIndicator[] = list.map(a => ({
      name: a.name,
      calcParams: a.calcParams,
      visible: a.visible,
      colors: a.colors,
      overlay: a.overlay,
    }));
    writeStoredIndicators(stored);
  }, []);

  const refreshActiveIndicators = useCallback(() => {
    const live = chartRef.current?.getActiveIndicators() ?? [];
    setActiveInds(prev => {
      const prevByName = new Map(prev.map(p => [p.name, p]));
      const next = live.map(l => {
        const cat = INDICATOR_CATALOG.find(c => c.name === l.name);
        const prevColors = prevByName.get(l.name)?.colors ?? [];
        return {
          id: l.id,
          name: l.name,
          label: cat?.label ?? l.name,
          calcParams: l.calcParams,
          visible: l.visible,
          overlay: cat?.overlay ?? prevByName.get(l.name)?.overlay ?? false,
          colors: prevColors,
        };
      });
      persistIndStore(next);
      return next;
    });
  }, [persistIndStore]);

  const handleAddIndicator = useCallback((name: string) => {
    const def = INDICATOR_CATALOG.find(c => c.name === name);
    if (!def || !chartRef.current) return;
    const cur = chartRef.current.getActiveIndicators();
    if (cur.some(c => c.name === name)) {
      toast.info(`${def.label} is already on the chart`);
      return;
    }
    const subPanes = cur.filter(c => {
      const d = INDICATOR_CATALOG.find(x => x.name === c.name);
      return !(d?.overlay ?? false);
    }).length;
    if (!def.overlay && subPanes >= 4) {
      toast.warning('Maximum 4 indicator panes reached. Remove one first.');
      return;
    }
    const id = chartRef.current.addIndicator(name, def.overlay);
    if (!id) {
      toast.error(`Could not add ${def.label}`);
      return;
    }
    refreshActiveIndicators();
    toast.success(`${def.label} added`);
  }, [refreshActiveIndicators]);

  const handleToggleIndicator = useCallback((id: string) => {
    const cur = chartRef.current?.getActiveIndicators().find(a => a.id === id);
    if (!cur || !chartRef.current) return;
    chartRef.current.overrideIndicatorById(id, { visible: !(cur.visible !== false) });
    refreshActiveIndicators();
  }, [refreshActiveIndicators]);

  const handleRemoveIndicator = useCallback((id: string) => {
    chartRef.current?.removeIndicatorById(id);
    refreshActiveIndicators();
  }, [refreshActiveIndicators]);

  const handleSaveIndicatorSettings = useCallback((id: string, patch: { calcParams: number[]; colors: string[] }) => {
    if (!chartRef.current?.overrideIndicatorById(id, patch)) {
      toast.error('Could not apply settings');
      return;
    }
    setActiveInds(prev => {
      const next = prev.map(a => (a.id === id ? { ...a, calcParams: patch.calcParams, colors: patch.colors } : a));
      persistIndStore(next);
      return next;
    });
    setIndSettings(null);
    toast.success('Indicator updated');
  }, [persistIndStore]);

  useEffect(() => {
    if (!indOpen) return;
    try {
      setSupportedInds(chartRef.current?.getSupportedIndicators() ?? []);
    } catch {
      setSupportedInds([]);
    }
    refreshActiveIndicators();
  }, [indOpen, refreshActiveIndicators]);
  const [selectedOverlay, setSelectedOverlay] = useState<{ id: string; name: string } | null>(null);
  const [editPanelPos, setEditPanelPos] = useState({ x: 0, y: 0 });
  const editDragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);

  useEffect(() => {
    fetch('/api/market/pairs')
      .then(r => r.json())
      .then((data: { pairs: Array<Record<string, unknown>> }) => {
        const normalized = (data.pairs || []).map(p => ({
          ...p,
          payoutPercent: Number(p.payoutPercent),
          basePrice: Number(p.basePrice),
          spread: Number(p.spread ?? 0),
          minTrade: Number(p.minTrade),
          maxTrade: Number(p.maxTrade),
        })) as PairDef[];
        setPairs(normalized);
        if (normalized.length > 0) {
          setVisibleIds((prev) => {
            if (prev !== null) return prev.filter((id) => normalized.some((p) => p.id === id));
            const stored = readStoredTabs();
            if (stored) return stored.filter((id) => normalized.some((p) => p.id === id));
            return normalized.map((p) => p.id);
          });
          setActivePair((cur) => {
            if (cur && normalized.some((p) => p.id === cur.id)) return cur;
            try {
              const last = localStorage.getItem('nextorx-active-pair');
              const found = last ? normalized.find((p) => p.id === last) : undefined;
              if (found) return found;
            } catch {}
            return normalized[0];
          });
        }
      })
      .catch(() => {});
    setMounted(true);
  }, []);

  const clearMarkers = useCallback(() => {
    for (const overlayIds of Array.from(markerRef.current.values())) {
      for (const oid of overlayIds) {
        try {
          chartRef.current?.removeOverlay(oid);
        } catch {}
      }
    }
    markerRef.current.clear();
  }, []);

  const handleSelectPair = useCallback((p: PairDef) => {
    clearMarkers();
    setVisibleIds((prev) => {
      const cur = prev ?? [];
      const next = cur.includes(p.id) ? cur : [...cur, p.id];
      try {
        localStorage.setItem('nextorx-visible-pairs', JSON.stringify(next));
        localStorage.setItem('nextorx-active-pair', p.id);
      } catch {}
      return next;
    });
    setActivePair(p);
  }, []);

  const handleClosePair = useCallback((id: string) => {
    const cur = visibleIds ?? [];
    const next = cur.filter((v) => v !== id);
    try {
      localStorage.setItem('nextorx-visible-pairs', JSON.stringify(next));
    } catch {}
    setVisibleIds(next);
    if (activePair?.id === id) {
      clearMarkers();
      setActivePair(pairs.find((p) => next.includes(p.id)) ?? null);
    }
  }, [visibleIds, activePair, pairs, clearMarkers]);

  const handleTick = useCallback(() => {}, []);
  const handleCandleClose = useCallback(() => {}, []);
  const handleSnapshot = useCallback(() => {}, []);

  const { isConnected, currentPrice, candle, serverTime } = usePairWS({
    pairId: activePair?.id ?? null,
    onTick: handleTick,
    onCandleClose: handleCandleClose,
    onSnapshot: handleSnapshot,
  });

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleDrawTool = useCallback((toolName: string) => {
    const overlayName = toolOverlayMap[toolName];
    if (overlayName) chartRef.current?.createOverlay(overlayName);
  }, []);

  useEffect(() => { setEditPanelPos({ x: 0, y: 0 }); }, [selectedOverlay?.id]);

  const handleRemoveDrawings = useCallback(() => {
    chartRef.current?.removeAllOverlays();
    setSelectedOverlay(null);
  }, []);

  const handleOverlayStyle = useCallback((key: string, value: unknown) => {
    if (!selectedOverlay) return;
    const isRect = selectedOverlay.name === 'rect';
    const styleKey = isRect ? 'rect' : 'line';
    const mappedKey = isRect && key === 'size' ? 'borderSize' : key;
    chartRef.current?.overrideOverlay(selectedOverlay.id, { styles: { [styleKey]: { [mappedKey]: value } } });
  }, [selectedOverlay]);

  const handleDeleteOverlay = useCallback(() => {
    if (!selectedOverlay) return;
    chartRef.current?.removeOverlay(selectedOverlay.id);
    setSelectedOverlay(null);
  }, [selectedOverlay]);

  const handleCopyOverlay = useCallback(() => {
    if (!selectedOverlay) return;
    chartRef.current?.copyOverlay(selectedOverlay.id);
  }, [selectedOverlay]);

  const onDragStart = (e: React.MouseEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: panelPos.x, startPosY: panelPos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      setPanelPos({
        x: dragRef.current.startPosX - (ev.clientX - dragRef.current.startX),
        y: dragRef.current.startPosY + (ev.clientY - dragRef.current.startY),
      });
    };
    const onUp = () => { dragRef.current = null; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const onEditDragStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    editDragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: editPanelPos.x, startPosY: editPanelPos.y };
    const onMove = (ev: MouseEvent) => {
      if (!editDragRef.current) return;
      setEditPanelPos({
        x: editDragRef.current.startPosX + (ev.clientX - editDragRef.current.startX),
        y: editDragRef.current.startPosY + (ev.clientY - editDragRef.current.startY),
      });
    };
    const onUp = () => { editDragRef.current = null; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const price = currentPrice ?? activePair?.basePrice ?? 1.0;
  priceRef.current = price;
  const payout = activePair ? (payoutMap[activePair.id] ?? effectivePayout ?? activePair.payoutPercent) : 80;
  const payoutAmount = (investment * (1 + payout / 100)).toFixed(2);
  const timeStr = `${String(timeMinutes).padStart(2, '0')}:${String(timeSeconds).padStart(2, '0')}:00`;

  const refreshTrades = useCallback(async () => {
    try {
      const wallet = accountType === 'demo' ? 'demo' : 'real';
      const res = await fetch(`/api/trade/trades?limit=20&wallet=${wallet}`);
      if (!res.ok) return;
      const data = await res.json();
      const mapped: Trade[] = ((data.trades ?? []) as Array<Record<string, unknown>>).map((t) => {
        const createdAt = new Date(t.createdAt as string).getTime();
        const duration = Number(t.durationSeconds ?? 0);
        return {
          id: String(t.id),
          symbol: ((t.pair as Record<string, unknown> | undefined)?.name as string) ?? '',
          type: (String(t.direction).toLowerCase() === 'up' ? 'up' : 'down') as 'up' | 'down',
          amount: Number(t.amount) / 100,
          payout: Number(t.payoutPercent ?? 0),
          profit: t.profit == null ? 0 : Number(t.profit) / 100,
          time: new Date(createdAt).toLocaleTimeString(),
          timestamp: createdAt,
          status: String(t.status).toLowerCase() as 'active' | 'won' | 'lost',
          openPrice: t.openPrice != null ? Number(t.openPrice) : undefined,
          closePrice: t.closePrice != null ? Number(t.closePrice) : undefined,
          payoutPercent: Number(t.payoutPercent ?? 0),
          expiresAt: createdAt + duration * 1000,
          pairId: (t.pairId as string) ?? ((t.pair as Record<string, unknown> | undefined)?.id as string) ?? '',

        };
      });
      setTrades(mapped);
      const nowActive = new Set(mapped.filter((t) => t.status === 'active').map((t) => t.id));
      for (const t of mapped) {
        if ((t.status === 'won' || t.status === 'lost') && prevActiveRef.current.has(t.id)) {
          const profitText = t.status === 'won' ? `+$${t.profit.toFixed(2)}` : `−$${t.amount.toFixed(2)}`;
          if (t.status === 'won') {
            toast.success(`Won ${profitText} on ${t.symbol || 'trade'}`);
          } else {
            toast.error(`Lost $${t.amount.toFixed(2)} on ${t.symbol || 'trade'}`);
          }
          window.dispatchEvent(new Event('balance-refresh'));
          try {
            const live = priceRef.current || price;
            const pt = (!activePair || !t.pairId || t.pairId === activePair.id)
              ? (chartRef.current?.chartPixel(Date.now(), live) ?? null)
              : null;
            if (pt) {
              const rid = `res:${t.id}`;
              const px = activePair && activePair.id.includes('JPY') ? 3 : 5;
              setResults((prev) => [...prev.slice(-2), { id: rid, x: pt.x, y: pt.y, text: profitText, atPrice: live.toFixed(px), won: t.status === 'won' }]);
              setTimeout(() => setResults((prev) => prev.filter((r) => r.id !== rid)), 4000);
            }
          } catch {}
        }
      }
      prevActiveRef.current = nowActive;
      const activeIds = new Set(mapped.filter((t) => t.status === 'active').map((t) => t.id));
      for (const t of mapped) {
        if (t.status === 'active' && !markerRef.current.has(t.id) && t.openPrice != null && t.expiresAt != null && (!activePair || !t.pairId || t.pairId === activePair.id)) {
          try {
            const ids = chartRef.current?.drawTradeMarkers({
              entryPrice: t.openPrice,
              entryMs: t.timestamp,
              endMs: markerEndMs(t.timestamp, t.expiresAt, timeframe),
              direction: t.type,
            }) ?? [];
            if (ids.length > 0) markerRef.current.set(t.id, ids);
          } catch {}
        }
      }
      for (const [tradeId, overlayIds] of Array.from(markerRef.current.entries())) {
        if (!activeIds.has(tradeId)) {
          for (const oid of overlayIds) {
            try {
              chartRef.current?.removeOverlay(oid);
            } catch {}
          }
          markerRef.current.delete(tradeId);
        }
      }
    } catch {}
  }, [accountType, activePair, timeframe]);

  useEffect(() => {
    refreshTrades();
    const timer = setInterval(refreshTrades, 2000);
    return () => clearInterval(timer);
  }, [refreshTrades]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshTrades();
        if (activePair) {
          fetch(`/api/market/pairs/${activePair.id}/candles?limit=300&interval=${encodeURIComponent(timeframe)}`)
            .then((r) => r.json())
            .then((data) => {
              const bars = ((data.candles ?? []) as CandleData[]).sort((a, b) => a.timestamp - b.timestamp);
              setSeed({ pairId: activePair.id, bars });
            })
            .catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [refreshTrades, activePair, timeframe]);

  const [payoutDetails, setPayoutDetails] = useState<Record<string, { base: number; payout: number; adjustments: { reason: string; delta: number }[] }>>({});

  useEffect(() => {
    if (pairs.length === 0) return;
    let cancelled = false;
    const loadAll = async () => {
      try {
        const res = await fetch('/api/market/payouts');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const map: Record<string, number> = {};
        const details: Record<string, { base: number; payout: number; adjustments: { reason: string; delta: number }[] }> = {};
        for (const p of pairs) {
          const b = data.payouts?.[p.id];
          if (b && typeof b.payout === 'number') {
            map[p.id] = b.payout;
            details[p.id] = b;
          }
        }
        setPayoutMap(map);
        setPayoutDetails(details);
      } catch {}
    };
    loadAll();
    const timer = setInterval(loadAll, 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pairs]);

  useEffect(() => {
    if (!activePair) {
      setEffectivePayout(null);
      return;
    }
    const v = payoutMap[activePair.id];
    setEffectivePayout(v ?? activePair.payoutPercent);
  }, [activePair, payoutMap]);

  const [candleLeft, setCandleLeft] = useState('');

  useEffect(() => {
    void syncWithServer();
    const iv = setInterval(() => void syncWithServer(), 60000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const intervalMsMap: Record<string, number> = { '5s': 5000, '30s': 30000, '1m': 60000, '5m': 300000, '15m': 900000, '30m': 1800000, '1h': 3600000, '4h': 14400000 };
    const intervalMs = intervalMsMap[timeframe] ?? 60000;
    const update = () => {
      const now = getServerNow();
      const leftMs = intervalMs - (now % intervalMs);
      const leftSec = Math.ceil(leftMs / 1000);
      const m = Math.floor(leftSec / 60);
      const s = leftSec % 60;
      setCandleLeft(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    update();
    const timer = setInterval(update, 250);
    return () => clearInterval(timer);
  }, [timeframe]);

  useEffect(() => {
    const intervalMsMap: Record<string, number> = { '5s': 5000, '30s': 30000, '1m': 60000, '5m': 300000, '15m': 900000, '30m': 1800000, '1h': 3600000, '4h': 14400000 };
    const intervalMs = intervalMsMap[timeframe] ?? 60000;
    const updateMarks = () => {
      const now = getServerNow();
      const marks: Array<{ id: string; x: number; y: number; left: string; amount?: string; dir?: 'up' | 'down'; stack?: number; kind?: 'pill' | 'dot'; ex?: number; ex2?: number }> = [];
      const nextCloseMs = now + (intervalMs - (now % intervalMs));
      const anchor = chartRef.current?.chartPixel(nextCloseMs, price) ?? chartRef.current?.chartPixel(now + intervalMs, price) ?? null;
      if (anchor) {
        const leftMs = intervalMs - (now % intervalMs);
        const leftSec = Math.ceil(leftMs / 1000);
        const mm = String(Math.floor(leftSec / 60)).padStart(2, '0');
        const ss = String(leftSec % 60).padStart(2, '0');
        marks.push({ id: 'candle', x: anchor.x, y: anchor.y, left: `${mm}:${ss}`, kind: 'pill' });
      }
      const liveTrades = trades.filter((t) => t.status === 'active' && t.openPrice != null && t.expiresAt != null && (!activePair || !t.pairId || t.pairId === activePair.id));
      const labelW = 104;
      const gap = 2;
      const liveEdgePt = chartRef.current?.chartPixel(now, price) ?? null;
      const placed: Array<{ x: number; y: number }> = [];
      liveTrades.forEach((t, i) => {
        const openPrice = t.openPrice as number;
        const entryPt = chartRef.current?.chartPixel(t.timestamp, openPrice) ?? null;
        if (!entryPt) return;
        const prevPt = chartRef.current?.chartPixel(t.timestamp - intervalMs, openPrice) ?? null;
        const pxCandle = prevPt && Math.abs(entryPt.x - prevPt.x) > 0 ? Math.abs(entryPt.x - prevPt.x) : 8;
        let x = entryPt.x - 2 * pxCandle;
        if (liveEdgePt) x = Math.min(x, liveEdgePt.x - 140);
        let guard = 0;
        while (guard++ < 12) {
          const hit = placed.find((p) => Math.abs(p.y - entryPt.y) < 16 && Math.abs(p.x - x) < labelW + gap);
          if (!hit) break;
          x = hit.x - (labelW + gap);
        }
        placed.push({ x, y: entryPt.y });
        const remainSec = Math.max(0, Math.ceil(((t.expiresAt as number) - now) / 1000));
        const mm = String(Math.floor(remainSec / 60)).padStart(2, '0');
        const ss = String(remainSec % 60).padStart(2, '0');
        const amt = Number.isInteger(t.amount) ? `$${t.amount}` : `$${t.amount.toFixed(2)}`;
        const lineEnd = markerEndMs(t.timestamp, t.expiresAt as number, timeframe);
        const endPt = chartRef.current?.chartPixel(lineEnd, openPrice) ?? null;
        marks.push({ id: `trade:${t.id}`, x, y: entryPt.y, left: `${mm}:${ss}`, amount: amt, dir: t.type, stack: i, kind: 'pill', ex: entryPt.x, ex2: endPt ? endPt.x : undefined });
        marks.push({ id: `dot-start:${t.id}`, x: entryPt.x, y: entryPt.y, left: '', dir: t.type, stack: i, kind: 'dot' });
        if (endPt) marks.push({ id: `dot-end:${t.id}`, x: endPt.x, y: endPt.y, left: '', dir: t.type, stack: i, kind: 'dot' });
      });
      setExpiryMarks(marks);
    };
    updateMarks();
    const timer = setInterval(updateMarks, 250);
    return () => clearInterval(timer);
  }, [price, timeframe, trades, activePair, viewSeq]);

  const handleTrade = useCallback(async (type: 'up' | 'down') => {
    if (!activePair) return;
    setTradeError('');

    try {
      const res = await fetch('/api/trade/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairId: activePair.id,
          direction: type.toUpperCase(),
          amount: investment,
          durationSeconds: timeMinutes * 60 + timeSeconds,
          wallet: accountType === 'demo' ? 'demo' : 'real',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.error || 'Trade failed. Please try again.';
        if (/insufficient balance/i.test(msg)) {
          setInsufficientOpen(true);
        } else {
          setTradeError(msg);
        }
        return;
      }

      if (data.trade) {
        try {
          const t = data.trade as { id: string; openPrice: number | string; createdAt: string; durationSeconds: number };
          const createdAt = new Date(t.createdAt).getTime();
          const ids = chartRef.current?.drawTradeMarkers({
            entryPrice: Number(t.openPrice),
            entryMs: createdAt,
            endMs: markerEndMs(createdAt, createdAt + Number(t.durationSeconds || 0) * 1000, timeframe),
            direction: type,
          }) ?? [];
          if (ids.length > 0) markerRef.current.set(String(t.id), ids);
        } catch {}
        window.dispatchEvent(new Event('balance-refresh'));
        await refreshTrades();
      }
    } catch {
      setTradeError('Trade failed. Please try again.');
    }
  }, [activePair, investment, timeMinutes, timeSeconds, accountType, refreshTrades, timeframe]);

  const handleTimeChange = (delta: number) => {
    setTimeSeconds(prev => {
      const next = prev + delta;
      if (next >= 60) { setTimeMinutes(m => m + 1); return 0; }
      if (next < 0) { setTimeMinutes(m => Math.max(0, m - 1)); return 59; }
      return next;
    });
  };

  const handleTimeSet = (m: number, s: number) => {
    const total = Math.max(30, Math.min(3600, m * 60 + s));
    setTimeMinutes(Math.floor(total / 60));
    setTimeSeconds(total % 60);
  };

  if (!mounted) return <div className="h-full w-full bg-background" />;

  const isComingSoon = accountType === 'funded' || accountType === 'tournament';

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="flex-1 flex min-w-0 overflow-hidden">
        <div className="flex-1 flex min-w-0 overflow-hidden" data-chart-area>
          <IndDialog
            open={indOpen}
            onClose={() => setIndOpen(false)}
            supported={supportedInds}
            active={activeInds}
            onAdd={handleAddIndicator}
            onToggle={handleToggleIndicator}
            onSettings={setIndSettings}
            onRemove={handleRemoveIndicator}
          />
          {indSettings && (
            <IndSettingsDialog
              ind={indSettings}
              onClose={() => setIndSettings(null)}
              onSave={handleSaveIndicatorSettings}
            />
          )}
          <InsufficientDialog open={insufficientOpen} isDemo={accountType === 'demo'} onClose={() => setInsufficientOpen(false)} />
          <TradeFailDialog open={!!tradeError} message={tradeError} onClose={() => setTradeError('')} />
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <TopBar pairs={pairs} visibleIds={visibleIds ?? []} activePair={activePair} effectivePayout={effectivePayout} payoutMap={payoutMap} payoutDetails={payoutDetails} trades={trades} currentPrice={price} onSelect={handleSelectPair} onClose={handleClosePair} />
            {!activePair ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-background">
                <div className="w-14 h-14 rounded-2xl bg-blue/10 border border-blue/20 flex items-center justify-center">
                  <svg className="w-7 h-7 text-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-foreground">No asset added</p>
                <p className="text-xs text-textDark">Click + above to add an asset from the list.</p>
              </div>
            ) : (
            <div className="flex-1 flex min-w-0 overflow-hidden">
              <div className="flex-1 relative overflow-hidden">
                <Chart ref={chartRef} pairId={activePair.id} pairName={activePair.name} currentPrice={price} currentCandle={candle} seed={seed} timeframe={timeframe} serverTime={serverTime} onOverlaySelected={setSelectedOverlay} onViewChange={handleViewChange} watermark={accountType === 'demo' ? 'DEMO' : null} />
                <SideToolbar timeframe={timeframe} onTimeframeChange={setTimeframe} chartType={chartType} onChartTypeChange={setChartType} sentiment={sentiment} onIndToggle={() => setIndOpen(!indOpen)} onDrawTool={handleDrawTool} onRemoveDrawings={handleRemoveDrawings} />
                {offLive && (
                  <button
                    onClick={() => {
                      try {
                        chartRef.current?.scrollToRealTime(200);
                      } catch {}
                      setOffLive(false);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-surface/90 backdrop-blur border border-border flex items-center justify-center text-text hover:text-white hover:bg-surface shadow-lg transition-colors"
                    title="Go to live price"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <circle cx="12" cy="12" r="7" />
                      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
                      <path d="M12 2v3m0 14v3M2 12h3m14 0h3" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => {
                    if (!activePair) return;
                    fetch(`/api/market/pairs/${activePair.id}/candles?limit=300&interval=${encodeURIComponent(timeframe)}`)
                      .then((r) => r.json())
                      .then((data) => {
                        const bars = ((data.candles ?? []) as CandleData[]).sort((a, b) => a.timestamp - b.timestamp);
                        setSeed({ pairId: activePair.id, bars });
                      })
                      .catch(() => {});
                  }}
                  className="absolute top-2 right-2 z-30 w-7 h-7 rounded-lg bg-surface/80 backdrop-blur border border-border flex items-center justify-center text-text hover:text-foreground hover:bg-surface transition-colors"
                  title="Refresh chart"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                {(() => {
                  if (!hoverDir) return null;
                  const y = chartRef.current?.getYPixel(price) ?? null;
                  if (y == null || !Number.isFinite(y)) return null;
                  const isUp = hoverDir === 'up';
                  const color = isUp ? '0,195,101' : '255,73,84';
                  const px = activePair.id.includes('JPY') ? 3 : 5;
                  return (
                    <>
                      <div
                        className="absolute left-0 right-0 z-30 pointer-events-none"
                        style={{
                          top: isUp ? 0 : y,
                          height: isUp ? Math.max(0, y) : undefined,
                          bottom: isUp ? undefined : 0,
                          background: isUp
                            ? `linear-gradient(to bottom, rgba(${color},0.22), rgba(${color},0.02))`
                            : `linear-gradient(to bottom, rgba(${color},0.02), rgba(${color},0.22))`,
                        }}
                      />
                      <div
                        className="absolute left-0 right-0 z-30 pointer-events-none"
                        style={{ top: y, borderTop: `1px dashed rgba(${color},0.9)` }}
                      />
                      <div
                        className={`absolute z-30 pointer-events-none px-1.5 py-0.5 rounded text-white text-[10px] font-mono font-bold tabular-nums whitespace-nowrap ${isUp ? 'bg-green' : 'bg-red'}`}
                        style={{ right: 4, top: y - 10 }}
                      >
                        {price.toFixed(px)}
                      </div>
                    </>
                  );
                })()}
                {expiryMarks.filter((m) => m.id !== 'candle' && m.kind !== 'dot').map((m) => (
                  <div
                    key={`line:${m.id}`}
                    className="absolute z-30 pointer-events-none"
                    style={{
                      left: 0,
                      right: 0,
                      top: m.y,
                      borderTop: m.dir === 'down' ? '1px dashed rgba(255,73,84,0.85)' : '1px dashed rgba(0,195,101,0.85)',
                    }}
                  />
                ))}
                {expiryMarks.map((m) => (
                  m.id === 'candle' ? (
                    <div
                      key={m.id}
                      className="absolute z-40 pointer-events-none px-1.5 py-0.5 rounded bg-blue text-white text-[10px] font-mono font-bold tabular-nums whitespace-nowrap"
                      style={{ left: Math.max(4, m.x + 10), top: m.y - 10 }}
                      title="Time to candle close"
                    >
                      {m.left}
                    </div>
                  ) : m.kind === 'dot' ? (
                    <div
                      key={m.id}
                      className="absolute z-40 pointer-events-none rounded-full"
                      style={{
                        left: m.x - 4,
                        top: m.y - 4,
                        width: 8,
                        height: 8,
                        backgroundColor: m.dir === 'down' ? '#ff4954' : '#00c365',
                        boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 1px 4px rgba(0,0,0,0.5)',
                      }}
                    />
                  ) : (
                    <div
                      key={m.id}
                      className={`absolute z-40 pointer-events-none px-1.5 py-0.5 rounded text-white text-[10px] font-mono font-bold tabular-nums whitespace-nowrap ${m.dir === 'down' ? 'bg-red' : 'bg-green'}`}
                      style={{ left: Math.max(4, m.x), top: m.y - 10 }}
                      title={`Expires in ${m.left}`}
                    >
                      {m.amount} • {m.left}
                    </div>
                  )
                ))}
                {results.map((r) => (
                  <div key={r.id} className="absolute z-40 pointer-events-none" style={{ left: r.x, top: r.y }}>
                    <div
                      className={`px-2.5 py-1 rounded-xl text-white text-center shadow-lg ${r.won ? 'bg-green' : 'bg-red'}`}
                      style={{
                        transform: 'translate(-50%, -100%) translateY(-12px)',
                        boxShadow: r.won ? '0 4px 16px rgba(0,195,101,0.45)' : '0 4px 16px rgba(255,73,84,0.45)',
                      }}
                    >
                      <div className="text-xs font-black tabular-nums whitespace-nowrap leading-tight">{r.text}</div>
                      <div className="text-[9px] font-mono font-semibold tabular-nums whitespace-nowrap opacity-80 leading-tight">{r.atPrice}</div>
                    </div>
                    <div
                      className="mx-auto"
                      style={{
                        width: 0,
                        height: 0,
                        transform: 'translateY(-12px)',
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderTop: `8px solid ${r.won ? '#00c365' : '#ff4954'}`,
                      }}
                    />
                    <div
                      className="absolute rounded-full"
                      style={{
                        left: -3,
                        top: -3,
                        width: 6,
                        height: 6,
                        backgroundColor: r.won ? '#00c365' : '#ff4954',
                        boxShadow: '0 0 0 2px rgba(255,255,255,0.9)',
                      }}
                    />
                  </div>
                ))}

                {isComingSoon && (
                  <div className="absolute inset-0 z-[70] bg-background/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-2xl bg-orange/15 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <h2 className="text-xl font-black text-foreground mb-2">Coming Soon</h2>
                      <p className="text-sm text-text-dark max-w-xs">
                        {accountType === 'funded'
                          ? 'Funded accounts are coming soon. Complete challenges to access funded trading.'
                          : 'Tournaments are coming soon. Compete against other traders for prizes.'}
                      </p>
                      <Link href="/trade/real" className="mt-4 inline-block bg-green hover:bg-green-hover text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors">
                        Trade on Real Account
                      </Link>
                    </div>
                  </div>
                )}

                {selectedOverlay && (
                  <div className="absolute z-[60] bg-background/95 backdrop-blur-md border border-border rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden"
                    style={{ left: `calc(50% + ${editPanelPos.x}px)`, top: `calc(8px + ${editPanelPos.y}px)`, transform: 'translateX(-50%)' }}>
                    <div onMouseDown={onEditDragStart} className="h-7 bg-background border-b border-border flex items-center justify-between px-2.5 cursor-move select-none">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3 h-3 text-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-[10px] font-semibold text-foreground/80">{selectedOverlay.name}</span>
                      </div>
                      <div className="w-6 h-0.5 bg-border rounded-full" />
                    </div>
                    <div className="px-2.5 py-2 flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {['#00c365', '#ff4954', '#007aff', '#ff8c00', '#e4e8f0', '#ffff00', '#a855f7', '#ec4899'].map(c => (
                          <button key={c} onClick={() => handleOverlayStyle('color', c)}
                            className="w-4 h-4 rounded-full border border-foreground/10 hover:scale-125 transition-all duration-150" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <div className="w-px h-5 bg-border" />
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4].map(w => (
                          <button key={w} onClick={() => handleOverlayStyle('size', w)}
                            className="w-6 h-6 rounded-md bg-background border border-border flex items-center justify-center hover:border-foreground/30 transition-all duration-150">
                            <div className="rounded-full bg-white" style={{ width: w + 1, height: w + 1 }} />
                          </button>
                        ))}
                      </div>
                      <div className="w-px h-5 bg-border" />
                      <div className="flex items-center gap-0.5">
                        {['solid', 'dashed'].map(s => (
                          <button key={s} onClick={() => handleOverlayStyle('style', s)}
                            className="w-6 h-6 rounded-md bg-background border border-border flex items-center justify-center hover:border-foreground/30 transition-all duration-150">
                            <div className={`w-3 h-0 border-t-[1.5px] ${s === 'dashed' ? 'border-dashed' : 'border-solid'} border-foreground/60`} />
                          </button>
                        ))}
                      </div>
                      <div className="w-px h-5 bg-border" />
                      <div className="flex items-center gap-0.5">
                        <button onClick={handleCopyOverlay} title="Copy"
                          className="w-6 h-6 rounded-md hover:bg-foreground/5 flex items-center justify-center text-foreground/30 hover:text-blue transition-all duration-150">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <button onClick={handleDeleteOverlay} title="Delete"
                          className="w-6 h-6 rounded-md hover:bg-red/10 flex items-center justify-center text-foreground/30 hover:text-red transition-all duration-150">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <button onClick={() => setSelectedOverlay(null)} title="Close"
                          className="w-6 h-6 rounded-md hover:bg-foreground/5 flex items-center justify-center text-foreground/30 hover:text-foreground/60 transition-all duration-150">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {isFullscreen && (
                  <div className="absolute z-50 w-[220px] bg-surface/95 backdrop-blur-sm border border-border rounded-xl shadow-2xl overflow-hidden"
                    style={{ right: 16 + panelPos.x, top: `calc(50% + ${panelPos.y}px)`, transform: 'translateY(-50%)' }}>
                    <div onMouseDown={onDragStart} className="h-7 bg-background border-b border-border flex items-center justify-center cursor-move select-none">
                      <div className="w-8 h-1 bg-border rounded-full" />
                    </div>
                    <div className="p-2.5 flex flex-col gap-2.5">
                      <div>
                        <span className="text-[9px] text-text-dark font-semibold uppercase tracking-wider block mb-1">Expiration</span>
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => handleTimeChange(-10)} className="w-7 h-7 rounded-lg bg-background border border-border flex items-center justify-center text-text hover:text-foreground transition-all flex-shrink-0">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M20 12H4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </button>
                          <input
                            type="number"
                            value={timeMinutes}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10);
                              if (!isNaN(v)) handleTimeSet(Math.max(0, Math.min(60, v)), timeSeconds);
                            }}
                            min={0}
                            max={60}
                            className="w-10 bg-background border border-border rounded-lg px-1 py-1 text-foreground font-bold text-sm text-center focus:outline-none focus:border-blue [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="text-white font-bold">:</span>
                          <input
                            type="number"
                            value={String(timeSeconds).padStart(2, '0')}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10);
                              if (!isNaN(v)) handleTimeSet(timeMinutes, Math.max(0, Math.min(59, v)));
                              else if (e.target.value === '') handleTimeSet(timeMinutes, 0);
                            }}
                            min={0}
                            max={59}
                            className="w-10 bg-background border border-border rounded-lg px-1 py-1 text-foreground font-bold text-sm text-center focus:outline-none focus:border-blue [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button onClick={() => handleTimeChange(10)} className="w-7 h-7 rounded-lg bg-background border border-border flex items-center justify-center text-text hover:text-foreground transition-all flex-shrink-0">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M12 6v6m0 0v6m0-6h6m-6 0H6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </button>
                        </div>
                        <div className="flex gap-1 mt-1.5 w-full">
                          {['00:30', '01:00', '03:00', '05:00'].map((t) => {
                            const [m, s] = t.split(':').map(Number);
                            return (
                              <button key={t} onClick={() => handleTimeSet(m, s)} className={`flex-1 py-0.5 text-[8px] font-semibold rounded transition-all border ${timeMinutes === m && timeSeconds === s ? 'text-white bg-blue/15 border-blue/40' : 'text-text-dark bg-background border-transparent hover:text-foreground'}`}>{t}</button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] text-text-dark font-semibold uppercase tracking-wider block mb-1">Investment</span>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setInvestment(Math.max(1, investment - 1))} className="w-7 h-7 rounded-lg bg-background border border-border flex items-center justify-center text-text hover:text-foreground transition-all">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M20 12H4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </button>
                          <div className="flex-1 flex items-center gap-1">
                            <span className="text-white font-bold text-sm">$</span>
                            <input
                              type="number"
                              value={investment}
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10);
                                if (!isNaN(v)) setInvestment(Math.max(1, Math.min(1000, v)));
                                else if (e.target.value === '') setInvestment(1);
                              }}
                              min={1}
                              max={1000}
                              className="flex-1 bg-background border border-border rounded-lg px-2 py-1 text-foreground font-bold text-sm text-center focus:outline-none focus:border-blue [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                          <button onClick={() => setInvestment(Math.min(1000, investment + 1))} className="w-7 h-7 rounded-lg bg-background border border-border flex items-center justify-center text-text hover:text-foreground transition-all">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M12 6v6m0 0v6m0-6h6m-6 0H6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </button>
                        </div>
                        <div className="flex gap-1 mt-1.5">
                          {[1, 5, 10, 25].map((amt) => (
                            <button key={amt} onClick={() => setInvestment(amt)} className={`flex-1 py-0.5 text-[8px] font-semibold rounded transition-all border ${investment === amt ? 'text-white bg-blue/15 border-blue/40' : 'text-text-dark bg-background border-transparent hover:text-foreground'}`}>${amt}</button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-text-dark font-semibold uppercase tracking-wider">Payout</span>
                        <span className="text-green font-bold text-sm">+{payoutAmount}$</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleTrade('up')} className="flex-1 bg-green hover:bg-green-hover text-white font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M5 10l7-7m0 0l7 7m-7-7v18" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          Up
                        </button>
                        <button onClick={() => handleTrade('down')} className="flex-1 bg-red hover:bg-red-hover text-white font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M19 14l-7 7m0 0l-7-7m7 7V3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          Down
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        </div>
        {!isFullscreen && activePair && (
          <TradingPanel
            symbol={activePair}
            investment={investment}
            setInvestment={setInvestment}
            timeStr={timeStr}
            timeMinutes={timeMinutes}
            timeSeconds={timeSeconds}
            onTimeChange={handleTimeChange}
            onTimeSet={handleTimeSet}
            onTrade={handleTrade}
            onDirectionHover={setHoverDir}
            payoutAmount={payoutAmount}
            trades={trades}
          />
        )}
      </div>
    </div>
  );
}
