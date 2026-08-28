'use client';

import { useState, useCallback, useEffect } from 'react';
import { SYMBOLS, generateCandles, Trade } from './lib/types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { AssetTabs } from './components/AssetTabs';
import { Chart } from './components/Chart';
import { TradingPanel } from './components/TradingPanel';

export default function TradingPage() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [drawOpen, setDrawOpen] = useState(false);
  const [drawClosing, setDrawClosing] = useState(false);
  const [indOpen, setIndOpen] = useState(false);
  const [indClosing, setIndClosing] = useState(false);
  const [activeSymbol, setActiveSymbol] = useState(SYMBOLS[0]);
  const [investment, setInvestment] = useState(1);
  const [timeMinutes, setTimeMinutes] = useState(1);
  const [timeSeconds, setTimeSeconds] = useState(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [balance] = useState(1000.00);
  const [activeTab, setActiveTab] = useState<'trades' | 'pending'>('trades');
  const [candles, setCandles] = useState<{ open: number; high: number; low: number; close: number }[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCandles(generateCandles(60, Date.now()));
  }, []);

  const currentPrice = 1.35947;
  const payoutAmount = (investment * (1 + activeSymbol.payout / 100)).toFixed(2);
  const timeStr = `${String(timeMinutes).padStart(2, '0')}:${String(timeSeconds).padStart(2, '0')}:00`;

  const handleTrade = useCallback((type: 'up' | 'down') => {
    const won = Math.random() > 0.5;
    const profit = won ? parseFloat(payoutAmount) - investment : -investment;
    const openPrice = currentPrice;
    const closePrice = won
      ? type === 'up' ? currentPrice * 1.002 : currentPrice * 0.998
      : type === 'up' ? currentPrice * 0.998 : currentPrice * 1.002;
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
      openPrice,
      closePrice,
      payoutPercent: activeSymbol.payout,
    };
    setTrades(prev => [newTrade, ...prev]);
  }, [activeSymbol, investment, payoutAmount, timeStr, currentPrice]);

  const handleDrawToggle = () => {
    setIndOpen(false);
    setIndClosing(false);
    if (drawOpen) {
      setDrawClosing(true);
      setTimeout(() => { setDrawOpen(false); setDrawClosing(false); }, 350);
    } else {
      setDrawOpen(true);
      setDrawClosing(false);
    }
  };

  const handleIndToggle = () => {
    setDrawOpen(false);
    setDrawClosing(false);
    if (indOpen) {
      setIndClosing(true);
      setTimeout(() => { setIndOpen(false); setIndClosing(false); }, 350);
    } else {
      setIndOpen(true);
      setIndClosing(false);
    }
  };

  const handleTimeChange = (delta: number) => {
    setTimeSeconds(prev => {
      const next = prev + delta;
      if (next >= 60) { setTimeMinutes(m => m + 1); return 0; }
      if (next < 0) { setTimeMinutes(m => Math.max(1, m - 1)); return 59; }
      return next;
    });
  };

  if (!mounted) {
    return <div className="h-screen w-screen bg-background" />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-background text-text text-sm">
      {/* Full-height left sidebar */}
      <Sidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded(!sidebarExpanded)} />

      {/* Right area: header + content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top nav - only spans right of sidebar */}
        <Header balance={balance} accountType="demo" />

        {/* Main content: chart + trading panel */}
        <div className="flex flex-1 min-h-0">
          {/* Drawing tools sidebar */}
          {drawOpen && (
            <div className="w-52 bg-surface border-r border-border flex-shrink-0 flex flex-col overflow-hidden" style={{ animation: drawClosing ? 'slideOutLeft 0.35s ease-in forwards' : 'slideInLeft 0.35s ease-out' }}>
              <div className="px-3.5 pt-3.5 pb-2.5 border-b border-border flex items-center justify-between">
                <span className="text-xs font-bold text-white">Drawing Tools</span>
                <button onClick={() => setDrawOpen(false)} className="w-6 h-6 flex items-center justify-center text-text hover:text-white rounded-md hover:bg-surface-hover transition-colors">
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {[
                  { cat: 'Lines', items: ['Cross Line', 'Horizontal Line', 'Vertical Line', 'Ray', 'Trend Line', 'Extended Line'] },
                  { cat: 'Fibonacci', items: ['Fibonacci Retracement', 'Fibonacci Extension', 'Fibonacci Circle'] },
                  { cat: 'Shapes', items: ['Rectangle', 'Circle', 'Triangle'] },
                  { cat: 'Channels', items: ['Parallel Channel', 'Andrews Pitchfork'] },
                  { cat: 'Annotations', items: ['Text', 'Callout', 'Price Label'] },
                ].map((group) => (
                  <div key={group.cat} className="mb-2">
                    <div className="px-2.5 py-1.5 text-[10px] font-bold text-text-dark uppercase tracking-wider">{group.cat}</div>
                    {group.items.map((tool) => (
                      <button key={tool} onClick={() => setDrawOpen(false)}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[11px] font-medium text-text hover:text-white hover:bg-surface-hover rounded-lg transition-colors text-left">
                        {tool}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Indicators sidebar */}
          {indOpen && (
            <div className="w-60 bg-surface border-r border-border flex-shrink-0 flex flex-col overflow-hidden" style={{ animation: indClosing ? 'slideOutLeft 0.35s ease-in forwards' : 'slideInLeft 0.35s ease-out' }}>
              <div className="px-3.5 pt-3.5 pb-2.5 border-b border-border flex items-center justify-between">
                <span className="text-xs font-bold text-white">Indicators</span>
                <button onClick={handleIndToggle} className="w-6 h-6 flex items-center justify-center text-text hover:text-white rounded-md hover:bg-surface-hover transition-colors">
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
                      <button key={tool} onClick={handleIndToggle}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[11px] font-medium text-text hover:text-white hover:bg-surface-hover rounded-lg transition-colors text-left">
                        {tool}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chart area */}
          <main className="flex-1 flex flex-col min-w-0 relative">
            <div className="flex-1 relative">
              <AssetTabs symbols={SYMBOLS} activeSymbol={activeSymbol} onSelect={setActiveSymbol} />
              <Chart candles={candles} currentPrice={currentPrice} onDrawToggle={handleDrawToggle} drawOpen={drawOpen} onIndToggle={handleIndToggle} indOpen={indOpen} investment={investment} setInvestment={setInvestment} payoutAmount={payoutAmount} onTrade={handleTrade} symbolName={activeSymbol.name} payoutPercent={activeSymbol.payout} timeStr={timeStr} onTimeChange={handleTimeChange} />
            </div>
          </main>

          {/* Right trading panel */}
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
    </div>
  );
}