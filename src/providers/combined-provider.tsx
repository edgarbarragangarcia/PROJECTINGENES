"use client";

import React, { type ReactNode, useEffect, useState, useCallback, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';

import { ProjectsContext, initialProjectsState } from '@/hooks/use-projects';
import { TasksContext, initialTasksState } from '@/hooks/use-tasks';
import { DailyNotesContext, initialDailyNotesState } from '@/hooks/use-daily-notes';
import { UserStoriesContext, initialUserStoriesState } from '@/hooks/use-user-stories';
import { GoogleCalendarProvider } from './google-calendar-provider';

import { createClient } from '@/lib/supabase/client';
import type { Project, Task, DailyNote, UserStory, Profile, ProjectWithProgress, Status, User } from '@/lib/types';

// This provider combines all the data contexts into one to avoid nested providers
// and centralize data fetching logic.
export function CombinedProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  // States for each data type
  const [projectsState, setProjectsState] = useState(initialProjectsState);
  const [tasksState, setTasksState] = useState(initialTasksState);
  const [dailyNotesState, setDailyNotesState] = useState(initialDailyNotesState);
  const [userStoriesState, setUserStoriesState] = useState(initialUserStoriesState);

  // --- AUTHENTICATION ---
  useEffect(() => {
    let mounted = true;
    async function getInitialSession() {
      const { data } = await supabase.auth.getSession();
      if (mounted) setSession(data.session ?? null);
    }
    getInitialSession();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setSession(session);
    });
    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]);

  const user = session?.user ?? null;

  // --- DATA FETCHING ---
  const refreshAllData = useCallback(async () => {
    if (!user) return;

    setProjectsState(s => ({ ...s, loading: true }));
    setTasksState(s => ({ ...s, loading: true }));
    setDailyNotesState(s => ({ ...s, loading: true }));
    setUserStoriesState(s => ({ ...s, loading: true }));

    // Fetch all data in parallel
    const [projectsRes, tasksRes, dailyNotesRes, userStoriesRes, allUsersRes] = await Promise.all([
      supabase.from('projects').select('*'),
      supabase.from('tasks').select('*'),
      supabase.from('daily_notes').select('*').eq('user_id', user.id),
      supabase.from('user_stories').select('*').eq('user_id', user.id),
      supabase.from('profiles').select('*'),
    ]);

    const projectsWithProgress = (projectsRes.data || []).map(p => {
        const projTasks = (tasksRes.data || []).filter(t => t.project_id === p.id);
        const total = projTasks.length;
        const completed = projTasks.filter(t => t.status === 'Done').length;
        return { ...p, progress: total > 0 ? Math.round((completed / total) * 100) : 0 };
    });

    // Update states with fetched data
    setProjectsState({ loading: false, error: projectsRes.error, projects: projectsWithProgress });
    setTasksState({ loading: false, error: tasksRes.error, tasks: tasksRes.data || [], allUsers: allUsersRes.data || [], draggedTask: null });
    setDailyNotesState({ loading: false, error: dailyNotesRes.error, notes: dailyNotesRes.data || [] });
    setUserStoriesState({ loading: false, error: userStoriesRes.error, userStories: userStoriesRes.data || [] });

  }, [user, supabase]);

  useEffect(() => {
    refreshAllData();
  }, [user, refreshAllData]);


  // --- PROJECTS CONTEXT ---
  const addProject = useCallback(async (projectData: any) => {
    if (!user) throw new Error("User not authenticated");
    const { data, error } = await supabase.from('projects').insert([{ ...projectData, user_id: user.id, creator_email: user.email, creator_name: user.user_metadata.full_name || user.email }]).select().single();
    if (error) throw error;
    await refreshAllData();
    return data;
  }, [supabase, user, refreshAllData]);

  const updateProject = useCallback(async (id: string, updates: any) => {
    const { data, error } = await supabase.from('projects').update(updates).eq('id', id).select().single();
    if (error) throw error;
    await refreshAllData();
  }, [supabase, refreshAllData]);

  const deleteProject = useCallback(async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
    await refreshAllData();
  }, [supabase, refreshAllData]);

  const projectsContextValue = useMemo(() => ({
    ...projectsState,
    addProject,
    updateProject,
    deleteProject,
    fetchProjects: refreshAllData,
    setProjects: (projects: ProjectWithProgress[]) => setProjectsState(s => ({ ...s, projects })),
    setProjectsLoading: (loading: boolean) => setProjectsState(s => ({ ...s, loading })),
    setProjectsError: (error: Error | null) => setProjectsState(s => ({ ...s, error })),
  }), [projectsState, addProject, updateProject, deleteProject, refreshAllData]);


  // --- TASKS CONTEXT ---
  const addTask = useCallback(async (taskData: any) => {
    if (!user) throw new Error("User not authenticated");
    const { data, error } = await supabase.from('tasks').insert([{ ...taskData, user_id: user.id }]).select().single();
    if (error) throw error;
    await refreshAllData();
    return data;
  }, [supabase, user, refreshAllData]);

  const updateTask = useCallback(async (id: string, updates: any) => {
    const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).select().single();
    if (error) throw error;
    await refreshAllData();
  }, [supabase, refreshAllData]);

  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
    await refreshAllData();
  }, [supabase, refreshAllData]);
  
  const updateUserRole = useCallback(async (userId: string, role: 'admin' | 'user') => {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
    if (error) throw error;
    await refreshAllData();
  }, [supabase, refreshAllData]);

  const tasksContextValue = useMemo(() => ({
    ...tasksState,
    addTask,
    updateTask,
    deleteTask,
    getTasksByStatus: (status: Status, projectId?: string) => {
      let filtered = tasksState.tasks;
      if (projectId) filtered = filtered.filter(t => t.project_id === projectId);
      return filtered.filter(t => t.status === status);
    },
    getTasksByProject: (projectId: string) => tasksState.tasks.filter(t => t.project_id === projectId),
    setDraggedTask: (id: string | null) => setTasksState(s => ({ ...s, draggedTask: id })),
    fetchTasks: async (user: User) => { await refreshAllData(); return tasksState.tasks; },
    setTasks: (tasks: Task[]) => setTasksState(s => ({ ...s, tasks })),
    setTasksLoading: (loading: boolean) => setTasksState(s => ({ ...s, loading })),
    fetchAllUsers: async () => { await refreshAllData() },
    updateUserRole,
    refreshAllData,
  }), [tasksState, addTask, updateTask, deleteTask, updateUserRole, refreshAllData]);


  // --- DAILY NOTES CONTEXT ---
  const addNote = useCallback(async (noteData: any) => {
    if (!user) throw new Error("User not authenticated");
    const { data, error } = await supabase.from('daily_notes').insert([{ ...noteData, user_id: user.id }]).select().single();
    if (error) throw error;
    await refreshAllData();
    return data;
  }, [supabase, user, refreshAllData]);

  const updateNote = useCallback(async (id: string, updates: any) => {
    const { data, error } = await supabase.from('daily_notes').update(updates).eq('id', id).select().single();
    if (error) throw error;
    await refreshAllData();
  }, [supabase, refreshAllData]);

  const deleteNote = useCallback(async (id: string) => {
    const { error } = await supabase.from('daily_notes').delete().eq('id', id);
    if (error) throw error;
    await refreshAllData();
  }, [supabase, refreshAllData]);

  const dailyNotesContextValue = useMemo(() => ({
    ...dailyNotesState,
    addNote,
    updateNote,
    deleteNote,
    getNotesByDate: (date: Date) => dailyNotesState.notes.filter((n: DailyNote) => n.date === date.toISOString().split('T')[0]),
    fetchDailyNotes: refreshAllData,
    setDailyNotes: (notes: DailyNote[]) => setDailyNotesState(s => ({ ...s, notes })),
    setDailyNotesLoading: (loading: boolean) => setDailyNotesState(s => ({ ...s, loading })),
  }), [dailyNotesState, addNote, updateNote, deleteNote, refreshAllData]);


  // --- USER STORIES CONTEXT ---
  const addUserStory = useCallback(async (storyData: any) => {
    if (!user) throw new Error("User not authenticated");
    const { data, error } = await supabase.from('user_stories').insert([{ ...storyData, user_id: user.id }]).select().single();
    if (error) throw error;
    await refreshAllData();
    return data;
  }, [supabase, user, refreshAllData]);

  const updateUserStory = useCallback(async (id: string, updates: any) => {
    const { data, error } = await supabase.from('user_stories').update(updates).eq('id', id).select().single();
    if (error) throw error;
    await refreshAllData();
  }, [supabase, refreshAllData]);

  const deleteUserStory = useCallback(async (id: string) => {
    const { error } = await supabase.from('user_stories').delete().eq('id', id);
    if (error) throw error;
    await refreshAllData();
  }, [supabase, refreshAllData]);

  const userStoriesContextValue = useMemo(() => ({
    ...userStoriesState,
    addUserStory,
    updateUserStory,
    deleteUserStory,
    fetchUserStories: refreshAllData,
    setUserStories: (userStories: UserStory[]) => setUserStoriesState(s => ({ ...s, userStories })),
    setUserStoriesLoading: (loading: boolean) => setUserStoriesState(s => ({ ...s, loading })),
    setUserStoriesError: (error: Error | null) => setUserStoriesState(s => ({ ...s, error })),
  }), [userStoriesState, addUserStory, updateUserStory, deleteUserStory, refreshAllData]);


  // --- COMBINED CONTEXT VALUE ---
  const combinedContextValue = useMemo(() => ({
    projects: projectsContextValue,
    tasks: tasksContextValue,
    dailyNotes: dailyNotesContextValue,
    userStories: userStoriesContextValue,
    session,
    supabase,
  }), [projectsContextValue, tasksContextValue, dailyNotesContextValue, userStoriesContextValue, session]);


  return (
    <ProjectsContext.Provider value={projectsContextValue}>
      <TasksContext.Provider value={tasksContextValue}>
        <DailyNotesContext.Provider value={dailyNotesContextValue}>
          <UserStoriesContext.Provider value={userStoriesContextValue as any}>
            <GoogleCalendarProvider session={session ?? null}>{children}</GoogleCalendarProvider>
          </UserStoriesContext.Provider>
        </DailyNotesContext.Provider>
      </TasksContext.Provider>
    </ProjectsContext.Provider>
  );
}

