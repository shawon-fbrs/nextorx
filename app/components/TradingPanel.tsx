import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';

interface SymbolLike {
  name: string;
  payoutPercent?: number;
  payout?: number;
  spread?: number;
  basePrice?: number;
}

interface TradingPanelProps {
  symbol: SymbolLike;
  investment: number;
  setInvestment: (v: number) => void;
  timeMinutes: number;
  timeSeconds: number;
  onTimeChange: (delta: number) => void;
  onTimeSet: (m: number, s: number) => void;
  onTrade: (type: 'up' | 'down') => void;
  onDirectionHover?: (dir: 'up' | 'down' | null) => void;
  payoutAmount: string;
  trades: TradeLike[];
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
  expiresAt?: number;
}

function formatCountdown(expiresAt: number, now: number): string {
  const ms = Math.max(0, expiresAt - now);
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function QuickSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 bg-surface rounded-t-2xl max-h-[70vh] flex flex-col overflow-hidden">
        <div className="relative px-4 pt-2.5 pb-2 flex items-center justify-center border-b border-border flex-shrink-0">
          <span className="absolute top-1 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-text-dark/40" />
          <span className="text-sm font-bold text-foreground mt-1">{title}</span>
          <button onClick={onClose} className="absolute right-3 top-2 p-1.5 text-text-dark">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-3" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function TradingPanel({
  symbol,
  investment,
  setInvestment,
  timeMinutes,
  timeSeconds,
  onTimeChange,
  onTimeSet,
  onTrade,
  onDirectionHover,
  payoutAmount,
  trades,
}: TradingPanelProps) {
  const [expandedTrade, setExpandedTrade] = useState<string | number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [amountSheet, setAmountSheet] = useState(false);
  const [timeSheet, setTimeSheet] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const quickTimes = ['00:30', '01:00', '03:00', '05:00'];
  const currentQuick = `${String(timeMinutes).padStart(2, '0')}:${String(timeSeconds).padStart(2, '0')}`;

  return (
    <aside className="w-[260px] 2xl:w-[300px] bg-surface border-border flex flex-col z-30 flex-shrink-0 border-l
      max-lg:w-full max-lg:border-l-0 max-lg:border-t max-lg:max-h-[44vh] max-lg:overflow-y-auto">
      <div className="px-3 py-3 max-lg:px-2.5 max-lg:py-2 flex-1 min-h-0 flex flex-col max-lg:grid max-lg:grid-cols-2 gap-2.5 max-lg:gap-1.5 overflow-hidden max-lg:overflow-visible">
        {/* Time Section */}
        <div className="bg-background rounded-xl border border-border px-3 py-2.5 max-lg:px-2.5 max-lg:py-1.5">
          <div className="flex items-center justify-between mb-2 max-lg:mb-1">
            <span className="text-[10px] text-textDark font-semibold uppercase tracking-wider">Expiration Time</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onTimeChange(-10)}
              className="w-9 h-9 max-lg:hidden rounded-lg bg-surface border border-border flex items-center justify-center text-text hover:text-foreground hover:bg-surface-hover hover:border-text-dark/30 transition-all active:scale-95">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path d="M20 12H4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="flex-1 flex items-center gap-1.5 justify-center">
              <input
                type="number"
                value={String(timeMinutes).padStart(2, '0')}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v)) onTimeSet(Math.max(0, Math.min(60, v)), timeSeconds);
                }}
                min={0}
                max={60}
                className="w-12 max-lg:w-10 bg-surface border border-border rounded-lg px-1 py-1 max-lg:py-0.5 text-foreground font-bold text-lg max-lg:text-base text-center focus:outline-none focus:border-blue [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-foreground font-bold">:</span>
              <input
                type="number"
                value={String(timeSeconds).padStart(2, '0')}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v)) onTimeSet(timeMinutes, Math.max(0, Math.min(59, v)));
                  else if (e.target.value === '') onTimeSet(timeMinutes, 0);
                }}
                min={0}
                max={59}
                className="w-12 max-lg:w-10 bg-surface border border-border rounded-lg px-1 py-1 max-lg:py-0.5 text-foreground font-bold text-lg max-lg:text-base text-center focus:outline-none focus:border-blue [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <button onClick={() => setTimeSheet(true)} title="Quick times"
              className="lg:hidden w-9 h-9 rounded-lg bg-blue/15 border border-blue/40 text-blue flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button onClick={() => onTimeChange(10)}
              className="w-9 h-9 max-lg:hidden rounded-lg bg-surface border border-border flex items-center justify-center text-text hover:text-foreground hover:bg-surface-hover hover:border-text-dark/30 transition-all active:scale-95">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="flex gap-1.5 mt-2 max-lg:hidden">
            {quickTimes.map((t) => {
              const [m, s] = t.split(':').map(Number);
              return (
                <button key={t} onClick={() => onTimeSet(m, s)}
                  className={`flex-1 py-1 text-[9px] font-semibold rounded-md transition-all border ${
                    currentQuick === t
                      ? 'text-foreground bg-blue/15 border-blue/40'
                      : 'text-textDark bg-surface border-transparent hover:text-foreground hover:bg-surface-hover hover:border-border'
                  }`}>
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Investment Section */}
        <div className="bg-background rounded-xl border border-border px-3 py-2.5 max-lg:px-2.5 max-lg:py-1.5">
          <div className="flex items-center justify-between mb-2 max-lg:mb-1">
            <span className="text-[10px] text-textDark font-semibold uppercase tracking-wider">Investment</span>
            <span className="text-[9px] text-textDark">Min $1</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setInvestment(Math.max(1, investment - 1))}
              className="w-9 h-9 max-lg:hidden rounded-lg bg-surface border border-border flex items-center justify-center text-text hover:text-foreground hover:bg-surface-hover hover:border-text-dark/30 transition-all active:scale-95">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path d="M20 12H4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="flex-1 flex flex-col items-center">
              <div className="flex items-center gap-1">
                <span className="text-foreground font-bold text-lg">$</span>
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
                  className="w-16 max-lg:w-14 bg-surface border border-border rounded-lg px-2 py-1 max-lg:py-0.5 text-foreground font-bold text-lg max-lg:text-base text-center focus:outline-none focus:border-blue [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <span className="text-[9px] text-textDark mt-0.5">amount</span>
            </div>
            <button onClick={() => setAmountSheet(true)} title="Quick amounts"
              className="lg:hidden w-9 h-9 rounded-lg bg-blue/15 border border-blue/40 text-blue text-sm font-bold flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform">
              $
            </button>
            <button onClick={() => setInvestment(Math.min(1000, investment + 1))}
              className="w-9 h-9 max-lg:hidden rounded-lg bg-surface border border-border flex items-center justify-center text-text hover:text-foreground hover:bg-surface-hover hover:border-text-dark/30 transition-all active:scale-95">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="flex gap-1.5 mt-2 max-lg:hidden">
            {[1, 5, 10, 25, 50].map((amt) => (
              <button key={amt} onClick={() => setInvestment(amt)}
                className={`flex-1 py-1 text-[9px] font-semibold rounded-md transition-all border ${
                  investment === amt
                    ? 'text-foreground bg-blue/15 border-blue/40'
                    : 'text-textDark bg-surface border-transparent hover:text-foreground hover:bg-surface-hover hover:border-border'
                }`}>
                ${amt}
              </button>
            ))}
          </div>
        </div>

        {/* Payout */}
        <div className="bg-background rounded-xl border border-border px-3 py-2.5 max-lg:hidden">
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
          {symbol.spread != null && Number(symbol.spread) > 0 && symbol.basePrice ? (
            <p className="text-[10px] text-textDark mt-1.5">
              Entry includes {(Number(symbol.spread) / 2 / Number(symbol.basePrice) * 100).toFixed(3)}% spread
            </p>
          ) : null}
        </div>

        {/* Up/Down buttons */}
        <div className="flex flex-col max-lg:flex-row gap-2 mt-auto max-lg:mt-0 max-lg:col-span-2">
          <button
            onClick={() => onTrade('up')}
            onMouseEnter={() => onDirectionHover?.('up')}
            onMouseLeave={() => onDirectionHover?.(null)}
            className="bg-green hover:bg-green-hover text-white font-bold text-base max-lg:text-sm py-4 max-lg:py-3 max-lg:flex-1 rounded-xl flex items-center justify-center gap-3 transition-all shadow-[0_4px_14px_0_rgba(0,195,101,0.25)] active:scale-[0.98]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path d="M5 10l7-7m0 0l7 7m-7-7v18" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Up</span>
            <span className="text-green-200 text-sm font-semibold ml-1">${(parseFloat(payoutAmount)).toFixed(2)}</span>
          </button>
          <button
            onClick={() => onTrade('down')}
            onMouseEnter={() => onDirectionHover?.('down')}
            onMouseLeave={() => onDirectionHover?.(null)}
            className="bg-red hover:bg-red-hover text-white font-bold text-base max-lg:text-sm py-4 max-lg:py-3 max-lg:flex-1 rounded-xl flex items-center justify-center gap-3 transition-all shadow-[0_4px_14px_0_rgba(255,73,84,0.25)] active:scale-[0.98]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Down</span>
            <span className="text-red-200 text-sm font-semibold ml-1">${(parseFloat(payoutAmount)).toFixed(2)}</span>
          </button>
        </div>
        {/* All Trades */}
        <div className="bg-background rounded-xl border border-border overflow-hidden flex flex-col flex-1 min-h-0 max-lg:hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-border flex-shrink-0">
            <span className="text-[11px] text-textDark font-semibold uppercase tracking-wider">All Trades</span>
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
              {trades.map((t) => {
                const isActive = t.status === 'active';
                const isExpanded = expandedTrade === String(t.id);
                return (
                  <div key={String(t.id)} className={`border-b border-border/50 last:border-b-0 ${isExpanded ? 'bg-surface/50' : ''}`}>
                    <button
                      onClick={() => setExpandedTrade(isExpanded ? null : String(t.id))}
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
                          <span className="text-foreground text-[11px] font-semibold block leading-tight">{t.symbol}</span>
                          <span className="text-[9px] text-textDark">{isActive ? `${t.amount > 0 ? `$${t.amount}` : ''} · ${t.payoutPercent ?? symbol.payoutPercent ?? symbol.payout}%` : t.time}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isActive ? (
                          <span className="text-[11px] font-mono font-bold text-blue">
                            {t.expiresAt ? formatCountdown(t.expiresAt, now) : '—'}
                          </span>
                        ) : (
                          <div className="text-right">
                            <span className={`text-[11px] font-bold block leading-tight ${t.profit > 0 ? 'text-green' : 'text-red'}`}>
                              {t.profit > 0 ? '+' : ''}{t.profit.toFixed(2)}$
                            </span>
                            <span className="text-[9px] text-textDark">${t.amount}</span>
                          </div>
                        )}
                        <svg className={`w-3.5 h-3.5 text-textDark transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </button>
                    <div className={`overflow-hidden transition-all duration-200 ease-in-out ${isExpanded ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="mx-3 mb-3 bg-background rounded-xl border border-border p-3.5">
                        <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-border/60">
                          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-blue animate-pulse' : t.status === 'won' ? 'bg-green' : 'bg-red'}`}></div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-blue' : t.status === 'won' ? 'text-green' : 'text-red'}`}>
                            {isActive ? 'Active' : t.status === 'won' ? 'Win' : 'Loss'}
                          </span>
                          <span className="text-[9px] text-textDark ml-auto">{t.time}</span>
                        </div>
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-textDark">Open Price</span>
                            <span className="text-[11px] text-foreground font-mono font-semibold">{t.openPrice?.toFixed(5) ?? '—'}</span>
                          </div>
                          {!isActive && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-textDark">Close Price</span>
                              <span className="text-[11px] text-foreground font-mono font-semibold">{t.closePrice?.toFixed(5) ?? '—'}</span>
                            </div>
                          )}
                          {isActive && t.expiresAt && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-textDark">Expires in</span>
                              <span className="text-[11px] text-blue font-mono font-semibold">{formatCountdown(t.expiresAt, now)}</span>
                            </div>
                          )}
                          <div className="h-px bg-border/40"></div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-textDark">Investment</span>
                            <span className="text-[11px] text-foreground font-semibold">${t.amount}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-textDark">Payout</span>
                            <span className="text-[11px] text-green font-semibold">{t.payoutPercent ?? symbol.payoutPercent ?? symbol.payout}%</span>
                          </div>
                          {!isActive && (
                            <>
                              <div className="h-px bg-border/40"></div>
                              <div className="flex items-center justify-between pt-0.5">
                                <span className="text-[10px] text-textDark font-semibold">Profit</span>
                                <span className={`text-sm font-bold ${t.profit > 0 ? 'text-green' : 'text-red'}`}>
                                  {t.profit > 0 ? '+' : ''}{t.profit.toFixed(2)}$
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="px-4 py-2.5 border-t border-border flex-shrink-0">
            <Link href="/transactions" className="block w-full text-center text-[11px] font-semibold text-blue hover:text-blue-hover transition-colors py-1">
              View All Trade History
            </Link>
          </div>
        </div>
      </div>
      {amountSheet && (
        <QuickSheet title="Investment amount" onClose={() => setAmountSheet(false)}>
          <div className="grid grid-cols-4 gap-2">
            {[1, 5, 10, 25, 50, 100, 200, 500].map((amt) => (
              <button key={amt} onClick={() => { setInvestment(amt); setAmountSheet(false); }}
                className={`py-3 text-sm font-bold rounded-xl border transition-all active:scale-95 ${
                  investment === amt
                    ? 'text-white bg-blue/20 border-blue/50'
                    : 'text-foreground bg-background border-border'
                }`}>
                ${amt}
              </button>
            ))}
          </div>
        </QuickSheet>
      )}
      {timeSheet && (
        <QuickSheet title="Expiry time" onClose={() => setTimeSheet(false)}>
          <div className="grid grid-cols-4 gap-2">
            {[['00:15', 0, 15], ['00:30', 0, 30], ['01:00', 1, 0], ['02:00', 2, 0], ['03:00', 3, 0], ['05:00', 5, 0], ['10:00', 10, 0], ['15:00', 15, 0]].map(([label, m, s]) => {
              const cur = `${String(timeMinutes).padStart(2, '0')}:${String(timeSeconds).padStart(2, '0')}` === label;
              return (
                <button key={label as string} onClick={() => { onTimeSet(m as number, s as number); setTimeSheet(false); }}
                  className={`py-3 text-sm font-bold rounded-xl border font-mono transition-all active:scale-95 ${
                    cur
                      ? 'text-white bg-blue/20 border-blue/50'
                      : 'text-foreground bg-background border-border'
                  }`}>
                  {label as string}
                </button>
              );
            })}
          </div>
        </QuickSheet>
      )}
    </aside>
  );
}