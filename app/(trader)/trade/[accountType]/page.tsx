'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { SYMBOLS, generateOtcCandles, Trade } from '../../../lib/types';
import { Chart } from '../../../components/Chart';
import { TradingPanel } from '../../../components/TradingPanel';

const OTC_SYMBOLS = SYMBOLS.filter(s => s.category === 'otc');

const drawingGroups = [
  { name: 'Line', icon: 'line', items: ['Trend Line', 'Horizontal Line', 'Vertical Line', 'Ray Line', 'Extended Line'] },
  { name: 'Circle', icon: 'circle', items: ['Circle', 'Ellipse'] },
  { name: 'Fibonacci', icon: 'fib', items: ['Fibonacci Retracement', 'Fibonacci Extension', 'Fibonacci Circle', 'Fibonacci Spiral'] },
  { name: 'Pattern', icon: 'pattern', items: ['Head and Shoulders', 'Triangle', 'Rectangle', 'Parallel Channel', 'Andrews Pitchfork'] },
];

function TopBar({ symbols, activeSymbol, onSelect }: { symbols: typeof OTC_SYMBOLS; activeSymbol: typeof OTC_SYMBOLS[0]; onSelect: (s: typeof OTC_SYMBOLS[0]) => void }) {
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const tz = new Date();
  const utcTime = `${String(tz.getUTCHours()).padStart(2, '0')}:${String(tz.getUTCMinutes()).padStart(2, '0')}:${String(tz.getUTCSeconds()).padStart(2, '0')}`;

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
            {symbols.filter(s => s.name.toLowerCase().includes(search.toLowerCase())).map(sym => {
              const isActive = sym.id === activeSymbol.id;
              return (
                <button key={sym.id} onClick={() => { onSelect(sym); setAddOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all mb-0.5 ${isActive ? 'bg-blue/10 border border-blue/30' : 'hover:bg-surface-hover border border-transparent'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-blue/20' : 'bg-background'}`}>
                    <span className="text-xs font-bold text-white">{sym.name.replace('/', '').slice(0, 3)}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-sm font-bold text-white">{sym.name}</span>
                  </div>
                  <span className="text-sm font-bold text-green">{sym.payout}%</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {symbols.slice(0, 7).map((sym) => {
        const isActive = sym.id === activeSymbol.id;
        return (
          <button key={sym.id} onClick={() => onSelect(sym)}
            className={`h-11 w-40 min-w-0 flex-shrink rounded-xl flex items-center pl-4 pr-7 gap-2.5 cursor-pointer transition-all shadow-lg relative ${isActive ? 'bg-background/90 border border-blue/50 shadow-blue/10' : 'bg-surface/90 border border-border/50 hover:bg-surface-hover/90 backdrop-blur-sm'}`}>
            <span onClick={(e) => e.stopPropagation()}
              className="absolute top-0 right-0 w-5 h-5 bg-red rounded-bl-xl flex items-center justify-center hover:bg-red-hover transition-colors">
              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
              </svg>
            </span>
            {isActive && <div className="w-0.5 h-6 bg-blue rounded-full" />}
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white leading-tight">{sym.name}</span>
              <span className="text-[10px] font-bold text-orange">{sym.payout}%</span>
            </div>
          </button>
        );
      })}
      <div className="flex-1" />
      <div className="flex items-center gap-1.5 text-[11px] font-mono flex-shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <span className="text-text">{utcTime} UTC</span>
      </div>
    </div>
  );
}

function SideToolbar({ onIndToggle }: { onIndToggle: () => void }) {
  const [activeDrawGroup, setActiveDrawGroup] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'candle' | 'line' | 'area'>('candle');
  const [ctOpen, setCtOpen] = useState(false);
  const [timeframe, setTimeframe] = useState('1m');
  const [tfOpen, setTfOpen] = useState(false);

  const drawGroups = [
    { name: 'Line', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 20L20 4" strokeLinecap="round" /><circle cx="4" cy="20" r="1.5" fill="currentColor" /><circle cx="20" cy="4" r="1.5" fill="currentColor" /></svg> },
    { name: 'Circle', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></svg> },
    { name: 'Fibonacci', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 20h16M4 14.5h16M4 10h16M4 5.5h16" strokeDasharray="2 2" /><path d="M4 20L20 4" strokeLinecap="round" strokeWidth="2" /></svg> },
    { name: 'Pattern', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 18L8 8l4 6 4-10 5 14" strokeLinecap="round" strokeLinejoin="round" /></svg> },
  ];

  return (
    <div className="w-11 bg-[#1a1e28] border-r border-[#242a38] flex-shrink-0 flex flex-col items-center py-2 gap-1 z-40 relative">
      {/* Drawing tool groups — each with own icon */}
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
                <button key={item} onClick={() => setActiveDrawGroup(null)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[11px] font-medium text-[#93a0b5] hover:text-white hover:bg-[#2a3142] rounded-lg transition-colors text-left">
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="w-6 h-px bg-[#31394c] my-1" />

      {/* Chart type */}
      <div className="relative">
        <button title="Chart Type" onClick={() => setCtOpen(!ctOpen)}
          className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${ctOpen ? 'bg-[#2a3142] text-white' : 'text-[#93a0b5] hover:bg-[#2a3142] hover:text-white'}`}>
          {chartType === 'candle' ? (
            <svg width="22" height="22" viewBox="0 0 16 16" fill="currentColor">
              <rect x="2" y="3" width="3" height="10" rx="0.5" />
              <rect x="3.25" y="1" width="0.5" height="3" />
              <rect x="3.25" y="12" width="0.5" height="3" />
              <rect x="8" y="5" width="3" height="6" rx="0.5" fill="#ff4954" />
              <rect x="9.25" y="2" width="0.5" height="4" fill="#ff4954" />
              <rect x="9.25" y="10" width="0.5" height="4" fill="#ff4954" />
            </svg>
          ) : chartType === 'line' ? (
            <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path d="M3 17l4-4 4 4 4-8 4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path d="M3 17l4-4 4 4 4-8 4 4v6H3z" fill="currentColor" fillOpacity="0.2" />
              <path d="M3 17l4-4 4 4 4-8 4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
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

      {/* Timeframe */}
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
        <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path d="M7 12l3-3 3 3 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="w-6 h-px bg-[#31394c] my-1" />

      <button title="Fullscreen" onClick={() => {
        const el = document.querySelector('[data-chart-area]') as HTMLElement;
        if (el) { document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen(); }
      }}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-[#93a0b5] hover:bg-[#2a3142] hover:text-white transition-all">
        <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

function IndSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="w-60 bg-surface border-r border-border flex-shrink-0 flex flex-col overflow-hidden">
      <div className="px-3.5 pt-3.5 pb-2.5 border-b border-border flex items-center justify-between">
        <span className="text-xs font-bold text-white">Indicators</span>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center text-text hover:text-white rounded-md hover:bg-surface-hover transition-colors">
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {[
          { cat: 'Trend', items: ['Moving Average', 'Exponential MA', 'Parabolic SAR', 'Ichimoku Cloud', 'ADX'] },
          { cat: 'Oscillators', items: ['RSI', 'MACD', 'Stochastic', 'CCI', 'Williams %R', 'Momentum'] },
          { cat: 'Volatility', items: ['Bollinger Bands', 'ATR', 'Keltner Channel'] },
          { cat: 'Volume', items: ['Volume', 'OBV', 'VWAP'] },
        ].map((group) => (
          <div key={group.cat} className="mb-2">
            <div className="px-2.5 py-1.5 text-[10px] font-bold text-text-dark uppercase tracking-wider">{group.cat}</div>
            {group.items.map((tool) => (
              <button key={tool} onClick={onClose}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[11px] font-medium text-text hover:text-white hover:bg-surface-hover rounded-lg transition-colors text-left">
                {tool}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TradingPage() {
  const params = useParams();
  const accountType = (params.accountType as string) || 'demo';
  const [indOpen, setIndOpen] = useState(false);
  const [activeSymbol, setActiveSymbol] = useState(OTC_SYMBOLS[0]);
  const [investment, setInvestment] = useState(1);
  const [timeMinutes, setTimeMinutes] = useState(1);
  const [timeSeconds, setTimeSeconds] = useState(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [candles, setCandles] = useState<{ time: number; open: number; high: number; low: number; close: number }[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const basePrice = activeSymbol.name.includes('Gold') ? 1950 : activeSymbol.name.includes('BTC') ? 43000 : 1.0;
    setCandles(generateOtcCandles(200, Date.now(), basePrice));
  }, [activeSymbol]);

  const currentPrice = 1.35947;
  const payoutAmount = (investment * (1 + activeSymbol.payout / 100)).toFixed(2);
  const timeStr = `${String(timeMinutes).padStart(2, '0')}:${String(timeSeconds).padStart(2, '0')}:00`;

  const handleTrade = useCallback((type: 'up' | 'down') => {
    const won = Math.random() > 0.5;
    const profit = won ? parseFloat(payoutAmount) - investment : -investment;
    const newTrade: Trade = {
      id: Date.now().toString(),
      symbol: activeSymbol.name,
      type,
      amount: investment,
      payout: activeSymbol.payout,
      profit,
      time: timeStr,
      timestamp: Date.now(),
      status: won ? 'won' : 'lost',
      openPrice: currentPrice,
      closePrice: won
        ? type === 'up' ? currentPrice * 1.002 : currentPrice * 0.998
        : type === 'up' ? currentPrice * 0.998 : currentPrice * 1.002,
      payoutPercent: activeSymbol.payout,
    };
    setTrades(prev => [newTrade, ...prev]);
  }, [activeSymbol, investment, payoutAmount, timeStr, currentPrice]);

  const handleTimeChange = (delta: number) => {
    setTimeSeconds(prev => {
      const next = prev + delta;
      if (next >= 60) { setTimeMinutes(m => m + 1); return 0; }
      if (next < 0) { setTimeMinutes(m => Math.max(1, m - 1)); return 59; }
      return next;
    });
  };

  if (!mounted) return <div className="h-full w-full bg-background" />;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <TopBar symbols={OTC_SYMBOLS} activeSymbol={activeSymbol} onSelect={setActiveSymbol} />
      <div className="flex-1 flex min-w-0 overflow-hidden">
        <SideToolbar onIndToggle={() => setIndOpen(!indOpen)} />
        <IndSidebar open={indOpen} onClose={() => setIndOpen(false)} />
        <div className="flex-1 relative overflow-hidden h-full" data-chart-area>
          <Chart candles={candles} currentPrice={currentPrice} />
        </div>
        <TradingPanel
          symbol={activeSymbol}
          investment={investment}
          setInvestment={setInvestment}
          timeStr={timeStr}
          onTimeChange={handleTimeChange}
          onTrade={handleTrade}
          payoutAmount={payoutAmount}
          trades={trades}
        />
      </div>
    </div>
  );
}
