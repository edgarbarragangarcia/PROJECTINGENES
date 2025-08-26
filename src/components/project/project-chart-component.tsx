
'use client';

import { Bar, CartesianGrid, XAxis, YAxis, LabelList, BarChart as RechartsBarChart } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ProjectWithProgress, Task } from '@/lib/types';
import { BarChart } from 'lucide-react';

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

interface ProjectChartComponentProps {
  project: ProjectWithProgress;
  tasks: Task[];
}

export function ProjectChartComponent({ project, tasks }: ProjectChartComponentProps) {
  const tasksByStatus = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(tasksByStatus).map(([status, count]) => ({
    status,
    tasks: count,
    fill: `var(--color-${status.replace(/ /g, '')})`
  }));

  return (
    <Card className="w-full">
        <CardHeader>
            <CardTitle className='flex items-center gap-2'><BarChart className='size-5'/> Resumen de Tareas: {project.name}</CardTitle>
            <CardDescription>Distribución de tareas por estado para este proyecto.</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
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
                        tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
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
                            offset={8}
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
  );
}
