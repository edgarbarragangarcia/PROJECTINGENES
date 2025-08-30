'use client';

import { useTasks } from '@/hooks/use-tasks';
import { KanbanColumn } from './kanban-column';
import { statuses } from '@/lib/types';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';

interface KanbanBoardProps {
  projectId?: string;
}

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  const { getTasksByStatus } = useTasks();

  return (
    <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 p-4 items-start">
            {statuses.map((status) => (
                <KanbanColumn
                key={status}
                status={status}
                tasks={getTasksByStatus(status, projectId)}
                />
            ))}
        </div>
        <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
