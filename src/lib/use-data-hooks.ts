import useSWR from 'swr';
import { createClient } from '@/lib/supabase/client';
import { type User } from '@supabase/supabase-js';
import { Project, Task, DailyNote, UserStory } from '@/types';

// Utility to serialize args into a cache key
const createKey = (table: string, args: any) => {
  return [table, ...Object.values(args)].join('-');
};

export function useProjects(user: User | null) {
  const supabase = createClient();
  
  const fetcher = async () => {
    if (!user) return [];

    const { data, error } = await supabase.rpc('get_projects_for_user', {
      p_user_id: user.id,
      p_user_email: user.email || ''
    });

    if (error) {
      console.error('[useProjects] Error fetching projects:', error);
      throw error;
    }

    return data || [];
  };

  return useSWR<Project[]>(
    user ? createKey('projects', { userId: user.id }) : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5000
    }
  );
}

export function useTasks(user: User | null) {
  const supabase = createClient();
  
  return useSWR(
    user ? createKey('tasks', { userId: user.id }) : null,
    async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user!.id)
        .single();

      const isAdmin = profile?.role === 'admin';
      
      let query = supabase.from('tasks').select('*, subtasks(*)');
      
      if (!isAdmin) {
        const userEmail = user!.email || '';
        query = query.or(`user_id.eq.${user!.id},assignees.cs.["${userEmail}"]`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      // Normalize fields: provide camelCase Date fields for UI convenience
      const mapped = (data || []).map((t: any) => {
        const startDate = t.start_date ? new Date(t.start_date) : (t.startDate ? new Date(t.startDate) : undefined);
        const dueDate = t.due_date ? new Date(t.due_date) : (t.dueDate ? new Date(t.dueDate) : undefined);
        return {
          ...t,
          start_date: t.start_date ?? t.startDate ?? null,
          due_date: t.due_date ?? t.dueDate ?? null,
          startDate: startDate,
          dueDate: dueDate,
        } as Task;
      });
      return mapped as Task[];
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000
    }
  );
}

export function useDailyNotes(user: User | null) {
  const supabase = createClient();
  
  return useSWR(
    user ? createKey('daily_notes', { userId: user.id }) : null,
    async () => {
      const { data, error } = await supabase
        .from('daily_notes')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DailyNote[];
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000
    }
  );
}

export function useUserStories(user: User | null) {
  const supabase = createClient();
  
  return useSWR(
    user ? createKey('user_stories', { userId: user.id }) : null,
    async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user!.id)
        .single();

      const isAdmin = profile?.role === 'admin';
      
      let query = supabase.from('user_stories').select('*');
      
      if (!isAdmin) {
        const { data: projectData } = await supabase.rpc('get_projects_for_user', {
          p_user_id: user!.id,
          p_user_email: user!.email || ''
        });

        if (!projectData) throw new Error('Could not fetch project data');
        
        const projectIds = projectData.map((p: any) => p.id);
        query = query.in('project_id', projectIds);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data as UserStory[];
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000
    }
  );
}

export function useAllUsers() {
  const supabase = createClient();
  
  return useSWR(
    'all_users',
    async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role');

      if (error) throw error;
      return data;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000
    }
  );
}