'use client';

import { useTasks } from '@/hooks/use-tasks';
import { KanbanColumn } from './kanban-column';
import { statuses } from '@/lib/types';

interface KanbanBoardProps {
  projectId?: string;
}

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  const { getTasksByStatus } = useTasks();

  return (
    <div className="flex gap-4 p-4 h-full items-start">
      {statuses.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          tasks={getTasksByStatus(status, projectId)}
        />
      ))}
    </div>
  );
}
