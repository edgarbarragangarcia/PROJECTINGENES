
'use client';

import { AppLayout } from "@/components/layout/app-layout";
import { GeneralGanttChart } from "@/components/project/general-gantt-chart";
import { useProjects } from "@/hooks/use-projects";
import { useTasks } from "@/hooks/use-tasks";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export default function GeneralGanttRoute() {
  const { tasks, allUsers } = useTasks();
  const { projects } = useProjects();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const currentUserProfile = allUsers.find(u => u.id === user.id);
        if (currentUserProfile?.role === 'admin') {
          setIsAdmin(true);
        }
      }
      setLoading(false);
    };
    if (allUsers.length > 0) {
        checkAdmin();
    }
  }, [supabase.auth, allUsers]);

  if (loading) {
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
      <GeneralGanttChart tasks={tasks} projects={projects} />
    </AppLayout>
  );
}
