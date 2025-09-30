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

export function CombinedProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

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

  const user = session ? session.user : null;
  const {
    data: projectsData = [],
    error: projectsError,
    isLoading: projectsLoading,
    mutate: mutateProjects,
  } = useProjectsSWR(user);

  const { data: tasksData = [], mutate: mutateTasks, error: tasksError, isLoading: tasksLoading } = useTasksSWR(user);
  const { data: dailyNotesData = [], mutate: mutateDailyNotes } = useDailyNotesSWR(user);
  const { data: userStoriesData = [] } = useUserStoriesSWR(user);
  const { data: allUsersData = [] } = useAllUsersSWR();

  const [localLoading, setLocalLoading] = useState(false);

  const addProject = useCallback(async (projectData: any) => {
    const { data, error } = await supabase.from('projects').insert([projectData]).select().single();
    if (error) throw error;
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
    let payload: any = { ...taskData };
    const subtasksPayload = payload.subtasks || [];
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
      delete payload.imageFile;
      delete payload.onUploadProgress;
    }

    if (!payload.assignees) payload.assignees = [];

    const dbPayload: any = {
      title: payload.title,
      description: payload.description ?? null,
      status: payload.status,
      priority: payload.priority,
      project_id: payload.project_id,
      assignees: payload.assignees,
      image_url: payload.image_url ?? null,
      creator_email: payload.creator_email ?? null,
      start_date: payload.startDate ? new Date(payload.startDate).toISOString() : null,
      due_date: payload.dueDate ? (payload.dueDate instanceof Date ? payload.dueDate.toISOString().slice(0,10) : new Date(payload.dueDate).toISOString().slice(0,10)) : null,
    };

    Object.keys(dbPayload).forEach(k => { if (dbPayload[k] === undefined) dbPayload[k] = null; });

    try {
      const { statuses, priorities } = await import('@/lib/types');
      if (!statuses.includes(payload.status)) {
        throw new Error(`Invalid status: ${payload.status}`);
      }
      if (!priorities.includes(payload.priority)) {
        throw new Error(`Invalid priority: ${payload.priority}`);
      }
    } catch (e) {
      if ((e as Error).message.startsWith('Invalid')) throw e;
    }

    if (!dbPayload.project_id) {
      throw new Error('project_id is required');
    }
    const { data: projectRow, error: projectError } = await supabase.from('projects').select('id').eq('id', dbPayload.project_id).single();
    if (projectError || !projectRow) {
      console.error('Project not found or permission denied', { projectId: dbPayload.project_id, projectError });
      throw new Error('Invalid project_id or insufficient permissions to access the project');
    }

    let createdTask: any = null;
    try {
      const { data: taskRow, error } = await supabase.from('tasks').insert([dbPayload]).select().single();
      if (error) {
        console.error('Failed to insert task', { dbPayload, errorMessage: error.message, errorDetails: error.details, errorHint: (error as any).hint || null, error });
        throw error;
      }
      createdTask = taskRow;
    } catch (e: any) {
      throw e;
    }

    if (subtasksPayload && Array.isArray(subtasksPayload) && subtasksPayload.length > 0) {
      try {
        const rows = subtasksPayload.map((st: any) => ({ ...st, task_id: createdTask.id }));
        const { error: stError } = await supabase.from('subtasks').insert(rows).select();
        if (stError) {
          console.error('Failed to insert subtasks', { rows, stError });
          throw stError;
        }
      } catch (e: any) {
        throw e;
      }
    }

    const { data: fullTask, error: fetchError } = await supabase.from('tasks').select('*, subtasks(*)').eq('id', createdTask.id).single();
    if (fetchError) {
      console.warn('Could not fetch full task after create', { id: createdTask.id, fetchError });
      if (mutateTasks) await mutateTasks((prev: any[] = []) => [createdTask, ...prev], false);
      return createdTask;
    }

    if (mutateTasks) {
      await mutateTasks((prev: any[] = []) => [fullTask, ...prev], false);
    }
    return fullTask;
  }, [supabase, mutateTasks]);

  const updateTask = useCallback(async (id: string, updates: any) => {
    let payload = { ...updates };
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
    const dbUpdates: any = { ...payload };
    if (payload.startDate) {
      dbUpdates.start_date = payload.startDate instanceof Date ? payload.startDate.toISOString() : new Date(payload.startDate).toISOString();
      delete dbUpdates.startDate;
    }
    if (payload.dueDate) {
      dbUpdates.due_date = payload.dueDate instanceof Date ? payload.dueDate.toISOString().slice(0,10) : new Date(payload.dueDate).toISOString().slice(0,10);
      delete dbUpdates.dueDate;
    }
    if (dbUpdates.assignees === undefined) dbUpdates.assignees = payload.assignees ?? [];

    if ('subtasks' in dbUpdates) delete dbUpdates.subtasks;
    if ('imageFile' in dbUpdates) delete dbUpdates.imageFile;
    if ('onUploadProgress' in dbUpdates) delete dbUpdates.onUploadProgress;
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

  const getTasksByStatus = useCallback((status: any, projectId?: string) => {
    if (!tasksData) return [];
    return (tasksData as any[]).filter(t => t.status === status && (projectId ? t.project_id === projectId : true));
  }, [tasksData]);

  const getTasksByProject = useCallback((projectId: string) => {
    if (!tasksData) return [];
    return (tasksData as any[]).filter(t => t.project_id === projectId);
  }, [tasksData]);

  const setDraggedTask = useCallback((id: string | null) => {
  }, []);

  const setTasks = useCallback(async (tasks: any[]) => {
    if (mutateTasks) return mutateTasks(tasks as any, false);
  }, [mutateTasks]);

  const setTasksLoading = useCallback((loading: boolean) => {
  }, []);

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

