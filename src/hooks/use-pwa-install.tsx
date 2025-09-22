'use client';

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if the app is already installed
    const w = (globalThis as any);

    // Check if the app is already installed (display-mode: standalone)
    try {
      if (w?.matchMedia && w.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
      }
    } catch (e) {
      // ignore in non-browser environments
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      // event.preventDefault(); // Allow the browser to show the install prompt
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    if (w?.addEventListener) {
      w.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    if (w?.addEventListener) {
      w.addEventListener('appinstalled', handleAppInstalled);
    }

    return () => {
      if (w?.removeEventListener) {
        w.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        w.removeEventListener('appinstalled', handleAppInstalled);
      }
    };
  }, []);

  const installPWA = useCallback(async () => {
    if (!installPrompt) {
      return;
    }
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setInstallPrompt(null);
  }, [installPrompt]);

  return {
    isInstalled,
    canInstall: !!installPrompt,
    installPWA,
  };
}
