
'use client';

import { PageHeader } from '../layout/page-header';
import { AppLayout } from '../layout/app-layout';
import type { ProjectWithProgress, Task, Profile, User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { useTasks } from '@/hooks/use-tasks';
import { useProjects } from '@/hooks/use-projects';
import { BarChart, FolderKanban, ListChecks, CheckCircle, Percent, Clock, User as UserIcon, Users, FolderPlus, FolderCheck } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, CartesianGrid, XAxis, YAxis, LabelList, Cell } from 'recharts';
import { BarChart as RechartsBarChart } from 'recharts';
import { ChartConfig } from '../ui/chart';
import Link from 'next/link';
import { format, isPast, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '../ui/badge';
import { PriorityIcon } from '../task/priority-icon';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from '@/lib/utils';

type ChartStatus = {
  label: string;
  color: string;
};

const chartConfig: Record<string, ChartStatus> = {
  tasks: {
    label: "Tareas",
    color: 'hsl(var(--foreground))',
  },
  Todo: {
    label: "Por Hacer",
    color: "hsl(var(--chart-1))",
  },
  "In Progress": {
    label: "En Progreso",
    color: "hsl(var(--chart-2))",
  },
  Done: {
    label: "Hecho",
    color: "hsl(var(--chart-3))",
  },
  Backlog: {
    label: "Backlog",
    color: "hsl(var(--chart-4))",
  },
  Stopper: {
    label: "Stopper",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;

const getPriorityBadgeVariant = (priority: Task['priority']) => {
    switch (priority) {
      case 'High': return 'destructive';
      case 'Medium': return 'secondary';
      case 'Low': return 'outline';
      default: return 'outline';
    }
};

export default function DashboardPage() {
    const { tasks, allUsers } = useTasks();
    const { projects } = useProjects();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [selectedUserEmail, setSelectedUserEmail] = useState('all');
    const supabase = createClient();

    const currentUserProfile = useMemo(() => allUsers.find(u => u.id === currentUser?.id), [allUsers, currentUser]);
    const isAdmin = currentUserProfile?.role === 'admin';

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);
            if(user) {
              const profile = allUsers.find(u => u.id === user.id);
              if (profile?.role !== 'admin') {
                setSelectedUserEmail(user.email || 'all');
              }
            }
        };
       if (allUsers.length > 0) {
            checkUser();
       }
    }, [supabase.auth, allUsers]);

    const assignedTasks = useMemo(() => {
        if (selectedUserEmail === 'all' || !selectedUserEmail) {
            return tasks;
        }
        return tasks.filter(task => Array.isArray(task.assignees) && task.assignees.includes(selectedUserEmail));
    }, [tasks, selectedUserEmail]);
    
    const userProjects = useMemo(() => {
        if (selectedUserEmail === 'all' || !selectedUserEmail) return projects;
        return projects.filter(p => p.creator_email === selectedUserEmail);
    }, [projects, selectedUserEmail]);
    
    const selectedUserName = useMemo(() => {
        if (selectedUserEmail === 'all') return 'General';
        const user = allUsers.find(u => u.email === selectedUserEmail);
        return user?.full_name || user?.email || 'Desconocido';
    }, [selectedUserEmail, allUsers]);

    // --- Chart Logic ---
    // The chart will now show a summary of the tasks ASSIGNED to the selected user.
    const tasksByStatusForChart = useMemo(() => assignedTasks.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>), [assignedTasks]);

    const chartData = useMemo(() => Object.entries(tasksByStatusForChart).map(([status, count]) => ({
        status,
        tasks: count,
        fill: chartConfig[status as keyof typeof chartConfig]?.color || 'hsl(var(--foreground))',
    })), [tasksByStatusForChart]);

    // --- KPIs ---
    const totalAssignedTasks = assignedTasks.length;
    const completedAssignedTasks = useMemo(() => assignedTasks.reduce((acc, task) => {
        if (task.status === 'Done') return acc + 1;
        return acc;
    }, 0), [assignedTasks]);
    
    const overallProgress = totalAssignedTasks > 0 ? Math.round((completedAssignedTasks / totalAssignedTasks) * 100) : 0;

    const participatingProjectsCount = useMemo(() => {
      if (selectedUserEmail === 'all' || !selectedUserEmail) {
        return projects.length;
      }
      const projectsWithUserTasks = new Set(assignedTasks.map(task => task.projectId));
      return projectsWithUserTasks.size;
    }, [projects.length, assignedTasks, selectedUserEmail]);
    
    const createdProjectsCount = userProjects.length;

    const closedProjectsCount = useMemo(() => {
        return userProjects.filter(p => p.status === 'Completado').length;
    }, [userProjects]);


    const upcomingTasks = useMemo(() => assignedTasks
        .filter(task => task.dueDate && task.status !== 'Done' && task.status !== 'Stopper')
        .sort((a, b) => {
            const aDueDate = new Date(a.dueDate!).getTime();
            const bDueDate = new Date(b.dueDate!).getTime();
            const aIsPast = isPast(startOfDay(new Date(a.dueDate!)));
            const bIsPast = isPast(startOfDay(new Date(b.dueDate!)));

            if (aIsPast && !bIsPast) return -1;
            if (!aIsPast && bIsPast) return 1;
            
            if (aIsPast && bIsPast) return aDueDate - bDueDate;
            
            return aDueDate - bDueDate;
        })
        .slice(0, 5), [assignedTasks]);

    const headerTitle = useMemo(() => {
        if (isAdmin) {
            return `Dashboard ${selectedUserName}`;
        }
        return 'Mi Dashboard';
    }, [isAdmin, selectedUserName]);

  return (
    <AppLayout>
        <div className="flex flex-col h-full">
        <PageHeader title={headerTitle}>
            {isAdmin && (
                <div className="flex items-center gap-2">
                    <Users className="size-5 text-muted-foreground" />
                    <Select value={selectedUserEmail} onValueChange={setSelectedUserEmail}>
                        <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder="Filtrar por usuario..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los usuarios</SelectItem>
                            {allUsers.map(user => (
                                <SelectItem key={user.id} value={user.email || ''}>{user.full_name || user.email}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </PageHeader>
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Proyectos en los que participo</CardTitle>
                        <FolderKanban className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{participatingProjectsCount}</div>
                        <p className="text-xs text-muted-foreground">
                            {selectedUserEmail === 'all' && isAdmin ? 'Proyectos activos y completados' : 'Proyectos con tareas asignadas'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Proyectos Creados</CardTitle>
                        <FolderPlus className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{createdProjectsCount}</div>
                        <p className="text-xs text-muted-foreground">
                            {selectedUserEmail === 'all' && isAdmin ? 'Total en el sistema' : 'Creados por mí'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Proyectos Cerrados</CardTitle>
                        <FolderCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{closedProjectsCount}</div>
                        <p className="text-xs text-muted-foreground">
                            {selectedUserEmail === 'all' && isAdmin ? 'Total completados' : 'Completados por mí'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Tareas Asignadas</CardTitle>
                        <ListChecks className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalAssignedTasks}</div>
                        <p className="text-xs text-muted-foreground">
                            {selectedUserEmail === 'all' && isAdmin ? 'En todos los proyectos' : 'Asignadas a mí'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tareas Completadas</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{completedAssignedTasks}</div>
                        <p className="text-xs text-muted-foreground">De mis tareas asignadas</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Progreso Personal</CardTitle>
                        <Percent className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{overallProgress}%</div>
                        <p className="text-xs text-muted-foreground">De mis tareas asignadas</p>
                    </CardContent>
                </Card>
            </div>
            
            <div className="grid gap-6 md:grid-cols-5">
                <Card className="md:col-span-3">
                    <CardHeader>
                        <CardTitle className='flex items-center gap-2'><BarChart className='size-5'/> Resumen de Tareas Asignadas por Estado</CardTitle>
                        <CardDescription>
                        {isAdmin && selectedUserEmail === 'all'
                            ? 'Distribución de todas las tareas en el sistema.'
                            : `Distribución de las tareas asignadas a ${isAdmin ? selectedUserName : 'mí'}.`
                        }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                    {chartData.length > 0 ? (
                            <ChartContainer config={chartConfig} className="w-full h-[250px]">
                                <RechartsBarChart 
                                    data={chartData} 
                                    layout="vertical" 
                                    margin={{ left: 10, right: 40 }}
                                >
                                    <CartesianGrid horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis 
                                        dataKey="status" 
                                        type="category" 
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                        width={80}
                                    />
                                    <ChartTooltip
                                        cursor={{fill: 'hsl(var(--accent))'}}
                                        content={<ChartTooltipContent />}
                                    />
                                    <Bar dataKey="tasks" layout="vertical" radius={[0, 4, 4, 0]}>
                                        <LabelList 
                                            dataKey="tasks" 
                                            position="right" 
                                            offset={10}
                                            className="fill-foreground font-semibold"
                                            fontSize={12}
                                        />
                                        {chartData.map((entry) => (
                                            <Cell key={`cell-${entry.status}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </RechartsBarChart>
                            </ChartContainer>
                    ) : (
                            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg h-[250px]">
                                <ListChecks className="size-8 text-muted-foreground mb-2"/>
                                <p className="font-semibold">Sin Tareas Asignadas</p>
                                <p className="text-sm text-muted-foreground">No se encontraron tareas para mostrar en el gráfico.</p>
                            </div>
                    )}
                    </CardContent>
                </Card>
                
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className='flex items-center gap-2'><Clock className='size-5'/> Próximas Tareas Asignadas</CardTitle>
                        <CardDescription>
                        {isAdmin && selectedUserEmail === 'all'
                            ? 'Las próximas 5 tareas más urgentes asignadas a cualquier usuario.'
                            : `Las próximas 5 tareas más urgentes asignadas a ${isAdmin ? selectedUserName : 'mí'}.`
                        }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {upcomingTasks.length > 0 ? (
                                upcomingTasks.map(task => {
                                    const project = projects.find(p => p.id === task.projectId);
                                    const isOverdue = task.dueDate && isPast(startOfDay(new Date(task.dueDate)));
                                    return (
                                        <div key={task.id} className={cn("flex items-center justify-between gap-2 p-2 rounded-lg", isOverdue && 'bg-red-50 dark:bg-red-950/30 shadow-inner shadow-red-500/10')}>
                                            <div className='flex-1 truncate'>
                                                <p className="font-medium text-sm truncate" title={task.title}>
                                                    <Link href={`/projects/${task.projectId}`} className="hover:underline">
                                                        {task.title}
                                                    </Link>
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate" title={project?.name}>{project?.name || 'Proyecto no encontrado'}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <Badge variant={getPriorityBadgeVariant(task.priority)} className="w-fit">
                                                    <PriorityIcon priority={task.priority} className='size-3 mr-1' />
                                                    {task.priority === 'High' ? 'Alta' : task.priority === 'Medium' ? 'Media' : 'Baja'}
                                                </Badge>
                                                {task.dueDate && (
                                                    <span className={cn("text-xs", isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-muted-foreground')}>
                                                        {format(new Date(task.dueDate), "d 'de' MMM", { locale: es })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg h-full">
                                    <CheckCircle className="size-8 text-green-500 mb-2"/>
                                    <p className="font-semibold">¡Todo en orden!</p>
                                    <p className="text-sm text-muted-foreground">No tienes tareas próximas asignadas.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
        </div>
    </AppLayout>
  );
}

    