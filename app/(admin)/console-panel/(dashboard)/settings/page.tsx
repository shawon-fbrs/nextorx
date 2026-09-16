import { getAdminSettings } from '@/lib/queries';
import SettingsClient from './settings-client';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const settings = await getAdminSettings();
  return <SettingsClient initialData={settings} />;
}
