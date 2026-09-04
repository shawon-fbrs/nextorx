'use client';

import { useAuth } from '@/lib/auth-context';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { checkPasswordStrength, PASSWORD_REQUIREMENTS } from '@/lib/password';
import Link from 'next/link';

export default function AccountPage() {
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAMsg, setTwoFAMsg] = useState('');
  const [disableModal, setDisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');

  const [deleteModal, setDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteMsg, setDeleteMsg] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setNickname(user.nickname || '');
      setPhone(user.phone || '');
      setCountry(user.country || '');
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetch('/api/auth/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' }),
      })
        .then((r) => r.json())
        .then((d) => setTwoFAEnabled(d.enabled))
        .catch(() => {});
    }
  }, [user]);

  const newPassStrength = checkPasswordStrength(newPassword);

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg('');

    if (newPassword !== confirmPassword) {
      setPasswordMsg('Passwords do not match');
      return;
    }

    if (!newPassStrength.isValid) {
      setPasswordMsg('Password does not meet requirements');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordMsg(data.error || 'Failed to change password');
      } else {
        setPasswordMsg('Password changed successfully. Please log in again.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          authClient.signOut({ fetchOptions: { onSuccess: () => router.push('/login') } });
        }, 2000);
      }
    } catch {
      setPasswordMsg('Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleToggle2FA = async () => {
    if (twoFAEnabled) {
      setDisableModal(true);
      return;
    }
    router.push('/setup-2fa');
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFALoading(true);
    setTwoFAMsg('');
    try {
      const res = await fetch('/api/auth/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable', password: disablePassword, code: disableCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTwoFAMsg(data.error || 'Failed to disable 2FA');
      } else {
        setTwoFAEnabled(false);
        setDisableModal(false);
        setDisablePassword('');
        setDisableCode('');
        setTwoFAMsg('2FA disabled successfully');
      }
    } catch {
      setTwoFAMsg('Failed to disable 2FA');
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleting(true);
    setDeleteMsg('');
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteMsg(data.error || 'Failed to delete account');
      } else {
        await authClient.signOut();
        router.push('/');
      }
    } catch {
      setDeleteMsg('Failed to delete account');
    } finally {
      setDeleting(false);
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
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full bg-background/50 border border-border/50 rounded-lg px-3.5 py-2.5 text-sm text-text-dark cursor-not-allowed"
                  />
                  {user.emailVerified ? (
                    <span className="text-[10px] text-green font-semibold whitespace-nowrap">Verified</span>
                  ) : (
                    <Link href={`/verify-email?email=${encodeURIComponent(user.email)}`} className="text-[10px] text-orange font-semibold whitespace-nowrap hover:underline">
                      Verify
                    </Link>
                  )}
                </div>
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

        <div className="grid grid-cols-2 gap-4 mb-6">
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
                  <span className="text-[10px] text-text-dark">{twoFAEnabled ? 'Enabled — extra layer of security' : 'Add an extra layer of security'}</span>
                </div>
                <button
                  onClick={handleToggle2FA}
                  disabled={twoFALoading}
                  className={`w-10 h-[22px] rounded-full relative transition-colors ${twoFAEnabled ? 'bg-green' : 'bg-border/50'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-[3px] transition-all ${twoFAEnabled ? 'left-[22px]' : 'left-[3px]'}`} />
                </button>
              </div>
              {twoFAMsg && (
                <p className={`text-[11px] font-semibold ${twoFAMsg.includes('success') || twoFAMsg.includes('Success') ? 'text-green' : 'text-red'}`}>{twoFAMsg}</p>
              )}
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

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue/15 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Change Password</h2>
                <p className="text-[11px] text-text-dark">Update your password regularly</p>
              </div>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-text-dark uppercase tracking-wider mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-dark uppercase tracking-wider mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 12 characters"
                  required
                  className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue transition-colors"
                />
                {newPassword && (
                  <div className="mt-2 space-y-1">
                    {PASSWORD_REQUIREMENTS.map((req) => (
                      <div key={req.label} className="flex items-center gap-1.5">
                        <div className={`w-1 h-1 rounded-full ${req.test(newPassword) ? 'bg-green' : 'bg-border'}`} />
                        <span className={`text-[10px] ${req.test(newPassword) ? 'text-green' : 'text-text-dark'}`}>
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-dark uppercase tracking-wider mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue transition-colors"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-[10px] text-red mt-1">Passwords do not match</p>
                )}
              </div>
              {passwordMsg && (
                <p className={`text-[11px] font-semibold ${passwordMsg.includes('success') || passwordMsg.includes('Success') ? 'text-green' : 'text-red'}`}>{passwordMsg}</p>
              )}
              <button
                type="submit"
                disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || !newPassStrength.isValid}
                className="w-full bg-blue hover:bg-blue-hover text-white text-xs font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {passwordSaving ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>

          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red/15 flex items-center justify-center">
                <svg className="w-5 h-5 text-red" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Delete Account</h2>
                <p className="text-[11px] text-text-dark">Permanently remove your account</p>
              </div>
            </div>
            <div className="bg-red/5 border border-red/10 rounded-lg p-3.5 mb-4">
              <p className="text-[11px] text-red leading-relaxed">
                This action is irreversible. All your data, balance, and trade history will be permanently deleted.
              </p>
            </div>
            <button
              onClick={() => setDeleteModal(true)}
              className="w-full bg-red/10 hover:bg-red/20 border border-red/20 text-red text-xs font-bold py-2.5 rounded-lg transition-colors"
            >
              Delete Account
            </button>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red/15 flex items-center justify-center">
              <svg className="w-5 h-5 text-red" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Session</h2>
              <p className="text-[11px] text-text-dark">Manage your session</p>
            </div>
          </div>
          <button
            onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => router.push('/login') } })}
            className="w-full bg-red/10 hover:bg-red/20 border border-red/20 text-red text-xs font-bold py-2.5 rounded-lg transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>

      {disableModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setDisableModal(false); setTwoFAMsg(''); }}>
          <div className="bg-surface border border-border rounded-2xl shadow-2xl w-[400px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-border">
              <h3 className="text-base font-bold text-white">Disable Two-Factor Authentication</h3>
              <p className="text-xs text-text-dark mt-1">Enter your password and current TOTP code</p>
            </div>
            <form onSubmit={handleDisable2FA} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-text-dark uppercase tracking-wider mb-1.5">Password</label>
                <input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  required
                  className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-dark uppercase tracking-wider mb-1.5">TOTP Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  autoFocus
                  required
                  className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-sm text-white text-center tracking-widest font-mono focus:outline-none focus:border-blue transition-colors"
                />
              </div>
              {twoFAMsg && <p className="text-[11px] font-semibold text-red">{twoFAMsg}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setDisableModal(false); setTwoFAMsg(''); }}
                  className="flex-1 bg-background border border-border text-text text-xs font-bold py-2.5 rounded-lg transition-colors hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={twoFALoading || !disablePassword || disableCode.length !== 6}
                  className="flex-1 bg-red hover:bg-red/80 text-white text-xs font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {twoFALoading ? 'Disabling...' : 'Disable 2FA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setDeleteModal(false); setDeleteMsg(''); }}>
          <div className="bg-surface border border-border rounded-2xl shadow-2xl w-[400px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-border">
              <h3 className="text-base font-bold text-white">Delete Account</h3>
              <p className="text-xs text-text-dark mt-1">This action cannot be undone</p>
            </div>
            <form onSubmit={handleDeleteAccount} className="px-6 py-5 space-y-4">
              <div className="bg-red/5 border border-red/10 rounded-lg p-3.5">
                <p className="text-[11px] text-red leading-relaxed">
                  Enter your password to confirm. All data, balance, and trade history will be permanently deleted.
                </p>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-dark uppercase tracking-wider mb-1.5">Password</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  required
                  className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue transition-colors"
                />
              </div>
              {deleteMsg && <p className="text-[11px] font-semibold text-red">{deleteMsg}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setDeleteModal(false); setDeleteMsg(''); }}
                  className="flex-1 bg-background border border-border text-text text-xs font-bold py-2.5 rounded-lg transition-colors hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleting || !deletePassword}
                  className="flex-1 bg-red hover:bg-red/80 text-white text-xs font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
