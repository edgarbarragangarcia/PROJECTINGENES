'use client';

import { ProjectsContext, initialProjectsState, type ProjectsState, type ProjectsContextType } from '@/hooks/use-projects';
import { TasksContext, initialTasksState, type TasksState, type TasksContextType } from '@/hooks/use-tasks';
import { DailyNotesContext, initialDailyNotesState, type DailyNotesState, type DailyNotesContextType } from '@/hooks/use-daily-notes';
import { createClient } from '@/lib/supabase/client';
import type { Project, ProjectWithProgress, Task, DailyNote } from '@/lib/types';
import { useState, useCallback, useEffect, type ReactNode, useMemo } from 'react';
import { format } from 'date-fns';


export const CombinedProvider = ({ children }: { children: ReactNode }) => {
  const [projectsState, setProjectsState] = useState<ProjectsState>(initialProjectsState);
  const [tasksState, setTasksState] = useState<TasksState>(initialTasksState);
  const [dailyNotesState, setDailyNotesState] = useState<DailyNotesState>(initialDailyNotesState);
  const supabase = createClient();

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


  const fetchProjects = useCallback(async () => {
    setProjectsState(prevState => ({ ...prevState, loading: true, error: null }));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setProjectsState({ ...initialProjectsState, loading: false, error: new Error('User not authenticated') });
      return;
    }
    const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching projects:', error);
      setProjectsState(prevState => ({ ...prevState, loading: false, error }));
    } else {
      setProjectsState(prevState => ({ ...prevState, loading: false, projects: data || [] }));
    }
  }, [supabase]);

  const fetchTasks = useCallback(async () => {
    setTasksState(prevState => ({ ...prevState, loading: true, error: null }));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setTasksState({ ...initialTasksState, loading: false });
      return;
    }
    const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching tasks:', error);
      setTasksState(prevState => ({ ...prevState, loading: false, error }));
    } else {
      const formattedTasks = data.map(task => ({
        ...task,
        projectId: task.project_id,
        startDate: task.start_date ? new Date(task.start_date) : undefined,
        dueDate: task.due_date ? new Date(task.due_date) : undefined
      }));
      setTasksState(prevState => ({ ...prevState, loading: false, tasks: formattedTasks || [] }));
    }
  }, [supabase]);

  const fetchDailyNotes = useCallback(async () => {
    setDailyNotesState(prevState => ({ ...prevState, loading: true, error: null }));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setDailyNotesState({ ...initialDailyNotesState, loading: false });
      return;
    }
    const { data, error } = await supabase.from('daily_notes').select('*');
    if (error) {
      console.error('Error fetching daily notes:', error);
      setDailyNotesState(prevState => ({ ...prevState, loading: false, error }));
    } else {
      setDailyNotesState(prevState => ({ ...prevState, loading: false, notes: data || [] }));
    }
  }, [supabase]);


  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        fetchProjects();
        fetchTasks();
        fetchDailyNotes();
      } else if (event === 'SIGNED_OUT') {
        setProjectsState(initialProjectsState);
        setTasksState(initialTasksState);
        setDailyNotesState(initialDailyNotesState);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchProjects, fetchTasks, fetchDailyNotes, supabase.auth]);


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


  const addProject = async (projectData: Omit<Project, 'id' | 'created_at' | 'user_id' | 'progress' | 'profiles'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");
    const { data, error } = await supabase.from('projects').insert({ ...projectData, user_id: user.id }).select('*, profiles(email)').single();
    if (error) throw error;
    if (data) setProjectsState(prevState => ({ ...prevState, projects: [data, ...prevState.projects] }));
  };

  const updateProject = async (id: string, data: Partial<Omit<Project, 'id' | 'created_at' | 'user_id' | 'progress' | 'profiles'>>) => {
    const { error } = await supabase.from('projects').update(data).eq('id', id);
    if (error) throw error;
    const { data: updatedData, error: selectError } = await supabase.from('projects').select('*, profiles(email)').eq('id', id).single();
    if(selectError) throw selectError;
    setProjectsState(prevState => ({ ...prevState, projects: prevState.projects.map((p) => (p.id === id ? { ...p, ...updatedData } : p)) }));
  };

  const deleteProject = async (id: string) => {
    const { error: tasksError } = await supabase.from('tasks').delete().eq('project_id', id);
    if(tasksError) throw tasksError;
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
    setTasksState(prevState => ({ ...prevState, tasks: prevState.tasks.filter((t) => t.projectId !== id)}));
    setProjectsState(prevState => ({ ...prevState, projects: prevState.projects.filter((p) => p.id !== id) }));
  };


  const addTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'user_id'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");
    const { startDate, dueDate, ...restOfTaskData } = taskData;
    const { data, error } = await supabase.from('tasks').insert({ ...restOfTaskData, user_id: user.id, start_date: startDate?.toISOString(), due_date: dueDate?.toISOString() }).select().single();
    if (error) throw error;
    if (data) {
      const formattedTask = { ...data, projectId: data.project_id, startDate: data.start_date ? new Date(data.start_date) : undefined, dueDate: data.due_date ? new Date(data.due_date) : undefined };
      setTasksState(prevState => ({ ...prevState, tasks: [formattedTask, ...prevState.tasks] }));
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
    setTasksState(prevState => ({ ...prevState, tasks: prevState.tasks.map((t) => (t.id === id ? { ...t, ...taskData } : t)) }));
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
    setTasksState(prevState => ({ ...prevState, tasks: prevState.tasks.filter((task) => task.id !== id) }));
  };
  
  const getTasksByStatus = (status: Task['status'], projectId?: string) => {
    let filteredTasks = tasksState.tasks.filter((task) => task.status === status);
    if (projectId) filteredTasks = filteredTasks.filter(task => task.projectId === projectId);
    return filteredTasks;
  };

  const getTasksByProject = (projectId: string) => tasksState.tasks.filter(task => task.projectId === projectId);


  const upsertNote = async (note: string, date: Date) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const dateString = format(date, 'yyyy-MM-dd');
    const existingNote = dailyNotesState.notes.find(n => n.date === dateString);

    const { data, error } = await supabase
      .from('daily_notes')
      .upsert({ 
        id: existingNote?.id,
        user_id: user.id,
        date: dateString,
        note: note
      }, { onConflict: 'user_id,date' })
      .select()
      .single();

    if (error) throw error;
    if(data) {
        if (existingNote) {
            setDailyNotesState(prevState => ({ ...prevState, notes: prevState.notes.map(n => n.id === data.id ? data : n) }));
        } else {
            setDailyNotesState(prevState => ({ ...prevState, notes: [...prevState.notes, data] }));
        }
    }
  };
  
  const deleteNote = async (date: Date) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const dateString = format(date, 'yyyy-MM-dd');
    const { error } = await supabase
        .from('daily_notes')
        .delete()
        .eq('user_id', user.id)
        .eq('date', dateString);

    if (error) throw error;

    setDailyNotesState(prevState => ({
        ...prevState,
        notes: prevState.notes.filter(n => n.date !== dateString)
    }));
  };

  const getNoteByDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return dailyNotesState.notes.find(n => n.date === dateString);
  };
  
  const projectsContextValue: ProjectsContextType = { ...projectsState, projects: projectsWithProgress, addProject, updateProject, deleteProject, fetchProjects, setProjects, setProjectsLoading, setProjectsError };
  const tasksContextValue: TasksContextType = { ...tasksState, addTask, updateTask, deleteTask, getTasksByStatus, getTasksByProject, setDraggedTask, fetchTasks, setTasks, setTasksLoading };
  const dailyNotesContextValue: DailyNotesContextType = { ...dailyNotesState, fetchDailyNotes, setDailyNotes, setDailyNotesLoading, upsertNote, deleteNote, getNoteByDate };

  return (
    <ProjectsContext.Provider value={projectsContextValue}>
      <TasksContext.Provider value={tasksContextValue}>
        <DailyNotesContext.Provider value={dailyNotesContextValue}>
          {children}
        </DailyNotesContext.Provider>
      </TasksContext.Provider>
    </ProjectsContext.Provider>
  );
};
