
'use client';

import { 
  GoogleCalendarContext,
} from '@/hooks/use-google-calendar';
import type { Session } from '@supabase/supabase-js';
import { type ReactNode } from 'react';

interface GoogleCalendarProviderProps {
    children: ReactNode;
    session: Session | null;
}

export const GoogleCalendarProvider = ({ children, session }: GoogleCalendarProviderProps) => {

  const getCalendarList = async () => {
    const providerToken = session?.provider_token;
    if (!providerToken) {
      throw new Error("No estás autenticado con Google o el token ha expirado. Por favor, inicia sesión de nuevo.");
    }

    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        'Authorization': `Bearer ${providerToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Google API Error:', errorData);
      throw new Error(errorData.error.message || 'No se pudieron obtener los calendarios de Google.');
    }
    
    return response.json();
  };

  const value = {
    session,
    providerToken: session?.provider_token || null,
    setProviderToken: () => {}, 
    setSession: () => {},
    getCalendarList,
  };

  return (
    <GoogleCalendarContext.Provider value={value}>
      {children}
    </GoogleCalendarContext.Provider>
  );
};
