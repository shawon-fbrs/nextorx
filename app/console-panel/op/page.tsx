'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/admin/ui/input';
import { Button } from '@/components/admin/ui/button';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate login
    setTimeout(() => {
      if (email === 'admin@nextorx.com' && password === 'admin123') {
        localStorage.setItem('admin_token', 'mock-admin-token');
        router.push('/console-panel');
      } else {
        setError('Invalid credentials');
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue flex items-center justify-center">
            <span className="text-white font-bold text-xl">N</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Nextorx</h1>
            <p className="text-xs text-textDark">Admin Console</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-surface border border-border rounded-xl p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white mb-1">Sign in to admin</h2>
            <p className="text-sm text-textDark">Enter your credentials to access the console</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="admin@nextorx.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <p className="text-sm text-red">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-[11px] text-textDark text-center">
              Demo: admin@nextorx.com / admin123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
