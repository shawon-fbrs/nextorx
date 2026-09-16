'use client';

import GlobalError from '@/app/components/GlobalError';

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <GlobalError error={error} reset={reset} />;
}
