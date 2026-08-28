'use client';

const marketItems = [
  { id: 1, name: 'Trading Signals Pro', description: 'AI-powered trading signals with 85% accuracy rate', price: '$29.99', category: 'Signals', rating: 4.8, users: 1240, icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  { id: 2, name: 'Risk Calculator', description: 'Advanced position sizing and risk management', price: '$14.99', category: 'Tools', rating: 4.6, users: 890, icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { id: 3, name: 'Trading Masterclass', description: 'Complete video course on binary options', price: '$49.99', category: 'Education', rating: 4.9, users: 2100, icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
  { id: 4, name: 'Custom Indicators', description: '10 premium indicators for analysis', price: '$39.99', category: 'Indicators', rating: 4.7, users: 670, icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z' },
  { id: 5, name: 'Auto-Trading Bot', description: 'Automated trading with customizable strategies', price: '$79.99', category: 'Bots', rating: 4.5, users: 450, icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  { id: 6, name: 'VIP Analysis Room', description: 'Live market analysis with experts', price: '$99.99', category: 'Premium', rating: 4.9, users: 320, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
];

const categories = ['All', 'Signals', 'Tools', 'Education', 'Indicators', 'Bots', 'Premium'];

export default function MarketPage() {
  return (
    <div className="bg-background text-text h-full overflow-y-auto">
      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Market</h1>
            <p className="text-sm text-text-dark mt-1">Premium tools for better trading</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                cat === 'All'
                  ? 'bg-blue text-white'
                  : 'bg-surface border border-border text-text hover:bg-surface-hover hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {marketItems.map((item) => (
            <div key={item.id} className="bg-surface border border-border rounded-xl overflow-hidden hover:border-text-dark/30 transition-colors">
              <div className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-blue/15 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5.5 h-5.5 text-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white mb-0.5">{item.name}</h3>
                    <span className="text-[10px] text-text-dark bg-border/30 px-1.5 py-0.5 rounded">{item.category}</span>
                  </div>
                </div>
                <p className="text-[12px] text-text mb-3 line-clamp-2">{item.description}</p>
                <div className="flex items-center gap-3 text-[11px]">
                  <div className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-orange" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    <span className="text-white font-semibold">{item.rating}</span>
                  </div>
                  <span className="text-text-dark">|</span>
                  <span className="text-text-dark">{item.users.toLocaleString()} users</span>
                </div>
              </div>
              <div className="px-4 py-3 border-t border-border flex items-center justify-between">
                <span className="text-base font-bold text-green">{item.price}</span>
                <button className="bg-blue hover:bg-blue-hover text-white text-[11px] font-bold px-4 py-2 rounded-lg transition-colors">
                  Buy Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
