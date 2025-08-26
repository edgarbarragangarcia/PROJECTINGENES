'use client';

import { ProjectsContext, initialProjectsState, type ProjectsState, type ProjectsContextType } from '@/hooks/use-projects';
import { TasksContext, initialTasksState, type TasksState, type TasksContextType } from '@/hooks/use-tasks';
import { createClient } from '@/lib/supabase/client';
import type { Project, ProjectWithProgress, Task } from '@/lib/types';
import { useState, useCallback, useEffect, type ReactNode, useMemo } from 'react';

export const CombinedProvider = ({ children }: { children: ReactNode }) => {
  const [projectsState, setProjectsState] = useState<ProjectsState>(initialProjectsState);
  const [tasksState, setTasksState] = useState<TasksState>(initialTasksState);
  const supabase = createClient();

  const setProjects = (projects: ProjectWithProgress[]) => {
    setProjectsState(prevState => ({ ...prevState, projects }));
  };

  const setProjectsLoading = (loading: boolean) => {
    setProjectsState(prevState => ({ ...prevState, loading }));
  };

  const setProjectsError = (error: Error | null) => {
    setProjectsState(prevState => ({ ...prevState, error }));
  };
  
  const setTasks = (tasks: Task[]) => {
    setTasksState(prevState => ({ ...prevState, tasks }));
  };
  
  const setTasksLoading = (loading: boolean) => {
    setTasksState(prevState => ({ ...prevState, loading }));
  };

  const fetchProjects = useCallback(async () => {
    setProjectsState(prevState => ({ ...prevState, loading: true, error: null }));
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setProjectsState({ projects: [], loading: false, error: new Error('User not authenticated') });
      return;
    }

    const { data, error } = await supabase
      .from('projects')
      .select('*, profiles(email)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      setProjectsState(prevState => ({ ...prevState, loading: false, error }));
    } else {
      const projectsWithProgress = (data || []).map(p => ({
        ...p,
        progress: 0
      }));
      setProjectsState(prevState => ({ ...prevState, loading: false, projects: projectsWithProgress }));
    }
  }, [supabase]);

  const fetchTasks = useCallback(async () => {
    setTasksState(prevState => ({ ...prevState, loading: true, error: null }));
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setTasksState({ ...initialTasksState, loading: false });
      return;
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        fetchProjects();
        fetchTasks();
      } else if (event === 'SIGNED_OUT') {
        setProjectsState(initialProjectsState);
        setTasksState(initialTasksState);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProjects, fetchTasks, supabase.auth]);


  const calculateProgress = useCallback((projectId: string, allTasks: Task[]): number => {
    const projectTasks = allTasks.filter(t => t.projectId === projectId);
    if (projectTasks.length === 0) return 0;
    const completedTasks = projectTasks.filter(t => t.status === 'Done').length;
    return Math.round((completedTasks / projectTasks.length) * 100);
  }, []);
  
  useEffect(() => {
    setProjectsState(prevState => {
      const updatedProjects = prevState.projects.map(p => ({
        ...p,
        progress: calculateProgress(p.id, tasksState.tasks)
      }));
      return { ...prevState, projects: updatedProjects };
    });
  }, [tasksState.tasks, calculateProgress]);


  // Projects context methods
  const addProject = async (projectData: Omit<Project, 'id' | 'created_at' | 'user_id' | 'progress' | 'profiles'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const { data, error } = await supabase
      .from('projects')
      .insert({ ...projectData, user_id: user.id })
      .select('*, profiles(email)')
      .single();

    if (error) {
      console.error('Error adding project:', error);
      throw error;
    }
    if (data) {
      const newProjectWithProgress = { ...data, progress: 0 };
      setProjectsState(prevState => ({ ...prevState, projects: [newProjectWithProgress, ...prevState.projects] }));
    }
  };

  const updateProject = async (id: string, data: Partial<Omit<Project, 'id' | 'created_at' | 'user_id' | 'progress' | 'profiles'>>) => {
    const { error } = await supabase
      .from('projects')
      .update(data)
      .eq('id', id);

    if (error) {
      console.error('Error updating project:', error);
      throw error;
    }
    
    const { data: updatedData, error: selectError } = await supabase
        .from('projects')
        .select('*, profiles(email)')
        .eq('id', id)
        .single();
    
    if(selectError) {
        console.error('Error fetching updated project:', selectError);
    }


    setProjectsState(prevState => ({
      ...prevState,
      projects: prevState.projects.map((p) => (p.id === id ? { ...p, ...updatedData, progress: p.progress } : p)),
    }));
  };

  const deleteProject = async (id: string) => {
    // Also delete associated tasks
    const { error: tasksError } = await supabase.from('tasks').delete().eq('project_id', id);
    if(tasksError) {
      console.error('Error deleting tasks for project:', tasksError);
      throw tasksError;
    }
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
    setTasksState(prevState => ({ ...prevState, tasks: prevState.tasks.filter((t) => t.projectId !== id)}));
    setProjectsState(prevState => ({ ...prevState, projects: prevState.projects.filter((p) => p.id !== id) }));
  };

  // Tasks context methods
  const addTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'user_id'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const { startDate, dueDate, projectId, ...restOfTaskData } = taskData;

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...restOfTaskData,
        user_id: user.id,
        start_date: startDate?.toISOString(),
        due_date: dueDate?.toISOString(),
        project_id: projectId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding task:', error);
      throw error;
    }
    if (data) {
      const formattedTask = {
        ...data,
        projectId: data.project_id,
        startDate: data.start_date ? new Date(data.start_date) : undefined,
        dueDate: data.due_date ? new Date(data.due_date) : undefined
      };
      setTasksState(prevState => ({ ...prevState, tasks: [formattedTask, ...prevState.tasks] }));
    }
  };

  const updateTask = async (id: string, taskData: Partial<Omit<Task, 'id' | 'created_at' | 'user_id'>>) => {
    const dataToUpdate: Record<string, any> = { ...taskData };
    delete dataToUpdate.startDate;
    delete dataToUpdate.dueDate;
    delete dataToUpdate.projectId;
    
    if ('startDate' in taskData) {
      dataToUpdate.start_date = taskData.startDate ? taskData.startDate.toISOString() : null;
    }
    if ('dueDate' in taskData) {
        dataToUpdate.due_date = taskData.dueDate ? taskData.dueDate.toISOString() : null;
    }
    if (taskData.projectId) {
      dataToUpdate.project_id = taskData.projectId;
    }
    
    const { error } = await supabase
      .from('tasks')
      .update(dataToUpdate)
      .eq('id', id);

    if (error) {
      console.error('Error updating task:', error);
      throw error;
    }

    setTasksState(prevState => ({
      ...prevState,
      tasks: prevState.tasks.map((t) => (t.id === id ? { ...t, ...taskData } : t)),
    }));
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
    setTasksState(prevState => ({ ...prevState, tasks: prevState.tasks.filter((task) => task.id !== id) }));
  };

  const setDraggedTask = (id: string | null) => {
    setTasksState(prevState => ({ ...prevState, draggedTask: id }));
  };

  const getTasksByStatus = (status: Task['status'], projectId?: string) => {
    let filteredTasks = tasksState.tasks.filter((task) => task.status === status);
    if (projectId) {
      filteredTasks = filteredTasks.filter(task => task.projectId === projectId);
    }
    return filteredTasks;
  };

  const getTasksByProject = (projectId: string) => {
    return tasksState.tasks.filter(task => task.projectId === projectId);
  };
  
  const projectsContextValue: ProjectsContextType = {
    ...projectsState,
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
      setTasksLoading,
  };

  return (
    <ProjectsContext.Provider value={projectsContextValue}>
      <TasksContext.Provider value={tasksContextValue}>
        {children}
      </TasksContext.Provider>
    </ProjectsContext.Provider>
  );
};
