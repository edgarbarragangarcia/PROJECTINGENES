import { useState, useEffect, Dispatch, SetStateAction } from 'react';

interface StorageOptions<T> {
  storage?: 'local' | 'session';
  serializer?: (value: T) => string;
  deserializer?: (value: string) => T;
}

export function useStateWithCache<T>(
  key: string,
  initialValue: T,
  options: StorageOptions<T> = {}
): [T, Dispatch<SetStateAction<T>>] {
  const {
    storage = 'local',
    serializer = JSON.stringify,
    deserializer = JSON.parse,
  } = options;

  // Initialize state with cached value or initial value
  const [state, setState] = useState<T>(() => {
    if (typeof globalThis === 'undefined' || typeof (globalThis as any).window === 'undefined') return initialValue;

    const storageApi = storage === 'local' ? (globalThis as any).window.localStorage : (globalThis as any).window.sessionStorage;
    const cached = storageApi.getItem(key);

    if (cached !== null) {
      try {
        return deserializer(cached);
      } catch (e) {
        console.warn(`Error deserializing cached value for ${key}:`, e);
        return initialValue;
      }
    }
    return initialValue;
  });

    // Update cache whenever state changes
  useEffect(() => {
    if (typeof globalThis === 'undefined' || typeof (globalThis as any).window === 'undefined') return;

    try {
      const storageApi = storage === 'local' ? (globalThis as any).window.localStorage : (globalThis as any).window.sessionStorage;
      const serialized = serializer(state);
      storageApi.setItem(key, serialized);
    } catch (e) {
      console.error(`Error caching value for ${key}:`, e);
    }
  }, [key, state, storage, serializer]);

  return [state, setState];
}
