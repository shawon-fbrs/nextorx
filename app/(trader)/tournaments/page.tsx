'use client';

const tournaments = [
  { id: 1, name: 'Weekly Championship', prize: '$5,000', entry: '$10', participants: 156, maxParticipants: 200, endDate: 'Aug 31', status: 'active', progress: 78 },
  { id: 2, name: 'Daily Sprint', prize: '$1,000', entry: '$5', participants: 89, maxParticipants: 100, endDate: 'Aug 28', status: 'active', progress: 89 },
  { id: 3, name: 'Rookie Tournament', prize: '$500', entry: 'Free', participants: 234, maxParticipants: 500, endDate: 'Sep 1', status: 'upcoming', progress: 0 },
  { id: 4, name: 'VIP Elite Cup', prize: '$10,000', entry: '$50', participants: 42, maxParticipants: 50, endDate: 'Sep 5', status: 'upcoming', progress: 0 },
  { id: 5, name: 'Speed Trading', prize: '$2,000', entry: '$15', participants: 67, maxParticipants: 100, endDate: 'Sep 3', status: 'active', progress: 67 },
  { id: 6, name: 'Weekend Battle', prize: '$3,000', entry: '$20', participants: 0, maxParticipants: 150, endDate: 'Sep 7', status: 'upcoming', progress: 0 },
];

const stats = [
  { label: 'Active Tournaments', value: '3', color: 'text-green' },
  { label: 'Your Wins', value: '2', color: 'text-blue' },
  { label: 'Total Earned', value: '$450', color: 'text-orange' },
];

export default function TournamentsPage() {
  return (
    <div className="bg-background text-text h-full overflow-y-auto">
      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Tournaments</h1>
            <p className="text-sm text-text-dark mt-1">Compete and win prizes</p>
          </div>
          <button className="bg-green hover:bg-green-hover text-white text-xs font-bold px-5 py-2.5 rounded-lg transition-colors shadow-lg shadow-green/20">
            Browse All
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-surface border border-border rounded-xl p-4">
              <span className="text-[11px] text-text-dark font-semibold uppercase tracking-wider">{stat.label}</span>
              <p className={`text-2xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-5">
          <button className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue text-white">All</button>
          <button className="px-4 py-2 rounded-lg text-xs font-semibold bg-surface border border-border text-text hover:bg-surface-hover">Active</button>
          <button className="px-4 py-2 rounded-lg text-xs font-semibold bg-surface border border-border text-text hover:bg-surface-hover">Upcoming</button>
          <button className="px-4 py-2 rounded-lg text-xs font-semibold bg-surface border border-border text-text hover:bg-surface-hover">Completed</button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {tournaments.map((t) => (
            <div key={t.id} className="bg-surface border border-border rounded-xl overflow-hidden hover:border-text-dark/30 transition-colors">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      t.status === 'active' ? 'bg-green/15' : 'bg-blue/15'
                    }`}>
                      <svg className={`w-4.5 h-4.5 ${t.status === 'active' ? 'text-green' : 'text-blue'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{t.name}</h3>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        t.status === 'active' ? 'bg-green/15 text-green' : 'bg-blue/15 text-blue'
                      }`}>{t.status}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-background rounded-lg p-2.5">
                    <span className="text-[9px] text-text-dark font-semibold uppercase block">Prize</span>
                    <span className="text-sm font-bold text-green">{t.prize}</span>
                  </div>
                  <div className="bg-background rounded-lg p-2.5">
                    <span className="text-[9px] text-text-dark font-semibold uppercase block">Entry</span>
                    <span className="text-sm font-bold text-white">{t.entry}</span>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-text-dark">{t.participants}/{t.maxParticipants}</span>
                    <span className="text-[10px] text-text-dark">{t.endDate}</span>
                  </div>
                  <div className="h-1.5 bg-background rounded-full overflow-hidden">
                    <div className="h-full bg-blue rounded-full" style={{ width: `${(t.participants / t.maxParticipants) * 100}%` }} />
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 border-t border-border">
                <button className={`w-full py-2 rounded-lg text-xs font-bold transition-colors ${
                  t.status === 'active'
                    ? 'bg-green hover:bg-green-hover text-white'
                    : 'bg-blue hover:bg-blue-hover text-white'
                }`}>
                  {t.status === 'active' ? 'Join Now' : 'Register'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
