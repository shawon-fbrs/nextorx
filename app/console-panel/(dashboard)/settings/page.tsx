'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/admin/ui/card';
import { Input } from '@/components/admin/ui/input';
import { Button } from '@/components/admin/ui/button';
import { Toggle } from '@/components/admin/ui/toggle';
import { Select } from '@/components/admin/ui/select';
import { Textarea } from '@/components/admin/ui/textarea';
import { Tabs } from '@/components/admin/ui/tabs';
import { Alert } from '@/components/admin/ui/alert';
import { Badge } from '@/components/admin/ui/badge';
import { payoutRules, withdrawalRules } from '@/lib/mock-data/treasury';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);
  const [rules, setRules] = useState(payoutRules);
  const [wRules, setWRules] = useState(withdrawalRules);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const toggleRule = (id: string) => {
    setRules(rules.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const toggleWRule = (id: string) => {
    setWRules(wRules.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-sm text-textDark">Platform configuration and automation rules</p>
      </div>

      {saved && <Alert variant="success" title="Settings saved successfully">Your changes have been saved.</Alert>}

      <Tabs
        tabs={[
          { id: 'general', label: 'General' },
          { id: 'trading', label: 'Trading' },
          { id: 'payout-engine', label: 'Payout Engine' },
          { id: 'withdrawal-rules', label: 'Withdrawal Rules' },
          { id: 'notifications', label: 'Notifications' },
          { id: 'security', label: 'Security' },
        ]}
        onChange={setActiveTab}
      />

      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Platform Info</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input label="Platform Name" defaultValue="Nextorx" />
              <Input label="Support Email" defaultValue="support@nextorx.com" />
              <Input label="Default Currency" defaultValue="USD" />
              <Textarea label="Platform Description" defaultValue="Binary options trading platform" rows={3} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Display</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Select label="Default Language" value="en" options={[{ value: 'en', label: 'English' }, { value: 'ar', label: 'Arabic' }, { value: 'es', label: 'Spanish' }]} />
              <Select label="Timezone" value="utc" options={[{ value: 'utc', label: 'UTC' }, { value: 'est', label: 'EST (UTC-5)' }]} />
              <Toggle label="Maintenance Mode" description="Disable platform for all users" />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'trading' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Trade Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input label="Default Trade Duration (seconds)" type="number" defaultValue="60" />
              <Input label="Minimum Trade Amount ($)" type="number" defaultValue="1" />
              <Input label="Maximum Trade Amount ($)" type="number" defaultValue="5000" />
              <Input label="Default Payout (%)" type="number" defaultValue="80" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>OTC Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Toggle label="Enable OTC Trading" description="Allow trading on weekends" checked />
              <Input label="OTC Payout Modifier (%)" type="number" defaultValue="2" helperText="Added to regular payout for OTC" />
              <Input label="OTC Spread Multiplier" type="number" defaultValue="1.5" />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'payout-engine' && (
        <div className="space-y-6">
          <Alert variant="info" title="Dynamic Payout Engine">
            Payouts auto-adjust based on treasury health. Rules are evaluated daily at 06:00 UTC. Higher priority rules override lower ones.
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

          <Card>
            <CardHeader><CardTitle>Current Payout Status</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3 bg-background rounded-lg border border-border">
                  <p className="text-[10px] text-textDark uppercase">Current Payout</p>
                  <p className="text-xl font-bold text-green">80%</p>
                </div>
                <div className="p-3 bg-background rounded-lg border border-border">
                  <p className="text-[10px] text-textDark uppercase">House Edge</p>
                  <p className="text-xl font-bold text-white">20%</p>
                </div>
                <div className="p-3 bg-background rounded-lg border border-border">
                  <p className="text-[10px] text-textDark uppercase">Min Payout</p>
                  <p className="text-xl font-bold text-red">65%</p>
                </div>
                <div className="p-3 bg-background rounded-lg border border-border">
                  <p className="text-[10px] text-textDark uppercase">Max Payout</p>
                  <p className="text-xl font-bold text-blue">85%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'withdrawal-rules' && (
        <div className="space-y-6">
          <Alert variant="info" title="Withdrawal Rules Engine">
            Withdrawals are processed automatically based on these rules. Manual review required for amounts above $500 or when reserve is low.
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

          <Card>
            <CardHeader><CardTitle>Limits</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Input label="Min Withdrawal ($)" type="number" defaultValue="10" />
                <Input label="Max Per Transaction ($)" type="number" defaultValue="5000" />
                <Input label="Max Per Day/User ($)" type="number" defaultValue="2000" />
                <Input label="Max Daily Total (% of treasury)" type="number" defaultValue="20" />
              </div>
              <Toggle label="Require Same Method" description="Withdrawal method must match deposit method" checked />
              <Toggle label="Require 1x Wager" description="User must wager 1x deposit before withdrawal" checked />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Email Notifications</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Toggle label="Deposit Confirmation" checked />
              <Toggle label="Withdrawal Processed" checked />
              <Toggle label="KYC Status Update" checked />
              <Toggle label="Large Trade Alert (>$1000)" checked />
              <Toggle label="Daily Summary" />
              <Toggle label="Treasury Warning" checked />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Alert Thresholds</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input label="Low Reserve Alert (%)" type="number" defaultValue="20" />
              <Input label="High Withdrawal Ratio (%)" type="number" defaultValue="100" />
              <Input label="Large Withdrawal ($)" type="number" defaultValue="2000" />
              <Input label="Win Rate Warning (%)" type="number" defaultValue="46" />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Authentication</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Toggle label="Require 2FA for Admin" checked />
              <Toggle label="Require 2FA for Users" />
              <Input label="Session Timeout (minutes)" type="number" defaultValue="30" />
              <Input label="Max Login Attempts" type="number" defaultValue="5" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>API Security</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input label="API Rate Limit (req/min)" type="number" defaultValue="100" />
              <Toggle label="Enable IP Whitelist" />
              <Textarea label="Whitelisted IPs" placeholder="Enter IP addresses, one per line" rows={3} />
              <Toggle label="Enable API Logging" checked />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave}>Save Settings</Button>
      </div>
    </div>
  );
}
