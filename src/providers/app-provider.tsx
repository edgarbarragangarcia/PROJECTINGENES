
'use client';

import { CombinedProvider } from '@/providers/combined-provider';
import { type ReactNode } from 'react';

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <CombinedProvider>
      {children}
    </CombinedProvider>
  );
}
