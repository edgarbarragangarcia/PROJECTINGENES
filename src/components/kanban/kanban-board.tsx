
'use client';

import { useTasks } from '@/hooks/use-tasks';
import { KanbanColumn } from './kanban-column';
import { statuses } from '@/types';

interface KanbanBoardProps {
  projectId?: string;
}

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  const { getTasksByStatus } = useTasks();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 items-start">
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
