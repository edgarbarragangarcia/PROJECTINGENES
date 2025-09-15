
'use client';

import { usePWAInstall } from '@/hooks/use-pwa-install';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { CheckCircle, Download } from 'lucide-react';

export function InstallPWAButton() {
  const { isInstalled, canInstall, installPWA } = usePWAInstall();

  if (isInstalled) {
    return (
      <DropdownMenuItem disabled>
        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
        <span>Aplicación Instalada</span>
      </DropdownMenuItem>
    );
  }

  if (canInstall) {
    return (
      <DropdownMenuItem onClick={installPWA}>
        <Download className="mr-2 h-4 w-4" />
        <span>Instalar Aplicación</span>
      </DropdownMenuItem>
    );
  }

  return null;
}
