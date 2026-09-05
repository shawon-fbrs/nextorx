'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/admin/ui/card';
import { Button } from '@/components/admin/ui/button';
import { Badge } from '@/components/admin/ui/badge';
import { Input } from '@/components/admin/ui/input';
import { Select } from '@/components/admin/ui/select';
import { Toggle } from '@/components/admin/ui/toggle';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from '@/components/admin/ui/dialog';
import { Skeleton } from '@/components/admin/ui/skeleton';

type Method = {
  id: string;
  name: string;
  label: string;
  active: boolean;
  sortOrder: number;
  logoUrl: string | null;
  networkName: string;
  networkLogoUrl: string | null;
  region: string;
  minDeposit: number;
  maxDeposit: number;
  minWithdraw: number;
  maxWithdraw: number;
  accountAddress: string | null;
  accountQrUrl: string | null;
};

const REGIONS = [
  { value: 'International', label: 'International (USD)' },
  { value: 'Bangladesh', label: 'Bangladesh' },
  { value: 'India', label: 'India' },
  { value: 'United States', label: 'United States' },
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'European Union', label: 'European Union' },
];

const usdToCents = (v: string) => Math.round((Number(v) || 0) * 100);

const EMPTY_FORM = {
  name: '', label: '', logoUrl: '', networkName: '', networkLogoUrl: '',
  region: 'International', minDeposit: '10', maxDeposit: '100000',
  minWithdraw: '5', maxWithdraw: '100000', qrUrl: '', address: '',
};

export default function PaymentMethodsPage() {
  const [methods, setMethods] = useState<Method[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState(EMPTY_FORM);
  const [picker, setPicker] = useState<null | { target: 'newLogo' | 'newNetworkLogo' | 'newQr' | 'editLogo' | 'editNetworkLogo' | 'editQr'; label: string }>(null);

  const fetchMethods = useCallback(async () => {
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

  const existingByName = methods.find((m) => m.name === form.name.trim().toUpperCase()) ?? null;

  const onNameChange = (v: string) => {
    const name = v.toUpperCase();
    setForm((f) => {
      const next = { ...f, name };
      const match = methods.find((m) => m.name === name.trim());
      if (match) {
        if (!next.logoUrl) next.logoUrl = match.logoUrl ?? '';
        if (!next.networkLogoUrl) next.networkLogoUrl = match.networkLogoUrl ?? '';
        if (!next.qrUrl) next.qrUrl = match.accountQrUrl ?? '';
        if (!next.address) next.address = match.accountAddress ?? '';
      }
      return next;
    });
    void existingByName;
  };

  const addMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.label.trim()) {
      setError('Code and label are required');
      return;
    }
    if (!form.logoUrl.trim()) {
      setError('Logo is required — pick one from the media library');
      return;
    }
    setActing('add');
    try {
      const res = await fetch('/api/admin/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          label: form.label.trim(),
          logoUrl: form.logoUrl.trim(),
          networkName: form.networkName.trim() || undefined,
          networkLogoUrl: form.networkLogoUrl.trim() || undefined,
          region: form.region,
          minDeposit: usdToCents(form.minDeposit),
          maxDeposit: usdToCents(form.maxDeposit),
          minWithdraw: usdToCents(form.minWithdraw),
          maxWithdraw: usdToCents(form.maxWithdraw),
          accountQrUrl: form.qrUrl.trim() || undefined,
          accountAddress: form.address.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to add method');
        return;
      }
      setForm(EMPTY_FORM);
      fetchMethods();
    } catch {
      setError('Failed to add method');
    } finally {
      setActing(null);
    }
  };

  const toggleMethod = async (m: Method) => {
    setActing(m.id);
    try {
      await fetch('/api/admin/payment-methods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: m.id, active: !m.active }),
      });
      fetchMethods();
    } catch {
    } finally {
      setActing(null);
    }
  };

  const saveEdit = async (id: string) => {
    if (!edit.label.trim() || !edit.logoUrl.trim()) {
      setError('Label and logo are required');
      return;
    }
    setActing(id);
    setError('');
    try {
      const res = await fetch('/api/admin/payment-methods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          label: edit.label.trim(),
          logoUrl: edit.logoUrl.trim(),
          networkName: edit.networkName.trim(),
          networkLogoUrl: edit.networkLogoUrl.trim() || undefined,
          region: edit.region,
          minDeposit: usdToCents(edit.minDeposit),
          maxDeposit: usdToCents(edit.maxDeposit),
          minWithdraw: usdToCents(edit.minWithdraw),
          maxWithdraw: usdToCents(edit.maxWithdraw),
          accountQrUrl: edit.qrUrl.trim() || undefined,
          accountAddress: edit.address.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update method');
        return;
      }
      setEditingId(null);
      fetchMethods();
    } catch {
      setError('Failed to update method');
    } finally {
      setActing(null);
    }
  };

  const deleteMethod = async (m: Method) => {
    if (!confirm(`Delete method "${m.label}"? Depositors will no longer see it.`)) return;
    setActing(m.id);
    try {
      await fetch('/api/admin/payment-methods', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: m.id }),
      });
      fetchMethods();
    } catch {
    } finally {
      setActing(null);
    }
  };

  const applyPick = (url: string | null) => {
    if (!picker) return;
    const value = url ?? '';
    if (picker.target === 'newLogo') setForm((f) => ({ ...f, logoUrl: value }));
    else if (picker.target === 'newNetworkLogo') setForm((f) => ({ ...f, networkLogoUrl: value }));
    else if (picker.target === 'newQr') setForm((f) => ({ ...f, qrUrl: value }));
    else if (picker.target === 'editLogo') setEdit((f) => ({ ...f, logoUrl: value }));
    else if (picker.target === 'editNetworkLogo') setEdit((f) => ({ ...f, networkLogoUrl: value }));
    else if (picker.target === 'editQr') setEdit((f) => ({ ...f, qrUrl: value }));
    setPicker(null);
  };

  const imageField = (
    label: string,
    value: string,
    pickTarget: NonNullable<typeof picker>['target'],
    clear: () => void,
  ) => (
    <div>
      <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">{label}</label>
      <div className="flex items-center gap-2">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="w-10 h-10 rounded-lg object-contain bg-white" />
        ) : (
          <span className="w-10 h-10 rounded-lg bg-surface border border-dashed border-border flex items-center justify-center text-textDark">+</span>
        )}
        <Button size="sm" variant="secondary" onClick={() => setPicker({ target: pickTarget, label })}>
          {value ? 'Change' : 'Pick'}
        </Button>
        {value && (
          <Button size="sm" variant="ghost" onClick={clear}>Clear</Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Payment Methods</h1>
        <p className="text-sm text-textDark">Rails, limits, wallets, and artwork. Amounts in USD.</p>
      </div>

      {error && <p className="text-xs text-red font-semibold">{error}</p>}

      <Card>
        <CardHeader><CardTitle>Add Method</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={addMethod} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Input label="Code (e.g. USDT)" value={form.name} onChange={(e) => onNameChange(e.target.value)} placeholder="USDT" />
            <Input label="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="USDT (Tether)" />
            <Select label="Region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} options={REGIONS} />
            {imageField('Logo (required)', form.logoUrl, 'newLogo', () => setForm((f) => ({ ...f, logoUrl: '' })))}
            <Input label="Network" value={form.networkName} onChange={(e) => setForm({ ...form, networkName: e.target.value })} placeholder="TRC20" />
            {imageField('Network logo', form.networkLogoUrl, 'newNetworkLogo', () => setForm((f) => ({ ...f, networkLogoUrl: '' })))}
            <Input label="Min deposit ($)" type="number" min={0} value={form.minDeposit} onChange={(e) => setForm({ ...form, minDeposit: e.target.value })} />
            <Input label="Max deposit ($)" type="number" min={0} value={form.maxDeposit} onChange={(e) => setForm({ ...form, maxDeposit: e.target.value })} />
            <Input label="Min withdraw ($)" type="number" min={0} value={form.minWithdraw} onChange={(e) => setForm({ ...form, minWithdraw: e.target.value })} />
            <Input label="Max withdraw ($)" type="number" min={0} value={form.maxWithdraw} onChange={(e) => setForm({ ...form, maxWithdraw: e.target.value })} />
            <Input label="Deposit address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Wallet shown to depositors" />
            {imageField('Deposit QR', form.qrUrl, 'newQr', () => setForm((f) => ({ ...f, qrUrl: '' })))}
            <div className="flex items-end">
              <Button type="submit" isLoading={acting === 'add'} className="w-full">Add Method</Button>
            </div>
          </form>
          {existingByName && (
            <p className="text-[11px] text-blue mt-2">“{existingByName.name}” exists — images and address prefilled from it. Change the network to add a variant.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All Methods ({isLoading ? '…' : methods.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : methods.length === 0 ? (
            <p className="text-sm text-textDark text-center py-8">No payment methods. Deposits are disabled until one is added.</p>
          ) : (
            <div className="space-y-3">
              {methods.map((m) => (
                <div key={m.id} className="p-4 bg-background rounded-xl border border-border space-y-3">
                  <div className="flex items-center gap-3">
                    <Toggle checked={m.active} onChange={() => toggleMethod(m)} size="sm" />
                    {m.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.logoUrl} alt={m.label} className="w-9 h-9 rounded-full object-contain bg-white" />
                    ) : (
                      <span className="w-9 h-9 rounded-full bg-surface flex items-center justify-center text-sm font-bold text-white">{m.label.slice(0, 1)}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">{m.label} <span className="text-textDark font-mono text-xs">({m.name}{m.networkName ? ` · ${m.networkName}` : ''})</span></p>
                      <p className="text-[11px] text-textDark">{m.region} · dep ${(m.minDeposit / 100).toFixed(0)}–${(m.maxDeposit / 100).toFixed(0)} · wd ${(m.minWithdraw / 100).toFixed(0)}–${(m.maxWithdraw / 100).toFixed(0)}</p>
                    </div>
                    <Badge variant={m.active ? 'success' : 'neutral'}>{m.active ? 'active' : 'off'}</Badge>
                    {editingId === m.id ? (
                      <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => startEdit(m)}>Edit</Button>
                    )}
                    <Button size="sm" variant="danger" isLoading={acting === m.id} onClick={() => deleteMethod(m)}>Delete</Button>
                  </div>

                  {editingId === m.id && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-3 border-t border-border">
                      <Input label="Label" value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} />
                      <Select label="Region" value={edit.region} onChange={(e) => setEdit({ ...edit, region: e.target.value })} options={REGIONS} />
                      <Input label="Network" value={edit.networkName} onChange={(e) => setEdit({ ...edit, networkName: e.target.value })} />
                      {imageField('Logo (required)', edit.logoUrl, 'editLogo', () => setEdit((f) => ({ ...f, logoUrl: '' })))}
                      {imageField('Network logo', edit.networkLogoUrl, 'editNetworkLogo', () => setEdit((f) => ({ ...f, networkLogoUrl: '' })))}
                      {imageField('Deposit QR', edit.qrUrl, 'editQr', () => setEdit((f) => ({ ...f, qrUrl: '' })))}
                      <Input label="Min deposit ($)" type="number" min={0} value={edit.minDeposit} onChange={(e) => setEdit({ ...edit, minDeposit: e.target.value })} />
                      <Input label="Max deposit ($)" type="number" min={0} value={edit.maxDeposit} onChange={(e) => setEdit({ ...edit, maxDeposit: e.target.value })} />
                      <Input label="Min withdraw ($)" type="number" min={0} value={edit.minWithdraw} onChange={(e) => setEdit({ ...edit, minWithdraw: e.target.value })} />
                      <Input label="Max withdraw ($)" type="number" min={0} value={edit.maxWithdraw} onChange={(e) => setEdit({ ...edit, maxWithdraw: e.target.value })} />
                      <div className="lg:col-span-2">
                        <Input label="Deposit address" value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} />
                      </div>
                      <div className="flex items-end">
                        <Button isLoading={acting === m.id} onClick={() => saveEdit(m.id)} className="w-full">Save Changes</Button>
                      </div>
                    </div>
                  )}

                  {!editingId && m.accountAddress && (
                    <p className="text-[11px] font-mono text-textDark truncate">→ {m.accountAddress}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {picker && (
        <ResourcePicker
          title={picker.label}
          onClose={() => setPicker(null)}
          onPick={applyPick}
        />
      )}
    </div>
  );

  function startEdit(m: Method) {
    setEditingId(m.id);
    setEdit({
      name: m.name, label: m.label, logoUrl: m.logoUrl ?? '',
      networkName: m.networkName ?? '', networkLogoUrl: m.networkLogoUrl ?? '',
      region: m.region, minDeposit: String(m.minDeposit / 100),
      maxDeposit: String(m.maxDeposit / 100), minWithdraw: String(m.minWithdraw / 100),
      maxWithdraw: String(m.maxWithdraw / 100), qrUrl: m.accountQrUrl ?? '',
      address: m.accountAddress ?? '',
    });
  }
}

function ResourcePicker({
  title,
  onClose,
  onPick,
}: {
  title: string;
  onClose: () => void;
  onPick: (url: string | null) => void;
}) {
  const [cats, setCats] = useState<Array<{ id: string; name: string; assets: Array<{ id: string; url: string; filename: string }> }>>([]);
  const [catId, setCatId] = useState<string>('');

  useEffect(() => {
    fetch('/api/admin/resources')
      .then((r) => r.json())
      .then((d) => {
        const list = d.categories ?? [];
        setCats(list);
        if (list.length > 0) setCatId(list[0].id);
      })
      .catch(() => {});
  }, []);

  const assets = cats.find((c) => c.id === catId)?.assets ?? [];

  return (
    <Dialog open onClose={onClose}>
      <DialogHeader onClose={onClose}>
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </DialogHeader>
      <DialogContent className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          {cats.map((c) => (
            <button
              key={c.id}
              onClick={() => setCatId(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${catId === c.id ? 'border-blue/50 bg-blue/10 text-white' : 'border-border text-textDark'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
        {assets.length === 0 ? (
          <p className="text-xs text-textDark text-center py-6">No images. Upload some under Resources first.</p>
        ) : (
          <div className="grid grid-cols-4 gap-2 max-h-72 overflow-y-auto">
            {assets.map((a) => (
              <button key={a.id} onClick={() => onPick(a.url)} className="border border-border rounded-lg overflow-hidden hover:border-blue/50 bg-black/40" title={a.filename}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt={a.filename} className="w-full h-16 object-contain" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="ghost" onClick={() => onPick(null)}>Clear</Button>
      </DialogFooter>
    </Dialog>
  );
}
