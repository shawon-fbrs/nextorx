'use client';

import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background text-text flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
              <rect fill="currentColor" height="12" rx="1" width="3" x="2" y="6" />
              <rect fill="currentColor" height="18" rx="1" width="3" x="7" y="3" />
              <rect fill="currentColor" height="8" rx="1" width="3" x="12" y="8" />
              <rect fill="currentColor" height="14" rx="1" width="3" x="17" y="5" />
            </svg>
            <span className="text-white font-bold text-xl tracking-wide">NEXTORX</span>
          </Link>
          <h1 className="text-2xl font-black text-white mb-2">Welcome Back</h1>
          <p className="text-sm text-text-dark">Log in to your trading account</p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">Email</label>
              <input
                type="email"
                placeholder="you@email.com"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-text-dark/50 focus:outline-none focus:border-blue transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5 block">Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-text-dark/50 focus:outline-none focus:border-blue transition-colors"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-border bg-background accent-green" />
                <span className="text-xs text-text-dark">Remember me</span>
              </label>
              <a href="#" className="text-xs text-blue hover:text-blue-hover transition-colors font-semibold">Forgot password?</a>
            </div>
            <button className="w-full bg-green hover:bg-green-hover text-white font-bold text-sm py-3 rounded-xl transition-colors shadow-lg shadow-green/20 active:scale-[0.98]">
              Log In
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center"><span className="bg-surface px-3 text-[11px] text-text-dark font-semibold">or continue with</span></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button className="bg-background border border-border hover:bg-surface-hover text-white text-xs font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
              Google
            </button>
            <button className="bg-background border border-border hover:bg-surface-hover text-white text-xs font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" /></svg>
              Facebook
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-text-dark mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-green hover:text-green-hover font-semibold transition-colors">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
