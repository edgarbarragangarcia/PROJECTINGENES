"use client";

import React, { type ReactNode, useEffect, useState, useCallback, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';

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
  // session: undefined = not checked yet, null = checked & no user, object = session
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  // Load current session on mount and listen for changes.
  useEffect(() => {
    let mounted = true;

    async function getInitialSession() {
      try {
        const { data } = await supabase.auth.getSession();
        if (mounted) setSession(data.session ?? null);
      } catch (e) {
        if (mounted) setSession(null);
      }
    }

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          setSession(session);
        }
      }
    );

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]);

  // Projects (SWR)
  // Don't call SWR hooks until we've determined the session state. When session
  // is undefined the hooks are not invoked; once resolved they will fetch accordingly.
  const user = session ? session.user : null;
  const {
    data: projectsData = [],
    error: projectsError,
    isLoading: projectsLoading,
    mutate: mutateProjects,
  } = useProjectsSWR(user);

  // Tasks / other domain SWR hooks (left wired to SWR so components using contexts can read them later)
  const { data: tasksData = [], mutate: mutateTasks, error: tasksError, isLoading: tasksLoading } = useTasksSWR(user);
  const { data: dailyNotesData = [], mutate: mutateDailyNotes } = useDailyNotesSWR(user);
  const { data: userStoriesData = [] } = useUserStoriesSWR(user);
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

  // Compute projects annotated with a numeric progress (0-100)
  const projectsWithProgress = useMemo(() => {
    const projectsArr: any[] = (projectsData || []) as any[];
    const tasksArr: any[] = (tasksData || []) as any[];
    return projectsArr.map(p => {
      const projTasks = tasksArr.filter(t => t.project_id === p.id || t.projectId === p.id);
      const total = projTasks.length;
      const completed = projTasks.filter(t => (t.status || '').toString() === 'Done').length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { ...p, progress };
    });
  }, [projectsData, tasksData]);

  const projectsContextValue = {
    projects: (projectsWithProgress as any[]),
    loading: !!projectsLoading || localLoading,
    error: projectsError ?? null,
    addProject,
    updateProject,
    deleteProject,
    fetchProjects,
    setProjects,
    setProjectsLoading,
  } as any;

  

  const addTask = useCallback(async (taskData: any) => {
    // Support optional image upload via storage if caller provided imageFile
    let payload: any = { ...taskData };
    const subtasksPayload = payload.subtasks || [];
    // Remove subtasks for the main insert; we'll insert them after we have task id
    delete payload.subtasks;

    if (taskData.imageFile) {
      try {
        const file = taskData.imageFile as File;
        const filePath = `tasks/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from('public').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('public').getPublicUrl(filePath);
        payload.image_url = urlData.publicUrl;
      } catch (e) {
        console.warn('Image upload failed', e);
      }
      // remove helper props
      delete payload.imageFile;
      delete payload.onUploadProgress;
    }

    // Ensure assignees is explicit (jsonb)
    if (!payload.assignees) payload.assignees = [];

    // Map camelCase form fields to snake_case DB columns
    const dbPayload: any = {
      title: payload.title,
      description: payload.description ?? null,
      status: payload.status,
      priority: payload.priority,
      project_id: payload.project_id,
      assignees: payload.assignees,
      image_url: payload.image_url ?? null,
      creator_email: payload.creator_email ?? null,
      // map dates if present
      start_date: payload.startDate ? new Date(payload.startDate).toISOString() : null,
      due_date: payload.dueDate ? (payload.dueDate instanceof Date ? payload.dueDate.toISOString().slice(0,10) : new Date(payload.dueDate).toISOString().slice(0,10)) : null,
    };

    // Remove undefined keys
    Object.keys(dbPayload).forEach(k => { if (dbPayload[k] === undefined) dbPayload[k] = null; });

    // Validate status and priority against allowed lists
    try {
      const { statuses, priorities } = await import('@/lib/types');
      if (!statuses.includes(payload.status)) {
        throw new Error(`Invalid status: ${payload.status}`);
      }
      if (!priorities.includes(payload.priority)) {
        throw new Error(`Invalid priority: ${payload.priority}`);
      }
    } catch (e) {
      // if import fails or validation fails, rethrow as error for caller
      if ((e as Error).message.startsWith('Invalid')) throw e;
      // otherwise ignore import error and proceed
    }

    // Ensure the referenced project exists
    if (!dbPayload.project_id) {
      throw new Error('project_id is required');
    }
    const { data: projectRow, error: projectError } = await supabase.from('projects').select('id').eq('id', dbPayload.project_id).single();
    if (projectError || !projectRow) {
      console.error('Project not found or permission denied', { projectId: dbPayload.project_id, projectError });
      throw new Error('Invalid project_id or insufficient permissions to access the project');
    }

    // Insert task without subtasks first
    let createdTask: any = null;
    try {
      const { data: taskRow, error } = await supabase.from('tasks').insert([dbPayload]).select().single();
      if (error) {
        // PostgREST error object often contains message, details, hint
        console.error('Failed to insert task', { dbPayload, errorMessage: error.message, errorDetails: error.details, errorHint: (error as any).hint || null, error });
        throw error;
      }
      createdTask = taskRow;
    } catch (e: any) {
      // rethrow so the caller shows the error
      throw e;
    }

    // If there are subtasks, insert them referencing the created task id
    if (subtasksPayload && Array.isArray(subtasksPayload) && subtasksPayload.length > 0) {
      try {
        const rows = subtasksPayload.map((st: any) => ({ ...st, task_id: createdTask.id }));
        const { error: stError } = await supabase.from('subtasks').insert(rows).select();
        if (stError) {
          console.error('Failed to insert subtasks', { rows, stError });
          // If subtasks insertion fails, proceed but log; optionally you may rollback the created task
          throw stError;
        }
      } catch (e: any) {
        // bubble up error for now
        throw e;
      }
    }

    // Fetch the task with subtasks to return the full shape
    const { data: fullTask, error: fetchError } = await supabase.from('tasks').select('*, subtasks(*)').eq('id', createdTask.id).single();
    if (fetchError) {
      console.warn('Could not fetch full task after create', { id: createdTask.id, fetchError });
      // return the createdTask anyway
      if (mutateTasks) await mutateTasks((prev: any[] = []) => [createdTask, ...prev], false);
      return createdTask;
    }

    if (mutateTasks) {
      await mutateTasks((prev: any[] = []) => [fullTask, ...prev], false);
    }
    return fullTask;
  }, [supabase, mutateTasks]);

  const updateTask = useCallback(async (id: string, updates: any) => {
    // handle image upload similarly
    let payload = { ...updates };
    // handle image upload similarly
    if (updates.imageFile) {
      try {
        const file = updates.imageFile as File;
        const filePath = `tasks/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from('public').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('public').getPublicUrl(filePath);
        payload.image_url = urlData.publicUrl;
      } catch (e) {
        console.warn('Image upload failed', e);
      }
      delete payload.imageFile;
      delete payload.onUploadProgress;
    }
    // Map camelCase date fields to DB snake_case and formats
    const dbUpdates: any = { ...payload };
    if (payload.startDate) {
      dbUpdates.start_date = payload.startDate instanceof Date ? payload.startDate.toISOString() : new Date(payload.startDate).toISOString();
      delete dbUpdates.startDate;
    }
    if (payload.dueDate) {
      // store only date portion for due_date (date column)
      dbUpdates.due_date = payload.dueDate instanceof Date ? payload.dueDate.toISOString().slice(0,10) : new Date(payload.dueDate).toISOString().slice(0,10);
      delete dbUpdates.dueDate;
    }
    if (dbUpdates.assignees === undefined) dbUpdates.assignees = payload.assignees ?? [];

    // Remove non-column fields that may be present (e.g., subtasks)
    if ('subtasks' in dbUpdates) delete dbUpdates.subtasks;
    if ('imageFile' in dbUpdates) delete dbUpdates.imageFile;
    if ('onUploadProgress' in dbUpdates) delete dbUpdates.onUploadProgress;
    // normalize undefined -> null for PostgREST
    Object.keys(dbUpdates).forEach(k => { if (dbUpdates[k] === undefined) dbUpdates[k] = null; });

    try {
      const { data, error } = await supabase.from('tasks').update(dbUpdates).eq('id', id).select('*, subtasks(*)').single();
      if (error) {
        console.error('Failed to update task', { id, dbUpdates, errorMessage: error.message, errorDetails: error.details, errorHint: (error as any).hint || null, error });
        throw error;
      }
      if (mutateTasks) {
        await mutateTasks((prev: any[] = []) => prev.map(t => (t.id === id ? data : t)), false);
      }
      return data;
    } catch (e) {
      throw e;
    }
  }, [supabase, mutateTasks]);

  const deleteTask = useCallback(async (id: string) => {
    const { data, error } = await supabase.from('tasks').delete().eq('id', id).select().single();
    if (error) throw error;
    if (mutateTasks) {
      await mutateTasks((prev: any[] = []) => prev.filter(t => t.id !== id), false);
    }
  }, [supabase, mutateTasks]);

  // Utility/accessor helpers expected by the TasksContext interface
  const getTasksByStatus = useCallback((status: any, projectId?: string) => {
    if (!tasksData) return [];
    return (tasksData as any[]).filter(t => t.status === status && (projectId ? t.project_id === projectId : true));
  }, [tasksData]);

  const getTasksByProject = useCallback((projectId: string) => {
    if (!tasksData) return [];
    return (tasksData as any[]).filter(t => t.project_id === projectId);
  }, [tasksData]);

  const setDraggedTask = useCallback((id: string | null) => {
    // placeholder: not storing draggedTask in this provider's state currently
    // Could add a useState for draggedTask if needed by consumers
    // noop for now
  }, []);

  const setTasks = useCallback(async (tasks: any[]) => {
    if (mutateTasks) return mutateTasks(tasks as any, false);
  }, [mutateTasks]);

  const setTasksLoading = useCallback((loading: boolean) => {
    // noop: tasks loading is derived from SWR isLoading; we keep function for compatibility
  }, []);

  // --- Daily Notes ---
  const addNote = useCallback(async (note: string, date: Date) => {
    if (!session?.user) throw new Error('User not authenticated');
    const { data, error } = await supabase.from('daily_notes').insert([{ note, date: date.toISOString().slice(0,10), user_id: session.user.id }]).select().single();
    if (error) throw error;
    if (mutateDailyNotes) {
      await mutateDailyNotes((prev: any[] = []) => [data, ...prev], false);
    }
  }, [supabase, mutateDailyNotes, session]);

  const updateNote = useCallback(async (id: string, note: string) => {
    const { data, error } = await supabase.from('daily_notes').update({ note }).eq('id', id).select().single();
    if (error) throw error;
    if (mutateDailyNotes) {
      await mutateDailyNotes((prev: any[] = []) => prev.map(n => n.id === id ? data : n), false);
    }
  }, [supabase, mutateDailyNotes]);

  const deleteNote = useCallback(async (id: string) => {
    const { error } = await supabase.from('daily_notes').delete().eq('id', id);
    if (error) throw error;
    if (mutateDailyNotes) {
      await mutateDailyNotes((prev: any[] = []) => prev.filter(n => n.id !== id), false);
    }
  }, [supabase, mutateDailyNotes]);

  const getNotesByDate = useCallback((date: Date) => {
    const dateString = date.toISOString().slice(0, 10);
    return (dailyNotesData as any[]).filter(note => note.date === dateString);
  }, [dailyNotesData]);

  const dailyNotesContextValue = {
    ...initialDailyNotesState,
    notes: dailyNotesData,
    loading: !dailyNotesData,
    addNote,
    updateNote,
    deleteNote,
    getNotesByDate,
    // placeholder no-ops for functions not implemented here
    fetchDailyNotes: async () => {},
    setDailyNotes: () => {},
    setDailyNotesLoading: () => {},
  };

  return (
    <ProjectsContext.Provider value={projectsContextValue}>
  <TasksContext.Provider value={{ ...initialTasksState, tasks: tasksData, allUsers: allUsersData, loading: !!projectsLoading || !!tasksLoading, addTask, updateTask, deleteTask, getTasksByProject, getTasksByStatus, setDraggedTask, fetchTasks: fetchProjects, setTasks, setTasksLoading } as any}>
        <DailyNotesContext.Provider value={dailyNotesContextValue as any}>
          <UserStoriesContext.Provider value={{ ...initialUserStoriesState, stories: userStoriesData } as any}>
            <GoogleCalendarProvider session={session ?? null}>{children}</GoogleCalendarProvider>
          </UserStoriesContext.Provider>
        </DailyNotesContext.Provider>
      </TasksContext.Provider>
    </ProjectsContext.Provider>
  );
}

