import { useEffect, useCallback, useState, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Task, Project, DailyNote, UserStory } from '@/types';

interface SyncState {
  lastSynced: number;
  isSyncing: boolean;
  error: Error | null;
}

export function useDataSync(user: User | null) {
  const supabase = createClient();
  const [syncState, setSyncState] = useState<SyncState>({
    lastSynced: 0,
    isSyncing: false,
    error: null,
  });
  
  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  const isFirstSync = useRef(true);

  const sync = useCallback(async (force = false) => {
    if (!user) return;
    
    // Skip if we're already syncing
    if (syncState.isSyncing) return;
    
    // Skip if we've synced recently (within last 30 seconds) unless forced
    const now = Date.now();
    if (!force && !isFirstSync.current && now - syncState.lastSynced < 30000) {
      return;
    }

    try {
      setSyncState(prev => ({ ...prev, isSyncing: true, error: null }));

      // Fetch updates for each data type with optimistic throttling
      const [projects, tasks, dailyNotes, userStories] = await Promise.all([
        supabase.from('projects').select('*').gt('updated_at', new Date(syncState.lastSynced).toISOString()),
        supabase.from('tasks').select('*').gt('updated_at', new Date(syncState.lastSynced).toISOString()),
        supabase.from('daily_notes').select('*').gt('updated_at', new Date(syncState.lastSynced).toISOString()),
        supabase.from('user_stories').select('*').gt('updated_at', new Date(syncState.lastSynced).toISOString())
      ]);

      // Handle any errors
      if (projects.error) throw projects.error;
      if (tasks.error) throw tasks.error;
      if (dailyNotes.error) throw dailyNotes.error;
      if (userStories.error) throw userStories.error;

      // Update state for any changed data
      // Return the updated data for the parent component to use
      const updates = {
        projects: projects.data as Project[],
        tasks: tasks.data as Task[],
        dailyNotes: dailyNotes.data as DailyNote[],
        userStories: userStories.data as UserStory[],
      };

      setSyncState({
        lastSynced: now,
        isSyncing: false,
        error: null
      });

      isFirstSync.current = false;
      return updates;

    } catch (error) {
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        error: error as Error
      }));
      console.error('Sync error:', error);
      throw error;
    }
  }, [user, syncState.lastSynced, syncState.isSyncing, supabase]);

  // Set up periodic sync
  useEffect(() => {
    if (!user) return;

    // Initial sync
    sync(true);

    // Set up periodic sync every minute
    const intervalId = setInterval(() => {
      sync();
    }, 60000);

    return () => {
      clearInterval(intervalId);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [user, sync]);

  // Force sync on window focus
  useEffect(() => {
    if (!user) return;

    const handleFocus = () => {
      sync(true);
    };

    if (typeof globalThis !== 'undefined' && typeof (globalThis as any).window !== 'undefined') {
      (globalThis as any).window.addEventListener('focus', handleFocus);
      return () => (globalThis as any).window.removeEventListener('focus', handleFocus);
    }

    return () => {};
  }, [user, sync]);

  return {
    sync,
    isSyncing: syncState.isSyncing,
    lastSynced: syncState.lastSynced,
    error: syncState.error
  };
}