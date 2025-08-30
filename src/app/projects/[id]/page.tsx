'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { PageHeader } from '@/components/layout/page-header';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { useProjects } from '@/hooks/use-projects';
import { useTasks } from '@/hooks/use-tasks';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskTable } from '@/components/task/task-table';
import { Kanban, ListTodo, PlusCircle, BarChartHorizontal, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskFormDialog } from '@/components/task/task-form-dialog';
import { GanttChart } from '@/components/project/gantt-chart';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const { projects } = useProjects();
  const { getTasksByProject } = useTasks();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('board');
  const [dayWidth, setDayWidth] = useState(40);

  const project = projects.find((p) => p.id === params.id);

  const projectTasks = useMemo(() => {
    return getTasksByProject(params.id);
  }, [params.id, getTasksByProject]);

  if (!project) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-full">
          <p>Cargando proyecto...</p>
        </div>
      </AppLayout>
    )
  }
  
  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <PageHeader title={project.name}>
          {activeTab === 'gantt' && (
            <div className='flex items-center gap-4 w-64'>
                <ZoomOut className='size-5' />
                <Slider
                    value={[dayWidth]}
                    onValueChange={(value) => setDayWidth(value[0])}
                    min={20}
                    max={100}
                    step={5}
                />
                <ZoomIn className='size-5' />
            </div>
          )}
          <Button size="sm" onClick={() => setIsFormOpen(true)}>
              <PlusCircle />
              Añadir Tarea
          </Button>
        </PageHeader>
          <Tabs defaultValue="board" className="flex-1 flex flex-col overflow-hidden" onValueChange={setActiveTab}>
          <div className='px-4 py-2 border-b'>
            <TabsList>
              <TabsTrigger value="board"><Kanban className='size-4 mr-2'/>Tablero</TabsTrigger>
              <TabsTrigger value="table"><ListTodo className='size-4 mr-2'/>Tabla</TabsTrigger>
              <TabsTrigger value="gantt"><BarChartHorizontal className='size-4 mr-2'/>Gantt</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="board" className="flex-1 mt-0 overflow-y-auto">
              <KanbanBoard projectId={project.id} />
          </TabsContent>
          <TabsContent value="table" className="flex-1 overflow-auto mt-0">
              <TaskTable tasks={projectTasks} />
          </TabsContent>
          <TabsContent value="gantt" className="flex-1 overflow-auto mt-0">
              <GanttChart tasks={projectTasks} dayWidth={dayWidth} />
          </TabsContent>
        </Tabs>
      </div>
      {isFormOpen && <TaskFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} projectId={project.id} />}
    </AppLayout>
  );
}
