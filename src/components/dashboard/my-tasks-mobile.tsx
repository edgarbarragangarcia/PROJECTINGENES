 'use client';

import { useMemo, useState, useEffect } from 'react';
import { statuses, type ProjectWithProgress, type Task, type Profile, type Status } from '@/lib/types';
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

    const [mobileTasks, setMobileTasks] = useState<Task[]>([]);
    const [mobileProjects, setMobileProjects] = useState<ProjectWithProgress[]>([]);
    const [loadingMobileData, setLoadingMobileData] = useState(true);
    const [fetchedMobileData, setFetchedMobileData] = useState(false);
    const [mobileFetchError, setMobileFetchError] = useState<string | null>(null);

    const displayTasks = fetchedMobileData ? mobileTasks : tasks.map(t => ({ ...t })).map(t => ({
        ...t,
        assignees: safeParseAssignees(t.assignees),
        project_id: t.project_id || (t as any).projectId,
    } as Task));
    const displayProjects = fetchedMobileData ? mobileProjects : projects;

    const normalizeTask = (t: any): Task => {
        return {
            ...t,
            // ensure assignees is an array
            assignees: safeParseAssignees(t.assignees),
            // prefer project_id; if absent, try projectId
            project_id: t.project_id || (t as any).projectId,
            // parse dates if strings
            startDate: t.start_date ? parseISO(t.start_date) : (t.startDate || undefined),
            dueDate: t.due_date ? parseISO(t.due_date) : (t.dueDate || undefined),
        } as Task;
    };

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

    useEffect(() => {
        let mounted = true;
        const supabase = createClient();

        const fetchMobileData = async () => {
            setLoadingMobileData(true);
            setMobileFetchError(null);
                try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    if (mounted) {
                        setMobileTasks([]);
                        setMobileProjects([]);
                        setFetchedMobileData(true);
                    }
                    return;
                }

                // Admin: fetch everything
                if (currentUserProfile?.role === 'admin') {
                    const { data: allTasks } = await supabase.from('tasks').select('*, subtasks(*)').order('created_at', { ascending: false });
                    const { data: allProjects } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
                    if (!mounted) return;
                    setMobileTasks((allTasks || []) as Task[]);
                    setMobileProjects((allProjects || []) as ProjectWithProgress[]);
                    setFetchedMobileData(true);
                    return;
                }

                // Regular user: tasks created by user OR assigned to user's email
                const userEmail = user.email || '';
                const { data: tasksData, error: tasksError } = await supabase
                    .from('tasks')
                    .select('*, subtasks(*)')
                    .or(`user_id.eq.${user.id},assignees.cs.["${userEmail}"]`)
                    .order('created_at', { ascending: false });

                if (tasksError) {
                    console.error('Error fetching mobile tasks:', tasksError);
                    setMobileFetchError(tasksError.message || JSON.stringify(tasksError));
                }

                const tasksList = (tasksData || []) as Task[];

                // Get project IDs from tasks
                const projectIds = Array.from(new Set(tasksList.map(t => t.project_id).filter(Boolean)));

                // Fetch projects owned by user
                const { data: ownedProjects } = await supabase.from('projects').select('*').eq('user_id', user.id);

                // Try RPC to get projects user has access to (handles RLS)
                let rpcProjects: any[] = [];
                try {
                    const { data: rpcData, error: rpcError } = await supabase.rpc('get_projects_for_user', {
                        p_user_id: user.id,
                        p_user_email: user.email || ''
                    });
                    if (rpcError) {
                        console.debug('RPC get_projects_for_user error:', rpcError);
                    } else if (rpcData) {
                        rpcProjects = rpcData as any[];
                    }
                } catch (e) {
                    console.debug('RPC call failed', e);
                }

                // Fetch projects related to tasks (by projectIds)
                let relatedProjects: any[] = [];
                if (projectIds.length > 0) {
                    const { data: projData } = await supabase.from('projects').select('*').in('id', projectIds);
                    relatedProjects = projData || [];
                }

                const combinedProjects = [...(ownedProjects || []), ...(rpcProjects || []), ...relatedProjects];
                // unique by id
                const uniqueProjectsMap: Record<string, any> = {};
                combinedProjects.forEach(p => { if (p && p.id) uniqueProjectsMap[p.id] = p; });
                const uniqueProjects = Object.values(uniqueProjectsMap) as ProjectWithProgress[];

                if (!mounted) return;
                setMobileTasks(tasksList.map(t => normalizeTask(t)));
                setMobileProjects(uniqueProjects);
                setFetchedMobileData(true);
            } catch (e: any) {
                console.error('Error fetching mobile data:', e);
                if (mounted) setMobileFetchError(e?.message || String(e));
                if (mounted) setFetchedMobileData(true);
            } finally {
                if (mounted) setLoadingMobileData(false);
            }
        };

        fetchMobileData();

        // Subscribe to auth changes so mobile view refetches automatically after sign-in/sign-out
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            try {
                if (event === 'SIGNED_IN') {
                    // Re-fetch data for the newly signed-in user
                    fetchMobileData();
                }
                if (event === 'SIGNED_OUT') {
                    // Clear mobile data on sign-out
                    if (mounted) {
                        setMobileTasks([]);
                        setMobileProjects([]);
                        setFetchedMobileData(true);
                    }
                }
            } catch (e) {
                console.error('Error handling auth state change in MyTasksMobile', e);
            }
        });

        return () => {
            mounted = false;
            try { authListener?.subscription?.unsubscribe(); } catch (e) {}
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUserProfile]);
    const [selectedUserId, setSelectedUserId] = useState<string>('all');
    const [filterType, setFilterType] = useState<'assignee' | 'creator'>('assignee');
    const [groupBy, setGroupBy] = useState<'project' | 'status'>('project');

    useEffect(() => {
        if (!isAdmin && currentUserProfile?.id) {
            setSelectedUserId(currentUserProfile.id);
        }
    }, [isAdmin, currentUserProfile]);

    const filteredTasks = useMemo(() => {
        if (selectedUserId === 'all' && isAdmin) {
            return displayTasks;
        }

        const selectedUser = allUsers.find(u => u.id === selectedUserId);

        // If we're filtering by creator explicitly
        if (filterType === 'creator') {
            return displayTasks.filter(task => task.user_id === selectedUserId);
        }

        // If we have the selected user profile, include tasks created by them OR assigned to their email
        if (selectedUser) {
            return displayTasks.filter(task => {
                const assigned = Array.isArray(task.assignees) && task.assignees.includes(selectedUser.email!);
                const createdBy = task.user_id === selectedUserId;
                return assigned || createdBy;
            });
        }

        // No selected user -> no tasks
        return [];

    }, [displayTasks, selectedUserId, isAdmin, filterType, allUsers]);

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

    const projectIdsWithTasks = Object.keys(tasksByProject);
    const statusKeys = useMemo(() => statuses.filter(s => tasksByStatus[s]?.length > 0), [tasksByStatus]);

    const showDebugPanel = false;

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

    const renderTaskItem = (task: Task) => {
        const project = displayProjects.find(p => p.id === (task.project_id || (task as any).projectId));
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
                            <p>Asignado a: {formatAssignees(task.assignees)}</p>
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
    };

    if (displayTasks.length === 0 && isAdmin) {
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
           {/* debug panel removed */}
           {(isAdmin || (tasks && tasks.length > 0)) && (
             <div className="p-4 border-b space-y-4">
                <div className="flex items-center gap-2 font-semibold">
                    <SlidersHorizontal className="size-5"/>
                    <Label>Filtros y Agrupación</Label>
                </div>
                
                <div className='space-y-2'>
                    <Label className='text-sm font-medium'>Agrupar por</Label>
                     <RadioGroup defaultValue="project" value={groupBy} onValueChange={(value: 'project' | 'status') => setGroupBy(value)} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="project" id="r-project" />
                            <Label htmlFor="r-project">Proyecto</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="status" id="r-status" />
                            <Label htmlFor="r-status">Estado</Label>
                        </div>
                    </RadioGroup>
                </div>

                {isAdmin && (
                    <div className='space-y-2'>
                         <Label className='text-sm font-medium'>Filtrar por</Label>
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
            </div>
           )}

            <div className="flex-1 overflow-auto p-4">
                {filteredTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center p-8 h-full">
                        <p className="font-semibold text-lg">No hay tareas</p>
                        <p className="text-sm text-muted-foreground">No se encontraron tareas para los filtros aplicados.</p>
                    </div>
                ) : (
                    <Accordion key={groupBy} type="multiple" defaultValue={groupBy === 'project' ? projectIdsWithTasks : statusKeys} className="w-full">
                        {groupBy === 'project' && projectIdsWithTasks.map(projectId => {
                            const project = displayProjects.find(p => p.id === projectId);
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
                                            {projectTasks.map(renderTaskItem)}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )
                        })}

                        {groupBy === 'status' && statusKeys.map(status => {
                             const statusTasks = tasksByStatus[status as Status];
                             return (
                                <AccordionItem value={status} key={status}>
                                     <AccordionTrigger className="font-semibold text-lg">
                                         <div className="flex items-center gap-3">
                                             <Badge variant="outline" className={cn(getStatusBadgeClass(status as Status), 'text-base')}>{status}</Badge>
                                             <Badge variant="outline">{statusTasks.length}</Badge>
                                         </div>
                                     </AccordionTrigger>
                                     <AccordionContent>
                                         <div className="space-y-3">
                                             {statusTasks.map(renderTaskItem)}
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
