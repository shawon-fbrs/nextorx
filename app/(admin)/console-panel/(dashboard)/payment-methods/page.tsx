'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/admin/ui/card';
import { Button } from '@/components/admin/ui/button';
import { Badge } from '@/components/admin/ui/badge';
import { Input } from '@/components/admin/ui/input';
import { Toggle } from '@/components/admin/ui/toggle';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from '@/components/admin/ui/dialog';
import { Skeleton } from '@/components/admin/ui/skeleton';

type Method = {
  id: string;
  name: string;
  label: string;
  active: boolean;
  networkName: string;
  region: string;
  minDeposit: number;
  maxDeposit: number;
  minWithdraw: number;
  maxWithdraw: number;
  accountAddress: string | null;
};

const EMPTY = {
  name: '', label: '', networkName: '', region: 'International',
  minDeposit: '10', maxDeposit: '100000', minWithdraw: '5', maxWithdraw: '100000',
  accountAddress: '',
};

export default function PaymentMethodsPage() {
  const [methods, setMethods] = useState<Method[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchMethods = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/payment-methods');
      const data = await res.json();
      setMethods(data.methods ?? []);
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMethods();
  }, [fetchMethods]);

  const handleCreate = async () => {
    if (form.name.trim().length < 1 || form.label.trim().length < 1) {
      setError('Name and label are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          label: form.label.trim(),
          networkName: form.networkName.trim(),
          region: form.region.trim() || undefined,
          minDeposit: Math.round(Number(form.minDeposit || 0) * 100),
          maxDeposit: Math.round(Number(form.maxDeposit || 0) * 100),
          minWithdraw: Math.round(Number(form.minWithdraw || 0) * 100),
          maxWithdraw: Math.round(Number(form.maxWithdraw || 0) * 100),
          accountAddress: form.accountAddress.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create method');
        return;
      }
      setDialogOpen(false);
      setForm(EMPTY);
      fetchMethods();
    } catch {
      setError('Failed to create method');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (m: Method) => {
    try {
      await fetch('/api/admin/payment-methods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: m.id, active: !m.active }),
      });
      fetchMethods();
    } catch {
    }
  };

  const handleAddress = async (m: Method, address: string) => {
    try {
      await fetch('/api/admin/payment-methods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: m.id, accountAddress: address }),
      });
      fetchMethods();
    } catch {
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Payment Methods</h1>
          <p className="text-sm text-textDark">Deposit addresses and limits. Amounts in USD.</p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setError(''); setDialogOpen(true); }}>+ New Method</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>All Methods ({methods.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : methods.length === 0 ? (
            <p className="text-sm text-textDark text-center py-8">No payment methods. Deposits are disabled until one is added.</p>
          ) : (
            <div className="space-y-3">
              {methods.map((m) => (
                <div key={m.id} className="p-3 bg-background rounded-lg border border-border space-y-2">
                  <div className="flex items-center gap-4">
                    <Toggle checked={m.active} onChange={() => handleToggle(m)} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">{m.label} <span className="text-textDark font-mono text-xs">({m.name}{m.networkName ? ` · ${m.networkName}` : ''})</span></p>
                      <p className="text-[11px] text-textDark">
                        dep ${(m.minDeposit / 100).toFixed(2)}–${(m.maxDeposit / 100).toFixed(2)} ·
                        wd ${(m.minWithdraw / 100).toFixed(2)}–${(m.maxWithdraw / 100).toFixed(2)}
                      </p>
                    </div>
                    <Badge variant={m.active ? 'success' : 'neutral'}>{m.active ? 'active' : 'off'}</Badge>
                  </div>
                  <AddressEditor method={m} onSave={handleAddress} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogHeader onClose={() => setDialogOpen(false)}>
          <h2 className="text-lg font-bold text-white">New Payment Method</h2>
        </DialogHeader>
        <DialogContent className="space-y-4">
          {error && <p className="text-xs text-red font-semibold">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Code (e.g. USDT)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="USDT (Tether)" />
            <Input label="Network" value={form.networkName} onChange={(e) => setForm({ ...form, networkName: e.target.value })} placeholder="TRC20" />
            <Input label="Region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
            <Input label="Min deposit ($)" type="number" min={0} value={form.minDeposit} onChange={(e) => setForm({ ...form, minDeposit: e.target.value })} />
            <Input label="Max deposit ($)" type="number" min={0} value={form.maxDeposit} onChange={(e) => setForm({ ...form, maxDeposit: e.target.value })} />
            <Input label="Min withdraw ($)" type="number" min={0} value={form.minWithdraw} onChange={(e) => setForm({ ...form, minWithdraw: e.target.value })} />
            <Input label="Max withdraw ($)" type="number" min={0} value={form.maxWithdraw} onChange={(e) => setForm({ ...form, maxWithdraw: e.target.value })} />
          </div>
          <Input label="Deposit address (optional)" value={form.accountAddress} onChange={(e) => setForm({ ...form, accountAddress: e.target.value })} placeholder="Wallet address shown to depositors" />
        </DialogContent>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button isLoading={saving} onClick={handleCreate}>Create</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

function AddressEditor({ method, onSave }: { method: Method; onSave: (m: Method, address: string) => void }) {
  const [value, setValue] = useState(method.accountAddress ?? '');
  const [saved, setSaved] = useState(false);
  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(e) => { setValue(e.target.value); setSaved(false); }}
        placeholder="Deposit wallet address (empty = hidden from deposit page)"
        className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-xs text-white font-mono placeholder:text-text-dark placeholder:font-sans focus:outline-none focus:border-blue"
      />
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          onSave(method, value.trim());
          setSaved(true);
        }}
      >
        {saved ? 'Saved' : 'Save'}
      </Button>
    </div>
  );
}
