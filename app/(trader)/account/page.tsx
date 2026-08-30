'use client';

import { useAuth } from '@/lib/auth-context';
import { useState, useEffect } from 'react';

export default function AccountPage() {
  const { user, loading: authLoading, refresh } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setNickname(user.nickname || '');
      setPhone(user.phone || '');
      setCountry(user.country || '');
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, nickname, phone, country }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Failed to save');
      } else {
        setMessage('Profile saved successfully');
        await refresh();
      }
    } catch {
      setMessage('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="bg-background text-text h-full flex items-center justify-center">
        <div className="text-text-dark text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-background text-text h-full flex items-center justify-center">
        <div className="text-text-dark text-sm">Please log in</div>
      </div>
    );
  }

  const kycStatus = user.kycStatus || 'NOT_SUBMITTED';
  const kycColor = kycStatus === 'APPROVED' ? 'text-green' : kycStatus === 'PENDING' ? 'text-orange' : 'text-red';
  const kycLabel = kycStatus === 'APPROVED' ? 'Verified' : kycStatus === 'PENDING' ? 'Under Review' : 'Not Verified';

  return (
    <div className="bg-background text-text h-full overflow-y-auto">
      <div className="px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">Account Settings</h1>
          <p className="text-sm text-text-dark mt-1">Manage your profile and security</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="col-span-2 bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-blue/15 flex items-center justify-center">
                <svg className="w-7 h-7 text-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Profile</h2>
                <p className="text-xs text-text-dark">Update your personal details</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-text-dark uppercase tracking-wider mb-1.5">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-dark uppercase tracking-wider mb-1.5">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-dark uppercase tracking-wider mb-1.5">Nickname</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-dark uppercase tracking-wider mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-dark uppercase tracking-wider mb-1.5">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-dark uppercase tracking-wider mb-1.5">Email</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full bg-background/50 border border-border/50 rounded-lg px-3.5 py-2.5 text-sm text-text-dark cursor-not-allowed"
                />
              </div>
            </div>
            {message && (
              <p className={`mt-3 text-xs font-semibold ${message.includes('success') ? 'text-green' : 'text-red'}`}>{message}</p>
            )}
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="mt-4 bg-blue hover:bg-blue-hover text-white text-xs font-bold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-green/15 flex items-center justify-center">
                <svg className="w-5 h-5 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Verification</h2>
                <p className="text-[11px] text-text-dark">Status</p>
              </div>
            </div>
            <div className="bg-background rounded-lg p-3.5 mb-4">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg ${kycStatus === 'APPROVED' ? 'bg-green/15' : kycStatus === 'PENDING' ? 'bg-orange/15' : 'bg-red/15'} flex items-center justify-center`}>
                  <svg className={`w-4 h-4 ${kycColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <span className={`text-xs font-semibold ${kycColor} block`}>{kycLabel}</span>
                  <span className="text-[10px] text-text-dark">{kycStatus === 'APPROVED' ? 'Identity confirmed' : 'Upload ID to verify'}</span>
                </div>
              </div>
            </div>
            <button className="w-full bg-green hover:bg-green-hover text-white text-xs font-bold py-2.5 rounded-lg transition-colors">
              {kycStatus === 'APPROVED' ? 'Verified' : 'Verify Now'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange/15 flex items-center justify-center">
                <svg className="w-5 h-5 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Security</h2>
                <p className="text-[11px] text-text-dark">Protect your account</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="bg-background rounded-lg p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">Two-Factor Authentication</span>
                  <span className="text-[10px] text-text-dark">Add an extra layer of security</span>
                </div>
                <button className="w-10 h-[22px] rounded-full relative transition-colors bg-border/50">
                  <div className="w-4 h-4 bg-white rounded-full absolute top-[3px] left-[3px]" />
                </button>
              </div>
              <div className="bg-background rounded-lg p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">Login Notifications</span>
                  <span className="text-[10px] text-text-dark">Get alerted on new logins</span>
                </div>
                <button className="w-10 h-[22px] rounded-full relative transition-colors bg-green">
                  <div className="w-4 h-4 bg-white rounded-full absolute top-[3px] left-[22px]" />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue/15 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Account Info</h2>
                <p className="text-[11px] text-text-dark">Your account details</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="bg-background rounded-lg p-3 flex items-center justify-between">
                <span className="text-[11px] text-text-dark">User ID</span>
                <span className="text-xs font-semibold text-white font-mono">{user.uid || '—'}</span>
              </div>
              <div className="bg-background rounded-lg p-3 flex items-center justify-between">
                <span className="text-[11px] text-text-dark">Role</span>
                <span className="text-xs font-semibold text-white capitalize">{user.role}</span>
              </div>
              <div className="bg-background rounded-lg p-3 flex items-center justify-between">
                <span className="text-[11px] text-text-dark">Referral Code</span>
                <span className="text-xs font-semibold text-green font-mono">{user.referralCode || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
