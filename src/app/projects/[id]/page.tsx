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
import { Kanban, ListTodo, PlusCircle, BarChartHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskFormDialog } from '@/components/task/task-form-dialog';
import GanttChart from '@/components/project/gantt-chart';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import type { Task } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const { projects } = useProjects();
  const { getTasksByProject, updateTask } = useTasks();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('board');
  const isMobile = useIsMobile();

  const project = projects.find((p) => p.id === params.id);

  const projectTasks = useMemo(() => {
    return getTasksByProject(params.id);
  }, [params.id, getTasksByProject]);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const task = projectTasks.find(t => t.id === draggableId);
    if (task) {
      updateTask(task.id, { status: destination.droppableId as Task['status'] });
    }
  };

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
          <Button size="sm" onClick={() => setIsFormOpen(true)}>
              <PlusCircle />
              Añadir Tarea
          </Button>
        </PageHeader>
        <div className="mt-4">
          <Tabs defaultValue="board" className="w-full" onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="board"><Kanban className='size-4 mr-2'/>Tablero</TabsTrigger>
              <TabsTrigger value="table"><ListTodo className='size-4 mr-2'/>Tabla</TabsTrigger>
              {!isMobile && <TabsTrigger value="gantt"><BarChartHorizontal className='size-4 mr-2'/>Gantt</TabsTrigger>}
            </TabsList>
            <TabsContent value="board" className="flex-1 mt-0 overflow-y-auto">
              <DragDropContext onDragEnd={handleDragEnd}>
                <KanbanBoard projectId={project.id} />
              </DragDropContext>
            </TabsContent>
            <TabsContent value="table" className="flex-1 overflow-auto mt-0">
                <TaskTable tasks={projectTasks} />
            </TabsContent>
            {!isMobile && (
              <TabsContent value="gantt">
                  <GanttChart projectId={project.id} />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
      {isFormOpen && <TaskFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} projectId={project.id} />}
    </AppLayout>
  );
}
