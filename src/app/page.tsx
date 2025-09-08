'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { KanbanPage } from '@/components/pages/kanban-page';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/dashboard');
  }, [router]);
  
  return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Redirigiendo...</p>
      </div>
    );
}
