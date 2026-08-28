'use client';

import { useState, useMemo } from 'react';
import { mockKyc, MockKyc } from '@/lib/mock-data/kyc';
import { SearchInput } from '@/components/admin/ui/search-input';
import { Badge } from '@/components/admin/ui/badge';
import { Card, CardContent } from '@/components/admin/ui/card';
import { Button } from '@/components/admin/ui/button';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from '@/components/admin/ui/dialog';
import { Textarea } from '@/components/admin/ui/textarea';
import { StatsCard } from '@/components/admin/ui/stats-card';
import { Tabs } from '@/components/admin/ui/tabs';
import { Alert } from '@/components/admin/ui/alert';

export default function KycPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedKyc, setSelectedKyc] = useState<MockKyc | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const filteredKyc = useMemo(() => {
    let result = [...mockKyc];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (k) => k.userName.toLowerCase().includes(s) || k.userEmail.toLowerCase().includes(s)
      );
    }
    if (statusFilter !== 'all') result = result.filter((k) => k.status === statusFilter);
    return result;
  }, [search, statusFilter]);

  const stats = useMemo(() => ({
    pending: mockKyc.filter((k) => k.status === 'pending').length,
    approved: mockKyc.filter((k) => k.status === 'approved').length,
    rejected: mockKyc.filter((k) => k.status === 'rejected').length,
  }), []);

  const handleApprove = (kyc: MockKyc) => {
    alert(`Approved KYC for ${kyc.userName}`);
    setSelectedKyc(null);
  };

  const handleReject = (kyc: MockKyc) => {
    if (!rejectReason.trim()) {
      alert('Please enter a rejection reason');
      return;
    }
    alert(`Rejected KYC for ${kyc.userName}: ${rejectReason}`);
    setRejectReason('');
    setSelectedKyc(null);
  };

  const getDocTypeLabel = (type: string) => {
    switch (type) {
      case 'passport': return 'Passport';
      case 'id_card': return 'ID Card';
      case 'drivers_license': return "Driver's License";
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">KYC Verification</h1>
        <p className="text-sm text-textDark">Review and verify user identity documents</p>
      </div>

      {/* Pending Alert */}
      {stats.pending > 0 && (
        <Alert variant="warning" title={`${stats.pending} KYC submissions pending review`}>
          Users cannot make withdrawals until their identity is verified.
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatsCard title="Pending Review" value={stats.pending} />
        <StatsCard title="Approved" value={stats.approved} />
        <StatsCard title="Rejected" value={stats.rejected} />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'all', label: 'All', count: mockKyc.length },
          { id: 'pending', label: 'Pending', count: stats.pending },
          { id: 'approved', label: 'Approved', count: stats.approved },
          { id: 'rejected', label: 'Rejected', count: stats.rejected },
        ]}
        onChange={(id) => setStatusFilter(id)}
      />

      {/* Search */}
      <Card>
        <CardContent>
          <SearchInput
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* KYC List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredKyc.map((kyc) => (
          <Card key={kyc.id} className="hover:border-blue/50 transition-colors">
            <CardContent>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">{kyc.userName}</h3>
                  <p className="text-[11px] text-textDark">{kyc.userEmail}</p>
                </div>
                <Badge
                  variant={
                    kyc.status === 'approved' ? 'success' : kyc.status === 'rejected' ? 'danger' : 'warning'
                  }
                >
                  {kyc.status}
                </Badge>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex justify-between">
                  <span className="text-[11px] text-textDark">Document Type</span>
                  <span className="text-[11px] text-white">{getDocTypeLabel(kyc.documentType)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-textDark">Submitted</span>
                  <span className="text-[11px] text-white">{new Date(kyc.submittedAt).toLocaleDateString()}</span>
                </div>
                {kyc.reviewedAt && (
                  <div className="flex justify-between">
                    <span className="text-[11px] text-textDark">Reviewed</span>
                    <span className="text-[11px] text-white">{new Date(kyc.reviewedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {kyc.rejectionReason && (
                <div className="p-2 bg-red/10 rounded-lg mb-3">
                  <p className="text-[11px] text-red">{kyc.rejectionReason}</p>
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedKyc(kyc)}
                >
                  Review
                </Button>
                {kyc.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        setSelectedKyc(kyc);
                        setRejectReason('');
                      }}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(kyc)}
                    >
                      Approve
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Review Modal */}
      <Dialog open={!!selectedKyc} onClose={() => setSelectedKyc(null)}>
        <DialogHeader onClose={() => setSelectedKyc(null)}>
          <h2 className="text-lg font-bold text-white">KYC Review — {selectedKyc?.userName}</h2>
        </DialogHeader>
        <DialogContent>
          {selectedKyc && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-textDark uppercase">User</p>
                  <p className="text-sm text-white">{selectedKyc.userName}</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase">Email</p>
                  <p className="text-sm text-white">{selectedKyc.userEmail}</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase">Document Type</p>
                  <p className="text-sm text-white">{getDocTypeLabel(selectedKyc.documentType)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-textDark uppercase">Status</p>
                  <Badge
                    variant={
                      selectedKyc.status === 'approved' ? 'success' : selectedKyc.status === 'rejected' ? 'danger' : 'warning'
                    }
                  >
                    {selectedKyc.status}
                  </Badge>
                </div>
              </div>

              {/* Document Preview Placeholders */}
              <div className="space-y-3">
                <p className="text-[11px] text-textDark uppercase">Documents</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="aspect-[1.6] bg-background border border-border rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <svg className="w-8 h-8 mx-auto mb-2 text-textDark" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="text-[11px] text-textDark">Front</p>
                    </div>
                  </div>
                  <div className="aspect-[1.6] bg-background border border-border rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <svg className="w-8 h-8 mx-auto mb-2 text-textDark" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="text-[11px] text-textDark">Back</p>
                    </div>
                  </div>
                </div>
                <div className="aspect-video bg-background border border-border rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-8 h-8 mx-auto mb-2 text-textDark" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="text-[11px] text-textDark">Selfie</p>
                  </div>
                </div>
              </div>

              {selectedKyc.status === 'pending' && (
                <div className="pt-4 border-t border-border space-y-3">
                  <Textarea
                    label="Rejection Reason (if rejecting)"
                    placeholder="Enter reason for rejection..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setSelectedKyc(null)}>Close</Button>
          {selectedKyc?.status === 'pending' && (
            <>
              <Button variant="danger" onClick={() => selectedKyc && handleReject(selectedKyc)}>Reject</Button>
              <Button onClick={() => selectedKyc && handleApprove(selectedKyc)}>Approve</Button>
            </>
          )}
        </DialogFooter>
      </Dialog>
    </div>
  );
}
