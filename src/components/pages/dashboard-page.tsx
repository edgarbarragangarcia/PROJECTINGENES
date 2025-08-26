'use client';

import { PageHeader } from '../layout/page-header';
import type { ProjectWithProgress } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { useTasks } from '@/hooks/use-tasks';
import { useProjects } from '@/hooks/use-projects';
import { BarChart, PieChart, PlusCircle, User } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, CartesianGrid, XAxis, YAxis, Pie, Cell } from 'recharts';
import { BarChart as RechartsBarChart } from 'recharts';
import { ChartConfig } from '../ui/chart';
import { Button } from '../ui/button';
import { TaskFormDialog } from '../task/task-form-dialog';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import Link from 'next/link';

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

function ProjectCard({ project }: { project: ProjectWithProgress }) {
    const isCompleted = project.status === 'Completado' || project.progress === 100;
    const getStatusBadgeVariant = (status: ProjectWithProgress['status']) => {
        switch (status) {
          case 'Completado': return 'default';
          case 'En Progreso': return 'secondary';
          case 'En Pausa': return 'outline';
          default: return 'outline';
        }
      };

    return (
      <Link href={`/projects/${project.id}`} className="block">
      <Card className={cn(
          "overflow-hidden flex flex-col h-full transition-all hover:shadow-lg",
          isCompleted && "bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800"
      )}>
        <CardHeader>
            <CardTitle className="text-lg font-headline mb-1 truncate">{project.name}</CardTitle>
            <p className="text-sm text-muted-foreground line-clamp-2 flex-1 h-10">{project.description}</p>
        </CardHeader>
        <CardContent className="p-4 pt-0 flex-1 flex flex-col justify-end gap-4">
             {project.profiles?.email && (
                <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                   <User className='size-3.5'/> 
                   <span>{project.profiles.email}</span>
                </div>
            )}
            <div>
                <div className='flex justify-between items-center mb-1'>
                    <span className="text-sm font-medium text-muted-foreground">Progreso</span>
                    <span className="text-sm font-bold">{project.progress}%</span>
                </div>
                <Progress value={project.progress || 0} aria-label={`${project.progress}% de progreso`} className={cn(isCompleted && '[&>div]:bg-emerald-500')} />
            </div>
            
        </CardContent>
        <CardFooter className="p-4 pt-0 flex justify-between items-center">
            <Badge variant={getStatusBadgeVariant(project.status)} className={cn(isCompleted && 'bg-emerald-600 text-white border-emerald-600')}>{project.status}</Badge>
        </CardFooter>
      </Card>
      </Link>
    );
}

export function DashboardPage() {
    const { tasks } = useTasks();
    const { projects } = useProjects();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const params = useParams();
    const projectId = typeof params.id === 'string' ? params.id : '';


    const tasksByStatus = tasks.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(tasksByStatus).map(([status, count]) => ({
        status,
        tasks: count,
        fill: `var(--color-${status.replace(' ', '')})`
    }));

    const totalTasks = tasks.length;
    const completedTasks = tasksByStatus['Done'] || 0;

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Dashboard" />
      <div className="flex-1 overflow-auto p-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle className='flex items-center gap-2'><BarChart className='size-5'/> Resumen de Tareas</CardTitle>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="w-full h-[250px]">
                    <RechartsBarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
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
                            cursor={false}
                            content={<ChartTooltipContent indicator="dot" />}
                        />
                        <Bar dataKey="tasks" layout="vertical" radius={5}>
                            {chartData.map((entry) => (
                                <Cell key={`cell-${entry.status}`} fill={entry.fill} />
                            ))}
                        </Bar>
                    </RechartsBarChart>
                </ChartContainer>
            </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'><PieChart className='size-5'/> Tareas Completadas</CardTitle>
          </CardHeader>
          <CardContent className='flex items-center justify-center h-[250px]'>
             <div className='relative size-40'>
                <svg className='size-full' viewBox='0 0 36 36'>
                    <path
                        className='stroke-secondary'
                        d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        strokeWidth="3"
                    ></path>
                    <path
                        className='stroke-primary'
                        strokeDasharray={`${totalTasks > 0 ? (completedTasks/totalTasks)*100 : 0}, 100`}
                        d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        strokeWidth="3"
                        strokeLinecap='round'
                        transform="rotate(90 18 18)"
                    ></path>
                </svg>
                <div className='absolute inset-0 flex flex-col items-center justify-center'>
                    <span className='text-3xl font-bold font-headline'>{completedTasks}</span>
                    <span className='text-sm text-muted-foreground'>de {totalTasks}</span>
                </div>
             </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Proyectos Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold font-headline">{projects.filter(p => p.status === 'En Progreso').length}</div>
            <p className="text-xs text-muted-foreground">
                de {projects.length} proyectos totales
            </p>
          </CardContent>
        </Card>

        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
       {isFormOpen && <TaskFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} projectId={projectId} />}
    </div>
  );
}
