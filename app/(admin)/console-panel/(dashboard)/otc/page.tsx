'use client';

import { useState, useEffect } from 'react';
import { SearchInput } from '@/components/admin/ui/search-input';
import { Badge } from '@/components/admin/ui/badge';
import { Card, CardContent } from '@/components/admin/ui/card';
import { Button } from '@/components/admin/ui/button';
import { StatsCard } from '@/components/admin/ui/stats-card';
import { Skeleton } from '@/components/admin/ui/skeleton';

type Pair = {
  id: string;
  name: string;
  category: string;
  basePrice: string;
  payoutPercent: string;
  spread: string;
  isActive: boolean;
  minTrade: string;
  maxTrade: string;
  _count: { trades: number };
};

export default function OtcPage() {
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchPairs(); }, []);

  const fetchPairs = async () => {
    try {
      const res = await fetch('/api/market/pairs');
      const data = await res.json();
      if (data.pairs) setPairs(data.pairs);
    } catch {} finally { setIsLoading(false); }
  };

  const filtered = pairs.filter((p) => {
    if (search) {
      const s = search.toLowerCase();
      return p.name.toLowerCase().includes(s) || p.category.toLowerCase().includes(s);
    }
    return true;
  });

  const stats = {
    total: pairs.length,
    active: pairs.filter((p) => p.isActive).length,
    avgPayout: pairs.length ? (pairs.reduce((s, p) => s + Number(p.payoutPercent), 0) / pairs.length).toFixed(1) : '0',
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-7 w-40 mb-2" /><Skeleton className="h-4 w-72" /></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="bg-surface border border-border rounded-xl p-4 space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-6 w-12" /></div>)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Card key={i}><CardContent><Skeleton className="h-32 w-full" /></CardContent></Card>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">OTC Pairs</h1>
        <p className="text-sm text-textDark">Manage trading pairs</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard title="Total Pairs" value={stats.total} />
        <StatsCard title="Active" value={stats.active} />
        <StatsCard title="Avg Payout" value={`${stats.avgPayout}%`} />
      </div>

      <Card>
        <CardContent>
          <SearchInput placeholder="Search pairs..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((pair) => (
          <Card key={pair.id} className="hover:border-blue/50 transition-colors">
            <CardContent>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">{pair.name}</h3>
                  <p className="text-[11px] text-textDark capitalize">{pair.category}</p>
                </div>
                <Badge variant={pair.isActive ? 'success' : 'danger'}>
                  {pair.isActive ? 'Active' : 'Disabled'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div><p className="text-[9px] text-textDark uppercase">Payout</p><p className="text-xs font-medium text-green">{pair.payoutPercent}%</p></div>
                <div><p className="text-[9px] text-textDark uppercase">Spread</p><p className="text-xs font-medium text-white">{pair.spread}</p></div>
                <div><p className="text-[9px] text-textDark uppercase">Min Trade</p><p className="text-xs font-medium text-white">${Number(pair.minTrade).toFixed(0)}</p></div>
                <div><p className="text-[9px] text-textDark uppercase">Max Trade</p><p className="text-xs font-medium text-white">${Number(pair.maxTrade).toLocaleString()}</p></div>
              </div>
              <div className="pt-3 border-t border-border">
                <p className="text-[10px] text-textDark">{pair._count.trades} total trades</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
