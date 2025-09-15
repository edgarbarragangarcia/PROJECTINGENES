
'use client';

import { createClient } from '@/lib/supabase/client';
import type { Task, Status, User, Profile } from '@/lib/types';
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
  addTask: (taskData: Omit<Task, 'id' | 'created_at' | 'user_id'>) => Promise<void>;
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
}

export const TasksContext = createContext<TasksContextType | undefined>(undefined);

// --- HOOK ---

export const useTasks = () => {
  const context = useContext(TasksContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return context;
};
