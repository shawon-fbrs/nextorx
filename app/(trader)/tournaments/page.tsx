'use client';

export default function TournamentsPage() {
  return (
    <div className="bg-background text-text h-full overflow-y-auto">
      <div className="px-6 py-6 max-w-xl mx-auto text-center">
        <h1 className="text-xl font-bold text-white">Tournaments</h1>
        <p className="text-sm text-text-dark mt-1">Compete and win prizes</p>
        <div className="mt-10 p-8 bg-surface border border-border rounded-2xl">
          <p className="text-4xl mb-4">🏆</p>
          <p className="text-white font-bold">Coming soon</p>
          <p className="text-xs text-text-dark mt-2 leading-relaxed">
            Daily and weekly tournaments with real prize pools are in development.
            Practice on the demo account meanwhile.
          </p>
        </div>
      </div>
    </div>
  );
}
