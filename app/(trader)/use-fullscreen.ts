'use client';

import { useState, useEffect } from 'react';

export function useFullscreenActive(): boolean {
  const [fs, setFs] = useState(false);
  useEffect(() => {
    const onChange = () => setFs(!!document.fullscreenElement);
    onChange();
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  return fs;
}
