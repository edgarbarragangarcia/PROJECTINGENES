"use client";

import React, { type ReactNode, useEffect, useState, useCallback } from 'react';

import { ProjectsContext, initialProjectsState } from '@/hooks/use-projects';
import { TasksContext, initialTasksState } from '@/hooks/use-tasks';
import { DailyNotesContext, initialDailyNotesState } from '@/hooks/use-daily-notes';
import { UserStoriesContext, initialUserStoriesState } from '@/hooks/use-user-stories';
import { GoogleCalendarProvider } from './google-calendar-provider';

import { createClient } from '@/lib/supabase/client';
import { Project } from '@/lib/types';
import {
  useProjects as useProjectsSWR,
  useTasks as useTasksSWR,
  useDailyNotes as useDailyNotesSWR,
  useUserStories as useUserStoriesSWR,
  useAllUsers as useAllUsersSWR,
} from '@/lib/use-data-hooks';

// CombinedProvider composes domain contexts. Implement a real Projects provider
// that uses the SWR read hooks and exposes typed mutators which update the SWR cache.
export function CombinedProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  // sessionUser: undefined = not checked yet, null = checked & no user, object = user
  const [sessionUser, setSessionUser] = useState<any | undefined>(undefined);

  // Load current user on mount and mark initialized
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (mounted) setSessionUser(user ?? null);
      } catch (e) {
        if (mounted) setSessionUser(null);
      }
    })();
    return () => { mounted = false; };
  }, [supabase]);

  // Projects (SWR)
  // Don't call SWR hooks until we've determined the session state. When sessionUser
  // is undefined the hooks are not invoked; once resolved they will fetch accordingly.
  const {
    data: projectsData = [],
    error: projectsError,
    isLoading: projectsLoading,
    mutate: mutateProjects,
  } = useProjectsSWR(sessionUser ?? null);

  // Tasks / other domain SWR hooks (left wired to SWR so components using contexts can read them later)
  const { data: tasksData = [] } = useTasksSWR(sessionUser ?? null);
  const { data: dailyNotesData = [] } = useDailyNotesSWR(sessionUser ?? null);
  const { data: userStoriesData = [] } = useUserStoriesSWR(sessionUser ?? null);
  const { data: allUsersData = [] } = useAllUsersSWR();

  // While we haven't checked session, show nothing (avoid rendering consumers
  // that would receive null/empty caches). This ensures mobile fetch logic that
  // depends on auth (MyTasksMobile) can query supabase directly and see an auth'ed user.
  // Local loading override so consumers can call setProjectsLoading
  const [localLoading, setLocalLoading] = useState(false);

  const addProject = useCallback(async (projectData: any) => {
    const { data, error } = await supabase.from('projects').insert([projectData]).select().single();
    if (error) throw error;
    // Optimistically update cache
    if (mutateProjects) {
      await mutateProjects((prev: any[] = []) => [data, ...prev], false);
    }
  }, [supabase, mutateProjects]);

  const updateProject = useCallback(async (id: string, updates: any) => {
    const { data, error } = await supabase.from('projects').update(updates).eq('id', id).select().single();
    if (error) throw error;
    if (mutateProjects) {
      await mutateProjects((prev: any[] = []) => prev.map(p => (p.id === id ? data : p)), false);
    }
  }, [supabase, mutateProjects]);

  const deleteProject = useCallback(async (id: string) => {
    const { data, error } = await supabase.from('projects').delete().eq('id', id).select().single();
    if (error) throw error;
    if (mutateProjects) {
      await mutateProjects((prev: any[] = []) => prev.filter(p => p.id !== id), false);
    }
  }, [supabase, mutateProjects]);

  const fetchProjects = useCallback(async (user: any) => {
    if (mutateProjects) return mutateProjects();
  }, [mutateProjects]);

  const setProjects = useCallback(async (projects: Project[]) => {
    if (mutateProjects) return mutateProjects(projects as any, false);
  }, [mutateProjects]);

  const setProjectsLoading = useCallback((loading: boolean) => {
    setLocalLoading(loading);
  }, []);

  const projectsContextValue = {
    projects: projectsData as any,
    loading: !!projectsLoading || localLoading,
    error: projectsError ?? null,
    addProject,
    updateProject,
    deleteProject,
    fetchProjects,
    setProjects,
    setProjectsLoading,
  } as any;

  if (sessionUser === undefined) {
    return (
      <ProjectsContext.Provider value={initialProjectsState as any}>
        <TasksContext.Provider value={initialTasksState as any}>
          <DailyNotesContext.Provider value={initialDailyNotesState as any}>
            <UserStoriesContext.Provider value={initialUserStoriesState as any}>
              <GoogleCalendarProvider session={null}>{/* loading... */ null}</GoogleCalendarProvider>
            </UserStoriesContext.Provider>
          </DailyNotesContext.Provider>
        </TasksContext.Provider>
      </ProjectsContext.Provider>
    );
  }

  return (
    <ProjectsContext.Provider value={projectsContextValue}>
      <TasksContext.Provider value={{ ...initialTasksState, tasks: tasksData, allUsers: allUsersData, loading: !!projectsLoading } as any}>
        <DailyNotesContext.Provider value={{ ...initialDailyNotesState, notes: dailyNotesData } as any}>
          <UserStoriesContext.Provider value={{ ...initialUserStoriesState, stories: userStoriesData } as any}>
            <GoogleCalendarProvider session={null}>{children}</GoogleCalendarProvider>
          </UserStoriesContext.Provider>
        </DailyNotesContext.Provider>
      </TasksContext.Provider>
    </ProjectsContext.Provider>
  );
}

