'use client';

import { useState } from 'react';
import { SymbolDef } from '../lib/types';

interface AssetTabsProps {
  symbols: SymbolDef[];
  activeSymbol: SymbolDef;
  onSelect: (symbol: SymbolDef) => void;
}

const categories = [
  { name: 'All', icon: '📋' },
  { name: 'Forex', icon: '💱', cats: ['forex', 'otc'] },
  { name: 'Crypto', icon: '₿', cats: ['crypto'] },
  { name: 'Commodities', icon: '🛢️', cats: ['commodities'] },
];

export function AssetTabs({ symbols, activeSymbol, onSelect }: AssetTabsProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const activeCat = categories.find((c) => c.name === activeCategory);

  const filtered = symbols.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (!activeCat || activeCat.name === 'All') return true;
    return activeCat.cats?.includes(s.category);
  });

  // Group by category for clearer display
  const grouped = filtered.reduce((acc, sym) => {
    const cat = sym.category === 'otc' ? 'forex' : sym.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(sym);
    return acc;
  }, {} as Record<string, SymbolDef[]>);

  return (
    <div className="absolute top-4 left-4 right-4 z-20 flex items-center gap-2 pb-2 pointer-events-auto">
      {/* Add asset button */}
      <div className="relative">
        <button
          onClick={() => { setAddOpen(!addOpen); setSearch(''); }}
          className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 ${
            addOpen
              ? 'bg-white text-background rotate-45'
              : 'bg-blue text-white hover:bg-blue/80'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
          </svg>
        </button>

        {/* Dropdown */}
        <div className={`absolute top-full left-0 mt-2 w-[420px] bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 origin-top z-50 ${addOpen ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-0 -translate-y-2 pointer-events-none'}`}>
          {/* Search */}
          <div className="p-4 pb-3">
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <input
                type="text"
                placeholder="Search assets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-text-dark focus:outline-none focus:border-blue/50 transition-colors"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="px-4 pb-3 flex gap-2">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeCategory === cat.name
                    ? 'bg-blue/15 text-blue border border-blue/30'
                    : 'bg-background text-text-dark hover:text-text border border-transparent hover:border-border'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Asset list */}
          <div className="max-h-[420px] overflow-y-auto px-2 pb-2">
            {filtered.length === 0 ? (
              <div className="py-12 text-center">
                <svg className="w-10 h-10 text-text-dark mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-sm text-text-dark">No assets found</span>
              </div>
            ) : (
              Object.entries(grouped).map(([cat, assets]) => (
                <div key={cat} className="mb-2">
                  <div className="px-3 py-2 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-text-dark uppercase tracking-wider">{cat === 'forex' ? 'Forex' : cat === 'crypto' ? 'Crypto' : 'Commodities'}</span>
                    <div className="flex-1 h-px bg-border/50" />
                    <span className="text-[10px] text-text-dark">{assets.length}</span>
                  </div>
                  {assets.map((sym) => {
                    const isActive = sym.id === activeSymbol.id;
                    const isOtc = sym.id.includes('OTC');
                    return (
                      <button
                        key={sym.id}
                        onClick={() => { onSelect(sym); setAddOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all mb-0.5 ${
                          isActive
                            ? 'bg-blue/10 border border-blue/30'
                            : 'hover:bg-surface-hover border border-transparent'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isActive ? 'bg-blue/20' : 'bg-background'
                        }`}>
                          <span className="text-xs font-bold text-white">{sym.name.replace('/', '').slice(0, 3)}</span>
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{sym.name}</span>
                            {isOtc && (
                              <span className="text-[9px] font-bold text-orange bg-orange/15 px-1.5 py-0.5 rounded">OTC</span>
                            )}
                            {isActive && (
                              <span className="text-[9px] font-bold text-blue bg-blue/15 px-1.5 py-0.5 rounded-full">ACTIVE</span>
                            )}
                          </div>
                          <span className="text-[11px] text-text">{isOtc ? 'Over the Counter' : 'Real Market'}</span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-sm font-bold text-green">{sym.payout}%</span>
                          <p className="text-[10px] text-text-dark">payout</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <span className="text-[11px] text-text-dark">{filtered.length} assets available</span>
            <button className="text-[11px] font-semibold text-blue hover:text-blue-hover transition-colors">
              View All Markets →
            </button>
          </div>
        </div>
      </div>

      {/* Existing asset tabs */}
      {symbols.slice(0, 7).map((sym) => {
        const isActive = sym.id === activeSymbol.id;
        return (
          <button
            key={sym.id}
            onClick={() => onSelect(sym)}
            className={`h-11 w-40 min-w-0 flex-shrink rounded-xl flex items-center pl-4 pr-7 gap-2.5 cursor-pointer transition-all shadow-lg relative ${
              isActive
                ? 'bg-background/90 border border-blue/50 shadow-blue/10'
                : 'bg-surface/90 border border-border/50 hover:bg-surface-hover/90 backdrop-blur-sm'
            }`}
          >
            <span
              onClick={(e) => { e.stopPropagation(); }}
              className="absolute top-0 right-0 w-5 h-5 bg-red rounded-bl-xl flex items-center justify-center hover:bg-red-hover transition-colors"
            >
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
    </div>
  );
}