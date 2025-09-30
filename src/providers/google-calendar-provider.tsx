'use client';

import { 
  GoogleCalendarContext,
} from '@/hooks/use-google-calendar';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';

interface GoogleCalendarProviderProps {
    children: ReactNode;
    session: Session | null;
}

export const GoogleCalendarProvider = ({ children, session }: GoogleCalendarProviderProps) => {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const handleGoogleApiError = async (response: Response) => {
    if (response.status === 401) {
      await supabase.auth.signOut();
      router.push('/login');
      throw new Error("Tu sesión de Google ha expirado. Por favor, inicia sesión de nuevo.");
    }
    const errorData = await response.json();
    console.error('Google API Error:', errorData);
    throw new Error(errorData.error.message || 'Ocurrió un error con la API de Google.');
  };

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
      return handleGoogleApiError(response);
    }
    
    return response.json();
  };

  const getCalendarEvents = async (calendarId: string, timeMin: string, timeMax: string) => {
    const providerToken = session?.provider_token;
    if (!providerToken) {
      throw new Error("No estás autenticado con Google o el token ha expirado. Por favor, inicia sesión de nuevo.");
    }
    const params = new URLSearchParams({ timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime' });
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${providerToken}`
      }
    });

     if (!response.ok) {
      return handleGoogleApiError(response);
    }
    
    return response.json();
  }

  const value = {
    session,
    providerToken: session?.provider_token || null,
    setProviderToken: () => {}, 
    setSession: () => {},
    getCalendarList,
    getCalendarEvents,
  };

  return (
    <GoogleCalendarContext.Provider value={value}>
      {children}
    </GoogleCalendarContext.Provider>
  );
};
