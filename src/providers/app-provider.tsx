
'use client';

import { CombinedProvider } from '@/providers/combined-provider';
import { type ReactNode } from 'react';
import { GoogleCalendarProvider } from './google-calendar-provider';

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <GoogleCalendarProvider>
      <CombinedProvider>
        {children}
      </CombinedProvider>
    </GoogleCalendarProvider>
  );
}
