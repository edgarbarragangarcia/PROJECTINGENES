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
    // Defensive fallback: don't throw in rendering paths to avoid crashing the whole
    // client-side app if the provider wasn't mounted for some reason. Log an error
    // so the issue can be diagnosed and return a minimal, safe implementation.
    // Consumers that perform mutations will still receive a thrown error when
    // calling the mutation helpers, but basic rendering will not crash.
    // eslint-disable-next-line no-console
    console.error('useProjects used outside a ProjectsProvider - returning fallback.');
    const noopAsync = async () => { throw new Error('ProjectsProvider not available'); };
    const fallback: ProjectsContextType = {
      projects: initialProjectsState.projects,
      loading: initialProjectsState.loading,
      error: initialProjectsState.error,
      addProject: noopAsync as any,
      updateProject: noopAsync as any,
      deleteProject: noopAsync as any,
      fetchProjects: async () => {},
      setProjects: () => {},
      setProjectsLoading: () => {},
      setProjectsError: () => {},
    };
    return fallback;
  }
  return context;
};
