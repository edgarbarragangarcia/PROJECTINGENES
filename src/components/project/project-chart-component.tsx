
'use client';

import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { ProjectWithProgress, Task } from '@/types';
import { BarChartHorizontal } from 'lucide-react';
import { useMemo } from 'react';

const chartConfig = {
  tasks: {
    label: "Tareas",
    color: "hsl(var(--foreground))",
  },
  Todo: {
    label: "Por Hacer",
    color: "hsl(var(--chart-2))",
  },
  "In Progress": {
    label: "En Progreso",
    color: "hsl(var(--chart-4))",
  },
  Done: {
    label: "Hecho",
    color: "hsl(var(--chart-3))",
  },
  Backlog: {
    label: "Backlog",
    color: "hsl(var(--chart-1))",
  },
  Stopper: {
      label: "Stopper",
      color: "hsl(var(--chart-5))",
  }
} as const;

interface ProjectChartComponentProps {
  project: ProjectWithProgress;
  tasks: Task[];
}

export function ProjectChartComponent({ project, tasks }: ProjectChartComponentProps) {
  const chartData = useMemo(() => {
    const tasksByStatus = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(tasksByStatus).map(([status, count]) => ({
      status: status,
      tasks: count,
      fill: chartConfig[status as keyof typeof chartConfig]?.color,
    }));
  }, [tasks]);

  const totalTasks = tasks.length;
  
  if (totalTasks === 0) {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className='flex items-center gap-2'><BarChartHorizontal className='size-5'/> Resumen de Tareas: {project.name}</CardTitle>
                <CardDescription>Distribución de tareas por estado para este proyecto.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-[250px]">
                <p className="text-muted-foreground">No hay tareas para mostrar en el gráfico.</p>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card className="w-full bg-background">
        <CardHeader>
            <CardTitle className='flex items-center gap-2'><BarChartHorizontal className='size-5'/> Resumen de Tareas: {project.name}</CardTitle>
            <CardDescription>Distribución de tareas por estado para este proyecto.</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
            <ChartContainer config={chartConfig} className="w-full h-[250px]">
                 <BarChart data={chartData} layout="horizontal" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="tasks" name="Tareas" radius={[4, 4, 0, 0]}>
                         {chartData.map((entry) => (
                            <Cell key={`cell-${entry.status}`} fill={entry.fill} />
                        ))}
                    </Bar>
                </BarChart>
            </ChartContainer>
        </CardContent>
    </Card>
  );
}
