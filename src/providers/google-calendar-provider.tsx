'use client';

import { 
  GoogleCalendarContext,
} from '@/hooks/use-google-calendar';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState, useEffect } from 'react';

interface GoogleCalendarProviderProps {
    children: ReactNode;
    session: Session | null;
}

export const GoogleCalendarProvider = ({ children, session }: GoogleCalendarProviderProps) => {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);

  useEffect(() => {
    const storedCalendarId = (globalThis as any).localStorage?.getItem('selectedGoogleCalendarId');
    if (storedCalendarId) {
      setSelectedCalendarId(JSON.parse(storedCalendarId));
    }
  }, []);

  const selectCalendar = (calendarId: string) => {
    setSelectedCalendarId(calendarId);
    (globalThis as any).localStorage?.setItem('selectedGoogleCalendarId', JSON.stringify(calendarId));
  };

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
    const cacheKey = `google-calendar-events-${calendarId}-${timeMin}-${timeMax}`;
    const cachedEvents = (globalThis as any).localStorage?.getItem(cacheKey);

    if (cachedEvents) {
      return JSON.parse(cachedEvents);
    }

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
    
    const events = await response.json();
    (globalThis as any).localStorage?.setItem(cacheKey, JSON.stringify(events));
    return events;
  }

  const createCalendarEvent = async (calendarId: string, event: any) => {
    const providerToken = session?.provider_token;
    if (!providerToken) {
      throw new Error("No estás autenticado con Google o el token ha expirado. Por favor, inicia sesión de nuevo.");
    }

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${providerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      return handleGoogleApiError(response);
    }

    return response.json();
  };

  const value = {
    session,
    providerToken: session?.provider_token || null,
    setProviderToken: () => {}, 
    setSession: () => {},
    getCalendarList,
    getCalendarEvents,
    selectedCalendarId,
    selectCalendar,
    createCalendarEvent,
  };

  return (
    <GoogleCalendarContext.Provider value={value}>
      {children}
    </GoogleCalendarContext.Provider>
  );
};
