"use client";

import React, { type ReactNode } from 'react';

import { ProjectsContext, initialProjectsState } from '@/hooks/use-projects';
import { TasksContext, initialTasksState } from '@/hooks/use-tasks';
import { DailyNotesContext, initialDailyNotesState } from '@/hooks/use-daily-notes';
import { UserStoriesContext, initialUserStoriesState } from '@/hooks/use-user-stories';
import { GoogleCalendarProvider } from './google-calendar-provider';

// Minimal CombinedProvider scaffold. Keeps the app running while we unify types
// and reintroduce realtime/SWR wiring in small, tested steps.
export function CombinedProvider({ children }: { children: ReactNode }) {
  return (
    <ProjectsContext.Provider value={initialProjectsState as any}>
      <TasksContext.Provider value={initialTasksState as any}>
        <DailyNotesContext.Provider value={initialDailyNotesState as any}>
          <UserStoriesContext.Provider value={initialUserStoriesState as any}>
            <GoogleCalendarProvider session={null}>{children}</GoogleCalendarProvider>
          </UserStoriesContext.Provider>
        </DailyNotesContext.Provider>
      </TasksContext.Provider>
    </ProjectsContext.Provider>
  );
}

