'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/admin/ui/card';
import { StatsCard } from '@/components/admin/ui/stats-card';
import { Skeleton } from '@/components/admin/ui/skeleton';

export default function KycPage() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">KYC Verification</h1>
        <p className="text-sm text-textDark">Review and verify user identity documents</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatsCard title="Pending Review" value={0} />
        <StatsCard title="Approved" value={0} />
        <StatsCard title="Rejected" value={0} />
      </div>

      <Card>
        <CardContent>
          <div className="text-center py-12">
            <svg className="w-12 h-12 mx-auto mb-3 text-textDark" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm font-medium text-white">KYC system not yet implemented</p>
            <p className="text-xs text-textDark mt-1">KYC submissions will appear here once the KycSubmission model is added</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
