'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Submission = {
  id: string;
  tier: string;
  idType: string | null;
  status: string;
  note: string | null;
  createdAt: string;
} | null;

export default function KycPage() {
  const [status, setStatus] = useState('NOT_SUBMITTED');
  const [submission, setSubmission] = useState<Submission>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [idType, setIdType] = useState('national_id');
  const [idNumber, setIdNumber] = useState('');
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);

  useEffect(() => {
    fetch('/api/account/kyc')
      .then((r) => r.json())
      .then((d) => {
        setStatus(d.kycStatus ?? 'NOT_SUBMITTED');
        setSubmission(d.submission ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idFront || !selfie || !idNumber.trim()) {
      setMessage('ID front, selfie, and ID number are required');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const form = new FormData();
      form.append('idType', idType);
      form.append('idNumber', idNumber.trim());
      form.append('idFront', idFront);
      if (idBack) form.append('idBack', idBack);
      form.append('selfie', selfie);
      const res = await fetch('/api/account/kyc', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Submission failed');
      } else {
        setMessage('Documents submitted. Review usually takes 24-48 hours.');
        setStatus('PENDING');
        setSubmission({ id: data.submission.id, tier: 'TIER_1', idType, status: 'PENDING', note: null, createdAt: data.submission.createdAt });
      }
    } catch {
      setMessage('Submission failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-background text-text h-full flex items-center justify-center">
        <div className="text-text-dark text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-background text-text h-full overflow-y-auto">
      <div className="px-6 py-6 max-w-xl mx-auto">
        <Link href="/more" className="text-xs text-blue font-semibold">← Back</Link>
        <h1 className="text-xl font-bold text-white mt-2">Identity Verification</h1>
        <p className="text-sm text-text-dark mt-1">Tier 1: government ID + selfie. Documents are encrypted at rest.</p>

        <div className="mt-4 p-4 bg-surface border border-border rounded-xl">
          <p className="text-xs text-text-dark uppercase tracking-wider">Status</p>
          <p className="text-lg font-bold text-white">{status.replace('_', ' ')}</p>
          {submission?.note && <p className="text-xs text-text-dark mt-1">Reviewer note: {submission.note}</p>}
        </div>

        {(status === 'NOT_SUBMITTED' || status === 'REJECTED') && (
          <form onSubmit={handleSubmit} className="mt-4 p-4 bg-surface border border-border rounded-xl space-y-4">
            {message && <p className="text-xs text-orange">{message}</p>}
            <div>
              <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">ID Type</label>
              <select value={idType} onChange={(e) => setIdType(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue">
                <option value="national_id">National ID</option>
                <option value="passport">Passport</option>
                <option value="driving_licence">Driving licence</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">ID Number</label>
              <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="As shown on document" required className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-text-dark/50 focus:outline-none focus:border-blue" />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">ID Front (JPEG/PNG/WebP, max 4MB)</label>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setIdFront(e.target.files?.[0] ?? null)} required className="w-full text-sm text-text-dark" />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">ID Back (optional)</label>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setIdBack(e.target.files?.[0] ?? null)} className="w-full text-sm text-text-dark" />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">Selfie (JPEG/PNG/WebP, max 4MB)</label>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setSelfie(e.target.files?.[0] ?? null)} required className="w-full text-sm text-text-dark" />
            </div>
            <button type="submit" disabled={saving} className="w-full bg-blue text-white font-semibold rounded-xl py-3 text-sm disabled:opacity-50">
              {saving ? 'Submitting...' : 'Submit for Review'}
            </button>
          </form>
        )}

        {status === 'PENDING' && !message && (
          <p className="text-xs text-text-dark mt-4">Your documents are under review.</p>
        )}
      </div>
    </div>
  );
}
