'use client';

import { useCallback } from 'react';

type TelemetryEvent = {
  ts: string;
  type: string;
  payload?: any;
};

export function useTelemetry() {
  const send = useCallback(async (type: string, payload?: any) => {
    try {
      // best-effort, don't block UI
      await fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ts: new Date().toISOString(), type, payload }),
      });
    } catch (e) {
      // ignore
      console.debug('telemetry send failed', e);
    }
  }, []);

  return { send };
}
