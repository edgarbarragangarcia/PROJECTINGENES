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
  const [sessionUser, setSessionUser] = useState<any>(null);

  // Load current user on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (mounted) setSessionUser(user ?? null);
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [supabase]);

  // Projects (SWR)
  const {
    data: projectsData = [],
    error: projectsError,
    isLoading: projectsLoading,
    mutate: mutateProjects,
  } = useProjectsSWR(sessionUser);

  // Tasks / other domain SWR hooks (left wired to SWR so components using contexts can read them later)
  const { data: tasksData = [] } = useTasksSWR(sessionUser);
  const { data: dailyNotesData = [] } = useDailyNotesSWR(sessionUser);
  const { data: userStoriesData = [] } = useUserStoriesSWR(sessionUser);
  const { data: allUsersData = [] } = useAllUsersSWR();

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

  return (
    <ProjectsContext.Provider value={projectsContextValue}>
      <TasksContext.Provider value={{ ...initialTasksState, tasks: tasksData } as any}>
        <DailyNotesContext.Provider value={{ ...initialDailyNotesState, notes: dailyNotesData } as any}>
          <UserStoriesContext.Provider value={{ ...initialUserStoriesState, stories: userStoriesData } as any}>
            <GoogleCalendarProvider session={null}>{children}</GoogleCalendarProvider>
          </UserStoriesContext.Provider>
        </DailyNotesContext.Provider>
      </TasksContext.Provider>
    </ProjectsContext.Provider>
  );
}

