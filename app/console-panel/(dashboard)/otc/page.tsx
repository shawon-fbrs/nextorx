'use client';

import { useState, useMemo } from 'react';
import { mockAssets, MockAsset } from '@/lib/mock-data/assets';
import { SearchInput } from '@/components/admin/ui/search-input';
import { Badge } from '@/components/admin/ui/badge';
import { Card, CardContent } from '@/components/admin/ui/card';
import { Select } from '@/components/admin/ui/select';
import { Toggle } from '@/components/admin/ui/toggle';
import { Button } from '@/components/admin/ui/button';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from '@/components/admin/ui/dialog';
import { Input } from '@/components/admin/ui/input';
import { Tabs } from '@/components/admin/ui/tabs';
import { StatsCard } from '@/components/admin/ui/stats-card';
import { Progress } from '@/components/admin/ui/progress';
import { Alert } from '@/components/admin/ui/alert';

export default function OtcPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState<MockAsset | null>(null);
  const [editBasePayout, setEditBasePayout] = useState('');
  const [editMinPayout, setEditMinPayout] = useState('');
  const [editMaxPayout, setEditMaxPayout] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [assets, setAssets] = useState(mockAssets);

  const filteredAssets = useMemo(() => {
    let result = [...assets];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((a) => a.name.toLowerCase().includes(s) || a.symbol.toLowerCase().includes(s));
    }
    if (categoryFilter !== 'all') result = result.filter((a) => a.category === categoryFilter);
    if (activeTab === 'otc') result = result.filter((a) => a.isOtc);
    if (activeTab === 'regular') result = result.filter((a) => !a.isOtc);
    return result;
  }, [search, categoryFilter, activeTab, assets]);

  const stats = useMemo(() => ({
    total: assets.length,
    enabled: assets.filter((a) => a.enabled).length,
    disabled: assets.filter((a) => !a.enabled).length,
    otc: assets.filter((a) => a.isOtc).length,
    avgPayout: Math.round(assets.filter((a) => a.enabled).reduce((s, a) => s + a.currentPayout, 0) / assets.filter((a) => a.enabled).length),
    totalVolume: assets.reduce((s, a) => s + a.dailyVolume, 0),
    totalTrades: assets.reduce((s, a) => s + a.dailyTrades, 0),
  }), [assets]);

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
          <h1 className="text-xl font-bold text-white">Asset Management</h1>
          <p className="text-sm text-textDark">Manage trading assets, per-pair payouts, and OTC configuration</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Assets" value={stats.total} />
        <StatsCard title="Active Pairs" value={stats.enabled} />
        <StatsCard title="Avg Payout" value={`${stats.avgPayout}%`} />
        <StatsCard title="Daily Volume" value={`$${stats.totalVolume.toLocaleString()}`} />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'all', label: 'All', count: assets.length },
          { id: 'regular', label: 'Regular', count: assets.filter((a) => !a.isOtc).length },
          { id: 'otc', label: 'OTC', count: assets.filter((a) => a.isOtc).length },
        ]}
        onChange={(id) => setActiveTab(id)}
      />

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchInput
                placeholder="Search assets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-40">
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Categories' },
                  { value: 'forex', label: 'Forex' },
                  { value: 'crypto', label: 'Crypto' },
                  { value: 'commodities', label: 'Commodities' },
                ]}
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
