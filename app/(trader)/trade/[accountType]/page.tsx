'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { ChartHandle } from '../../../components/Chart';
const Chart = dynamic(() => import('../../../components/Chart').then(m => m.Chart), { ssr: false });
import { TradingPanel } from '../../../components/TradingPanel';
import { usePairWS, type CandleData } from '@/lib/use-ws';
import {
  TrendingUp, BarChart3, Square, ArrowUpRight,
  Minus, MoveHorizontal, ChevronRight,
  GitBranch, Pencil, Activity, Trash2, Maximize2, CandlestickChart,
  PenLine, ArrowRight,
} from 'lucide-react';

interface PairDef {
  id: string;
  name: string;
  category: string;
  payoutPercent: number;
  basePrice: number;
  minTrade: number;
  maxTrade: number;
}

interface Trade {
  id: string;
  symbol: string;
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

const drawingGroups = [
  { name: 'Line', icon: 'line', items: ['Trend Line', 'Horizontal Line', 'Horizontal Ray', 'Horizontal Segment', 'Ray Line', 'Extended Line'] },
  { name: 'Fib', icon: 'fib', items: ['Fibonacci Retracement'] },
  { name: 'Shapes', icon: 'shapes', items: ['Rectangle', 'Brush'] },
  { name: 'Signals', icon: 'signals', items: ['Arrow Marker'] },
];

const toolOverlayMap: Record<string, string> = {
  'Trend Line': 'segment',
  'Horizontal Line': 'horizontalStraightLine',
  'Horizontal Ray': 'horizontalRayLine',
  'Horizontal Segment': 'horizontalSegment',
  'Ray Line': 'rayLine',
  'Extended Line': 'straightLine',
  'Fibonacci Retracement': 'fibonacciLine',
  'Rectangle': 'rect',
  'Brush': 'brush',
  'Arrow Marker': 'arrowMarker',
};

function TopBar({ pairs, activePair, onSelect }: { pairs: PairDef[]; activePair: PairDef; onSelect: (p: PairDef) => void }) {
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');

  return (
    <div className="h-14 flex items-center gap-2 px-3 bg-surface border-b border-border flex-shrink-0 relative z-50">
      <div className="relative">
        <button onClick={() => { setAddOpen(!addOpen); setSearch(''); }}
          className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 ${addOpen ? 'bg-white text-background rotate-45' : 'bg-blue text-white hover:bg-blue/80'}`}>
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
                className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-text-dark focus:outline-none focus:border-blue/50 transition-colors" />
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto px-2 pb-2">
            {pairs.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(pair => {
              const isActive = pair.id === activePair.id;
              return (
                <button key={pair.id} onClick={() => { onSelect(pair); setAddOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all mb-0.5 ${isActive ? 'bg-blue/10 border border-blue/30' : 'hover:bg-surface-hover border border-transparent'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-blue/20' : 'bg-background'}`}>
                    <span className="text-xs font-bold text-white">{pair.name.replace('/', '').slice(0, 3)}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-sm font-bold text-white">{pair.name}</span>
                  </div>
                  <span className="text-sm font-bold text-green">{pair.payoutPercent}%</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {pairs.slice(0, 7).map((pair) => {
        const isActive = pair.id === activePair.id;
        return (
          <button key={pair.id} onClick={() => onSelect(pair)}
            className={`h-11 w-40 min-w-0 flex-shrink rounded-xl flex items-center pl-4 pr-7 gap-2.5 cursor-pointer transition-all shadow-lg relative ${isActive ? 'bg-background/90 border border-blue/50 shadow-blue/10' : 'bg-surface/90 border border-border/50 hover:bg-surface-hover/90 backdrop-blur-sm'}`}>
            <span onClick={(e) => e.stopPropagation()}
              className="absolute top-0 right-0 w-5 h-5 bg-red rounded-bl-xl flex items-center justify-center hover:bg-red-hover transition-colors">
              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
              </svg>
            </span>
            {isActive && <div className="w-0.5 h-6 bg-blue rounded-full" />}
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white leading-tight">{pair.name}</span>
              <span className="text-[10px] font-bold text-orange">{pair.payoutPercent}%</span>
            </div>
          </button>
        );
      })}
      <div className="flex-1" />
    </div>
  );
}

function SideToolbar({ onIndToggle, onDrawTool, onRemoveDrawings }: { onIndToggle: () => void; onDrawTool: (toolName: string) => void; onRemoveDrawings: () => void }) {
  const [activeDrawGroup, setActiveDrawGroup] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'candle' | 'line' | 'area'>('candle');
  const [ctOpen, setCtOpen] = useState(false);
  const [timeframe, setTimeframe] = useState('1m');
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

  const drawGroups = [
    { name: 'Line', icon: <PenLine size={20} /> },
    { name: 'Fib', icon: <BarChart3 size={20} /> },
    { name: 'Shapes', icon: <Square size={20} /> },
    { name: 'Signals', icon: <ArrowUpRight size={20} /> },
  ];

  return (
    <div className="w-11 bg-[#1a1e28] border-r border-[#242a38] flex-shrink-0 flex flex-col items-center py-2 gap-1 z-40 relative">
      {drawGroups.map(g => (
        <div key={g.name} className="relative">
          <button title={g.name} onClick={() => setActiveDrawGroup(activeDrawGroup === g.name ? null : g.name)}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${activeDrawGroup === g.name ? 'bg-[#2a3142] text-white' : 'text-[#93a0b5] hover:bg-[#2a3142] hover:text-white'}`}>
            {g.icon}
          </button>
          {activeDrawGroup === g.name && (
            <div className="absolute left-full top-0 ml-1 w-52 bg-[#242a38] border border-[#31394c] rounded-xl shadow-2xl p-1.5 z-50">
              <div className="px-2.5 py-1.5 text-[9px] font-bold text-[#5c677f] uppercase tracking-wider mb-1">{g.name} Tools</div>
              {drawingGroups.find(dg => dg.name === g.name)?.items.map(item => (
                <button key={item} onClick={() => { setActiveDrawGroup(null); onDrawTool(item); }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[11px] font-medium text-[#93a0b5] hover:text-white hover:bg-[#2a3142] rounded-lg transition-colors text-left">
                  <span className="text-[#5c677f]">{toolIcons[item]}</span>
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="w-6 h-px bg-[#31394c] my-1" />

      <div className="relative">
        <button title="Chart Type" onClick={() => setCtOpen(!ctOpen)}
          className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${ctOpen ? 'bg-[#2a3142] text-white' : 'text-[#93a0b5] hover:bg-[#2a3142] hover:text-white'}`}>
          <CandlestickChart size={20} />
        </button>
        {ctOpen && (
          <div className="absolute left-full top-0 ml-1 w-32 bg-[#242a38] border border-[#31394c] rounded-lg shadow-2xl p-1.5 z-50">
            {(['candle', 'line', 'area'] as const).map(t => (
              <button key={t} onClick={() => { setChartType(t); setCtOpen(false); }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-semibold rounded-md transition-all capitalize ${chartType === t ? 'bg-blue-500 text-white' : 'text-[#93a0b5] hover:bg-[#2a3142] hover:text-white'}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <button title="Timeframe" onClick={() => setTfOpen(!tfOpen)}
          className={`w-9 h-9 flex items-center justify-center rounded-lg text-[10px] font-bold font-mono transition-all ${tfOpen ? 'bg-[#2a3142] text-white' : 'text-[#93a0b5] hover:bg-[#2a3142] hover:text-white'}`}>
          {timeframe}
        </button>
        {tfOpen && (
          <div className="absolute left-full top-0 ml-1 w-40 bg-[#242a38] border border-[#31394c] rounded-lg shadow-2xl p-1.5 z-50">
            <div className="text-[9px] font-bold text-[#5c677f] uppercase tracking-wider mb-1.5 px-1">Timeframe</div>
            <div className="grid grid-cols-3 gap-1">
              {['1m', '5m', '15m', '30m', '1h', '4h', '1d'].map(tf => (
                <button key={tf} onClick={() => { setTimeframe(tf); setTfOpen(false); }}
                  className={`py-1.5 text-[11px] font-semibold rounded-md transition-all ${timeframe === tf ? 'bg-blue-500 text-white' : 'text-[#93a0b5] hover:bg-[#2a3142] hover:text-white'}`}>
                  {tf}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-6 h-px bg-[#31394c] my-1" />

      <button title="Indicators" onClick={onIndToggle}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-[#93a0b5] hover:bg-[#2a3142] hover:text-white transition-all">
        <Activity size={20} />
      </button>

      <div className="w-6 h-px bg-[#31394c] my-1" />

      <button title="Remove Drawings" onClick={onRemoveDrawings}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-[#93a0b5] hover:bg-[#2a3142] hover:text-red transition-all">
        <Trash2 size={20} />
      </button>

      <button title="Fullscreen" onClick={() => {
        const el = document.querySelector('[data-chart-area]') as HTMLElement;
        if (el) { document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen(); }
      }}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-[#93a0b5] hover:bg-[#2a3142] hover:text-white transition-all">
        <Maximize2 size={20} />
      </button>
    </div>
  );
}

function IndDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [search, setSearch] = useState('');
  if (!open) return null;

  const groups = [
    { cat: 'Trend', items: ['Moving Average', 'Exponential MA', 'Parabolic SAR', 'Ichimoku Cloud', 'ADX', 'SuperTrend', 'VWMA'] },
    { cat: 'Oscillators', items: ['RSI', 'MACD', 'Stochastic', 'CCI', 'Williams %R', 'Momentum', 'ROC', 'True Strength'] },
    { cat: 'Volatility', items: ['Bollinger Bands', 'ATR', 'Keltner Channel', 'Donchian Channel', 'Historical Volatility'] },
    { cat: 'Volume', items: ['Volume', 'OBV', 'VWAP', 'MFI', 'CMF', 'Accumulation/Distribution'] },
  ];

  const filtered = groups.map(g => ({
    ...g,
    items: g.items.filter(i => i.toLowerCase().includes(search.toLowerCase())),
  })).filter(g => g.items.length > 0);

  return (
    <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-[420px] max-h-[480px] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Indicators</h3>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-text hover:text-white rounded-lg hover:bg-surface-hover transition-colors">
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
              className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-text-dark/50 focus:outline-none focus:border-blue/50 transition-colors" autoFocus />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {filtered.map(group => (
            <div key={group.cat} className="mb-3">
              <div className="text-[10px] font-bold text-text-dark uppercase tracking-wider mb-1.5">{group.cat}</div>
              <div className="space-y-0.5">
                {group.items.map(tool => (
                  <button key={tool} onClick={onClose}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors group">
                    <div className="w-7 h-7 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
                      <svg className="w-3.5 h-3.5 text-text-dark group-hover:text-blue transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path d="M7 12l3-3 3 3 4-4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className="text-[12px] font-medium text-text group-hover:text-white transition-colors">{tool}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center py-8 text-text-dark text-sm">No indicators found</div>}
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
  const [investment, setInvestment] = useState(1);
  const [timeMinutes, setTimeMinutes] = useState(1);
  const [timeSeconds, setTimeSeconds] = useState(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tradeError, setTradeError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [panelPos, setPanelPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const chartRef = useRef<ChartHandle>(null);
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
          minTrade: Number(p.minTrade),
          maxTrade: Number(p.maxTrade),
        })) as PairDef[];
        setPairs(normalized);
        if (normalized.length > 0) setActivePair(normalized[0]);
      })
      .catch(() => {});
    setMounted(true);
  }, []);

  const handleTick = useCallback(() => {}, []);
  const handleCandleClose = useCallback(() => {}, []);
  const handleSnapshot = useCallback(() => {}, []);

  const { isConnected, currentPrice, candle } = usePairWS({
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
  const payout = activePair?.payoutPercent ?? 80;
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
        };
      });
      setTrades(mapped);
    } catch {}
  }, [accountType]);

  useEffect(() => {
    refreshTrades();
    const timer = setInterval(refreshTrades, 5000);
    return () => clearInterval(timer);
  }, [refreshTrades]);

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
        setTradeError(data.error || 'Trade failed. Please try again.');
        return;
      }

      if (data.trade) {
        await refreshTrades();
      }
    } catch {
      setTradeError('Trade failed. Please try again.');
    }
  }, [activePair, investment, timeMinutes, timeSeconds, accountType, refreshTrades]);

  const handleTimeChange = (delta: number) => {
    setTimeSeconds(prev => {
      const next = prev + delta;
      if (next >= 60) { setTimeMinutes(m => m + 1); return 0; }
      if (next < 0) { setTimeMinutes(m => Math.max(1, m - 1)); return 59; }
      return next;
    });
  };

  if (!mounted || !activePair) return <div className="h-full w-full bg-background" />;

  const isComingSoon = accountType === 'funded' || accountType === 'tournament';

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {tradeError && (
        <div className="mx-3 mt-2 px-4 py-2.5 bg-red/10 border border-red/30 rounded-xl text-red text-xs font-semibold flex items-center justify-between flex-shrink-0">
          <span>{tradeError}</span>
          <button onClick={() => setTradeError('')} className="ml-3 text-red/70 hover:text-red font-bold">✕</button>
        </div>
      )}
      <div className="flex-1 flex min-w-0 overflow-hidden">
        <div className="flex-1 flex min-w-0 overflow-hidden" data-chart-area>
          <IndDialog open={indOpen} onClose={() => setIndOpen(false)} />
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <TopBar pairs={pairs} activePair={activePair} onSelect={setActivePair} />
            <div className="flex-1 flex min-w-0 overflow-hidden">
              <SideToolbar onIndToggle={() => setIndOpen(!indOpen)} onDrawTool={handleDrawTool} onRemoveDrawings={handleRemoveDrawings} />
              <div className="flex-1 relative overflow-hidden">
                <Chart ref={chartRef} pairId={activePair.id} pairName={activePair.name} currentPrice={price} currentCandle={candle} onOverlaySelected={setSelectedOverlay} />

                {isComingSoon && (
                  <div className="absolute inset-0 z-[70] bg-background/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-2xl bg-orange/15 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <h2 className="text-xl font-black text-white mb-2">Coming Soon</h2>
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
                  <div className="absolute z-[60] bg-[#1a1e2a]/95 backdrop-blur-md border border-[#2e3548] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden"
                    style={{ left: `calc(50% + ${editPanelPos.x}px)`, top: `calc(8px + ${editPanelPos.y}px)`, transform: 'translateX(-50%)' }}>
                    <div onMouseDown={onEditDragStart} className="h-7 bg-[#161a24] border-b border-[#2e3548] flex items-center justify-between px-2.5 cursor-move select-none">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3 h-3 text-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-[10px] font-semibold text-white/80">{selectedOverlay.name}</span>
                      </div>
                      <div className="w-6 h-0.5 bg-[#3a4256] rounded-full" />
                    </div>
                    <div className="px-2.5 py-2 flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {['#00c365', '#ff4954', '#007aff', '#ff8c00', '#e4e8f0', '#ffff00', '#a855f7', '#ec4899'].map(c => (
                          <button key={c} onClick={() => handleOverlayStyle('color', c)}
                            className="w-4 h-4 rounded-full border border-white/10 hover:scale-125 transition-all duration-150" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <div className="w-px h-5 bg-[#2e3548]" />
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4].map(w => (
                          <button key={w} onClick={() => handleOverlayStyle('size', w)}
                            className="w-6 h-6 rounded-md bg-[#161a24] border border-[#2e3548] flex items-center justify-center hover:border-white/30 transition-all duration-150">
                            <div className="rounded-full bg-white" style={{ width: w + 1, height: w + 1 }} />
                          </button>
                        ))}
                      </div>
                      <div className="w-px h-5 bg-[#2e3548]" />
                      <div className="flex items-center gap-0.5">
                        {['solid', 'dashed'].map(s => (
                          <button key={s} onClick={() => handleOverlayStyle('style', s)}
                            className="w-6 h-6 rounded-md bg-[#161a24] border border-[#2e3548] flex items-center justify-center hover:border-white/30 transition-all duration-150">
                            <div className={`w-3 h-0 border-t-[1.5px] ${s === 'dashed' ? 'border-dashed' : 'border-solid'} border-white/60`} />
                          </button>
                        ))}
                      </div>
                      <div className="w-px h-5 bg-[#2e3548]" />
                      <div className="flex items-center gap-0.5">
                        <button onClick={handleCopyOverlay} title="Copy"
                          className="w-6 h-6 rounded-md hover:bg-white/5 flex items-center justify-center text-white/30 hover:text-blue transition-all duration-150">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <button onClick={handleDeleteOverlay} title="Delete"
                          className="w-6 h-6 rounded-md hover:bg-red/10 flex items-center justify-center text-white/30 hover:text-red transition-all duration-150">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <button onClick={() => setSelectedOverlay(null)} title="Close"
                          className="w-6 h-6 rounded-md hover:bg-white/5 flex items-center justify-center text-white/30 hover:text-white/60 transition-all duration-150">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {isFullscreen && (
                  <div className="absolute z-50 w-[200px] bg-surface/95 backdrop-blur-sm border border-border rounded-xl shadow-2xl overflow-hidden"
                    style={{ right: 16 + panelPos.x, top: `calc(50% + ${panelPos.y}px)`, transform: 'translateY(-50%)' }}>
                    <div onMouseDown={onDragStart} className="h-7 bg-background border-b border-border flex items-center justify-center cursor-move select-none">
                      <div className="w-8 h-1 bg-border rounded-full" />
                    </div>
                    <div className="p-2.5 flex flex-col gap-2">
                      <div>
                        <span className="text-[9px] text-text-dark font-semibold uppercase tracking-wider block mb-1">Expiration</span>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleTimeChange(-10)} className="w-7 h-7 rounded-lg bg-background border border-border flex items-center justify-center text-text hover:text-white transition-all">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M20 12H4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </button>
                          <div className="flex-1 text-center">
                            <span className="text-white font-bold text-base tracking-wider block leading-none">{timeStr.slice(0, 5)}</span>
                          </div>
                          <button onClick={() => handleTimeChange(10)} className="w-7 h-7 rounded-lg bg-background border border-border flex items-center justify-center text-text hover:text-white transition-all">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M12 6v6m0 0v6m0-6h6m-6 0H6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </button>
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] text-text-dark font-semibold uppercase tracking-wider block mb-1">Investment</span>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setInvestment(Math.max(1, investment - 1))} className="w-7 h-7 rounded-lg bg-background border border-border flex items-center justify-center text-text hover:text-white transition-all">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M20 12H4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </button>
                          <div className="flex-1 text-center">
                            <span className="text-white font-bold text-base block leading-none">${investment}</span>
                          </div>
                          <button onClick={() => setInvestment(Math.min(100, investment + 1))} className="w-7 h-7 rounded-lg bg-background border border-border flex items-center justify-center text-text hover:text-white transition-all">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M12 6v6m0 0v6m0-6h6m-6 0H6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </button>
                        </div>
                        <div className="flex gap-1 mt-1.5">
                          {[1, 5, 10, 25].map((amt) => (
                            <button key={amt} onClick={() => setInvestment(amt)} className={`flex-1 py-0.5 text-[8px] font-semibold rounded transition-all border ${investment === amt ? 'text-white bg-blue/15 border-blue/40' : 'text-text-dark bg-background border-transparent hover:text-white'}`}>${amt}</button>
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
          </div>
        </div>
        {!isFullscreen && activePair && (
          <TradingPanel
            symbol={activePair}
            investment={investment}
            setInvestment={setInvestment}
            timeStr={timeStr}
            onTimeChange={handleTimeChange}
            onTrade={handleTrade}
            payoutAmount={payoutAmount}
            trades={trades}
          />
        )}
      </div>
    </div>
  );
}
