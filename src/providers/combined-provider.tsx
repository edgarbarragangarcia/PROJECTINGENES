'use client';

import { ProjectsContext, initialProjectsState, type ProjectsContextType } from '@/hooks/use-projects';
import { TasksContext, initialTasksState, type TasksContextType } from '@/hooks/use-tasks';
import { DailyNotesContext, initialDailyNotesState, type DailyNotesState, type DailyNotesContextType } from '@/hooks/use-daily-notes';
import { createClient } from '@/lib/supabase/client';
import type { Project, ProjectWithProgress, Task, DailyNote, User } from '@/lib/types';
import { useState, useCallback, useEffect, type ReactNode, useMemo } from 'react';
import { format } from 'date-fns';
import { GoogleCalendarProvider } from './google-calendar-provider';

export const adminEmails = ['edgarbarragangarcia@gmail.com', 'eabarragang@ingenes.com', 'ntorres@ingenes.com'];

export const CombinedProvider = ({ children }: { children: ReactNode }) => {
  const [projectsState, setProjectsState] = useState(initialProjectsState);
  const [tasksState, setTasksState] = useState(initialTasksState);
  const [dailyNotesState, setDailyNotesState] = useState<DailyNotesState>(initialDailyNotesState);
  const supabase = createClient();
  const [session, setSession] = useState<any>(null);
  const [providerToken, setProviderToken] = useState<string | null>(null);

  // --- Projects ---
  const setProjects = (projects: ProjectWithProgress[]) => setProjectsState(prevState => ({ ...prevState, projects }));
  const setProjectsLoading = (loading: boolean) => setProjectsState(prevState => ({ ...prevState, loading }));
  const setProjectsError = (error: Error | null) => setProjectsState(prevState => ({ ...prevState, error }));
  
  // --- Tasks ---
  const setTasks = (tasks: Task[]) => setTasksState(prevState => ({ ...prevState, tasks }));
  const setTasksLoading = (loading: boolean) => setTasksState(prevState => ({ ...prevState, loading }));
  const setDraggedTask = (id: string | null) => setTasksState(prevState => ({ ...prevState, draggedTask: id }));
  
  // --- Daily Notes ---
  const setDailyNotes = (notes: DailyNote[]) => setDailyNotesState(prevState => ({ ...prevState, notes }));
  const setDailyNotesLoading = (loading: boolean) => setDailyNotesState(prevState => ({ ...prevState, loading }));

  const fetchProjects = useCallback(async (user: User) => {
    setProjectsState(prevState => ({ ...prevState, loading: true, error: null }));
    try {
      const isAdmin = user.email && adminEmails.includes(user.email);
      let query = supabase.from('projects').select('*');

      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error("Supabase error fetching projects:", error);
        throw error;
      }
      
      setProjectsState(prevState => ({ ...prevState, loading: false, projects: data || [] }));
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      setProjectsState(prevState => ({ ...prevState, loading: false, error }));
    }
  }, [supabase]);


  const fetchTasks = useCallback(async (user: User) => {
    setTasksState(prevState => ({ ...prevState, loading: true, error: null }));
    try {
      const isAdmin = user.email && adminEmails.includes(user.email);
      let query = supabase.from('tasks').select('*');

      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const formattedTasks = (data || []).map(task => ({
        ...task,
        projectId: task.project_id,
        startDate: task.start_date ? new Date(task.start_date) : undefined,
        dueDate: task.due_date ? new Date(task.due_date) : undefined
      }));
      setTasksState(prevState => ({ ...prevState, loading: false, tasks: formattedTasks }));
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      setTasksState(prevState => ({ ...prevState, loading: false, error }));
    }
  }, [supabase]);

  const fetchDailyNotes = useCallback(async (user: User) => {
    setDailyNotesState(prevState => ({ ...prevState, loading: true, error: null }));
    try {
      const { data, error } = await supabase
        .from('daily_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      setDailyNotesState(prevState => ({ ...prevState, loading: false, notes: data || [] }));
    } catch (error: any) {
      console.error('Error fetching daily notes:', error);
      setDailyNotesState(prevState => ({ ...prevState, loading: false, error }));
    }
  }, [supabase]);

  const fetchAllData = useCallback(async (user: User) => {
    await Promise.all([
      fetchProjects(user),
      fetchTasks(user),
      fetchDailyNotes(user)
    ]);
  }, [fetchProjects, fetchTasks, fetchDailyNotes]);


  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      
      if (session) {
        setProviderToken(session?.provider_token || null);
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          fetchAllData(session.user);
        }
      } else if (event === 'SIGNED_OUT') {
        setProjectsState(initialProjectsState);
        setTasksState(initialTasksState);
        setDailyNotesState(initialDailyNotesState);
        setProviderToken(null);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth, fetchAllData]);

  const calculateProgress = useCallback((projectId: string, allTasks: Task[]): number => {
    const projectTasks = allTasks.filter(t => t.projectId === projectId);
    if (projectTasks.length === 0) return 0;
    const completedTasks = projectTasks.filter(t => t.status === 'Done').length;
    return Math.round((completedTasks / projectTasks.length) * 100);
  }, []);
  
  const projectsWithProgress = useMemo(() => {
    return projectsState.projects.map(p => ({
      ...p,
      progress: calculateProgress(p.id, tasksState.tasks)
    }));
  }, [projectsState.projects, tasksState.tasks, calculateProgress]);

  const addProject = async (projectData: Omit<Project, 'id' | 'created_at' | 'user_id' | 'progress'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");
    
    const { data, error } = await supabase
      .from('projects')
      .insert({ ...projectData, user_id: user.id })
      .select('*')
      .single();
      
    if (error) throw error;
    
    if (data) {
      setProjectsState(prevState => ({ 
        ...prevState, 
        projects: [data, ...prevState.projects] 
      }));
    }
  };

  const updateProject = async (id: string, data: Partial<Omit<Project, 'id' | 'created_at' | 'user_id' | 'progress'>>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const { error } = await supabase.from('projects').update(data).eq('id', id);
    if (error) throw error;
    await fetchProjects(user);
  };

  const deleteProject = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const { error: tasksError } = await supabase.from('tasks').delete().eq('project_id', id);
    if(tasksError) throw tasksError;
    
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
    
    setTasksState(prevState => ({ 
      ...prevState, 
      tasks: prevState.tasks.filter((t) => t.projectId !== id)
    }));
    setProjectsState(prevState => ({ 
      ...prevState, 
      projects: prevState.projects.filter((p) => p.id !== id) 
    }));
  };

  const addTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'user_id'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");
    
    const { startDate, dueDate, ...restOfTaskData } = taskData;
    const { data, error } = await supabase
      .from('tasks')
      .insert({ 
        ...restOfTaskData, 
        user_id: user.id, 
        start_date: startDate?.toISOString(), 
        due_date: dueDate?.toISOString() 
      })
      .select()
      .single();
      
    if (error) throw error;
    
    if (data) {
      const formattedTask = { 
        ...data, 
        projectId: data.project_id, 
        startDate: data.start_date ? new Date(data.start_date) : undefined, 
        dueDate: data.due_date ? new Date(data.due_date) : undefined 
      };
      setTasksState(prevState => ({ 
        ...prevState, 
        tasks: [formattedTask, ...prevState.tasks] 
      }));
    }
  };

  const updateTask = async (id: string, taskData: Partial<Omit<Task, 'id' | 'created_at' | 'user_id'>>) => {
    const dataToUpdate: Record<string, any> = { ...taskData };
    if ('startDate' in taskData) dataToUpdate.start_date = taskData.startDate ? taskData.startDate.toISOString() : null;
    if ('dueDate' in taskData) dataToUpdate.due_date = taskData.dueDate ? taskData.dueDate.toISOString() : null;
    if (taskData.projectId) dataToUpdate.project_id = taskData.projectId;
    delete dataToUpdate.startDate;
    delete dataToUpdate.dueDate;
    delete dataToUpdate.projectId;
    
    const { error } = await supabase.from('tasks').update(dataToUpdate).eq('id', id);
    if (error) throw error;
    
    setTasksState(prevState => ({ 
      ...prevState, 
      tasks: prevState.tasks.map((t) => (t.id === id ? { ...t, ...taskData } : t)) 
    }));
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
    
    setTasksState(prevState => ({ 
      ...prevState, 
      tasks: prevState.tasks.filter((task) => task.id !== id) 
    }));
  };
  
  const getTasksByStatus = (status: Task['status'], projectId?: string) => {
    let filteredTasks = tasksState.tasks.filter((task) => task.status === status);
    if (projectId) filteredTasks = filteredTasks.filter(task => task.projectId === projectId);
    return filteredTasks;
  };

  const getTasksByProject = (projectId: string) => tasksState.tasks.filter(task => task.projectId === projectId);

  const addNote = async (note: string, date: Date) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const dateString = format(date, 'yyyy-MM-dd');
    const { data, error } = await supabase
      .from('daily_notes')
      .insert({
        user_id: user.id,
        date: dateString,
        note: note,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    if (data) {
      setDailyNotesState(prevState => ({
        ...prevState,
        notes: [...prevState.notes, data].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
      }));
    }
  };

  const updateNote = async (id: string, note: string) => {
    const { data, error } = await supabase
      .from('daily_notes')
      .update({ note })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    if (data) {
      setDailyNotesState(prevState => ({
        ...prevState,
        notes: prevState.notes.map(n => (n.id === id ? data : n)),
      }));
    }
  };
  
  const deleteNote = async (id: string) => {
    const { error } = await supabase.from('daily_notes').delete().eq('id', id);
    if (error) throw error;

    setDailyNotesState(prevState => ({
      ...prevState,
      notes: prevState.notes.filter(n => n.id !== id),
    }));
  };

  const getNotesByDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return dailyNotesState.notes.filter(n => n.date === dateString);
  };
  
  const projectsContextValue: ProjectsContextType = { 
    ...projectsState, 
    projects: projectsWithProgress, 
    addProject, 
    updateProject, 
    deleteProject, 
    fetchProjects, 
    setProjects, 
    setProjectsLoading, 
    setProjectsError 
  };
  
  const tasksContextValue: TasksContextType = { 
    ...tasksState, 
    addTask, 
    updateTask, 
    deleteTask, 
    getTasksByStatus, 
    getTasksByProject, 
    setDraggedTask, 
    fetchTasks,
    setTasks, 
    setTasksLoading 
  };
  
  const dailyNotesContextValue: DailyNotesContextType = { 
    ...dailyNotesState, 
    fetchDailyNotes,
    setDailyNotes, 
    setDailyNotesLoading, 
    addNote, 
    updateNote, 
    deleteNote, 
    getNotesByDate 
  };

  return (
    <GoogleCalendarProvider session={session} providerToken={providerToken}>
      <ProjectsContext.Provider value={projectsContextValue}>
        <TasksContext.Provider value={tasksContextValue}>
          <DailyNotesContext.Provider value={dailyNotesContextValue}>
            {children}
          </DailyNotesContext.Provider>
        </TasksContext.Provider>
      </ProjectsContext.Provider>
    </GoogleCalendarProvider>
  );
};
