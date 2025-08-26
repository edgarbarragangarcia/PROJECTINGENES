'use client';

import { Button } from '@/components/ui/button';
import { Download, PlusCircle } from 'lucide-react';
import { TaskFormDialog } from '../task/task-form-dialog';
import { useState } from 'react';
import { useTasks } from '@/hooks/use-tasks';
import { useParams } from 'next/navigation';

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
}

function exportTasksToJSON(tasks: any[]) {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(tasks, (key, value) => {
        if (key === 'dueDate' && value) {
            return new Date(value).toISOString();
        }
        return value;
    }, 2)
  )}`;
  const link = document.createElement("a");
  link.href = jsonString;
  link.download = "projectia-tasks.json";
  link.click();
}

export function PageHeader({ title, children }: PageHeaderProps) {
  const { tasks } = useTasks();
  const params = useParams();
  const projectId = typeof params.id === 'string' ? params.id : '';

  const handleExport = () => {
    const tasksToExport = projectId ? tasks.filter(t => t.projectId === projectId) : tasks;
    exportTasksToJSON(tasksToExport);
  }

  return (
    <>
      <header className="flex items-center justify-between p-4 border-b bg-card">
        <h1 className="text-2xl font-bold font-headline">{title}</h1>
        <div className="flex items-center gap-2">
          {children}
        </div>
      </header>
    </>
  );
}
