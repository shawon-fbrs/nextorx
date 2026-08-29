'use client';

import { useState, useMemo, useEffect } from 'react';
import { mockAssets, MockAsset } from '@/lib/mock-data/assets';
import { SearchInput } from '@/components/admin/ui/search-input';
import { Badge } from '@/components/admin/ui/badge';
import { Card, CardContent } from '@/components/admin/ui/card';
import { Select } from '@/components/admin/ui/select';
import { Toggle } from '@/components/admin/ui/toggle';
import { Button } from '@/components/admin/ui/button';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from '@/components/admin/ui/dialog';
import { Input } from '@/components/admin/ui/input';
import { StatsCard } from '@/components/admin/ui/stats-card';
import { Progress } from '@/components/admin/ui/progress';
import { Alert } from '@/components/admin/ui/alert';
import { Skeleton } from '@/components/admin/ui/skeleton';

interface NewOtcPair {
  symbol: string;
  name: string;
  description: string;
  category: string;
  basePayout: number;
  minPayout: number;
  maxPayout: number;
  tradingHours: string;
  spread: number;
  minTrade: number;
  maxTrade: number;
}

const categories = [
  { value: 'forex', label: 'Forex' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'commodities', label: 'Commodities' },
  { value: 'stocks', label: 'Stocks' },
];

export default function OtcPage() {
  const [search, setSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<MockAsset | null>(null);
  const [editBasePayout, setEditBasePayout] = useState('');
  const [editMinPayout, setEditMinPayout] = useState('');
  const [editMaxPayout, setEditMaxPayout] = useState('');
  const [assets, setAssets] = useState(mockAssets);
  const [isLoading, setIsLoading] = useState(true);
  const [addPairOpen, setAddPairOpen] = useState(false);
  const [newPair, setNewPair] = useState<NewOtcPair>({
    symbol: '',
    name: '',
    description: '',
    category: 'forex',
    basePayout: 85,
    minPayout: 75,
    maxPayout: 92,
    tradingHours: '24/7',
    spread: 0.0002,
    minTrade: 1,
    maxTrade: 5000,
  });

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-40 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-4 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </div>
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-16 w-full" />
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((j) => <Skeleton key={j} className="h-8 w-full" />)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const filteredAssets = useMemo(() => {
    let result = assets.filter((a) => a.isOtc);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((a) => a.name.toLowerCase().includes(s) || a.symbol.toLowerCase().includes(s));
    }
    return result;
  }, [search, assets]);

  const stats = useMemo(() => {
    const otcAssets = assets.filter((a) => a.isOtc);
    return {
      total: otcAssets.length,
      enabled: otcAssets.filter((a) => a.enabled).length,
      avgPayout: Math.round(otcAssets.filter((a) => a.enabled).reduce((s, a) => s + a.currentPayout, 0) / otcAssets.filter((a) => a.enabled).length) || 0,
      totalVolume: otcAssets.reduce((s, a) => s + a.dailyVolume, 0),
      totalTrades: otcAssets.reduce((s, a) => s + a.dailyTrades, 0),
    };
  }, [assets]);

  const handleAddPair = () => {
    if (!newPair.symbol || !newPair.name) {
      alert('Symbol and Name are required');
      return;
    }
    const id = `OTC_${newPair.symbol.toUpperCase()}_${Date.now()}`;
    const pair: MockAsset = {
      id,
      symbol: newPair.symbol.toUpperCase(),
      name: newPair.name,
      description: newPair.description || `${newPair.name} OTC pair`,
      category: newPair.category as any,
      currentPayout: newPair.basePayout,
      basePayout: newPair.basePayout,
      minPayout: newPair.minPayout,
      maxPayout: newPair.maxPayout,
      enabled: true,
      isOtc: true,
      dailyVolume: 0,
      dailyTrades: 0,
      winRate: 0,
      tradingHours: newPair.tradingHours,
      spread: newPair.spread,
      minTrade: newPair.minTrade,
      maxTrade: newPair.maxTrade,
    };
    setAssets([...assets, pair]);
    setAddPairOpen(false);
    setNewPair({
      symbol: '',
      name: '',
      description: '',
      category: 'forex',
      basePayout: 85,
      minPayout: 75,
      maxPayout: 92,
      tradingHours: '24/7',
      spread: 0.0002,
      minTrade: 1,
      maxTrade: 5000,
    });
  };

  const handleSavePayout = () => {
    if (selectedAsset) {
      setAssets(assets.map((a) =>
        a.id === selectedAsset.id
          ? {
              ...a,
              basePayout: Number(editBasePayout),
              currentPayout: Number(editBasePayout),
              minPayout: Number(editMinPayout),
              maxPayout: Number(editMaxPayout),
            }
          : a
      ));
      setSelectedAsset(null);
    }
  };

  const getPayoutColor = (current: number, base: number) => {
    if (current > base) return 'text-green';
    if (current < base) return 'text-red';
    return 'text-white';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">OTC Pairs Management</h1>
          <p className="text-sm text-textDark">Add and manage Over-The-Counter trading pairs</p>
        </div>
        <Button onClick={() => setAddPairOpen(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Add New Pair
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total OTC Pairs" value={stats.total} />
        <StatsCard title="Active Pairs" value={stats.enabled} />
        <StatsCard title="Avg Payout" value={`${stats.avgPayout}%`} />
        <StatsCard title="Daily Volume" value={`$${stats.totalVolume.toLocaleString()}`} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchInput
                placeholder="Search OTC pairs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAssets.map((asset) => (
          <Card key={asset.id} className="hover:border-blue/50 transition-colors">
            <CardContent>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">{asset.name}</h3>
                  <p className="text-[11px] text-textDark">{asset.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {asset.isOtc && <Badge variant="info">OTC</Badge>}
                  <Badge variant={asset.enabled ? 'success' : 'danger'}>
                    {asset.enabled ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
              </div>

              {/* Payout Section */}
              <div className="p-3 bg-background rounded-lg border border-border mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-textDark uppercase">Current Payout</span>
                  <span className={`text-lg font-bold ${getPayoutColor(asset.currentPayout, asset.basePayout)}`}>
                    {asset.currentPayout}%
                  </span>
                </div>
                <Progress value={asset.currentPayout} max={100} size="sm" color={asset.currentPayout >= asset.basePayout ? 'green' : 'orange'} />
                <div className="flex justify-between mt-1 text-[9px] text-textDark">
                  <span>Min: {asset.minPayout}%</span>
                  <span>Base: {asset.basePayout}%</span>
                  <span>Max: {asset.maxPayout}%</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div>
                  <p className="text-[9px] text-textDark uppercase">Volume</p>
                  <p className="text-xs font-medium text-white">${asset.dailyVolume.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] text-textDark uppercase">Trades</p>
                  <p className="text-xs font-medium text-white">{asset.dailyTrades.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] text-textDark uppercase">Win Rate</p>
                  <p className={`text-xs font-medium ${asset.winRate >= 48 ? 'text-green' : 'text-orange'}`}>
                    {asset.winRate > 0 ? `${asset.winRate}%` : '-'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <p className="text-[10px] text-textDark">{asset.tradingHours}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedAsset(asset);
                      setEditBasePayout(asset.basePayout.toString());
                      setEditMinPayout(asset.minPayout.toString());
                      setEditMaxPayout(asset.maxPayout.toString());
                    }}
                  >
                    Edit Payout
                  </Button>
                  <Toggle
                    checked={asset.enabled}
                    size="sm"
                    onChange={() => setAssets(assets.map((a) => a.id === asset.id ? { ...a, enabled: !a.enabled } : a))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add New Pair Modal */}
      <Dialog open={addPairOpen} onClose={() => setAddPairOpen(false)}>
        <DialogHeader onClose={() => setAddPairOpen(false)}>
          <h2 className="text-lg font-bold text-white">Add New OTC Pair</h2>
        </DialogHeader>
        <DialogContent className="space-y-4">
          <Alert variant="info" title="New OTC Pair">
            Create a new Over-The-Counter trading pair. These pairs are managed manually and use fixed pricing.
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Symbol (e.g., USD/BRL)"
              placeholder="USD/BRL"
              value={newPair.symbol}
              onChange={(e) => setNewPair({ ...newPair, symbol: e.target.value })}
            />
            <Input
              label="Display Name (e.g., USD/BRL OTC)"
              placeholder="USD/BRL (OTC)"
              value={newPair.name}
              onChange={(e) => setNewPair({ ...newPair, name: e.target.value })}
            />
          </div>

          <Input
            label="Description"
            placeholder="Short description of the pair"
            value={newPair.description}
            onChange={(e) => setNewPair({ ...newPair, description: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              value={newPair.category}
              onChange={(e) => setNewPair({ ...newPair, category: e.target.value })}
              options={categories}
            />
            <Input
              label="Trading Hours"
              placeholder="24/7"
              value={newPair.tradingHours}
              onChange={(e) => setNewPair({ ...newPair, tradingHours: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Spread"
              type="number"
              placeholder="0.0002"
              value={newPair.spread.toString()}
              onChange={(e) => setNewPair({ ...newPair, spread: Number(e.target.value) })}
            />
            <Input
              label="Min Trade ($)"
              type="number"
              placeholder="1"
              value={newPair.minTrade.toString()}
              onChange={(e) => setNewPair({ ...newPair, minTrade: Number(e.target.value) })}
            />
            <Input
              label="Max Trade ($)"
              type="number"
              placeholder="5000"
              value={newPair.maxTrade.toString()}
              onChange={(e) => setNewPair({ ...newPair, maxTrade: Number(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Base Payout (%)"
              type="number"
              value={newPair.basePayout.toString()}
              onChange={(e) => setNewPair({ ...newPair, basePayout: Number(e.target.value) })}
              min={50}
              max={95}
            />
            <Input
              label="Min Payout (%)"
              type="number"
              value={newPair.minPayout.toString()}
              onChange={(e) => setNewPair({ ...newPair, minPayout: Number(e.target.value) })}
              min={50}
              max={95}
            />
            <Input
              label="Max Payout (%)"
              type="number"
              value={newPair.maxPayout.toString()}
              onChange={(e) => setNewPair({ ...newPair, maxPayout: Number(e.target.value) })}
              min={50}
              max={95}
            />
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setAddPairOpen(false)}>Cancel</Button>
          <Button onClick={handleAddPair}>Add Pair</Button>
        </DialogFooter>
      </Dialog>

      {/* Edit Payout Modal */}
      <Dialog open={!!selectedAsset} onClose={() => setSelectedAsset(null)}>
        <DialogHeader onClose={() => setSelectedAsset(null)}>
          <h2 className="text-lg font-bold text-white">Edit Payout — {selectedAsset?.name}</h2>
        </DialogHeader>
        <DialogContent className="space-y-4">
          <Alert variant="info" title="Dynamic Payout">
            Set the base payout and allowed range. The payout engine will auto-adjust within this range based on treasury health.
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Base Payout (%)"
              type="number"
              value={editBasePayout}
              onChange={(e) => setEditBasePayout(e.target.value)}
              min={50}
              max={95}
            />
            <div className="flex items-end">
              <p className="text-[11px] text-textDark">
                House Edge: <span className="text-white font-medium">{100 - Number(editBasePayout || 0)}%</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Min Payout (%)"
              type="number"
              value={editMinPayout}
              onChange={(e) => setEditMinPayout(e.target.value)}
              min={50}
              max={95}
              helperText="Lowest payout when treasury is low"
            />
            <Input
              label="Max Payout (%)"
              type="number"
              value={editMaxPayout}
              onChange={(e) => setEditMaxPayout(e.target.value)}
              min={50}
              max={95}
              helperText="Highest payout when treasury is healthy"
            />
          </div>

          <div className="p-3 bg-background rounded-lg border border-border">
            <p className="text-[10px] text-textDark uppercase mb-2">Payout Range Preview</p>
            <div className="relative h-4 bg-border rounded-full overflow-hidden">
              <div
                className="absolute h-full bg-blue rounded-full"
                style={{
                  left: `${Number(editMinPayout) || 0}%`,
                  width: `${(Number(editMaxPayout) || 100) - (Number(editMinPayout) || 0)}%`,
                }}
              />
              <div
                className="absolute h-full w-1 bg-white rounded-full"
                style={{ left: `${Number(editBasePayout) || 0}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[9px] text-textDark">
              <span>{editMinPayout}% (Min)</span>
              <span>{editBasePayout}% (Base)</span>
              <span>{editMaxPayout}% (Max)</span>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setSelectedAsset(null)}>Cancel</Button>
          <Button onClick={handleSavePayout}>Save Changes</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
