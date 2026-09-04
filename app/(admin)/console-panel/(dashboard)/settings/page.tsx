'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/admin/ui/card';
import { Input } from '@/components/admin/ui/input';
import { Button } from '@/components/admin/ui/button';
import { Toggle } from '@/components/admin/ui/toggle';
import { Tabs } from '@/components/admin/ui/tabs';
import { Alert } from '@/components/admin/ui/alert';
import { Badge } from '@/components/admin/ui/badge';
import { Skeleton } from '@/components/admin/ui/skeleton';

type Lever = {
  key: string;
  label: string;
  value: number;
};

const payoutRules = [
  { id: '1', condition: 'Reserve > 40%', action: 'increase' as const, payoutValue: 85, enabled: true },
  { id: '2', condition: 'Reserve 30-40%', action: 'increase' as const, payoutValue: 82, enabled: true },
  { id: '3', condition: 'Reserve 20-30%', action: 'decrease' as const, payoutValue: 75, enabled: true },
  { id: '4', condition: 'Reserve < 20%', action: 'decrease' as const, payoutValue: 65, enabled: true },
];

const withdrawalRules = [
  { id: '1', name: 'Auto Approve', condition: 'Amount < $200 AND reserve > 40%', action: 'auto_approve' as const, enabled: true },
  { id: '2', name: 'Manual Review', condition: 'Amount $200-$500 OR reserve < 40%', action: 'manual_review' as const, enabled: true },
  { id: '3', name: 'Senior Review', condition: 'Amount > $500 OR reserve < 20%', action: 'manual_review' as const, enabled: true },
  { id: '4', name: 'Block High Risk', condition: 'User risk score > 80', action: 'reject' as const, enabled: true },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('levers');
  const [levers, setLevers] = useState<Lever[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [rules, setRules] = useState(payoutRules);
  const [wRules, setWRules] = useState(withdrawalRules);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setLevers(d.settings ?? []))
      .catch(() => setError('Failed to load settings'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const values: Record<string, number> = {};
      for (const lever of levers) {
        if (!Number.isInteger(lever.value) || lever.value < 0) {
          setError(`Invalid value for ${lever.label}`);
          return;
        }
        values[lever.key] = lever.value;
      }
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = (id: string) => {
    setRules(rules.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const toggleWRule = (id: string) => {
    setWRules(wRules.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-20 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-96" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-sm text-textDark">Platform configuration and automation rules</p>
      </div>

      {saved && <Alert variant="success" title="Settings saved successfully">Your changes have been saved.</Alert>}
      {error && <Alert variant="danger" title="Error">{error}</Alert>}

      <Tabs
        tabs={[
          { id: 'levers', label: 'Platform Levers' },
          { id: 'payout-engine', label: 'Payout Engine' },
          { id: 'withdrawal-rules', label: 'Withdrawal Rules' },
        ]}
        onChange={setActiveTab}
      />

      {activeTab === 'levers' && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Platform Levers</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {levers.map((lever) => (
                  <Input
                    key={lever.key}
                    label={lever.label}
                    type="number"
                    min={0}
                    step={1}
                    value={lever.value}
                    onChange={(e) =>
                      setLevers(levers.map((l) => l.key === lever.key ? { ...l, value: Number(e.target.value) } : l))
                    }
                    helperText={lever.key}
                  />
                ))}
              </div>
              {levers.length === 0 && !error && (
                <p className="text-sm text-textDark">No settings found.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'payout-engine' && (
        <div className="space-y-6">
          <Alert variant="info" title="Track B — display only">
            Payout rules are not persisted yet. Changes here do not take effect.
          </Alert>
          <Card>
            <CardHeader>
              <CardTitle>Payout Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div key={rule.id} className="flex items-center gap-4 p-3 bg-background rounded-lg border border-border">
                    <Toggle checked={rule.enabled} onChange={() => toggleRule(rule.id)} size="sm" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{rule.condition}</span>
                        <Badge variant={rule.action === 'increase' ? 'success' : 'danger'}>
                          {rule.action} → {rule.payoutValue}%
                        </Badge>
                      </div>
                    </div>
                    <Input
                      type="number"
                      value={rule.payoutValue}
                      onChange={(e) => setRules(rules.map((r) => r.id === rule.id ? { ...r, payoutValue: Number(e.target.value) } : r))}
                      className="w-20"
                      min={50}
                      max={95}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'withdrawal-rules' && (
        <div className="space-y-6">
          <Alert variant="info" title="Track B — display only">
            Withdrawal rules are not persisted yet. Changes here do not take effect.
          </Alert>
          <Card>
            <CardHeader><CardTitle>Processing Rules</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {wRules.map((rule) => (
                  <div key={rule.id} className="flex items-center gap-4 p-3 bg-background rounded-lg border border-border">
                    <Toggle checked={rule.enabled} onChange={() => toggleWRule(rule.id)} size="sm" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{rule.name}</p>
                      <p className="text-[11px] text-textDark">{rule.condition}</p>
                    </div>
                    <Badge
                      variant={
                        rule.action === 'auto_approve' ? 'success' :
                        rule.action === 'manual_review' ? 'warning' :
                        rule.action === 'reject' ? 'danger' : 'info'
                      }
                    >
                      {rule.action.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'levers' && (
        <div className="flex justify-end">
          <Button onClick={handleSave} isLoading={saving}>Save Settings</Button>
        </div>
      )}
    </div>
  );
}
