'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function Home() {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const checkSessionAndRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    };

    checkSessionAndRedirect();
  }, [supabase, router]);

  return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Cargando...</p>
      </div>
    );
}
