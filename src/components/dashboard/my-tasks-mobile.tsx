'use client';

import { useMemo, useState, useEffect } from 'react';
import { statuses, type ProjectWithProgress, type Task, type Profile, type Status } from '@/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { PriorityIcon } from '@/components/task/priority-icon';
import { cn } from '@/lib/utils';
import { TaskFormDialog } from '@/components/task/task-form-dialog';
import { CheckCircle, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { useTasks } from '@/hooks/use-tasks';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { parseISO } from 'date-fns';

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
    // debug logs removed

    // Safely parse assignees which can come as an array, a JSON string, or a comma-separated string
    const safeParseAssignees = (value: any): string[] => {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
            // Try JSON.parse first (most common from Postgres jsonb stored as string)
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) return parsed;
            } catch (e) {
                // fallthrough to comma-split
            }
            // Fallback: comma-separated list
            return value.split(',').map(s => s.trim()).filter(Boolean);
        }
        return [];
    };

    const displayTasks = tasks.map(t => ({
        ...t,
        assignees: safeParseAssignees(t.assignees),
        project_id: t.project_id || (t as any).projectId,
    } as Task));

    const displayProjects = projects;

    // Format assignees safely for display. Always returns a string.
    const formatAssignees = (value: any): string => {
        try {
            const arr = safeParseAssignees(value);
            if (Array.isArray(arr) && arr.length > 0) return arr.join(', ');
            return 'Nadie';
        } catch (e) {
            // Defensive fallback
            if (typeof value === 'string') return value;
            return 'Nadie';
        }
    };

    const [selectedUserEmail, setSelectedUserEmail] = useState('all');
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<'assignee' | 'creator'>('assignee');
    const [groupBy, setGroupBy] = useState<'project' | 'status'>('project');

    useEffect(() => {
        if (currentUserProfile) {
            setCurrentUserEmail(currentUserProfile.email || null);
        }
    }, [currentUserProfile]);

    // If not admin, default to current user
    useEffect(() => {
        if (currentUserProfile && !isAdmin) {
            setSelectedUserEmail(currentUserProfile.email || 'all');
        }
    }, [currentUserProfile, isAdmin]);

    const filteredTasks = useMemo(() => {
        if (selectedUserEmail === 'all' && isAdmin) {
            return displayTasks;
        }

        const selectedProfile = allUsers.find(u => u.email === selectedUserEmail);

        // If we're filtering by creator explicitly
        if (filterType === 'creator') {
            return displayTasks.filter(task => task.user_id === selectedProfile?.id);
        }

        // If we have the selected user profile, include tasks created by them OR assigned to their email
        if (selectedProfile) {
            return displayTasks.filter(task => {
                const assigned = Array.isArray(task.assignees) && task.assignees.includes(selectedProfile.email!);
                const createdBy = task.user_id === selectedProfile.id;
                return assigned || createdBy;
            });
        }

        // No selected user -> no tasks
        return [];

    }, [displayTasks, selectedUserEmail, isAdmin, filterType, allUsers]);

    const tasksByProject = useMemo(() => {
        const grouped: { [key: string]: Task[] } = {};
        filteredTasks.forEach(task => {
            const projectId = task.project_id || (task as any).projectId;
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

    const tasksByStatus = useMemo(() => {
        const grouped: { [key: string]: Task[] } = {};
        filteredTasks.forEach(task => {
            if (!grouped[task.status]) {
                grouped[task.status] = [];
            }
            grouped[task.status].push(task);
        });
        return grouped;
    }, [filteredTasks]);

    const handleStatusChange = async (task: Task, newStatus: Status) => {
        try {
            await updateTask(task.id, { status: newStatus });
            // setMobileTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
            toast({ title: 'Estado actualizado', description: `La tarea "${task.title}" ahora está ${newStatus}.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar la tarea.' });
        }
    };



    const hasTasks = filteredTasks.length > 0;

    return (
        <div className="p-4 space-y-4">
            {isAdmin && (
                <div className="p-4 bg-card rounded-lg shadow space-y-4">
                    <h3 className="font-bold text-lg">Filtros de Administrador</h3>
                    <div className="space-y-2">
                        <Label>Filtrar por</Label>
                        <RadioGroup value={filterType} onValueChange={(value) => setFilterType(value as any)}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="assignee" id="assignee" />
                                <Label htmlFor="assignee">Responsable</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="creator" id="creator" />
                                <Label htmlFor="creator">Creador</Label>
                            </div>
                        </RadioGroup>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="user-select">Usuario</Label>
                        <Select value={selectedUserEmail} onValueChange={setSelectedUserEmail}>
                            <SelectTrigger id="user-select">
                                <SelectValue placeholder="Seleccionar usuario" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los usuarios</SelectItem>
                                {allUsers.map(user => (
                                    <SelectItem key={user.id} value={user.email || ''}>{user.full_name || user.email}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Mis Tareas</h2>
                <div className="flex items-center gap-2">
                    <Label>Agrupar por:</Label>
                    <Select value={groupBy} onValueChange={(value) => setGroupBy(value as any)}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="project">Proyecto</SelectItem>
                            <SelectItem value="status">Estado</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Accordion type="multiple" className="w-full">
                {groupBy === 'project' ? (
                    Object.entries(tasksByProject).map(([projectId, tasks], index) => {
                        const project = displayProjects.find(p => p.id === projectId);
                        const itemClass = index % 2 === 0 ? 'bg-card' : 'bg-muted/50';
                        return (
                            <AccordionItem value={projectId} key={projectId} className={cn(itemClass, "border-b-0 rounded-lg mb-2 shadow-sm")}>
                                <AccordionTrigger className="px-4 py-3 group">
                                    <span className="flex-1 text-left font-semibold">{project?.name || 'Tareas sin proyecto'}</span>
                                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-3">
                                    <div className="space-y-2">
                                        {tasks.map(task => (
                                            <div key={task.id} className="p-3 bg-background rounded-lg shadow-sm" onClick={() => setEditingTask(task)}>
                                                <div className="flex justify-between items-start">
                                                    <span className="font-semibold">{task.title}</span>
                                                    <Badge className={cn("text-xs", getStatusBadgeClass(task.status))}>{task.status}</Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                                                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                        <PriorityIcon priority={task.priority} />
                                                        <span>{task.priority}</span>
                                                    </div>
                                                    <span>Responsable: {formatAssignees(task.assignees)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        );
                    })
                ) : (
                    statuses.map(status => (
                        tasksByStatus[status] && tasksByStatus[status].length > 0 && (
                            <AccordionItem value={status} key={status}>
                                <AccordionTrigger>{status}</AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-2">
                                        {tasksByStatus[status].map(task => (
                                            <div key={task.id} className="p-3 bg-card rounded-lg shadow-sm" onClick={() => setEditingTask(task)}>
                                                <div className="flex justify-between items-start">
                                                    <span className="font-semibold">{task.title}</span>
                                                    <Badge variant={getPriorityBadgeVariant(task.priority)}>{task.priority}</Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                                                <div className="text-xs text-muted-foreground mt-2">
                                                    Proyecto: {displayProjects.find(p => p.id === task.project_id)?.name || 'N/A'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    ))
                )}
            </Accordion>

            {!hasTasks && (
                <div className="text-center py-10">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                    <h3 className="mt-2 text-lg font-medium">¡Todo en orden!</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        No tienes tareas asignadas por el momento.
                    </p>
                </div>
            )}

            {editingTask && (
                <TaskFormDialog
                    open={!!editingTask}
                    onOpenChange={(open) => !open && setEditingTask(null)}
                    taskToEdit={editingTask}
                />
            )}
        </div>
    );
}
