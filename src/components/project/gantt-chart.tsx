
'use client'

import type { Status, Task } from '@/lib/types';
import { useMemo, useRef, UIEvent } from 'react';
import { format, differenceInDays, startOfDay, addDays, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface GanttChartProps {
  tasks: Task[];
  dayWidth?: number;
}

const statusColors: { [key in Status]: { bg: string, border: string } } = {
  'Backlog': { bg: 'bg-amber-400/70', border: 'border-amber-600' },
  'Todo': { bg: 'bg-sky-400/70', border: 'border-sky-600' },
  'In Progress': { bg: 'bg-orange-400/70', border: 'border-orange-600' },
  'Done': { bg: 'bg-green-400/70', border: 'border-green-600' },
  'Stopper': { bg: 'bg-red-400/70', border: 'border-red-600' },
};

const ROW_HEIGHT = 40; // px

export function GanttChart({ tasks, dayWidth = 40 }: GanttChartProps) {
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  
  const handleVerticalScroll = (e: UIEvent<HTMLDivElement>) => {
    if (leftPanelRef.current) {
      leftPanelRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const { chartData, totalDays, timelineDays, months } = useMemo(() => {
    const tasksWithDates = tasks
      .filter(t => t.dueDate)
      .map(t => ({
        ...t,
        startDate: t.startDate || new Date(t.created_at),
        dueDate: new Date(t.dueDate!), // Make sure dueDate is a Date object
      }))
      .sort((a,b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime());

    if (tasksWithDates.length === 0) {
      return { chartData: [], totalDays: 0, timelineDays: [], months: [] };
    }

    const allDates = tasksWithDates.flatMap(t => [startOfDay(new Date(t.startDate!)).getTime(), startOfDay(new Date(t.dueDate!)).getTime()]);

    const minDate = startOfDay(new Date(Math.min(...allDates)));
    const maxDate = startOfDay(new Date(Math.max(...allDates)));

    const projectStartDate = addDays(minDate, -2);
    const projectEndDate = addDays(maxDate, 5);

    const totalDays = differenceInDays(projectEndDate, projectStartDate) + 1;
    const timelineDays = eachDayOfInterval({ start: projectStartDate, end: projectEndDate });

    const data = tasksWithDates.map(task => {
      const taskStart = startOfDay(new Date(task.startDate!));
      const taskEnd = startOfDay(new Date(task.dueDate!));
      
      // Handle cases where start date might be after due date
      const validTaskStart = taskStart.getTime() > taskEnd.getTime() ? taskEnd : taskStart;
      const validTaskEnd = taskStart.getTime() > taskEnd.getTime() ? taskStart : taskEnd;

      const startDayIndex = differenceInDays(validTaskStart, projectStartDate);
      const duration = differenceInDays(validTaskEnd, validTaskStart) + 1;

      return {
        ...task,
        gantt: {
          start: startDayIndex,
          duration,
        }
      };
    });

    const months = timelineDays.reduce((acc, day) => {
        const monthKey = format(day, 'MMMM yyyy', { locale: es });
        if (!acc[monthKey]) {
            acc[monthKey] = 0;
        }
        acc[monthKey]++;
        return acc;
    }, {} as Record<string, number>);

    return { chartData: data, totalDays, timelineDays, months };
  }, [tasks]);

  if (!tasks.length || chartData.length === 0) {
    return <div className="flex items-center justify-center h-full text-muted-foreground p-4">No hay tareas con fechas de inicio y fin para mostrar.</div>;
  }

  return (
    <div className="flex h-full w-full border-t">
      {/* Left Panel: Task Details */}
      <div className="w-[450px] border-r flex-shrink-0 bg-card flex flex-col">
        <div className="h-[60px] flex-shrink-0 flex items-center p-2 border-b font-semibold bg-muted/50 sticky top-0 z-20">
          <div className="w-[200px] px-2">Nombre de la tarea</div>
          <div className="w-[100px] px-2">Responsable</div>
          <div className="w-[75px] px-2">Inicio</div>
          <div className="w-[75px] px-2">Fin</div>
        </div>
        <div 
          ref={leftPanelRef} 
          className="flex-1 overflow-y-hidden"
        >
          {chartData.map((task) => (
            <div key={task.id} className="flex items-center border-b" style={{ height: `${ROW_HEIGHT}px` }}>
              <div className="w-[200px] px-2 text-sm truncate" title={task.title}>{task.title}</div>
              <div className="w-[100px] px-2 text-sm text-muted-foreground truncate" title={task.assignees?.join(', ')}>{task.assignees?.join(', ') || 'N/A'}</div>
              <div className="w-[75px] px-2 text-sm text-muted-foreground">{task.startDate ? format(new Date(task.startDate!), 'dd/MM') : 'N/A'}</div>
              <div className="w-[75px] px-2 text-sm text-muted-foreground">{task.dueDate ? format(new Date(task.dueDate!), 'dd/MM') : 'N/A'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel: Timeline */}
      <ScrollArea 
        className="flex-1" 
        onScroll={handleVerticalScroll}
        ref={timelineContainerRef}
      >
        <div className="h-full relative" style={{ width: totalDays * dayWidth }}>
          {/* Timeline Header */}
          <div className="sticky top-0 z-10 bg-card">
            <div className="flex h-[30px] border-b">
              {Object.entries(months).map(([month, dayCount]) => (
                <div key={month} className="flex items-center justify-center border-r" style={{ width: dayCount * dayWidth }}>
                  <span className="text-sm font-medium capitalize">{month}</span>
                </div>
              ))}
            </div>
            <div className="flex h-[30px] border-b">
              {timelineDays.map((day, index) => (
                <div key={index} className="flex items-center justify-center border-r flex-shrink-0" style={{ width: dayWidth }}>
                  <span className="text-xs text-muted-foreground">{format(day, 'd')}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="relative" style={{ height: chartData.length * ROW_HEIGHT }}>
            {/* Grid Background */}
            <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${totalDays}, ${dayWidth}px)` }}>
              {timelineDays.map((_, index) => (
                <div key={`grid-v-${index}`} className="border-r h-full"></div>
              ))}
            </div>
            <div className="absolute inset-0 grid" style={{ gridTemplateRows: `repeat(${chartData.length}, ${ROW_HEIGHT}px)` }}>
              {chartData.map((task) => (
                <div key={`grid-h-${task.id}`} className="border-b w-full"></div>
              ))}
            </div>

            {/* Task Bars */}
            <div className="absolute inset-0">
                {chartData.map((task, index) => (
                    <div 
                        key={task.id} 
                        className="absolute h-[30px] rounded flex items-center px-2 border"
                        title={`${task.title} | ${task.startDate ? format(new Date(task.startDate), 'dd/MM/yy') : ''} - ${task.dueDate ? format(new Date(task.dueDate), 'dd/MM/yy') : ''}`}
                        style={{
                            top: `${index * ROW_HEIGHT + 5}px`,
                            left: `${task.gantt.start * dayWidth + 2}px`,
                            width: `${task.gantt.duration * dayWidth - 4}px`,
                        }}
                    >
                       <div className={cn(
                            "absolute inset-0 rounded opacity-70",
                            statusColors[task.status].bg
                        )}></div>
                        <div className={cn(
                            "absolute inset-0 rounded border-2",
                            statusColors[task.status].border
                        )}></div>
                        <span className="relative text-xs font-medium text-black/90 truncate z-10">{task.title}</span>
                    </div>
                ))}
            </div>
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
