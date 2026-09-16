'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/admin/ui/card';
import { Button } from '@/components/admin/ui/button';
import { Badge } from '@/components/admin/ui/badge';
import { Input } from '@/components/admin/ui/input';
import { Toggle } from '@/components/admin/ui/toggle';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from '@/components/admin/ui/dialog';
import { togglePromoActive, createPromo } from '@/lib/actions/admin';

type Promo = {
  id: string;
  code: string;
  label: string | null;
  percent: number;
  maxBonus: number;
  minDeposit: number;
  maxUses: number;
  usesPerUser: number;
  validUntil: string | Date | null;
  active: boolean;
  createdAt: string | Date;
  _count: { uses: number };
};

const EMPTY = { code: '', label: '', percent: '100', maxBonus: '10000', minDeposit: '5000', maxUses: '0', usesPerUser: '1', validUntil: '' };

export default function PromosClient({ initialData }: { initialData: Promo[] }) {
  const [promos, setPromos] = useState<Promo[]>(initialData);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (form.code.trim().length < 2) {
      setError('Code must be at least 2 characters');
      return;
    }
    setSaving(true);
    setError('');
    const result = await createPromo({
      code: form.code.trim(),
      label: form.label.trim() || null,
      percent: Number(form.percent) || 0,
      maxBonus: Math.round(Number(form.maxBonus || 0) * 100),
      minDeposit: Math.round(Number(form.minDeposit || 0) * 100),
      maxUses: Number(form.maxUses) || 0,
      usesPerUser: Number(form.usesPerUser) || 0,
      validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : null,
    });
    setSaving(false);
    if ('ok' in result) {
      setDialogOpen(false);
      setForm(EMPTY);
    } else {
      setError(result.error || 'Failed to create promo');
    }
  };

  const handleToggle = async (promo: Promo) => {
    const result = await togglePromoActive(promo.id, !promo.active);
    if ('ok' in result) {
      setPromos((prev) => prev.map((p) => p.id === promo.id ? { ...p, active: !p.active } : p));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Promo Codes</h1>
          <p className="text-sm text-textDark">Deposit bonuses. Amounts in USD. 0 = unlimited.</p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setError(''); setDialogOpen(true); }}>+ New Promo</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>All Promos ({promos.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {promos.length === 0 ? (
              <p className="text-sm text-textDark text-center py-8">No promo codes yet.</p>
            ) : (
              promos.map((p) => (
                <div key={p.id} className="flex items-center gap-4 p-3 bg-background rounded-lg border border-border">
                  <Toggle checked={p.active} onChange={() => handleToggle(p)} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-bold text-foreground">{p.code}</p>
                    <p className="text-[11px] text-textDark">
                      {p.percent}% bonus · max ${(p.maxBonus / 100).toFixed(2)} · min dep ${(p.minDeposit / 100).toFixed(2)} · used {p._count.uses}{p.maxUses > 0 ? `/${p.maxUses}` : ''}
                    </p>
                  </div>
                  <Badge variant={p.active ? 'success' : 'neutral'}>{p.active ? 'active' : 'off'}</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogHeader onClose={() => setDialogOpen(false)}>
          <h2 className="text-lg font-bold text-foreground">New Promo Code</h2>
        </DialogHeader>
        <DialogContent className="space-y-4">
          {error && <p className="text-xs text-red font-semibold">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="WELCOME100" />
            <Input label="Bonus %" type="number" min={1} max={100} value={form.percent} onChange={(e) => setForm({ ...form, percent: e.target.value })} />
            <Input label="Label (optional)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            <Input label="Valid until (optional)" type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
            <Input label="Max bonus ($)" type="number" min={0} value={form.maxBonus} onChange={(e) => setForm({ ...form, maxBonus: e.target.value })} />
            <Input label="Min deposit ($)" type="number" min={0} value={form.minDeposit} onChange={(e) => setForm({ ...form, minDeposit: e.target.value })} />
            <Input label="Max uses (0 = ∞)" type="number" min={0} value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} />
            <Input label="Uses per user (0 = ∞)" type="number" min={0} value={form.usesPerUser} onChange={(e) => setForm({ ...form, usesPerUser: e.target.value })} />
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button isLoading={saving} onClick={handleCreate}>Create</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
