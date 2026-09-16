'use client';

import GlobalError from '@/app/components/GlobalError';

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <GlobalError error={error} reset={reset} />;
}
