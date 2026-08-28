'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/admin/ui/card';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Reports</h1>
        <p className="text-sm text-textDark">View platform analytics and reports</p>
      </div>
      <Card>
        <CardContent>
          <p className="text-sm text-textDark text-center py-8">Coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
