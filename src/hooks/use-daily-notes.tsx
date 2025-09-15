'use client';

import type { DailyNote, User } from '@/lib/types';
import { createContext, useContext } from 'react';

// --- STATE ---

export interface DailyNotesState {
  notes: DailyNote[];
  loading: boolean;
  error: Error | null;
}

export const initialDailyNotesState: DailyNotesState = {
  notes: [],
  loading: true,
  error: null,
};

// --- CONTEXT ---

export interface DailyNotesContextType extends DailyNotesState {
  fetchDailyNotes: (user: User) => Promise<void>;
  setDailyNotes: (notes: DailyNote[]) => void;
  setDailyNotesLoading: (loading: boolean) => void;
  addNote: (note: string, date: Date) => Promise<void>;
  updateNote: (id: string, note: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  getNotesByDate: (date: Date) => DailyNote[];
}

export const DailyNotesContext = createContext<DailyNotesContextType | undefined>(undefined);

// --- HOOK ---

export const useDailyNotes = () => {
  const context = useContext(DailyNotesContext);
  if (context === undefined) {
    throw new Error('useDailyNotes must be used within a DailyNotesProvider');
  }
  return context;
};
