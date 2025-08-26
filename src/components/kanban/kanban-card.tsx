'use client';

import type { Task } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTasks } from '@/hooks/use-tasks';
import { MoreHorizontal, CalendarIcon, Trash2, Edit, UserCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { PriorityIcon } from '../task/priority-icon';
import { format } from 'date-fns';
import { useState } from 'react';
import { TaskFormDialog } from '../task/task-form-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '../ui/avatar';

interface KanbanCardProps {
  task: Task;
}

const taskColors = [
  'bg-sky-50 border-sky-200 hover:bg-sky-100 dark:bg-sky-950 dark:border-sky-800 dark:hover:bg-sky-900',
  'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950 dark:border-emerald-800 dark:hover:bg-emerald-900',
  'bg-rose-50 border-rose-200 hover:bg-rose-100 dark:bg-rose-950 dark:border-rose-800 dark:hover:bg-rose-900',
  'bg-indigo-50 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950 dark:border-indigo-800 dark:hover:bg-indigo-900',
  'bg-fuchsia-50 border-fuchsia-200 hover:bg-fuchsia-100 dark:bg-fuchsia-950 dark:border-fuchsia-800 dark:hover:bg-fuchsia-900',
];

const stringToHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
};


export function KanbanCard({ task }: KanbanCardProps) {
  const { setDraggedTask, deleteTask } = useTasks();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    setDraggedTask(task.id);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
  };
  
  const handleDelete = async () => {
    try {
      await deleteTask(task.id);
      toast({ title: "Tarea eliminada", description: `La tarea "${task.title}" ha sido eliminada.`})
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Error al eliminar", description: error.message });
    }
  }

  const getPriorityBadgeVariant = (priority: Task['priority']) => {
    switch (priority) {
      case 'High': return 'destructive';
      case 'Medium': return 'secondary';
      case 'Low': return 'outline';
      default: return 'outline';
    }
  };

  const getColorClass = () => {
    switch (task.status) {
      case 'Backlog':
        return 'bg-amber-50 border-amber-200 hover:bg-amber-100 dark:bg-amber-950 dark:border-amber-800 dark:hover:bg-amber-900';
      case 'In Progress':
        return 'bg-orange-50 border-orange-200 hover:bg-orange-100 dark:bg-orange-950 dark:border-orange-800 dark:hover:bg-orange-900';
      case 'Done':
        return 'bg-green-50 border-green-200 hover:bg-green-100 dark:bg-green-950 dark:border-green-800 dark:hover:bg-green-900';
      case 'Cancelled':
        return 'bg-red-50 border-red-200 hover:bg-red-100 dark:bg-red-950 dark:border-red-800 dark:hover:bg-red-900';
      case 'Todo':
        return taskColors[stringToHash(task.id) % taskColors.length];
      default:
        return 'bg-secondary';
    }
  };
  
  const getAssigneeInitials = (assignee?: string) => {
    if (!assignee) return '?';
    return assignee.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  return (
    <>
      <Card
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={cn(
          "cursor-grab active:cursor-grabbing shadow-sm transition-all",
          getColorClass()
        )}
      >
        <CardHeader className="p-3 pb-0">
          <div className="flex items-start justify-between">
            <Badge variant={getPriorityBadgeVariant(task.priority)} className="flex items-center gap-1.5">
              <PriorityIcon priority={task.priority} className="size-3" />
              {task.priority === 'High' ? 'Alta' : task.priority === 'Medium' ? 'Media' : 'Baja'}
            </Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded-md hover:bg-accent">
                  <MoreHorizontal className="size-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsFormOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Editar</span>
                </DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Eliminar</span>
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará permanentemente la tarea.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-2">
          <p className="font-medium text-sm">{task.title}</p>
          {task.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>}
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            {task.dueDate && (
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="size-3.5" />
                <span>{format(task.dueDate, 'MMM d', { locale: es })}</span>
              </div>
            )}
             {task.assignee && (
                <div className="flex items-center gap-1.5" title={task.assignee}>
                    <Avatar className='size-5 text-xs'>
                        <AvatarFallback>{getAssigneeInitials(task.assignee)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate max-w-[100px]">{task.assignee.split('@')[0]}</span>
                </div>
            )}
          </div>
        </CardContent>
      </Card>
      {isFormOpen && <TaskFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} taskToEdit={task} projectId={task.projectId}/>}
    </>
  );
}
