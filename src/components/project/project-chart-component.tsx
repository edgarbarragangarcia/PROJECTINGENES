
'use client';

import { Pie, PieChart, Cell, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { ProjectWithProgress, Task } from '@/lib/types';
import { PieChart as PieChartIcon } from 'lucide-react';
import { useMemo } from 'react';

const chartConfig = {
  tasks: {
    label: "Tareas",
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
  Cancelled: {
      label: "Cancelado",
      color: "hsl(var(--chart-5))",
  }
} satisfies ChartConfig;

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
      name: status,
      value: count,
      fill: `var(--color-${status.replace(/ /g, '')})`,
      label: status,
    }));
  }, [tasks]);

  const totalTasks = tasks.length;

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    if (percent === 0) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
  
  if (totalTasks === 0) {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className='flex items-center gap-2'><PieChartIcon className='size-5'/> Resumen de Tareas: {project.name}</CardTitle>
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
            <CardTitle className='flex items-center gap-2'><PieChartIcon className='size-5'/> Resumen de Tareas: {project.name}</CardTitle>
            <CardDescription>Distribución de tareas por estado para este proyecto.</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
            <ChartContainer config={chartConfig} className="w-full h-[250px]">
                 <PieChart>
                    <Tooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={100}
                        dataKey="value"
                        nameKey="name"
                    >
                        {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill}/>
                        ))}
                    </Pie>
                    <Legend 
                        iconType='circle'
                        formatter={(value) => <span className="text-foreground">{value}</span>}
                    />
                </PieChart>
            </ChartContainer>
        </CardContent>
    </Card>
  );
}
