
'use client';

import type { Task } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PriorityIcon } from './priority-icon';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '../ui/button';
import { useState } from 'react';
import { TaskFormDialog } from './task-form-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { useTasks } from '@/hooks/use-tasks';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '../ui/avatar';


interface TaskTableProps {
  tasks: Task[];
}

export function TaskTable({ tasks }: TaskTableProps) {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const { deleteTask, allUsers } = useTasks();
  const { toast } = useToast();

  const getPriorityBadgeVariant = (priority: Task['priority']) => {
    switch (priority) {
      case 'High': return 'destructive';
      case 'Medium': return 'secondary';
      case 'Low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusBadgeClass = (status: Task['status']) => {
    switch (status) {
      case 'Backlog': return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800';
      case 'In Progress': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-800';
      case 'Done': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800';
      case 'Stopper': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800';
      case 'Todo': return 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/50 dark:text-sky-300 dark:border-sky-800';
      default: return 'bg-secondary text-secondary-foreground';
    }
  }
  
  const handleDelete = async (task: Task) => {
    try {
      await deleteTask(task.id);
      toast({ title: "Tarea eliminada", description: `La tarea "${task.title}" ha sido eliminada.`})
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Error al eliminar", description: error.message });
    }
  }
  
  const getAssigneeInitials = (email?: string) => {
    if (!email) return '?';
    const user = allUsers.find(u => u.email === email);
    if (user?.full_name) {
      return user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  }


  return (
    <>
      <div className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">Nombre de la tarea</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Prioridad</TableHead>
              <TableHead>Responsables</TableHead>
              <TableHead>Fecha Vencimiento</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="font-medium">{task.title}</TableCell>
                <TableCell>
                    <Badge variant="outline" className={getStatusBadgeClass(task.status)}>{task.status}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getPriorityBadgeVariant(task.priority)} className="flex items-center gap-1.5 w-fit">
                    <PriorityIcon priority={task.priority} className="size-3" />
                    {task.priority === 'High' ? 'Alta' : task.priority === 'Medium' ? 'Media' : 'Baja'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {task.assignees && task.assignees.length > 0 ? (
                     <div className="flex items-center -space-x-2">
                        {task.assignees.slice(0, 3).map(assignee => (
                            <Avatar key={assignee} className='size-7 text-xs border-2 border-background'>
                                <AvatarFallback>{getAssigneeInitials(assignee)}</AvatarFallback>
                            </Avatar>
                        ))}
                        {task.assignees.length > 3 && (
                              <Avatar className='size-7 text-xs border-2 border-background'>
                                <AvatarFallback>+{task.assignees.length - 3}</AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                  ) : 'N/A'}
                </TableCell>
                <TableCell>
                  {task.dueDate ? format(new Date(task.dueDate), 'dd MMM, yyyy', { locale: es }) : 'N/A'}
                </TableCell>
                <TableCell className="text-right">
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingTask(task)}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Editar</span>
                      </DropdownMenuItem>
                       <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
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
                            <AlertDialogAction onClick={() => handleDelete(task)} className="bg-destructive hover:bg-destructive/90">
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {editingTask && (
        <TaskFormDialog
          open={!!editingTask}
          onOpenChange={(isOpen) => !isOpen && setEditingTask(null)}
          taskToEdit={editingTask}
          projectId={editingTask.project_id}
        />
      )}
    </>
  );
}
