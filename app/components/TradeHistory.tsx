import { Trade } from '../lib/types';

interface TradeHistoryProps {
  trades: Trade[];
  activeTab: 'trades' | 'pending';
  onTabChange: (tab: 'trades' | 'pending') => void;
}

export function TradeHistory({ trades, activeTab, onTabChange }: TradeHistoryProps) {
  return (
    <div className="bg-background border border-border rounded-lg overflow-hidden flex flex-col h-[280px]">
      <div className="flex border-b border-border h-9 flex-shrink-0">
        <button
          onClick={() => onTabChange('trades')}
          className={`flex-1 text-[11px] font-bold flex items-center justify-center relative transition-colors ${
            activeTab === 'trades' ? 'bg-surface text-white' : 'bg-background text-text hover:text-white'
          }`}
        >
          Trades <span className="ml-1 bg-border text-textDark text-[8px] px-1.5 py-0.5 rounded">{trades.length}</span>
          {activeTab === 'trades' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue" />}
        </button>
        <button
          onClick={() => onTabChange('pending')}
          className={`flex-1 text-[11px] font-bold flex items-center justify-center border-l border-border transition-colors ${
            activeTab === 'pending' ? 'bg-surface text-white' : 'bg-background text-text hover:text-white'
          }`}
        >
          <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
          <span className="bg-border text-textDark text-[8px] px-1.5 py-0.5 rounded">0</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {trades.length === 0 ? (
          <div className="flex items-center justify-center h-full text-textDark text-[11px]">No trades yet</div>
        ) : (
          trades.map((trade) => (
            <div key={trade.id} className="flex items-center justify-between px-3 py-2 hover:bg-surface transition-colors cursor-pointer border-b border-border/50">
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d={trade.type === 'up' ? 'M19 9l-7 7-7-7' : 'M19 14l-7 7m0 0l-7-7m7 7V3'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                  </svg>
                  <span className="text-[11px] text-white font-bold">{trade.symbol}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${trade.type === 'up' ? 'bg-green' : 'bg-red'}`}>
                    <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d={trade.type === 'up' ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                    </svg>
                  </span>
                  <span className="text-[9px] text-text">{trade.amount} $</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[9px] text-text font-mono">{trade.time}</span>
                <span className={`text-[11px] font-bold mt-1 ${trade.status === 'won' ? 'text-green' : 'text-red'}`}>
                  {trade.status === 'won' ? '+' : ''}{trade.profit.toFixed(2)} $
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
