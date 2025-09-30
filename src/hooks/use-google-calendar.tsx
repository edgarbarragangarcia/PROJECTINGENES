'use client';

import type { Session } from '@supabase/supabase-js';
import { createContext, useContext } from 'react';

// --- STATE ---

export interface GoogleCalendarState {
  providerToken: string | null;
  session: Session | null;
}

export const initialGoogleCalendarState: GoogleCalendarState = {
  providerToken: null,
  session: null,
};

// --- CONTEXT ---

export interface GoogleCalendarContextType extends GoogleCalendarState {
  isLoading: boolean;
  setProviderToken: (token: string | null) => void;
  setSession: (session: Session | null) => void;
  getCalendarList: () => Promise<any>;
  getCalendarEvents: (calendarId: string, timeMin: string, timeMax: string) => Promise<any>;
  createCalendarEvent: (calendarId: string, event: any) => Promise<any>;
  selectedCalendarId: string | null;
  selectCalendar: (calendarId: string) => void;
}

export const GoogleCalendarContext = createContext<GoogleCalendarContextType>({
  session: null,
  providerToken: null,
  isLoading: true,
  setProviderToken: () => {},
  setSession: () => {},
  getCalendarList: async () => {},
  getCalendarEvents: async () => {},
  createCalendarEvent: async () => {},
  selectedCalendarId: null,
  selectCalendar: () => {},
});

// --- HOOK ---

export const useGoogleCalendar = () => {
  const context = useContext(GoogleCalendarContext);
  if (context === undefined) {
    throw new Error('useGoogleCalendar must be used within a GoogleCalendarProvider');
  }
  return context;
};
