
'use client';

import { createClient } from '@/lib/supabase/client';
import type { Project, ProjectWithProgress, User } from '@/lib/types';
import React, { createContext, useContext, type ReactNode } from 'react';

// --- STATE & REDUCER ---

export interface ProjectsState {
  projects: ProjectWithProgress[];
  loading: boolean;
  error: Error | null;
}

export const initialProjectsState: ProjectsState = {
  projects: [],
  loading: true,
  error: null,
};

// --- CONTEXT ---

export interface ProjectsContextType extends ProjectsState {
  addProject: (projectData: Omit<Project, 'id' | 'created_at' | 'user_id' | 'progress' | 'users'> & { imageFile?: File, onUploadProgress?: (progress: number) => void, documentFile?: File, onDocUploadProgress?: (progress: number) => void }) => Promise<void>;
  updateProject: (id: string, data: Partial<Omit<Project, 'id' | 'created_at' | 'user_id' | 'progress' | 'users'>> & { imageFile?: File, onUploadProgress?: (progress: number) => void, documentFile?: File, onDocUploadProgress?: (progress: number) => void }) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  fetchProjects: (user: User) => Promise<void>;
  setProjects: (projects: ProjectWithProgress[]) => void;
  setProjectsLoading: (loading: boolean) => void;
  setProjectsError: (error: Error | null) => void;
}

export const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);


// --- HOOK ---

export const useProjects = () => {
  const context = useContext(ProjectsContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectsProvider');
  }
  return context;
};
