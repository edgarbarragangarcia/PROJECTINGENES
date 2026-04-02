
'use client';

import { AppLayout } from "@/components/layout/app-layout";
import UserManagementPage from "@/components/pages/user-management-page";
import { useTasks } from "@/hooks/use-tasks";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

import { useUser } from '@/providers/user-context';

export default function UserManagementRoute() {
  const { user, profile, isAdmin, isLoading } = useUser();
  const { allUsers } = useTasks();
  // The supabase client is no longer directly used for auth in this component
  // const supabase = createClient(); 

  // The useEffect block is no longer needed as isAdmin and isLoading are provided by useUser
  // useEffect(() => {
  //   const checkAdmin = async () => {
  //     const { data: { user } } = await supabase.auth.getUser();
  //     if (user) {
  //       const currentUserProfile = allUsers.find(u => u.id === user.id);
  //       if (currentUserProfile?.role === 'admin') {
  //         setIsAdmin(true);
  //       }
  //     }
  //     setLoading(false);
  //   };
  //   if (allUsers.length > 0) {
  //       checkAdmin();
  //   }
  // }, [supabase.auth, allUsers]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-full">
          <p>Cargando...</p>
        </div>
      </AppLayout>
    )
  }

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-full text-center">
          <div>
            <h1 className="text-2xl font-bold">Acceso Denegado</h1>
            <p className="text-muted-foreground">No tienes permiso para ver esta página.</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <UserManagementPage />
    </AppLayout>
  );
}

