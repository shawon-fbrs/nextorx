import { useState } from 'react';

interface SymbolLike {
  name: string;
  payoutPercent?: number;
  payout?: number;
}

interface TradeLike {
  id: string | number;
  symbol: string;
  type: string;
  amount: number;
  payout: number;
  profit: number;
  time: string;
  timestamp: number;
  status: string;
  openPrice?: number;
  closePrice?: number;
  payoutPercent?: number;
}

interface TradingPanelProps {
  symbol: SymbolLike;
  investment: number;
  setInvestment: (v: number) => void;
  timeStr: string;
  onTimeChange: (delta: number) => void;
  onTrade: (type: 'up' | 'down') => void;
  payoutAmount: string;
  trades: TradeLike[];
}

export function TradingPanel({
  symbol,
  investment,
  setInvestment,
  timeStr,
  onTimeChange,
  onTrade,
  payoutAmount,
  trades,
}: TradingPanelProps) {
  const [expandedTrade, setExpandedTrade] = useState<number | null>(null);

  return (
    <aside className="w-[260px] bg-surface border-l border-border flex flex-col z-30 flex-shrink-0">
      {/* Symbol header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-5 bg-background flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center">
            <span className="text-xs font-bold text-white">{symbol.name.slice(0, 2)}</span>
          </div>
          <div>
            <span className="font-bold text-white text-sm block leading-tight">{symbol.name}</span>
            <span className="text-[10px] text-textDark">Real Market</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-green font-bold text-sm block leading-tight">{symbol.payoutPercent ?? symbol.payout}%</span>
          <span className="text-[10px] text-textDark">payout</span>
        </div>
      </div>

      <div className="px-3 py-3 flex-1 flex flex-col gap-2.5 overflow-hidden">
        {/* Time Section */}
        <div className="bg-background rounded-xl border border-border px-3 py-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-textDark font-semibold uppercase tracking-wider">Expiration Time</span>
            <span className="text-[9px] text-blue font-semibold cursor-pointer hover:text-blue-hover transition-colors">Quick Select</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onTimeChange(-10)}
              className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center text-text hover:text-white hover:bg-surface-hover hover:border-text-dark/30 transition-all active:scale-95">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path d="M20 12H4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="flex-1 text-center">
              <span className="text-white font-bold text-xl tracking-wider block leading-none">{timeStr.slice(0, 5)}</span>
              <span className="text-[9px] text-textDark">min : sec</span>
            </div>
            <button onClick={() => onTimeChange(10)}
              className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center text-text hover:text-white hover:bg-surface-hover hover:border-text-dark/30 transition-all active:scale-95">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="flex gap-1.5 mt-2">
            {['00:30', '01:00', '03:00', '05:00'].map((t) => (
              <button key={t} className="flex-1 py-1 text-[9px] font-semibold text-textDark bg-surface rounded-md hover:text-white hover:bg-surface-hover transition-colors border border-transparent hover:border-border">
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Investment Section */}
        <div className="bg-background rounded-xl border border-border px-3 py-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-textDark font-semibold uppercase tracking-wider">Investment</span>
            <span className="text-[9px] text-textDark">Min $1</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setInvestment(Math.max(1, investment - 1))}
              className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center text-text hover:text-white hover:bg-surface-hover hover:border-text-dark/30 transition-all active:scale-95">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path d="M20 12H4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="flex-1 text-center">
              <span className="text-white font-bold text-xl block leading-none">${investment}</span>
              <span className="text-[9px] text-textDark">amount</span>
            </div>
            <button onClick={() => setInvestment(Math.min(100, investment + 1))}
              className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center text-text hover:text-white hover:bg-surface-hover hover:border-text-dark/30 transition-all active:scale-95">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="flex gap-1.5 mt-2">
            {[1, 5, 10, 25, 50].map((amt) => (
              <button key={amt} onClick={() => setInvestment(amt)}
                className={`flex-1 py-1 text-[9px] font-semibold rounded-md transition-all border ${
                  investment === amt
                    ? 'text-white bg-blue/15 border-blue/40'
                    : 'text-textDark bg-surface border-transparent hover:text-white hover:bg-surface-hover hover:border-border'
                }`}>
                ${amt}
              </button>
            ))}
          </div>
        </div>

        {/* Payout */}
        <div className="bg-background rounded-xl border border-border px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-textDark font-semibold uppercase tracking-wider block mb-0.5">Potential Payout</span>
              <span className="text-green font-bold text-lg">+{payoutAmount}$</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* Up/Down buttons */}
        <div className="flex flex-col gap-2 mt-auto">
          <button
            onClick={() => onTrade('up')}
            className="bg-green hover:bg-green-hover text-white font-bold text-base py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-[0_4px_14px_0_rgba(0,195,101,0.25)] active:scale-[0.98]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path d="M5 10l7-7m0 0l7 7m-7-7v18" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Up</span>
            <span className="text-green-200 text-sm font-semibold ml-1">${(parseFloat(payoutAmount)).toFixed(2)}</span>
          </button>
          <button
            onClick={() => onTrade('down')}
            className="bg-red hover:bg-red-hover text-white font-bold text-base py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-[0_4px_14px_0_rgba(255,73,84,0.25)] active:scale-[0.98]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Down</span>
            <span className="text-red-200 text-sm font-semibold ml-1">${(parseFloat(payoutAmount)).toFixed(2)}</span>
          </button>
        </div>

        {/* Recent Trades */}
        <div className="bg-background rounded-xl border border-border overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="px-4 py-3 flex items-center justify-between border-b border-border flex-shrink-0">
            <span className="text-[11px] text-textDark font-semibold uppercase tracking-wider">Recent Trades</span>
            <span className="text-[10px] text-textDark">{trades.length} total</span>
          </div>
          {trades.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-textDark">
              <svg className="w-8 h-8 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[11px]">No trades yet</span>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
              {trades.map((t, i) => {
                const isExpanded = expandedTrade === i;
                return (
                  <div key={i} className={`border-b border-border/50 last:border-b-0 ${isExpanded ? 'bg-surface/50' : ''}`}>
                    <button
                      onClick={() => setExpandedTrade(isExpanded ? null : i)}
                      className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-surface-hover/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${t.type === 'up' ? 'bg-green/10' : 'bg-red/10'}`}>
                          <svg className={`w-3.5 h-3.5 ${t.type === 'up' ? 'text-green' : 'text-red'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            {t.type === 'up' ? (
                              <path d="M5 10l7-7m0 0l7 7m-7-7v18" strokeLinecap="round" strokeLinejoin="round" />
                            ) : (
                              <path d="M19 14l-7 7m0 0l-7-7m7 7V3" strokeLinecap="round" strokeLinejoin="round" />
                            )}
                          </svg>
                        </div>
                        <div>
                          <span className="text-white text-[11px] font-semibold block leading-tight">{t.symbol}</span>
                          <span className="text-[9px] text-textDark">{t.time}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className={`text-[11px] font-bold block leading-tight ${t.profit > 0 ? 'text-green' : 'text-red'}`}>
                            {t.profit > 0 ? '+' : ''}{t.profit.toFixed(2)}$
                          </span>
                          <span className="text-[9px] text-textDark">${t.amount}</span>
                        </div>
                        <svg className={`w-3.5 h-3.5 text-textDark transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </button>
                    {/* Accordion detail */}
                    <div className={`overflow-hidden transition-all duration-200 ease-in-out ${isExpanded ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="mx-3 mb-3 bg-background rounded-xl border border-border p-3.5">
                        <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-border/60">
                          <div className={`w-2 h-2 rounded-full ${t.status === 'won' ? 'bg-green' : 'bg-red'}`}></div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${t.status === 'won' ? 'text-green' : 'text-red'}`}>
                            {t.status === 'won' ? 'Win' : 'Loss'}
                          </span>
                          <span className="text-[9px] text-textDark ml-auto">{t.time}</span>
                        </div>
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-textDark flex items-center gap-1.5">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                              Open Price
                            </span>
                            <span className="text-[11px] text-white font-mono font-semibold">{t.openPrice?.toFixed(5) ?? '—'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-textDark flex items-center gap-1.5">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                              Close Price
                            </span>
                            <span className="text-[11px] text-white font-mono font-semibold">{t.closePrice?.toFixed(5) ?? '—'}</span>
                          </div>
                          <div className="h-px bg-border/40"></div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-textDark">Investment</span>
                            <span className="text-[11px] text-white font-semibold">${t.amount}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-textDark">Payout</span>
                            <span className="text-[11px] text-green font-semibold">{t.payoutPercent ?? symbol.payoutPercent ?? symbol.payout}%</span>
                          </div>
                          <div className="h-px bg-border/40"></div>
                          <div className="flex items-center justify-between pt-0.5">
                            <span className="text-[10px] text-textDark font-semibold">Profit</span>
                            <span className={`text-sm font-bold ${t.profit > 0 ? 'text-green' : 'text-red'}`}>
                              {t.profit > 0 ? '+' : ''}{t.profit.toFixed(2)}$
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* View All button */}
          <div className="px-4 py-2.5 border-t border-border flex-shrink-0">
            <button className="w-full text-center text-[11px] font-semibold text-blue hover:text-blue-hover transition-colors py-1">
              View All Trade History
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}