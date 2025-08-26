'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { KanbanPage } from '@/components/pages/kanban-page';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Home() {
  const supabase = createClient();
  const router = useRouter();
  const [isLogged, setIsLogged] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        router.push('/dashboard');
      }
    };
    checkSession();
  }, [supabase, router]);
  
  return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Cargando...</p>
      </div>
    );
}
