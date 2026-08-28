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

export default function OtcPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState<MockAsset | null>(null);
  const [editPayout, setEditPayout] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const filteredAssets = useMemo(() => {
    let result = [...mockAssets];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((a) => a.name.toLowerCase().includes(s) || a.symbol.toLowerCase().includes(s));
    }
    if (categoryFilter !== 'all') result = result.filter((a) => a.category === categoryFilter);
    if (activeTab === 'otc') result = result.filter((a) => a.isOtc);
    if (activeTab === 'regular') result = result.filter((a) => !a.isOtc);
    return result;
  }, [search, categoryFilter, activeTab]);

  const stats = useMemo(() => ({
    total: mockAssets.length,
    enabled: mockAssets.filter((a) => a.enabled).length,
    disabled: mockAssets.filter((a) => !a.enabled).length,
    otc: mockAssets.filter((a) => a.isOtc).length,
    avgPayout: Math.round(mockAssets.reduce((s, a) => s + a.payoutPercent, 0) / mockAssets.length),
  }), []);

  const handleSavePayout = () => {
    if (selectedAsset) {
      alert(`Updated ${selectedAsset.name} payout to ${editPayout}%`);
      setSelectedAsset(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Asset Management</h1>
        <p className="text-sm text-textDark">Manage trading assets, payouts, and OTC pairs</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard title="Total Assets" value={stats.total} />
        <StatsCard title="Enabled" value={stats.enabled} />
        <StatsCard title="Disabled" value={stats.disabled} />
        <StatsCard title="OTC Pairs" value={stats.otc} />
        <StatsCard title="Avg Payout" value={`${stats.avgPayout}%`} />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'all', label: 'All', count: mockAssets.length },
          { id: 'regular', label: 'Regular', count: mockAssets.filter((a) => !a.isOtc).length },
          { id: 'otc', label: 'OTC', count: mockAssets.filter((a) => a.isOtc).length },
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
                  { value: 'stocks', label: 'Stocks' },
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
                  {asset.isOtc && (
                    <Badge variant="info">OTC</Badge>
                  )}
                  <Badge variant={asset.enabled ? 'success' : 'danger'}>
                    {asset.enabled ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-[10px] text-textDark uppercase">Payout</p>
                  <p className="text-sm font-bold text-green">{asset.payoutPercent}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-textDark uppercase">Spread</p>
                  <p className="text-sm text-text">{asset.spread}</p>
                </div>
                <div>
                  <p className="text-[10px] text-textDark uppercase">Min Trade</p>
                  <p className="text-sm text-text">${asset.minTrade}</p>
                </div>
                <div>
                  <p className="text-[10px] text-textDark uppercase">Max Trade</p>
                  <p className="text-sm text-text">${asset.maxTrade.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <p className="text-[10px] text-textDark">{asset.tradingHours}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedAsset(asset);
                      setEditPayout(asset.payoutPercent.toString());
                    }}
                  >
                    Edit Payout
                  </Button>
                  <Toggle
                    checked={asset.enabled}
                    size="sm"
                    onChange={() => alert(`${asset.enabled ? 'Disabled' : 'Enabled'} ${asset.name}`)}
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
        <DialogContent>
          <Input
            label="Payout Percentage"
            type="number"
            value={editPayout}
            onChange={(e) => setEditPayout(e.target.value)}
            min={50}
            max={95}
          />
          <p className="text-[11px] text-textDark mt-2">
            Recommended range: 70%–85%. Higher payouts attract more traders but reduce house edge.
          </p>
        </DialogContent>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setSelectedAsset(null)}>Cancel</Button>
          <Button onClick={handleSavePayout}>Save Changes</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
