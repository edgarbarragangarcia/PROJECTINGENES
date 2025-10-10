'use client';

import { createClient } from '@/lib/supabase/client';
import type { Task, Status, User, Profile } from '@/types';
import React, { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';

// --- STATE ---

export interface TasksState {
  tasks: Task[];
  loading: boolean;
  error: Error | null;
  draggedTask: string | null;
  allUsers: Profile[];
}

export const initialTasksState: TasksState = {
  tasks: [],
  loading: true,
  error: null,
  draggedTask: null,
  allUsers: [],
};

// --- CONTEXT ---

export interface TasksContextType extends TasksState {
  addTask: (taskData: Omit<Task, 'id' | 'created_at' | 'user_id'>) => Promise<Task>;
  updateTask: (id: string, data: Partial<Omit<Task, 'id' | 'created_at' | 'user_id'>>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  getTasksByStatus: (status: Status, projectId?: string) => Task[];
  getTasksByProject: (projectId: string) => Task[];
  setDraggedTask: (id: string | null) => void;
  fetchTasks: (user: User) => Promise<Task[]>;
  setTasks: (tasks: Task[]) => void;
  setTasksLoading: (loading: boolean) => void;
  fetchAllUsers: () => Promise<void>;
  updateUserRole: (userId: string, role: 'admin' | 'user') => Promise<void>;
  refreshAllData: () => Promise<void>;
}

export const TasksContext = createContext<TasksContextType | undefined>(undefined);

// --- HOOK ---

export const useTasks = () => {
  const context = useContext(TasksContext);
  if (context === undefined) {
    // Defensive fallback to avoid client crash if provider missing
    // eslint-disable-next-line no-console
    console.error('useTasks used outside a TasksProvider - returning fallback.');
    const noopAsync = async () => { throw new Error('TasksProvider not available'); };
    const fallback: TasksContextType = {
      tasks: initialTasksState.tasks,
      loading: initialTasksState.loading,
      error: initialTasksState.error,
      draggedTask: initialTasksState.draggedTask,
      allUsers: initialTasksState.allUsers,
      addTask: noopAsync as any,
      updateTask: noopAsync as any,
      deleteTask: noopAsync as any,
      getTasksByStatus: () => [],
      getTasksByProject: () => [],
      setDraggedTask: () => {},
      fetchTasks: async () => [],
      setTasks: () => {},
      setTasksLoading: () => {},
      fetchAllUsers: async () => {},
      updateUserRole: noopAsync as any,
      refreshAllData: noopAsync as any,
    } as any;
    return fallback;
  }
  return context;
};

const supabase = createClient();

export const TasksProvider = ({ children }: { children: ReactNode }) => {
  const [tasks, setTasks] = useState<Task[]>(initialTasksState.tasks);
  const [loading, setLoading] = useState<boolean>(initialTasksState.loading);
  const [error, setError] = useState<Error | null>(initialTasksState.error);
  const [draggedTask, setDraggedTask] = useState<string | null>(initialTasksState.draggedTask);
  const [allUsers, setAllUsers] = useState<Profile[]>(initialTasksState.allUsers);

  const fetchTasks = async (user: User) => {
    setLoading(true);
    // Remove the problematic relationship query. The 'subtasks' jsonb column
    // is still fetched with '*', which is what's likely used.
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      setError(error);
      setLoading(false);
      return [];
    }

    setTasks(data as Task[]);
    setLoading(false);
    return data as Task[];
  };

  const addTask = async (taskData: any) => {
    const { imageFile, onUploadProgress, ...restData } = taskData;
    
    let imageUrl = restData.image_url;

    if (imageFile && typeof imageFile !== 'string') {
      const filePath = `public/${Date.now()}-${imageFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('task-images')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: imageFile.type,
          // Duplex option is needed for upload progress to work
          ...(onUploadProgress ? { duplex: 'half' } : {}),
        });

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        throw new Error('Failed to upload image.');
      }
      const { data: { publicUrl } } = supabase.storage.from('task-images').getPublicUrl(filePath);
      imageUrl = publicUrl;
    }

    // Create a new object with only the valid columns for the 'tasks' table
    const finalData: Partial<Task> = {
      title: restData.title,
      description: restData.description,
      status: restData.status,
      priority: restData.priority,
      project_id: restData.project_id,
      assignees: restData.assignees,
      subtasks: restData.subtasks,
      image_url: imageUrl,
    };

    // Conditionally add dates only if they exist, and format them correctly
    if (restData.start_date) {
      finalData.start_date = new Date(restData.start_date).toISOString();
    }
    if (restData.due_date) {
      finalData.due_date = new Date(restData.due_date).toISOString().split('T')[0];
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert(finalData as any)
      .select()
      .single();

    if (error) {
      console.error('Error adding task:', error);
      throw new Error('Failed to add task.');
    }

    setTasks(prev => [...prev, data]);
    return data;
  };

  const updateTask = async (id: string, taskData: any) => {
    const { imageFile, onUploadProgress, ...restData } = taskData;

    let imageUrl = restData.image_url;

    if (imageFile && typeof imageFile !== 'string') {
      const filePath = `public/${imageFile.name}`;

      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('task-images')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        throw new Error('Failed to upload image.');
      }
      const { data: { publicUrl } } = supabase.storage.from('task-images').getPublicUrl(filePath);
      imageUrl = publicUrl;
    }

    // Create a new object with only the valid columns for the 'tasks' table
    const finalData: Partial<Task> = {
      title: restData.title,
      description: restData.description,
      status: restData.status,
      priority: restData.priority,
      project_id: restData.project_id,
      assignees: restData.assignees,
      subtasks: restData.subtasks,
      image_url: imageUrl,
    };

    // Conditionally add dates only if they exist, and format them correctly
    // The form sends startDate/dueDate, but the DB expects start_date/due_date.
    // The submission object from the form dialog already maps this, but we ensure it here for safety.
    const startDate = restData.start_date || restData.startDate;
    const dueDate = restData.due_date || restData.dueDate;

    if (startDate) {
      finalData.start_date = new Date(startDate).toISOString();
    }
    if (dueDate) {
      finalData.due_date = new Date(dueDate).toISOString().split('T')[0];
    }

    const { error } = await supabase
      .from('tasks')
      .update(finalData)
      .eq('id', id);

    if (error) {
      setError(error);
      return;
    }

    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, ...finalData } : task)));
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      setError(error);
      return;
    }

    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const getTasksByStatus = (status: Status, projectId?: string) => {
    return tasks.filter((task) => task.status === status && (!projectId || task.project_id === projectId));
  };

  const getTasksByProject = (projectId: string) => {
    return tasks.filter((task) => task.project_id === projectId);
  };

  const fetchAllUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*');

    if (error) {
      setError(error);
      return;
    }

    setAllUsers(data as Profile[]);
  };

  const updateUserRole = async (userId: string, role: 'admin' | 'user') => {
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) {
      setError(error);
      return;
    }

    setAllUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, role } : user)));
  };

  const refreshAllData = async () => {
    // Re-fetch tasks and users
    await Promise.all([
      fetchTasks,
      fetchAllUsers,
    ]);
  };

  const value = {
    tasks,
    loading,
    error,
    draggedTask,
    allUsers,
    addTask,
    updateTask,
    deleteTask,
    getTasksByStatus,
    getTasksByProject,
    setDraggedTask,
    fetchTasks,
    setTasks,
    setTasksLoading: setLoading,
    fetchAllUsers,
    updateUserRole,
    refreshAllData,
  };

  return (
    <TasksContext.Provider value={value}>
      {children}
    </TasksContext.Provider>
  );
};
