'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/admin/ui/card';
import { Button } from '@/components/admin/ui/button';
import { Badge } from '@/components/admin/ui/badge';
import { Input } from '@/components/admin/ui/input';
import { Select } from '@/components/admin/ui/select';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from '@/components/admin/ui/dialog';
import { reviewKyc } from '@/lib/actions/admin';

type Submission = {
  id: string;
  userId: string;
  tier: string;
  idType: string | null;
  status: string;
  note: string | null;
  createdAt: string | Date;
  idFrontMime: string | null;
  idBackMime: string | null;
  selfieMime: string | null;
  user: { id: string; email: string; name: string } | null;
};

export default function KycClient({
  initialData,
  initialFilter,
}: {
  initialData: { submissions: Submission[]; counts: Record<string, number> };
  initialFilter: string;
}) {
  const [submissions, setSubmissions] = useState<Submission[]>(initialData.submissions);
  const [counts, setCounts] = useState<Record<string, number>>(initialData.counts);
  const [filter, setFilter] = useState(initialFilter);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [note, setNote] = useState('');
  const [acting, setActing] = useState(false);
  const [docView, setDocView] = useState<string | null>(null);

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!selected) return;
    if (action === 'reject' && !note.trim()) return;
    setActing(true);
    const result = await reviewKyc(selected.id, action, note.trim() || undefined);
    setActing(false);
    if ('ok' in result) {
      setSelected(null);
      setNote('');
      setDocView(null);
      setSubmissions((prev) => prev.filter((s) => s.id !== selected.id));
      setCounts((prev) => ({
        ...prev,
        [filter]: Math.max(0, (prev[filter] ?? 1) - 1),
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">KYC Verification</h1>
        <p className="text-sm text-textDark">Review and verify user identity documents (Tier 1 manual review)</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent><p className="text-[11px] text-textDark uppercase">Pending Review</p><p className="text-2xl font-bold text-foreground">{counts.PENDING ?? 0}</p></CardContent></Card>
        <Card><CardContent><p className="text-[11px] text-textDark uppercase">Approved</p><p className="text-2xl font-bold text-green">{counts.APPROVED ?? 0}</p></CardContent></Card>
        <Card><CardContent><p className="text-[11px] text-textDark uppercase">Rejected</p><p className="text-2xl font-bold text-red">{counts.REJECTED ?? 0}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Submissions</CardTitle>
            <Select value={filter} onChange={(e) => setFilter(e.target.value)} options={[
              { value: 'PENDING', label: 'Pending' },
              { value: 'APPROVED', label: 'Approved' },
              { value: 'REJECTED', label: 'Rejected' },
            ]} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {submissions.length === 0 ? (
              <p className="text-sm text-textDark text-center py-8">No {filter.toLowerCase()} submissions.</p>
            ) : (
              submissions.map((s) => (
                <div key={s.id} className="flex items-center gap-4 p-3 bg-background rounded-lg border border-border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{s.user?.email ?? s.userId}</p>
                    <p className="text-[11px] text-textDark">{s.idType?.replace('_', ' ') ?? '—'} · {new Date(s.createdAt).toLocaleString()}</p>
                  </div>
                  <Badge variant={s.status === 'APPROVED' ? 'success' : s.status === 'REJECTED' ? 'danger' : 'warning'}>{s.status}</Badge>
                  <Button size="sm" variant="secondary" onClick={() => { setSelected(s); setNote(s.note ?? ''); setDocView(null); }}>Review</Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {selected && (
        <Dialog open onClose={() => { setSelected(null); setDocView(null); }}>
          <DialogHeader>Review — {selected.user?.email ?? selected.userId}</DialogHeader>
          <DialogContent>
            <div className="space-y-3 text-sm">
              <p className="text-textDark">ID type: <span className="text-white">{selected.idType?.replace('_', ' ') ?? '—'}</span></p>
              <div className="flex gap-2 flex-wrap">
                {selected.idFrontMime && <Button size="sm" variant="outline" onClick={() => setDocView(`/api/admin/kyc/${selected.id}/document?type=idFront`)}>ID Front</Button>}
                {selected.idBackMime && <Button size="sm" variant="outline" onClick={() => setDocView(`/api/admin/kyc/${selected.id}/document?type=idBack`)}>ID Back</Button>}
                {selected.selfieMime && <Button size="sm" variant="outline" onClick={() => setDocView(`/api/admin/kyc/${selected.id}/document?type=selfie`)}>Selfie</Button>}
              </div>
              {docView && (
                <div className="border border-border rounded-lg overflow-hidden">
                  <img src={docView} alt="KYC document" className="w-full max-h-96 object-contain bg-black" />
                </div>
              )}
              <Input label="Reviewer note (required to reject)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for decision" />
            </div>
          </DialogContent>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setSelected(null); setDocView(null); }}>Close</Button>
            <Button variant="danger" isLoading={acting} onClick={() => handleReview('reject')}>Reject</Button>
            <Button isLoading={acting} onClick={() => handleReview('approve')}>Approve Tier 1</Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
