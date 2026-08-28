'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/admin/ui/card';

export default function OtcPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">OTC Pairs</h1>
        <p className="text-sm text-textDark">Manage OTC asset pairs</p>
      </div>
      <Card>
        <CardContent>
          <p className="text-sm text-textDark text-center py-8">Coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
