'use client';

import { useState, useEffect, useCallback } from 'react';
import { SearchInput } from '@/components/admin/ui/search-input';
import { Badge } from '@/components/admin/ui/badge';
import { Card, CardContent } from '@/components/admin/ui/card';
import { Button } from '@/components/admin/ui/button';
import { StatsCard } from '@/components/admin/ui/stats-card';
import { Skeleton } from '@/components/admin/ui/skeleton';
import { Input } from '@/components/admin/ui/input';
import { Select } from '@/components/admin/ui/select';
import { Toggle } from '@/components/admin/ui/toggle';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from '@/components/admin/ui/dialog';
import { Alert } from '@/components/admin/ui/alert';

type Pair = {
  id: string;
  name: string;
  symbol: string | null;
  category: string;
  basePrice: string;
  volatility: string;
  payoutPercent: string;
  weekendPayout: string | null;
  spread: string;
  isActive: boolean;
  isFeatured: boolean;
  minTrade: string;
  maxTrade: string;
  maxPayout: string | null;
  description: string | null;
  tradingHours: string | null;
  tags: string[];
  maxDailyVolume: number | null;
  sortOrder: number;
  _count: { trades: number };
};

const CATEGORY_DEFAULTS: Record<string, { volatility: number; spread: number; payoutPercent: number; minTrade: number; maxTrade: number }> = {
  forex:       { volatility: 0.5,  spread: 0.0002, payoutPercent: 80, minTrade: 1,   maxTrade: 5000 },
  crypto:      { volatility: 2.0,  spread: 0.001,  payoutPercent: 85, minTrade: 1,   maxTrade: 5000 },
  commodities: { volatility: 1.0,  spread: 0.0005, payoutPercent: 78, minTrade: 1,   maxTrade: 5000 },
  indices:     { volatility: 0.8,  spread: 0.0003, payoutPercent: 82, minTrade: 1,   maxTrade: 5000 },
  stocks:      { volatility: 1.2,  spread: 0.0008, payoutPercent: 82, minTrade: 1,   maxTrade: 5000 },
};

const CATEGORY_OPTIONS = [
  { value: 'forex', label: 'Forex' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'commodities', label: 'Commodities' },
  { value: 'indices', label: 'Indices' },
  { value: 'stocks', label: 'Stocks' },
];

type PairForm = {
  id: string;
  name: string;
  symbol: string;
  category: string;
  basePrice: string;
  volatility: string;
  payoutPercent: string;
  weekendPayout: string;
  spread: string;
  minTrade: string;
  maxTrade: string;
  maxPayout: string;
  description: string;
  tradingHours: string;
  isFeatured: boolean;
};

const EMPTY_FORM: PairForm = {
  id: '',
  name: '',
  symbol: '',
  category: 'forex',
  basePrice: '',
  volatility: '',
  payoutPercent: '80',
  weekendPayout: '',
  spread: '',
  minTrade: '1',
  maxTrade: '5000',
  maxPayout: '95',
  description: '',
  tradingHours: '24/7',
  isFeatured: false,
};

export default function OtcPage() {
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingPair, setEditingPair] = useState<Pair | null>(null);
  const [form, setForm] = useState<PairForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchPairs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/pairs');
      const data = await res.json();
      if (data.pairs) setPairs(data.pairs);
    } catch {} finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchPairs(); }, [fetchPairs]);

  const filtered = pairs.filter((p) => {
    if (search) {
      const s = search.toLowerCase();
      if (!p.name.toLowerCase().includes(s) && !p.id.toLowerCase().includes(s) && !p.category.toLowerCase().includes(s)) return false;
    }
    if (filterCategory && p.category !== filterCategory) return false;
    return true;
  });

  const stats = {
    total: pairs.length,
    active: pairs.filter((p) => p.isActive).length,
    featured: pairs.filter((p) => p.isFeatured).length,
    avgPayout: pairs.length ? (pairs.reduce((s, p) => s + Number(p.payoutPercent), 0) / pairs.length).toFixed(1) : '0',
  };

  const handleToggleActive = async (pair: Pair) => {
    try {
      const res = await fetch(`/api/admin/pairs/${pair.id}/toggle`, { method: 'PUT' });
      if (res.ok) {
        setPairs((prev) => prev.map((p) => p.id === pair.id ? { ...p, isActive: !p.isActive } : p));
      }
    } catch {}
  };

  const handleDelete = async (pair: Pair) => {
    if (!confirm(`Delete "${pair.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/pairs/${pair.id}`, { method: 'DELETE' });
      if (res.ok) {
        setPairs((prev) => prev.filter((p) => p.id !== pair.id));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete');
      }
    } catch {}
  };

  const openAddDialog = (category?: string) => {
    const cat = category || 'forex';
    const defaults = CATEGORY_DEFAULTS[cat];
    setForm({
      ...EMPTY_FORM,
      category: cat,
      volatility: String(defaults.volatility),
      spread: String(defaults.spread),
      payoutPercent: String(defaults.payoutPercent),
      minTrade: String(defaults.minTrade),
      maxTrade: String(defaults.maxTrade),
    });
    setError('');
    setShowAddDialog(true);
  };

  const openEditDrawer = (pair: Pair) => {
    setForm({
      id: pair.id,
      name: pair.name,
      symbol: pair.symbol || '',
      category: pair.category,
      basePrice: pair.basePrice,
      volatility: pair.volatility,
      payoutPercent: pair.payoutPercent,
      weekendPayout: pair.weekendPayout || '',
      spread: pair.spread,
      minTrade: pair.minTrade,
      maxTrade: pair.maxTrade,
      maxPayout: pair.maxPayout || '95',
      description: pair.description || '',
      tradingHours: pair.tradingHours || '24/7',
      isFeatured: pair.isFeatured,
    });
    setError('');
    setEditingPair(pair);
  };

  const handleCategoryChange = (cat: string) => {
    const defaults = CATEGORY_DEFAULTS[cat];
    if (defaults) {
      setForm((prev) => ({
        ...prev,
        category: cat,
        volatility: String(defaults.volatility),
        spread: String(defaults.spread),
        payoutPercent: String(defaults.payoutPercent),
        minTrade: String(defaults.minTrade),
        maxTrade: String(defaults.maxTrade),
      }));
    } else {
      setForm((prev) => ({ ...prev, category: cat }));
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    setError('');
    try {
      const body = {
        id: form.id.toUpperCase(),
        name: form.name,
        symbol: form.symbol || undefined,
        category: form.category,
        basePrice: parseFloat(form.basePrice),
        volatility: parseFloat(form.volatility),
        payoutPercent: parseFloat(form.payoutPercent),
        weekendPayout: form.weekendPayout ? parseFloat(form.weekendPayout) : undefined,
        spread: parseFloat(form.spread),
        minTrade: parseFloat(form.minTrade),
        maxTrade: parseFloat(form.maxTrade),
        maxPayout: parseFloat(form.maxPayout),
        description: form.description || undefined,
        tradingHours: form.tradingHours || undefined,
        isFeatured: form.isFeatured,
      };
      const res = await fetch('/api/admin/pairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create');
        return;
      }
      setPairs((prev) => [...prev, { ...data.pair, _count: { trades: 0 } }]);
      setShowAddDialog(false);
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingPair) return;
    setSaving(true);
    setError('');
    try {
      const body = {
        name: form.name,
        symbol: form.symbol || null,
        category: form.category,
        basePrice: parseFloat(form.basePrice),
        volatility: parseFloat(form.volatility),
        payoutPercent: parseFloat(form.payoutPercent),
        weekendPayout: form.weekendPayout ? parseFloat(form.weekendPayout) : null,
        spread: parseFloat(form.spread),
        minTrade: parseFloat(form.minTrade),
        maxTrade: parseFloat(form.maxTrade),
        maxPayout: parseFloat(form.maxPayout),
        description: form.description || null,
        tradingHours: form.tradingHours || null,
        isFeatured: form.isFeatured,
      };
      const res = await fetch(`/api/admin/pairs/${editingPair.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update');
        return;
      }
      setPairs((prev) => prev.map((p) => p.id === editingPair.id ? { ...p, ...data.pair } : p));
      setEditingPair(null);
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-7 w-40 mb-2" /><Skeleton className="h-4 w-72" /></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="bg-surface border border-border rounded-xl p-4 space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-6 w-12" /></div>)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">OTC Pairs</h1>
          <p className="text-sm text-textDark">Manage trading pairs, payouts, and volatility</p>
        </div>
        <Button onClick={() => openAddDialog()} className="bg-blue hover:bg-blue/90 text-white">
          + Add Pair
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Pairs" value={stats.total} />
        <StatsCard title="Active" value={stats.active} />
        <StatsCard title="Featured" value={stats.featured} />
        <StatsCard title="Avg Payout" value={`${stats.avgPayout}%`} />
      </div>

      <Alert variant="info" title="Engine UNCALIBRATED (Track B)">
        Volatility and price parameters are hand-tuned, not fitted to real market data. Quant calibration replaces them before industry-grade sign-off.
      </Alert>

      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <SearchInput placeholder="Search by name, ID, or category..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select
              options={[{ value: '', label: 'All Categories' }, ...CATEGORY_OPTIONS]}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full sm:w-40"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-textDark uppercase tracking-wider">Pair</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-textDark uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-textDark uppercase tracking-wider">Base Price</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-textDark uppercase tracking-wider">Volatility</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-textDark uppercase tracking-wider">Spread</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-textDark uppercase tracking-wider">Payout</th>
                <th className="px-4 py-3 text-center text-[10px] font-semibold text-textDark uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-[10px] font-semibold text-textDark uppercase tracking-wider">Featured</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-textDark uppercase tracking-wider">Trades</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-textDark uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-textDark text-sm">No pairs found</td>
                </tr>
              ) : (
                filtered.map((pair) => (
                  <tr key={pair.id} className="border-b border-border/50 hover:bg-surface-hover/50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-white">{pair.name}</p>
                        <p className="text-[11px] text-textDark">{pair.id}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={pair.category === 'crypto' ? 'info' : pair.category === 'commodities' ? 'warning' : 'neutral'}>
                        {pair.category}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-white font-mono">{Number(pair.basePrice).toFixed(pair.category === 'forex' && Number(pair.basePrice) < 10 ? 5 : 2)}</td>
                    <td className="px-4 py-3 text-right text-sm text-white font-mono">{pair.volatility}</td>
                    <td className="px-4 py-3 text-right text-sm text-white font-mono">{pair.spread}</td>
                    <td className="px-4 py-3 text-right text-sm font-mono">
                      <span className="text-green">{pair.payoutPercent}%</span>
                      {pair.weekendPayout && (
                        <span className="text-textDark text-[10px] block">wknd: {pair.weekendPayout}%</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Toggle size="sm" checked={pair.isActive} onChange={() => handleToggleActive(pair)} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {pair.isFeatured ? <Badge variant="info">Featured</Badge> : <span className="text-textDark text-[11px]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-textDark">{pair._count.trades.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEditDrawer(pair)} className="px-2 py-1 text-[11px] font-medium text-blue hover:text-blue/80 transition-colors">Edit</button>
                        <button onClick={() => handleDelete(pair)} className="px-2 py-1 text-[11px] font-medium text-red hover:text-red/80 transition-colors">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} className="max-w-2xl">
        <DialogHeader onClose={() => setShowAddDialog(false)}>
          <h2 className="text-lg font-bold text-white">Add New Pair</h2>
        </DialogHeader>
        <DialogContent className="max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Pair ID" placeholder="EURUSD" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value.toUpperCase() })} />
            <Input label="Display Name" placeholder="EUR/USD" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Symbol (optional)" placeholder="EUR/USD" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
            <Select label="Category" options={CATEGORY_OPTIONS} value={form.category} onChange={(e) => handleCategoryChange(e.target.value)} />
            <Input label="Base Price" type="number" step="any" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} />
            <Input label="Volatility" type="number" step="any" value={form.volatility} onChange={(e) => setForm({ ...form, volatility: e.target.value })} helperText="Uncalibrated (Track B). Higher = more price movement" />
            <Input label="Spread" type="number" step="any" value={form.spread} onChange={(e) => setForm({ ...form, spread: e.target.value })} />
            <Input label="Payout %" type="number" min="50" max="95" value={form.payoutPercent} onChange={(e) => setForm({ ...form, payoutPercent: e.target.value })} />
            <Input label="Weekend Payout %" type="number" min="50" max="95" value={form.weekendPayout} onChange={(e) => setForm({ ...form, weekendPayout: e.target.value })} helperText="Optional lower payout on weekends" />
            <Input label="Max Payout %" type="number" min="50" max="95" value={form.maxPayout} onChange={(e) => setForm({ ...form, maxPayout: e.target.value })} />
            <Input label="Min Trade ($)" type="number" value={form.minTrade} onChange={(e) => setForm({ ...form, minTrade: e.target.value })} />
            <Input label="Max Trade ($)" type="number" value={form.maxTrade} onChange={(e) => setForm({ ...form, maxTrade: e.target.value })} />
            <Input label="Trading Hours" value={form.tradingHours} onChange={(e) => setForm({ ...form, tradingHours: e.target.value })} />
            <div className="flex items-end pb-1">
              <Toggle label="Featured" description="Show in top bar" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />
            </div>
            <div className="col-span-2">
              <Input label="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red">{error}</p>}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving || !form.id || !form.name || !form.basePrice} className="bg-blue hover:bg-blue/90 text-white">
            {saving ? 'Creating...' : 'Create Pair'}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={!!editingPair} onClose={() => setEditingPair(null)} className="max-w-2xl">
        <DialogHeader onClose={() => setEditingPair(null)}>
          <h2 className="text-lg font-bold text-white">Edit {editingPair?.name}</h2>
        </DialogHeader>
        <DialogContent className="max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Pair ID" value={form.id} disabled className="opacity-50" />
            <Input label="Display Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Symbol" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
            <Select label="Category" options={CATEGORY_OPTIONS} value={form.category} onChange={(e) => handleCategoryChange(e.target.value)} />
            <Input label="Base Price" type="number" step="any" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} />
            <Input label="Volatility" type="number" step="any" value={form.volatility} onChange={(e) => setForm({ ...form, volatility: e.target.value })} />
            <Input label="Spread" type="number" step="any" value={form.spread} onChange={(e) => setForm({ ...form, spread: e.target.value })} />
            <Input label="Payout %" type="number" min="50" max="95" value={form.payoutPercent} onChange={(e) => setForm({ ...form, payoutPercent: e.target.value })} />
            <Input label="Weekend Payout %" type="number" min="50" max="95" value={form.weekendPayout} onChange={(e) => setForm({ ...form, weekendPayout: e.target.value })} />
            <Input label="Max Payout %" type="number" min="50" max="95" value={form.maxPayout} onChange={(e) => setForm({ ...form, maxPayout: e.target.value })} />
            <Input label="Min Trade ($)" type="number" value={form.minTrade} onChange={(e) => setForm({ ...form, minTrade: e.target.value })} />
            <Input label="Max Trade ($)" type="number" value={form.maxTrade} onChange={(e) => setForm({ ...form, maxTrade: e.target.value })} />
            <Input label="Trading Hours" value={form.tradingHours} onChange={(e) => setForm({ ...form, tradingHours: e.target.value })} />
            <div className="flex items-end pb-1">
              <Toggle label="Featured" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />
            </div>
            <div className="col-span-2">
              <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red">{error}</p>}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditingPair(null)}>Cancel</Button>
          <Button onClick={handleUpdate} disabled={saving || !form.name || !form.basePrice} className="bg-blue hover:bg-blue/90 text-white">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
