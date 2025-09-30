'use client';

import type { Status, Task } from '@/lib/types';
import { useTasks } from '@/hooks/use-tasks';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { KanbanCard } from './kanban-card';

interface KanbanColumnProps {
  status: Status;
  tasks: Task[];
}

export function KanbanColumn({ status, tasks }: KanbanColumnProps) {
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
    <div className="flex flex-col">
      <h3 className="text-lg font-semibold mb-4 capitalize flex items-center gap-2">
        {status} <span className='text-sm text-muted-foreground bg-muted/50 rounded-full px-2 py-0.5'>{tasks.length}</span>
      </h3>
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <ScrollArea 
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "h-[calc(100vh-250px)] rounded-lg p-2 transition-colors",
              snapshot.isDraggingOver ? "bg-muted/80" : "bg-muted/40"
            )}
          >
            {tasks.length > 0 ? (
              tasks.map((task, index) => (
                <Draggable key={task.id} draggableId={task.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="mb-2"
                    >
                      <KanbanCard task={task} />
                    </div>
                  )}
                </Draggable>
              ))
            ) : (
              <div className={cn("flex justify-center items-center h-full rounded-lg border-2 border-dashed", getEmptyStateClass())}>
                <p className="text-sm">No hay tareas en este estado.</p>
              </div>
            )}
            {provided.placeholder}
          </ScrollArea>
        )}
      </Droppable>
    </div>
  );
}
