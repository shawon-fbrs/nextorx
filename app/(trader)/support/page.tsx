'use client';

import { useState } from 'react';

type Tab = 'faq' | 'contact';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  title: string;
  icon: string;
  items: FAQItem[];
}

const faqData: FAQCategory[] = [
  {
    title: 'Getting Started',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    items: [
      { question: 'How do I create an account?', answer: 'Register with your email and a strong password, verify the code we send you, then enable two-factor authentication. You can also sign up with Google — you will set a password during onboarding.' },
      { question: 'How do I start trading?', answer: 'Pick an asset, set your stake and duration, then choose Up or Down. New accounts start with a $10,000 demo balance for practice.' },
      { question: 'What is a demo account?', answer: 'A demo account comes with $10,000 in virtual funds for practice trading. It is perfect for learning without risking real money.' },
    ],
  },
  {
    title: 'Account & Verification',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    items: [
      { question: 'How do I verify my account?', answer: 'Go to More > Verify ID and upload a government-issued ID plus a selfie. Manual review usually takes 24-48 hours.' },
      { question: 'How do I enable two-factor authentication?', answer: 'You are asked to set it up right after registration. Later, you can manage it from Account settings. Save your recovery codes somewhere safe.' },
      { question: 'I lost my authenticator. What now?', answer: 'Use one of the recovery codes shown during setup. If those are gone too, contact support from your account email and we will verify and reset 2FA manually.' },
    ],
  },
  {
    title: 'Deposits & Withdrawals',
    icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    items: [
      { question: 'What deposit methods are available?', answer: 'Crypto deposits (USDT and others listed on the Deposit page). Send funds to the shown address, paste the transaction hash, and our team verifies it manually.' },
      { question: 'How long do withdrawals take?', answer: 'Withdrawals are reviewed manually, usually within 24 hours. A 20% treasury reserve rule may delay large payouts during high demand.' },
      { question: 'Is there a minimum deposit?', answer: 'Minimums depend on the payment method and are shown on the Deposit page before you confirm.' },
    ],
  },
  {
    title: 'Trading Basics',
    icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
    items: [
      { question: 'What are binary options?', answer: 'You predict whether an asset price goes up or down within a chosen time. Correct predictions earn a fixed payout; wrong ones lose the stake.' },
      { question: 'What is the payout percentage?', answer: 'Payouts vary by asset and conditions — weekends, peak hours, high volume, and treasury health can lower them. The exact payout is always shown before you confirm a trade.' },
      { question: 'Are prices fair?', answer: 'Yes. Our market is generated from a published daily cryptographic seed. Anyone can re-run the math via More > Verify Fairness after the seed is revealed.' },
    ],
  },
];

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<Tab>('faq');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleCategory = (title: string) => {
    setExpandedCategory(expandedCategory === title ? null : title);
  };

  const toggleQuestion = (question: string) => {
    setExpandedQuestion(expandedQuestion === question ? null : question);
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'faq', label: 'FAQ', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { key: 'contact', label: 'Contact Us', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  ];

  const filteredFaq = faqData
    .map((category) => ({
      ...category,
      items: category.items.filter(
        (item) =>
          searchQuery.trim() === '' ||
          item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.answer.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((category) => category.items.length > 0);

  return (
    <div className="bg-background text-text h-full overflow-y-auto">
      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Support Center</h1>
            <p className="text-sm text-text-dark mt-1">Find answers or contact our team</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="w-56 flex-shrink-0">
            <div className="bg-surface border border-border rounded-xl p-2 sticky top-6">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left ${
                    activeTab === tab.key
                      ? 'bg-blue text-white'
                      : 'text-text hover:text-white hover:bg-surface-hover'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path d={tab.icon} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {activeTab === 'faq' && (
              <div>
                <div className="mb-4">
                  <div className="relative">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search questions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-text-dark focus:outline-none focus:border-blue transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {filteredFaq.map((category) => (
                    <div key={category.title} className="bg-surface border border-border rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleCategory(category.title)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-hover transition-colors text-left"
                      >
                        <div className="w-9 h-9 rounded-lg bg-blue/15 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path d={category.icon} strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-white block">{category.title}</span>
                          <span className="text-[11px] text-text-dark">{category.items.length} questions</span>
                        </div>
                        <svg
                          className={`w-4 h-4 text-text-dark transition-transform duration-200 flex-shrink-0 ${expandedCategory === category.title ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
                        >
                          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>

                      {expandedCategory === category.title && (
                        <div className="border-t border-border">
                          {category.items.map((item, idx) => (
                            <div key={idx} className="border-b border-border/50 last:border-b-0">
                              <button
                                onClick={() => toggleQuestion(item.question)}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-hover/50 transition-colors text-left"
                              >
                                <span className="text-[13px] text-text-light pr-3">{item.question}</span>
                                <svg
                                  className={`w-3.5 h-3.5 text-text-dark flex-shrink-0 transition-transform duration-200 ${expandedQuestion === item.question ? 'rotate-180' : ''}`}
                                  fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
                                >
                                  <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>
                              {expandedQuestion === item.question && (
                                <div className="px-4 pb-3 pl-16">
                                  <p className="text-[13px] text-text leading-relaxed">{item.answer}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {filteredFaq.length === 0 && (
                  <p className="text-sm text-text-dark text-center py-8">No answers match your search.</p>
                )}
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Email support</h3>
                  <p className="text-xs text-text-dark leading-relaxed">
                    Write to <span className="text-white font-semibold">support@nextorx.247play.win</span> from
                    your account email. Include your UID (shown on the Account page) and screenshots
                    where relevant. We reply within 24 hours on business days.
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Urgent: locked out?</h3>
                  <p className="text-xs text-text-dark leading-relaxed">
                    Use a recovery code first. If those are lost, email us with your ID document attached —
                    2FA resets require manual identity verification.
                  </p>
                </div>
                <div className="p-3 bg-blue/5 border border-blue/20 rounded-lg">
                  <p className="text-[11px] text-text leading-relaxed">
                    A built-in ticket system is coming soon. Until then, email is the official support channel —
                    keep your ticket emails for reference.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
