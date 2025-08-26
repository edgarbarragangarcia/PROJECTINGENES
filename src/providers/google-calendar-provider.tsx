
'use client';

import { 
  GoogleCalendarContext, 
  initialGoogleCalendarState, 
  type GoogleCalendarState 
} from '@/hooks/use-google-calendar';
import type { Session } from '@supabase/supabase-js';
import { useState, type ReactNode } from 'react';

export const GoogleCalendarProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<GoogleCalendarState>(initialGoogleCalendarState);

  const setProviderToken = (token: string | null) => {
    setState(prevState => ({ ...prevState, providerToken: token }));
  };

  const setSession = (session: Session | null) => {
    setState(prevState => ({ ...prevState, session }));
  };

  const getCalendarList = async () => {
    if (!state.providerToken) {
      throw new Error("Provider token not available.");
    }
    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        'Authorization': `Bearer ${state.providerToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error.message || 'Failed to fetch calendar list.');
    }
    
    return response.json();
  };

  const value = {
    ...state,
    setProviderToken,
    setSession,
    getCalendarList,
  };

  return (
    <GoogleCalendarContext.Provider value={value}>
      {children}
    </GoogleCalendarContext.Provider>
  );
};
