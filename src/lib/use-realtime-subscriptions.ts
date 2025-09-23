import { useCallback, useEffect, useRef } from 'react';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimePayload<T = any> {
  new: T;
  old: T;
  eventType?: string;
  type?: string;
  event?: string;
}

interface SubscriptionConfig {
  table: string;
  onInsert?: (payload: RealtimePayload) => void;
  onUpdate?: (payload: RealtimePayload) => void;
  onDelete?: (payload: RealtimePayload) => void;
}

export function useRealtimeSubscriptions(
  supabase: SupabaseClient,
  configs: SubscriptionConfig[],
  enabled: boolean = true
) {
  const channelsRef = useRef<RealtimeChannel[]>([]);

  const cleanup = useCallback(() => {
    channelsRef.current.forEach(channel => {
      try {
        if (channel?.unsubscribe) {
          channel.unsubscribe();
        }
      } catch (e) {
        console.debug('Error unsubscribing from channel:', e);
      }
    });
    channelsRef.current = [];
  }, []);

  useEffect(() => {
    if (!enabled) {
      cleanup();
      return;
    }

    configs.forEach(config => {
      const channel = supabase
        .channel(`${config.table}_changes`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: config.table },
          (payload: any) => {
            try {
              const event = payload?.eventType || payload?.type || payload?.event;
              if (event === 'INSERT' && config.onInsert) {
                config.onInsert(payload);
              } else if (event === 'UPDATE' && config.onUpdate) {
                config.onUpdate(payload);
              } else if (event === 'DELETE' && config.onDelete) {
                config.onDelete(payload);
              }
            } catch (e) {
              console.error(`Error handling ${config.table} realtime payload:`, e);
            }
          }
        )
        .subscribe();

      channelsRef.current.push(channel);
    });

    return cleanup;
  }, [supabase, configs, enabled, cleanup]);

  return { cleanup };
}