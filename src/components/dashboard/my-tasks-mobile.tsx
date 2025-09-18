'use client';

import { useMemo, useState } from 'react';
import type { ProjectWithProgress, Task } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { PriorityIcon } from '@/components/task/priority-icon';
import { cn } from '@/lib/utils';
import { TaskFormDialog } from '@/components/task/task-form-dialog';
import { CheckCircle, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { useTasks } from '@/hooks/use-tasks';
import { useToast } from '@/hooks/use-toast';
import { useProjects } from '@/hooks/use-projects';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MyTasksMobileProps {
    tasks: Task[];
    projects: ProjectWithProgress[];
}

const getStatusBadgeClass = (status: Task['status']) => {
    switch (status) {
      case 'Backlog': return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800';
      case 'In Progress': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-800';
      case 'Done': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800';
      case 'Stopper': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800';
      case 'Todo': return 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/50 dark:text-sky-300 dark:border-sky-800';
      default: return 'bg-secondary text-secondary-foreground';
    }
};

const getPriorityBadgeVariant = (priority: Task['priority']) => {
    switch (priority) {
      case 'High': return 'destructive';
      case 'Medium': return 'secondary';
      case 'Low': return 'outline';
      default: return 'outline';
    }
};

export function MyTasksMobile({ tasks, projects }: MyTasksMobileProps) {
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const { updateTask } = useTasks();
    const { toast } = useToast();
    const [selectedAssignee, setSelectedAssignee] = useState('Todos');

    const allAssignees = useMemo(() => {
        const assignees = new Set<string>();
        tasks.forEach(task => {
            task.assignees?.forEach(assignee => {
                assignees.add(assignee);
            });
        });
        return ['Todos', ...Array.from(assignees)];
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        if (selectedAssignee === 'Todos') {
            return tasks;
        }
        return tasks.filter(task => task.assignees?.includes(selectedAssignee));
    }, [tasks, selectedAssignee]);

    const tasksByProject = useMemo(() => {
        const grouped: { [key: string]: Task[] } = {};
        filteredTasks.forEach(task => {
            if (!grouped[task.projectId]) {
                grouped[task.projectId] = [];
            }
            grouped[task.projectId].push(task);
        });
        return grouped;
    }, [filteredTasks]);

    const projectIdsWithTasks = Object.keys(tasksByProject);

    const handleTaskCheck = async (task: Task, isChecked: boolean) => {
        const newStatus = isChecked ? 'Done' : 'Todo';
        try {
            await updateTask(task.id, { status: newStatus });
            toast({
                title: `Tarea ${isChecked ? 'Completada' : 'Pendiente'}`,
                description: `"${task.title}" ha sido actualizada.`
            })
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error al actualizar',
                description: error.message,
            });
        }
    };


    if (tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-8 h-full">
                <CheckCircle className="size-12 text-green-500 mb-4"/>
                <p className="font-semibold text-lg">¡Todo en orden!</p>
                <p className="text-sm text-muted-foreground">No tienes tareas asignadas por el momento.</p>
            </div>
        )
    }

    return (
        <>
            <div className="p-4 border-b">
                <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Filtrar por responsable" />
                    </SelectTrigger>
                    <SelectContent>
                        {allAssignees.map(assignee => (
                            <SelectItem key={assignee} value={assignee}>
                                {assignee}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex-1 overflow-auto p-4">
                {projectIdsWithTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center p-8 h-full">
                        <p className="font-semibold text-lg">No hay tareas</p>
                        <p className="text-sm text-muted-foreground">No se encontraron tareas para el usuario seleccionado.</p>
                    </div>
                ) : (
                    <Accordion type="multiple" defaultValue={projectIdsWithTasks} className="w-full">
                        {projectIdsWithTasks.map(projectId => {
                            const project = projects.find(p => p.id === projectId);
                            const projectTasks = tasksByProject[projectId];
                            return (
                                <AccordionItem value={projectId} key={projectId}>
                                    <AccordionTrigger className="font-semibold text-lg">
                                        <div className="flex items-center gap-3">
                                            <span>{project?.name || 'Tareas sin proyecto'}</span>
                                            <Badge variant="outline">{projectTasks.length}</Badge>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-3">
                                            {projectTasks.map(task => (
                                                <div
                                                    key={task.id}
                                                    className="p-3 rounded-lg border bg-card"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <Checkbox
                                                            id={`task-check-${task.id}`}
                                                            className='mt-1'
                                                            checked={task.status === 'Done'}
                                                            onCheckedChange={(checked) => handleTaskCheck(task, !!checked)}
                                                        />
                                                        <div className='flex-1'>
                                                            <label 
                                                                htmlFor={`task-check-${task.id}`} 
                                                                className={cn("font-medium cursor-pointer", task.status === 'Done' && 'line-through text-muted-foreground')}
                                                                onClick={(e) => { e.preventDefault(); setEditingTask(task); }}
                                                            >
                                                                {task.title}
                                                            </label>
                                                            {task.assignees && task.assignees.length > 0 && (
                                                                <p className="text-xs text-muted-foreground mt-1">
                                                                    Asignado a: {task.assignees.join(', ')}
                                                                </p>
                                                            )}
                                                            <div className="flex items-center justify-between mt-2">
                                                                <Badge variant="outline" className={cn(getStatusBadgeClass(task.status))}>
                                                                    {task.status}
                                                                </Badge>
                                                                <Badge variant={getPriorityBadgeVariant(task.priority)} className="flex items-center gap-1.5 w-fit">
                                                                    <PriorityIcon priority={task.priority} className="size-3" />
                                                                    {task.priority === 'High' ? 'Alta' : task.priority === 'Medium' ? 'Media' : 'Baja'}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )
                        })}
                    </Accordion>
                )}
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
    )
}
