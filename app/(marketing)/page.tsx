'use client';

import Link from 'next/link';

const candles = [
  { x: 0, top: 90, bottom: 210, bodyTop: 100, bodyH: 80, up: true },
  { x: 42, top: 70, bottom: 220, bodyTop: 80, bodyH: 90, up: true },
  { x: 84, top: 110, bottom: 190, bodyTop: 120, bodyH: 60, up: false },
  { x: 126, top: 60, bottom: 230, bodyTop: 70, bodyH: 100, up: true },
  { x: 168, top: 100, bottom: 200, bodyTop: 110, bodyH: 70, up: false },
  { x: 210, top: 80, bottom: 215, bodyTop: 90, bodyH: 85, up: true },
  { x: 252, top: 95, bottom: 195, bodyTop: 105, bodyH: 70, up: false },
  { x: 294, top: 65, bottom: 225, bodyTop: 75, bodyH: 100, up: true },
  { x: 336, top: 85, bottom: 210, bodyTop: 95, bodyH: 85, up: true },
  { x: 378, top: 105, bottom: 195, bodyTop: 115, bodyH: 60, up: false },
  { x: 420, top: 75, bottom: 220, bodyTop: 85, bodyH: 95, up: true },
  { x: 462, top: 90, bottom: 205, bodyTop: 100, bodyH: 75, up: false },
  { x: 504, top: 55, bottom: 235, bodyTop: 65, bodyH: 110, up: true },
  { x: 546, top: 100, bottom: 200, bodyTop: 110, bodyH: 70, up: true },
  { x: 588, top: 80, bottom: 215, bodyTop: 90, bodyH: 85, up: false },
  { x: 630, top: 70, bottom: 225, bodyTop: 80, bodyH: 95, up: true },
  { x: 672, top: 95, bottom: 200, bodyTop: 105, bodyH: 75, up: true },
  { x: 714, top: 110, bottom: 190, bodyTop: 120, bodyH: 60, up: false },
  { x: 756, top: 85, bottom: 210, bodyTop: 95, bodyH: 85, up: true },
  { x: 800, top: 75, bottom: 220, bodyTop: 85, bodyH: 95, up: true },
];

const features = [
  { title: 'High Payouts', desc: 'Up to 95% profit on successful trades', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'green' },
  { title: 'Fast Execution', desc: 'Trades executed in under 1 second', icon: 'M13 10V3L4 14h7v7l9-11h-7z', color: 'blue' },
  { title: '24/7 Trading', desc: 'Trade anytime with OTC assets', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'orange' },
  { title: 'Free Demo', desc: '$10,000 virtual funds to practice', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', color: 'blue' },
  { title: 'Secure Platform', desc: 'Bank-grade encryption & regulation', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', color: 'green' },
  { title: 'Tournaments', desc: 'Compete for prize pools up to $50,000', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z', color: 'orange' },
];

const steps = [
  { num: '01', title: 'Create Account', desc: 'Sign up in seconds with email or social login' },
  { num: '02', title: 'Fund Account', desc: 'Deposit via card, crypto, or e-wallet' },
  { num: '03', title: 'Start Trading', desc: 'Choose an asset, set amount, predict direction' },
  { num: '04', title: 'Withdraw Profits', desc: 'Cash out anytime with fast processing' },
];

const assets = [
  { name: 'Forex', pairs: '30+ pairs', examples: 'EUR/USD, GBP/USD, USD/JPY', color: 'blue' },
  { name: 'Crypto', pairs: '15+ coins', examples: 'BTC, ETH, SOL, XRP', color: 'orange' },
  { name: 'Stocks', pairs: '20+ stocks', examples: 'AAPL, TSLA, AMZN, NVDA', color: 'green' },
  { name: 'Commodities', pairs: '10+ assets', examples: 'Gold, Silver, Oil, Gas', color: 'orange' },
];

const stats = [
  { value: '2M+', label: 'Active Traders' },
  { value: '$12B+', label: 'Monthly Volume' },
  { value: '95%', label: 'Max Payout' },
  { value: '50ms', label: 'Execution Speed' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-text">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24">
                <rect fill="currentColor" height="12" rx="1" width="3" x="2" y="6" />
                <rect fill="currentColor" height="18" rx="1" width="3" x="7" y="3" />
                <rect fill="currentColor" height="8" rx="1" width="3" x="12" y="8" />
                <rect fill="currentColor" height="14" rx="1" width="3" x="17" y="5" />
              </svg>
              <span className="text-white font-bold text-lg tracking-wide">NEXTORX</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-text hover:text-white transition-colors">Features</a>
              <a href="#assets" className="text-sm text-text hover:text-white transition-colors">Assets</a>
              <a href="#how-it-works" className="text-sm text-text hover:text-white transition-colors">How It Works</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-text hover:text-white transition-colors px-4 py-2">
              Log In
            </Link>
            <Link href="/register" className="bg-green hover:bg-green-hover text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-green/20">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-green/10 border border-green/20 rounded-full px-4 py-1.5 mb-6">
              <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-green">Live Trading Platform</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-white mb-5 leading-tight">
              Trade Smarter,<br />Earn Faster
            </h1>
            <p className="text-lg text-text max-w-xl mx-auto mb-8">
              Binary options trading with up to 95% payouts. Start with a free $10,000 demo account.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/register" className="bg-green hover:bg-green-hover text-white font-bold text-base px-8 py-3.5 rounded-xl transition-colors shadow-lg shadow-green/20 active:scale-[0.98]">
                Start Trading Free
              </Link>
              <Link href="/login" className="bg-surface border border-border hover:bg-surface-hover text-white font-bold text-base px-8 py-3.5 rounded-xl transition-colors">
                Log In
              </Link>
            </div>
          </div>

          {/* Trading Preview */}
          <div className="relative max-w-5xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
            <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl">
              <div className="h-10 bg-background border-b border-border flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red" />
                <div className="w-3 h-3 rounded-full bg-orange" />
                <div className="w-3 h-3 rounded-full bg-green" />
                <div className="flex-1 text-center text-[11px] text-text-dark font-mono">EUR/USD — 80% payout</div>
              </div>
              <div className="h-80 bg-[#161a22] relative overflow-hidden">
                <svg width="100%" height="100%" viewBox="0 0 800 300" preserveAspectRatio="none">
                  {candles.map((c, i) => (
                    <g key={i}>
                      <line x1={c.x} y1={c.top} x2={c.x} y2={c.bottom} stroke={c.up ? '#00c365' : '#ff4954'} strokeWidth="1" />
                      <rect x={c.x - 8} y={c.bodyTop} width={16} height={c.bodyH} fill={c.up ? '#00c365' : '#ff4954'} rx="2" opacity="0.8" />
                    </g>
                  ))}
                  <line x1="0" y1="150" x2="800" y2="150" stroke="#31394c" strokeWidth="1" strokeDasharray="4 4" />
                </svg>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-surface border border-border rounded-xl p-4 shadow-xl">
                  <div className="text-xs text-text-dark mb-1">EUR/USD</div>
                  <div className="text-xl font-bold text-white mb-3">1.08942</div>
                  <div className="flex gap-2">
                    <button className="bg-green text-white text-xs font-bold px-4 py-2 rounded-lg">Up</button>
                    <button className="bg-red text-white text-xs font-bold px-4 py-2 rounded-lg">Down</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-black text-white mb-1">{stat.value}</div>
                <div className="text-sm text-text-dark">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-white mb-3">Why Choose Nextorx</h2>
            <p className="text-text max-w-lg mx-auto">Everything you need for successful trading in one platform</p>
          </div>
          <div className="grid grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className="bg-surface border border-border rounded-xl p-6 hover:border-text-dark/30 transition-colors">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  f.color === 'green' ? 'bg-green/15' : f.color === 'blue' ? 'bg-blue/15' : 'bg-orange/15'
                }`}>
                  <svg className={`w-6 h-6 ${
                    f.color === 'green' ? 'text-green' : f.color === 'blue' ? 'text-blue' : 'text-orange'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path d={f.icon} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-text">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 bg-surface/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-white mb-3">How It Works</h2>
            <p className="text-text max-w-lg mx-auto">Start trading in 4 simple steps</p>
          </div>
          <div className="grid grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={s.num} className="relative">
                {i < steps.length - 1 && (
                  <div className="absolute top-8 left-full w-full h-px bg-border z-0" />
                )}
                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-blue/15 flex items-center justify-center mb-4">
                    <span className="text-xl font-black text-blue">{s.num}</span>
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-text">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Assets */}
      <section id="assets" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-white mb-3">Trade Any Market</h2>
            <p className="text-text max-w-lg mx-auto">Access 75+ assets across global markets</p>
          </div>
          <div className="grid grid-cols-4 gap-5">
            {assets.map((a) => (
              <div key={a.name} className="bg-surface border border-border rounded-xl p-6 text-center hover:border-text-dark/30 transition-colors">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                  a.color === 'green' ? 'bg-green/15' : a.color === 'blue' ? 'bg-blue/15' : 'bg-orange/15'
                }`}>
                  <span className={`text-lg font-black ${
                    a.color === 'green' ? 'text-green' : a.color === 'blue' ? 'text-blue' : 'text-orange'
                  }`}>{a.name[0]}</span>
                </div>
                <h3 className="text-base font-bold text-white mb-1">{a.name}</h3>
                <p className="text-sm text-text mb-2">{a.pairs}</p>
                <p className="text-[11px] text-text-dark">{a.examples}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-black text-white mb-4">Ready to Start Trading?</h2>
          <p className="text-text mb-8 max-w-md mx-auto">
            Join millions of traders worldwide. Start with a free demo account — no deposit required.
          </p>
          <Link href="/register" className="inline-block bg-green hover:bg-green-hover text-white font-bold text-lg px-10 py-4 rounded-xl transition-colors shadow-lg shadow-green/20 active:scale-[0.98]">
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-5 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24">
                  <rect fill="currentColor" height="12" rx="1" width="3" x="2" y="6" />
                  <rect fill="currentColor" height="18" rx="1" width="3" x="7" y="3" />
                  <rect fill="currentColor" height="8" rx="1" width="3" x="12" y="8" />
                  <rect fill="currentColor" height="14" rx="1" width="3" x="17" y="5" />
                </svg>
                <span className="text-white font-bold">NEXTORX</span>
              </div>
              <p className="text-xs text-text-dark leading-relaxed">Binary options trading platform with high payouts and fast execution.</p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Trading</h4>
              <div className="space-y-2">
                <a href="#" className="block text-xs text-text-dark hover:text-white transition-colors">Binary Options</a>
                <a href="#" className="block text-xs text-text-dark hover:text-white transition-colors">Digital Options</a>
                <a href="#" className="block text-xs text-text-dark hover:text-white transition-colors">OTC Market</a>
                <a href="#" className="block text-xs text-text-dark hover:text-white transition-colors">Tournaments</a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Company</h4>
              <div className="space-y-2">
                <a href="#" className="block text-xs text-text-dark hover:text-white transition-colors">About Us</a>
                <a href="#" className="block text-xs text-text-dark hover:text-white transition-colors">Careers</a>
                <a href="#" className="block text-xs text-text-dark hover:text-white transition-colors">Blog</a>
                <a href="#" className="block text-xs text-text-dark hover:text-white transition-colors">Press</a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Support</h4>
              <div className="space-y-2">
                <a href="/support" className="block text-xs text-text-dark hover:text-white transition-colors">Help Center</a>
                <a href="#" className="block text-xs text-text-dark hover:text-white transition-colors">Contact Us</a>
                <a href="#" className="block text-xs text-text-dark hover:text-white transition-colors">FAQ</a>
                <a href="#" className="block text-xs text-text-dark hover:text-white transition-colors">Community</a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Legal</h4>
              <div className="space-y-2">
                <a href="#" className="block text-xs text-text-dark hover:text-white transition-colors">Terms of Service</a>
                <a href="#" className="block text-xs text-text-dark hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" className="block text-xs text-text-dark hover:text-white transition-colors">Risk Disclosure</a>
                <a href="#" className="block text-xs text-text-dark hover:text-white transition-colors">AML Policy</a>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex items-center justify-between">
            <p className="text-[11px] text-text-dark">&copy; 2026 Nextorx. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-text-dark bg-surface border border-border px-2.5 py-1 rounded">Risk Warning</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
