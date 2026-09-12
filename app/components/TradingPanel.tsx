import { useState, type ReactNode } from 'react';

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
  timeStr: string;
  timeMinutes: number;
  timeSeconds: number;
  onTimeChange: (delta: number) => void;
  onTimeSet: (m: number, s: number) => void;
  onTrade: (type: 'up' | 'down') => void;
  onDirectionHover?: (dir: 'up' | 'down' | null) => void;
  payoutAmount: string;
}

function QuickSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[95]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 bg-surface rounded-t-2xl px-4 pt-2 pb-8 flex flex-col" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="w-10 h-1 rounded-full bg-text-dark/40 mx-auto my-2 flex-shrink-0" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-foreground">{title}</span>
          <button onClick={onClose} className="p-1.5 text-text-dark">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function TradingPanel({
  symbol,
  investment,
  setInvestment,
  timeStr,
  timeMinutes,
  timeSeconds,
  onTimeChange,
  onTimeSet,
  onTrade,
  onDirectionHover,
  payoutAmount,
}: TradingPanelProps) {
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
            <button onClick={() => setTimeSheet(true)} title="Quick times"
              className="lg:hidden w-7 h-7 rounded-lg bg-blue/15 border border-blue/40 text-blue flex items-center justify-center active:scale-95 transition-transform">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
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
            <span className="flex items-center gap-1.5">
              <span className="text-[9px] text-textDark">Min $1</span>
              <button onClick={() => setAmountSheet(true)} title="Quick amounts"
                className="lg:hidden w-7 h-7 rounded-lg bg-blue/15 border border-blue/40 text-blue text-sm font-bold flex items-center justify-center active:scale-95 transition-transform">
                $
              </button>
            </span>
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
        <div className="bg-background rounded-xl border border-border px-3 py-2.5 max-lg:px-2.5 max-lg:py-1.5 max-lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-textDark font-semibold uppercase tracking-wider block mb-0.5 max-lg:mb-0">Potential Payout</span>
              <span className="text-green font-bold text-lg max-lg:text-base">+{payoutAmount}$</span>
            </div>
            <div className="w-10 h-10 max-lg:hidden rounded-lg bg-green/10 flex items-center justify-center">
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