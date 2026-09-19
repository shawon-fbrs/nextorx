import { MarketingHeader } from '@/app/components/MarketingHeader';
import { MarketingFooter } from '@/app/components/MarketingFooter';

export const metadata = {
  title: 'Nextorx — Binary Options Trading Platform',
  description: 'Trade binary options with up to 95% payouts. Start with a free $10,000 demo account.',
  openGraph: {
    title: 'Nextorx — Binary Options Trading Platform',
    description: 'Trade binary options with up to 95% payouts. Start with a free $10,000 demo account.',
    siteName: 'Nextorx',
    type: 'website',
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-text flex flex-col">
      <MarketingHeader />
      <main className="flex-1 pt-16">{children}</main>
      <MarketingFooter />
    </div>
  );
}
