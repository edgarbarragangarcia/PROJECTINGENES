
'use client';

import { 
  GoogleCalendarContext, 
  initialGoogleCalendarState, 
} from '@/hooks/use-google-calendar';
import type { Session } from '@supabase/supabase-js';
import { type ReactNode } from 'react';

interface GoogleCalendarProviderProps {
    children: ReactNode;
    session: Session | null;
    providerToken: string | null;
}

export const GoogleCalendarProvider = ({ children, session, providerToken }: GoogleCalendarProviderProps) => {

  const getCalendarList = async () => {
    if (!providerToken) {
      throw new Error("Provider token not available.");
    }
    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        'Authorization': `Bearer ${providerToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error.message || 'Failed to fetch calendar list.');
    }
    
    return response.json();
  };

  const value = {
    session,
    providerToken,
    setProviderToken: () => {}, // No-op, managed by CombinedProvider
    setSession: () => {}, // No-op, managed by CombinedProvider
    getCalendarList,
  };

  return (
    <GoogleCalendarContext.Provider value={value}>
      {children}
    </GoogleCalendarContext.Provider>
  );
};
