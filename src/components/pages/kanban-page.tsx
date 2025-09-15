import { PageHeader } from '../layout/page-header';
import { KanbanBoard } from '../kanban/kanban-board';

export function KanbanPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Tablero Kanban" />
      <div className="flex-1 overflow-x-auto">
        <KanbanBoard />
      </div>
    </div>
  );
}
