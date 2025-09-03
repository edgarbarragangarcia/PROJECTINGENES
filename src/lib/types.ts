

import { User as SupabaseUser } from "@supabase/supabase-js";

export const priorities = ['Low', 'Medium', 'High'] as const;
export type Priority = (typeof priorities)[number];

export const statuses = ['Backlog', 'Todo', 'In Progress', 'Done', 'Stopper'] as const;
export type Status = (typeof statuses)[number];

export interface Subtask {
  id: string;
  created_at: string;
  title: string;
  is_completed: boolean;
  task_id: string;
  user_id: string;
}

export interface Task {
  id: string;
  created_at: string;
  title: string;
  description?: string;
  status: Status;
  priority: Priority;
  startDate?: Date;
  start_date?: string; // from Supabase
  dueDate?: Date;
  due_date?: string; // from Supabase
  projectId: string;
  project_id: string; // from Supabase
  user_id: string;
  assignees: string[]; // Array of user emails
  subtasks?: Subtask[];
  image_url?: string;
}

export const projectStatuses = ['En Progreso', 'Completado', 'En Pausa'] as const;
export type ProjectStatus = (typeof projectStatuses)[number];

export interface Project {
  id: string;
  created_at: string;
  name: string;
  description: string;
  image_url: string;
  status: ProjectStatus;
  user_id: string;
  creator_email?: string;
  creator_name?: string;
}

export interface ProjectWithProgress extends Project {
    progress: number;
}

export interface DailyNote {
  id: string;
  created_at: string;
  note: string;
  date: string; // YYYY-MM-DD
  user_id: string;
}

export interface UserStory {
    id: string;
    created_at: string;
    project_id: string;
    user_id: string;
    name: string;
    stakeholders?: string;
    i_want_to?: string;
    so_that?: string;
    acceptance_criteria?: string[];
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'admin' | 'user' | null;
}

export type User = SupabaseUser;
