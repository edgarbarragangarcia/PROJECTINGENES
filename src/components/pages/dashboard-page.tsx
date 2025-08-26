
'use client';

import { PageHeader } from '../layout/page-header';
import type { ProjectWithProgress, Task } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { useTasks } from '@/hooks/use-tasks';
import { useProjects } from '@/hooks/use-projects';
import { BarChart, FolderKanban, ListChecks, CheckCircle, Percent, Clock } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, CartesianGrid, XAxis, YAxis, LabelList } from 'recharts';
import { BarChart as RechartsBarChart } from 'recharts';
import { ChartConfig } from '../ui/chart';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '../ui/badge';
import { PriorityIcon } from '../task/priority-icon';

const chartConfig = {
  tasks: {
    label: "Tareas",
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
  Cancelled: {
      label: "Cancelado",
      color: "hsl(var(--chart-5))",
  }
} satisfies ChartConfig;

const getPriorityBadgeVariant = (priority: Task['priority']) => {
    switch (priority) {
      case 'High': return 'destructive';
      case 'Medium': return 'secondary';
      case 'Low': return 'outline';
      default: return 'outline';
    }
};

export function DashboardPage() {
    const { tasks } = useTasks();
    const { projects } = useProjects();

    const tasksByStatus = tasks.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(tasksByStatus).map(([status, count]) => ({
        status,
        tasks: count,
        fill: `var(--color-${status.replace(/ /g, '')})`
    }));

    const totalTasks = tasks.length;
    const completedTasks = tasksByStatus['Done'] || 0;
    const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const totalProjects = projects.length;

    const upcomingTasks = tasks
        .filter(task => task.dueDate && new Date(task.dueDate) >= new Date() && task.status !== 'Done' && task.status !== 'Cancelled')
        .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
        .slice(0, 5);

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Dashboard General" />
      <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Proyectos</CardTitle>
                    <FolderKanban className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalProjects}</div>
                    <p className="text-xs text-muted-foreground">Proyectos activos y completados</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Tareas</CardTitle>
                    <ListChecks className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalTasks}</div>
                    <p className="text-xs text-muted-foreground">En todos los proyectos</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tareas Completadas</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{completedTasks}</div>
                     <p className="text-xs text-muted-foreground">Marcadas como 'Done'</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Progreso General</CardTitle>
                    <Percent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{overallProgress}%</div>
                    <p className="text-xs text-muted-foreground">De todas las tareas</p>
                </CardContent>
            </Card>
        </div>
        
        <div className="grid gap-6 md:grid-cols-5">
            {/* Task Summary Chart */}
            <Card className="md:col-span-3">
                <CardHeader>
                    <CardTitle className='flex items-center gap-2'><BarChart className='size-5'/> Resumen de Tareas por Estado</CardTitle>
                    <CardDescription>Una vista rápida de cómo se distribuyen tus tareas.</CardDescription>
                </CardHeader>
                <CardContent>
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
                                    <Bar key={entry.status} dataKey="tasks" fill={entry.fill} />
                                ))}
                            </Bar>
                        </RechartsBarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
            
            {/* Upcoming Tasks */}
            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle className='flex items-center gap-2'><Clock className='size-5'/> Próximas Tareas</CardTitle>
                    <CardDescription>Tus próximas 5 tareas más urgentes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {upcomingTasks.length > 0 ? (
                            upcomingTasks.map(task => {
                                const project = projects.find(p => p.id === task.projectId);
                                return (
                                    <div key={task.id} className="flex items-center justify-between gap-2">
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
                                                <span className="text-xs text-muted-foreground">
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
                                <p className="text-sm text-muted-foreground">No tienes tareas próximas.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
