'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[40vh] flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 rounded-xl bg-red/10 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-red" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="text-sm font-bold text-foreground mb-1">Something went wrong</h3>
        <p className="text-xs text-text-dark mb-3">{error.digest ? 'A rendering error occurred' : error.message || 'An unexpected error occurred'}</p>
        <button onClick={reset} className="text-xs font-semibold text-blue hover:text-blue/80 transition-colors">
          Try again
        </button>
      </div>
    </div>
  );
}
