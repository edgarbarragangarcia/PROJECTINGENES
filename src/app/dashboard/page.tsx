'use client';

import { AppLayout } from "@/components/layout/app-layout";
import { DashboardPage } from "@/components/pages/dashboard-page";
import { GeneralGanttChart } from "@/components/project/general-gantt-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjects } from "@/hooks/use-projects";
import { useTasks } from "@/hooks/use-tasks";
import { BarChartHorizontal, LayoutDashboard } from "lucide-react";

export default function DashboardRoute() {
  const { tasks } = useTasks();
  const { projects } = useProjects();
  return (
    <main className="flex flex-col h-full">
      <AppLayout>
         <Tabs defaultValue="dashboard" className="flex-1 flex flex-col overflow-hidden">
          <div className='px-4 py-2 border-b'>
            <TabsList>
              <TabsTrigger value="dashboard"><LayoutDashboard className='size-4 mr-2'/>Dashboard</TabsTrigger>
              <TabsTrigger value="gantt"><BarChartHorizontal className='size-4 mr-2'/>Gantt General</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="dashboard" className="flex-1 flex flex-col overflow-y-auto mt-0">
            <DashboardPage />
          </TabsContent>
          <TabsContent value="gantt" className="flex-1 flex flex-col overflow-y-hidden mt-0">
             <GeneralGanttChart tasks={tasks} projects={projects} />
          </TabsContent>
        </Tabs>
      </AppLayout>
    </main>
  );
}
