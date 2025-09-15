
'use client';

import type { UserStory, User } from '@/lib/types';
import { createContext, useContext } from 'react';

// --- STATE ---

export interface UserStoriesState {
  userStories: UserStory[];
  loading: boolean;
  error: Error | null;
}

export const initialUserStoriesState: UserStoriesState = {
  userStories: [],
  loading: true,
  error: null,
};

// --- CONTEXT ---

export interface UserStoriesContextType extends UserStoriesState {
  fetchUserStories: (user: User) => Promise<void>;
  addUserStory: (storyData: Omit<UserStory, 'id' | 'created_at' | 'user_id'>) => Promise<void>;
  updateUserStory: (id: string, storyData: Partial<Omit<UserStory, 'id' | 'created_at' | 'user_id' | 'project_id'>>) => Promise<void>;
  deleteUserStory: (id: string) => Promise<void>;
}

export const UserStoriesContext = createContext<UserStoriesContextType | undefined>(undefined);

// --- HOOK ---

export const useUserStories = () => {
  const context = useContext(UserStoriesContext);
  if (context === undefined) {
    throw new Error('useUserStories must be used within a UserStoriesProvider');
  }
  return context;
};
