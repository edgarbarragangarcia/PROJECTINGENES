'use client';

import { useMemo, useState, useEffect } from 'react';
import type { ProjectWithProgress, Task, Profile } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { PriorityIcon } from '@/components/task/priority-icon';
import { cn } from '@/lib/utils';
import { TaskFormDialog } from '@/components/task/task-form-dialog';
import { CheckCircle, SlidersHorizontal } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { useTasks } from '@/hooks/use-tasks';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface MyTasksMobileProps {
    tasks: Task[];
    projects: ProjectWithProgress[];
    allUsers: Profile[];
    currentUserProfile?: Profile;
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

export function MyTasksMobile({ tasks, projects, allUsers, currentUserProfile }: MyTasksMobileProps) {
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const { updateTask } = useTasks();
    const { toast } = useToast();
    
    const isAdmin = currentUserProfile?.role === 'admin';
    const [selectedUserId, setSelectedUserId] = useState<string>('all');
    const [filterType, setFilterType] = useState<'assignee' | 'creator'>('assignee');

    useEffect(() => {
        if (!isAdmin && currentUserProfile?.id) {
            setSelectedUserId(currentUserProfile.id);
        }
    }, [isAdmin, currentUserProfile]);

    const filteredTasks = useMemo(() => {
        if (selectedUserId === 'all' && isAdmin) {
            return tasks;
        }

        if (filterType === 'creator') {
            return tasks.filter(task => task.user_id === selectedUserId);
        } 
        
        // Default to assignee filter
        const selectedUser = allUsers.find(u => u.id === selectedUserId);
        if (!selectedUser) return [];
        return tasks.filter(task => 
            Array.isArray(task.assignees) && task.assignees.includes(selectedUser.email!)
        );

    }, [tasks, selectedUserId, isAdmin, filterType, allUsers]);

    const tasksByProject = useMemo(() => {
        const grouped: { [key: string]: Task[] } = {};
        filteredTasks.forEach(task => {
            const projectId = task.project_id || task.projectId;
            if (!grouped[projectId]) {
                grouped[projectId] = [];
            }
            grouped[projectId].push(task);
        });

        for (const projectId in grouped) {
            grouped[projectId].sort((a, b) => {
                const aIsDone = a.status === 'Done';
                const bIsDone = b.status === 'Done';
                if (aIsDone === bIsDone) return 0;
                return aIsDone ? 1 : -1;
            });
        }

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

    if (tasks.length === 0 && isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-8 h-full">
                <CheckCircle className="size-12 text-green-500 mb-4"/>
                <p className="font-semibold text-lg">¡Todo en orden!</p>
                <p className="text-sm text-muted-foreground">No hay tareas en el sistema.</p>
            </div>
        )
    }

    if (filteredTasks.length === 0 && !isAdmin) {
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
           {isAdmin && (
             <div className="p-4 border-b space-y-4">
                <div className="flex items-center gap-2 font-semibold">
                    <SlidersHorizontal className="size-5"/>
                    <Label>Filtros</Label>
                </div>
                <RadioGroup defaultValue="assignee" value={filterType} onValueChange={(value: 'assignee' | 'creator') => setFilterType(value)} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="assignee" id="r-assignee" />
                        <Label htmlFor="r-assignee">Asignado a</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="creator" id="r-creator" />
                        <Label htmlFor="r-creator">Creado por</Label>
                    </div>
                </RadioGroup>

                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Filtrar por usuario..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los usuarios</SelectItem>
                        {allUsers.map(user => (
                            <SelectItem key={user.id} value={user.id!}>
                                {user.full_name || user.email}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
           )}

            <div className="flex-1 overflow-auto p-4">
                {projectIdsWithTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center p-8 h-full">
                        <p className="font-semibold text-lg">No hay tareas</p>
                        <p className="text-sm text-muted-foreground">No se encontraron tareas para los filtros aplicados.</p>
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
                                            {projectTasks.map(task => {
                                                const creator = allUsers.find(u => u.id === task.user_id);
                                                return (
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
                                                                <div className="text-xs text-muted-foreground mt-1 space-y-1">
                                                                    <p>Proyecto: {project?.name || 'Tareas sin proyecto'}</p>
                                                                    <p>Creada por: {creator?.full_name || 'Desconocido'}</p>
                                                                    <p>Asignado a: {task.assignees?.join(', ') || 'Nadie'}</p>
                                                                </div>
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
                                                )
                                            })}
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
                    projectId={editingTask.project_id || editingTask.projectId}
                />
            )}
        </>
    )
}
