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

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-sm text-textDark">Configure platform settings</p>
      </div>

      {saved && <Alert variant="success" title="Settings saved successfully">Your changes have been saved.</Alert>}

      <Tabs
        tabs={[
          { id: 'general', label: 'General' },
          { id: 'trading', label: 'Trading' },
          { id: 'notifications', label: 'Notifications' },
          { id: 'security', label: 'Security' },
        ]}
        onChange={setActiveTab}
      />

      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input label="Platform Name" defaultValue="Nextorx" />
              <Input label="Support Email" defaultValue="support@nextorx.com" />
              <Input label="Default Currency" defaultValue="USD" />
              <Textarea label="Platform Description" defaultValue="Binary options trading platform" rows={3} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Display</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                label="Default Language"
                value="en"
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'ar', label: 'Arabic' },
                  { value: 'es', label: 'Spanish' },
                  { value: 'fr', label: 'French' },
                  { value: 'pt', label: 'Portuguese' },
                  { value: 'tr', label: 'Turkish' },
                ]}
              />
              <Select
                label="Timezone"
                value="utc"
                options={[
                  { value: 'utc', label: 'UTC' },
                  { value: 'est', label: 'EST (UTC-5)' },
                  { value: 'pst', label: 'PST (UTC-8)' },
                  { value: 'cet', label: 'CET (UTC+1)' },
                ]}
              />
              <Toggle label="Maintenance Mode" description="Disable platform for all users" />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'trading' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Trade Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input label="Default Trade Duration (seconds)" type="number" defaultValue="60" />
              <Input label="Minimum Trade Amount ($)" type="number" defaultValue="1" />
              <Input label="Maximum Trade Amount ($)" type="number" defaultValue="5000" />
              <Input label="Default Payout (%)" type="number" defaultValue="80" />
              <Select
                label="Default Chart Type"
                value="candlestick"
                options={[
                  { value: 'candlestick', label: 'Candlestick' },
                  { value: 'line', label: 'Line' },
                  { value: 'area', label: 'Area' },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>OTC Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Toggle label="Enable OTC Trading" description="Allow trading on weekends via OTC pairs" checked />
              <Input label="OTC Payout Modifier (%)" type="number" defaultValue="2" helperText="Added to regular payout for OTC" />
              <Input label="OTC Spread Multiplier" type="number" defaultValue="1.5" helperText="Multiplier for OTC spread" />
              <Toggle label="Auto-disable OTC on Monday" description="Automatically disable OTC pairs when market opens" />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Toggle label="Deposit Confirmation" description="Notify users on successful deposit" checked />
              <Toggle label="Withdrawal Processed" description="Notify users when withdrawal is processed" checked />
              <Toggle label="KYC Status Update" description="Notify users on KYC approval/rejection" checked />
              <Toggle label="Large Trade Alert" description="Notify admin on trades > $1000" checked />
              <Toggle label="Daily Summary" description="Send daily platform summary to admin" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhook Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input label="Webhook URL" placeholder="https://..." />
              <Select
                label="Events"
                value="all"
                options={[
                  { value: 'all', label: 'All Events' },
                  { value: 'deposits', label: 'Deposits Only' },
                  { value: 'withdrawals', label: 'Withdrawals Only' },
                  { value: 'kyc', label: 'KYC Events' },
                ]}
              />
              <Toggle label="Enable Webhooks" description="Send HTTP callbacks on events" />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Toggle label="Require 2FA for Admin" description="Enforce two-factor authentication for all admin accounts" checked />
              <Toggle label="Require 2FA for Users" description="Enforce two-factor authentication for trader accounts" />
              <Input label="Session Timeout (minutes)" type="number" defaultValue="30" />
              <Input label="Max Login Attempts" type="number" defaultValue="5" helperText="Lock account after failed attempts" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input label="API Rate Limit (req/min)" type="number" defaultValue="100" />
              <Toggle label="Enable IP Whitelist" description="Restrict API access to whitelisted IPs" />
              <Textarea label="Whitelisted IPs" placeholder="Enter IP addresses, one per line" rows={3} />
              <Toggle label="Enable API Logging" description="Log all API requests for audit" checked />
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
