
'use client';

import { AppLayout } from "@/components/layout/app-layout";
import { GeneralGanttChart } from "@/components/project/general-gantt-chart";
import { useProjects } from "@/hooks/use-projects";
import { useTasks } from "@/hooks/use-tasks";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

import { useUser } from '@/providers/user-context';

export default function GeneralGanttRoute() {
  const { tasks, allUsers } = useTasks();
  const { projects } = useProjects();
  const { user, profile, isAdmin, isLoading } = useUser();

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
      <GeneralGanttChart tasks={tasks} projects={projects} />
    </AppLayout>
  );
}
