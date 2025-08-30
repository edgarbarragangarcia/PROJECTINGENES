'use client';

import type { Status, Task } from '@/lib/types';
import { KanbanCard } from './kanban-card';
import { useTasks } from '@/hooks/use-tasks';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface KanbanColumnProps {
  status: Status;
  tasks: Task[];
}

export function KanbanColumn({ status, tasks }: KanbanColumnProps) {
  const { updateTask, draggedTask, setDraggedTask } = useTasks();
  const [isOver, setIsOver] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggedTask) {
      updateTask(draggedTask, { status });
      setDraggedTask(null);
    }
    setIsOver(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(false);
  };
  
  const getEmptyStateClass = () => {
    switch(status) {
      case 'In Progress':
        return 'border-orange-500/20 text-orange-500/60';
      case 'Done':
        return 'border-green-500/20 text-green-500/60';
      default:
        return 'border-muted-foreground/20 text-muted-foreground/50';
    }
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        'h-full flex-shrink-0 rounded-lg bg-secondary/50 flex flex-col transition-colors',
        isOver && 'bg-primary/20'
      )}
    >
      <div className="p-3 border-b sticky top-0 bg-secondary/50 rounded-t-lg z-10">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          {status}
          <span className="text-xs text-muted-foreground bg-background rounded-full px-2 py-0.5">
            {tasks.length}
          </span>
        </h3>
      </div>
      <ScrollArea className="flex-1" style={{height: 'calc(100vh - 300px)'}}>
        <div className="p-2 flex flex-col gap-2">
          {tasks.map((task) => (
            <KanbanCard key={task.id} task={task} />
          ))}
           {tasks.length === 0 && (
            <div className={cn("flex items-center justify-center h-24 text-sm border-2 border-dashed rounded-lg m-2", getEmptyStateClass())}>
              No hay tareas en este estado.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
