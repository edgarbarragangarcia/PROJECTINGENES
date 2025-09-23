import { User } from '@supabase/supabase-js';
import { Project, Task, DailyNote, UserStory } from './types';

export function useProjects(user: User | null): {
  data?: Project[];
  error?: Error;
  isLoading: boolean;
};

export function useTasks(user: User | null): {
  data?: Task[];
  error?: Error;
  isLoading: boolean;
};

export function useDailyNotes(user: User | null): {
  data?: DailyNote[];
  error?: Error;
  isLoading: boolean;
};

export function useUserStories(user: User | null): {
  data?: UserStory[];
  error?: Error;
  isLoading: boolean;
};

export function useAllUsers(): {
  data?: any[];
  error?: Error;
  isLoading: boolean;
};