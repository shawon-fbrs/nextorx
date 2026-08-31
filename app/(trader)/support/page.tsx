'use client';

import { useState } from 'react';

type Tab = 'faq' | 'contact' | 'tickets';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  title: string;
  icon: string;
  items: FAQItem[];
}

interface Ticket {
  id: string;
  subject: string;
  category: string;
  date: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  lastMessage: string;
}

const faqData: FAQCategory[] = [
  {
    title: 'Getting Started',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    items: [
      { question: 'How do I create an account?', answer: 'Click the "Sign Up" button on the homepage and follow the registration process. You\'ll need to provide your email, create a password, and verify your identity.' },
      { question: 'How do I start trading?', answer: 'After logging in, select an asset from the asset tabs, set your investment amount and expiration time, then click "Up" or "Down" to place your trade.' },
      { question: 'What is a demo account?', answer: 'A demo account comes with $10,000 in virtual funds for practice trading. It\'s perfect for learning without risking real money.' },
    ],
  },
  {
    title: 'Account & Verification',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    items: [
      { question: 'How do I verify my account?', answer: 'Go to Account Settings > Verification and upload a government-issued ID and proof of address. Verification typically takes 24-48 hours.' },
      { question: 'Can I change my email address?', answer: 'Yes, go to Account Settings > Profile and click "Change Email". You\'ll need to verify the new email address.' },
      { question: 'How do I enable two-factor authentication?', answer: 'Navigate to Account Settings > Security and toggle on 2FA. You can use an authenticator app or SMS verification.' },
    ],
  },
  {
    title: 'Deposits & Withdrawals',
    icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    items: [
      { question: 'What deposit methods are available?', answer: 'We accept credit/debit cards, bank transfers, e-wallets (Skrill, Neteller), and cryptocurrency payments.' },
      { question: 'How long do withdrawals take?', answer: 'E-wallet withdrawals are processed within 24 hours. Bank transfers take 3-5 business days. Card withdrawals may take 3-7 days.' },
      { question: 'Is there a minimum deposit?', answer: 'The minimum deposit is $10. However, we recommend starting with at least $100 for better risk management.' },
    ],
  },
  {
    title: 'Trading Basics',
    icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
    items: [
      { question: 'What are binary options?', answer: 'Binary options are financial instruments where you predict whether an asset\'s price will go up or down within a specific time period. You either earn a fixed payout or lose your investment.' },
      { question: 'What is the payout percentage?', answer: 'The payout percentage varies by asset and market conditions. It typically ranges from 80% to 95% on successful trades.' },
      { question: 'What is OTC trading?', answer: 'OTC (Over The Counter) trading allows you to trade on weekends and holidays when regular markets are closed. OTC assets have special payout rates.' },
    ],
  },
  {
    title: 'Tournaments',
    icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
    items: [
      { question: 'How do tournaments work?', answer: 'Tournaments are competitive trading events where participants trade with virtual funds. Top performers win real money prizes from the prize pool.' },
      { question: 'How do I join a tournament?', answer: 'Click the "Tournaments" tab in the sidebar, select an active tournament, and pay the entry fee. You\'ll receive virtual funds to trade with.' },
      { question: 'What are tournament prizes?', answer: 'Prizes vary by tournament size and entry fee. The winner typically receives 30-50% of the prize pool, with smaller prizes for 2nd and 3rd place.' },
    ],
  },
];

const mockTickets: Ticket[] = [];

const contactCategories = ['Technical Issue', 'Account Problem', 'Payment Issue', 'Trading Question', 'Partnership', 'Other'];

const quickLinks = [
  { label: 'Live Chat', desc: 'Chat with support agent', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', color: 'green' },
  { label: 'Email Us', desc: 'support@nextorx.com', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', color: 'blue' },
  { label: 'Call Us', desc: '+1 (800) 123-4567', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', color: 'orange' },
];

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<Tab>('faq');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [formData, setFormData] = useState({ subject: '', category: '', message: '' });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleCategory = (title: string) => {
    setExpandedCategory(expandedCategory === title ? null : title);
  };

  const toggleQuestion = (question: string) => {
    setExpandedQuestion(expandedQuestion === question ? null : question);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    setTimeout(() => {
      setFormSubmitted(false);
      setFormData({ subject: '', category: '', message: '' });
    }, 3000);
  };

  const getStatusColor = (status: Ticket['status']) => {
    switch (status) {
      case 'open': return 'bg-blue/15 text-blue';
      case 'pending': return 'bg-orange/15 text-orange';
      case 'resolved': return 'bg-green/15 text-green';
      case 'closed': return 'bg-border/50 text-text-dark';
    }
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'faq', label: 'FAQ', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { key: 'contact', label: 'Contact Us', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { key: 'tickets', label: 'My Tickets', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  ];

  return (
    <div className="bg-background text-text h-full overflow-y-auto">
      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Support Center</h1>
            <p className="text-sm text-text-dark mt-1">Find answers or contact our team</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {quickLinks.map((link) => (
            <button key={link.label} className="bg-surface border border-border rounded-xl p-4 hover:bg-surface-hover transition-colors text-left">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  link.color === 'green' ? 'bg-green/15' : link.color === 'blue' ? 'bg-blue/15' : 'bg-orange/15'
                }`}>
                  <svg className={`w-5 h-5 ${
                    link.color === 'green' ? 'text-green' : link.color === 'blue' ? 'text-blue' : 'text-orange'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path d={link.icon} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <span className="text-sm font-semibold text-white block">{link.label}</span>
                  <span className="text-xs text-text-dark">{link.desc}</span>
                </div>
              </div>
            </button>
          ))}
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
                  {faqData.map((category) => (
                    <div key={category.title} className="bg-surface border border-border rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleCategory(category.title)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-hover transition-colors text-left"
                      >
                        <div className="w-9 h-9 rounded-lg bg-blue/15 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4.5 h-4.5 text-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
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
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="bg-surface border border-border rounded-xl p-6">
                {formSubmitted ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-full bg-green/15 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Message Sent!</h3>
                    <p className="text-sm text-text">We&apos;ll get back to you within 24 hours.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-text-dark uppercase tracking-wider mb-2">Subject</label>
                      <input
                        type="text" value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="Brief description of your issue" required
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-text-dark focus:outline-none focus:border-blue transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-dark uppercase tracking-wider mb-2">Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })} required
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue transition-colors appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-surface">Select a category</option>
                        {contactCategories.map((cat) => (
                          <option key={cat} value={cat} className="bg-surface">{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-dark uppercase tracking-wider mb-2">Message</label>
                      <textarea
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Describe your issue in detail..." required rows={5}
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-text-dark focus:outline-none focus:border-blue transition-colors resize-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-green hover:bg-green-hover text-white font-bold text-sm px-8 py-3 rounded-xl transition-colors shadow-lg shadow-green/20 active:scale-[0.98]"
                    >
                      Send Message
                    </button>
                  </form>
                )}
              </div>
            )}

            {activeTab === 'tickets' && (
              <div className="space-y-3">
                {mockTickets.map((ticket) => (
                  <div key={ticket.id} className="bg-surface border border-border rounded-xl p-4 hover:bg-surface-hover transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-text-dark bg-background px-2.5 py-1 rounded-lg">{ticket.id}</span>
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${getStatusColor(ticket.status)}`}>
                          {ticket.status}
                        </span>
                        <span className="text-xs text-text-dark bg-border/30 px-2 py-0.5 rounded">{ticket.category}</span>
                      </div>
                      <span className="text-xs text-text-dark">{ticket.date}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-white mb-1">{ticket.subject}</h4>
                    <p className="text-xs text-text-dark truncate">{ticket.lastMessage}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
