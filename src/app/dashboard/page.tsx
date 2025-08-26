'use client';

import { AppLayout } from "@/components/layout/app-layout";
import { DashboardPage } from "@/components/pages/dashboard-page";
import { useProjects } from "@/hooks/use-projects";
import { useTasks } from "@/hooks/use-tasks";

export default function DashboardRoute() {
  const { tasks } = useTasks();
  const { projects } = useProjects();
  return (
    <main className="flex flex-col h-full">
      <AppLayout>
        <DashboardPage />
      </AppLayout>
    </main>
  );
}
