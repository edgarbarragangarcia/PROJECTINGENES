'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { KanbanPage } from '@/components/pages/kanban-page';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Home() {
  // The redirection logic is now handled by the middleware.
  // This page will likely not be seen by users, but serves as a fallback.
  return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Cargando...</p>
      </div>
    );
}
