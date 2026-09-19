'use client';

import Link from 'next/link';

const footerLinks = {
  trading: [
    { label: 'Binary Options', href: '#' },
    { label: 'Digital Options', href: '#' },
    { label: 'OTC Market', href: '#' },
    { label: 'Tournaments', href: '#' },
  ],
  company: [
    { label: 'About Us', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Press', href: '#' },
  ],
  support: [
    { label: 'Help Center', href: '/support' },
    { label: 'Verify Fairness', href: '/verify' },
    { label: 'Seed Commitments', href: '/seeds' },
    { label: 'Contact Us', href: '/support' },
  ],
  legal: [
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Risk Disclosure', href: '#' },
    { label: 'AML Policy', href: '#' },
  ],
};

export function MarketingFooter() {
  return (
    <footer className="border-t border-border py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-5 gap-8 mb-10">
          <div>
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24">
                <rect fill="currentColor" height="12" rx="1" width="3" x="2" y="6" />
                <rect fill="currentColor" height="18" rx="1" width="3" x="7" y="3" />
                <rect fill="currentColor" height="8" rx="1" width="3" x="12" y="8" />
                <rect fill="currentColor" height="14" rx="1" width="3" x="17" y="5" />
              </svg>
              <span className="text-white font-bold">NEXTORX</span>
            </Link>
            <p className="text-xs text-text-dark leading-relaxed">Binary options trading platform with high payouts and fast execution.</p>
          </div>
          {[
            { title: 'Trading', links: footerLinks.trading },
            { title: 'Company', links: footerLinks.company },
            { title: 'Support', links: footerLinks.support },
            { title: 'Legal', links: footerLinks.legal },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">{col.title}</h4>
              <div className="space-y-2">
                {col.links.map((link) =>
                  link.href.startsWith('/') ? (
                    <Link key={link.label} href={link.href} className="block text-xs text-text-dark hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  ) : (
                    <a key={link.label} href={link.href} className="block text-xs text-text-dark hover:text-white transition-colors">
                      {link.label}
                    </a>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-6 flex items-center justify-between">
          <p className="text-[11px] text-text-dark">&copy; {new Date().getFullYear()} Nextorx. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-text-dark bg-surface border border-border px-2.5 py-1 rounded">Risk Warning</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
