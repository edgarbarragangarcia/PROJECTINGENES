"use client";

import { SWRConfig } from 'swr';

export const DATA_REFRESH_INTERVAL = 5000; // 5 seconds
export const ERROR_RETRY_COUNT = 3;
export const FOCUS_THROTTLE_INTERVAL = 5000;

export const swrConfig = {
  dedupingInterval: DATA_REFRESH_INTERVAL,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  revalidateIfStale: true,
  shouldRetryOnError: true,
  errorRetryCount: ERROR_RETRY_COUNT,
  focusThrottleInterval: FOCUS_THROTTLE_INTERVAL,
  provider: () => new Map(),
};

export function DataProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={swrConfig}>
      {children}
    </SWRConfig>
  );
}