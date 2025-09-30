'use client';

import type { Task } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTasks } from '@/hooks/use-tasks';
import { MoreHorizontal, CalendarIcon, Trash2, Edit, Paperclip } from 'lucide-react';
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
import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface KanbanCardProps {
  task: Task;
}

export function KanbanCard({ task }: KanbanCardProps) {
  const { deleteTask, allUsers } = useTasks();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();

  const handleDelete = () => {
    deleteTask(task.id);
    toast({
      title: "Tarea eliminada",
      description: `La tarea "${task.title}" ha sido eliminada.`,
    });
  };

  const getAssigneeInitials = (email?: string) => {
    if (!email) return '?';
    const user = allUsers.find(u => u.email === email);
    if (user?.full_name) {
      return user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  }

  const getAssigneeName = (email: string) => {
    const user = allUsers.find(u => u.email === email);
    return user?.full_name || email;
  }

  const getStatusColors = () => {
    switch (task.status) {
      case 'In Progress':
        return 'border-orange-500/50 bg-orange-500/10';
      case 'Done':
        return 'border-green-500/50 bg-green-500/10';
      case 'Stopper':
        return 'border-red-500/50 bg-red-500/10';
      default:
        return 'border-transparent';
    }
  }

  return (
    <>
      <Card className={cn("group hover:shadow-md transition-shadow", getStatusColors())}>
        <CardHeader className="p-3">
          {task.image_url && (
            <div className="relative h-32 w-full mb-2">
              <Image src={task.image_url} alt={task.title} layout="fill" objectFit="cover" className="rounded-t-lg" />
            </div>
          )}
          <div className="flex justify-between items-start">
            <CardTitle className="text-base font-medium line-clamp-2">{task.title}</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded-md hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsFormOpen(true)}><Edit className='size-4 mr-2'/>Editar</DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className='text-red-500 focus:text-red-500'><Trash2 className='size-4 mr-2'/>Eliminar</DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará permanentemente la tarea.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className='bg-red-500 hover:bg-red-600'>Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <PriorityIcon priority={task.priority} />
            <span>{task.priority}</span>
          </div>
          {task.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>}
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
             <div className="flex items-center gap-2">
                {task.dueDate && (
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="size-3.5" />
                    <span>{format(new Date(task.dueDate), 'MMM d', { locale: es })}</span>
                  </div>
                )}
                {task.subtasks && task.subtasks.length > 0 && (
                    <div className="flex items-center gap-1" title={`${task.subtasks.filter(st => st.is_completed).length} de ${task.subtasks.length} subtareas completadas`}>
                       <svg className='size-3.5' viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5.75 11.75L2.25 8.25L3.31 7.19L5.75 9.63L12.69 2.69L13.75 3.75L5.75 11.75Z"></path></svg>
                       <span>{`${task.subtasks.filter(st => st.is_completed).length}/${task.subtasks.length}`}</span>
                    </div>
                )}
                {task.image_url && (
                    <Paperclip className="size-3.5" />
                )}
            </div>

            {Array.isArray(task.assignees) && task.assignees.length > 0 && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center -space-x-2">
                                {task.assignees.slice(0, 2).map(assignee => (
                                    <Avatar key={assignee} className='size-6 text-xs border-2 border-background'>
                                        <AvatarFallback>{getAssigneeInitials(assignee)}</AvatarFallback>
                                    </Avatar>
                                ))}
                                {task.assignees.length > 2 && (
                                     <Avatar className='size-6 text-xs border-2 border-background'>
                                        <AvatarFallback>+{task.assignees.length - 2}</AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{task.assignees.map(getAssigneeName).join(', ')}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
          </div>
        </CardContent>
      </Card>
      {isFormOpen && <TaskFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} taskToEdit={task} projectId={task.project_id}/>}
    </>
  );
}
