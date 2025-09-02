
'use client'

import type { Status, Task, ProjectWithProgress } from '@/lib/types';
import { useMemo, useRef, UIEvent, useState } from 'react';
import { format, differenceInDays, startOfDay, addDays, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, ChevronRight } from 'lucide-react';
import { PageHeader } from '../layout/page-header';

interface GeneralGanttChartProps {
  tasks: Task[];
  projects: ProjectWithProgress[];
}

const statusColors: { [key in Status]: { bg: string, border: string } } = {
  'Backlog': { bg: 'bg-amber-400/70', border: 'border-amber-600' },
  'Todo': { bg: 'bg-sky-400/70', border: 'border-sky-600' },
  'In Progress': { bg: 'bg-orange-400/70', border: 'border-orange-600' },
  'Done': { bg: 'bg-green-400/70', border: 'border-green-600' },
  'Stopper': { bg: 'bg-red-400/70', border: 'border-red-600' },
};

const ROW_HEIGHT = 40; // px

export function GeneralGanttChart({ tasks, projects }: GeneralGanttChartProps) {
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const [dayWidth, setDayWidth] = useState(40);
  const [expandedProjects, setExpandedProjects] = useState<string[]>([]);

  const handleVerticalScroll = (e: UIEvent<HTMLDivElement>) => {
    if (leftPanelRef.current) {
      leftPanelRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };
  
  const handleToggleProject = (projectId: string) => {
    setExpandedProjects(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };


  const { chartItems, totalDays, timelineDays, months } = useMemo(() => {
    
    const sortedProjects = [...projects].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const items = sortedProjects.flatMap(project => {
        const projectTasks = tasks
            .filter(t => t.project_id === project.id && t.dueDate)
            .map(t => ({
                ...t,
                type: 'task' as const,
                startDate: new Date(t.startDate || t.dueDate!),
                dueDate: new Date(t.dueDate!), 
            }))
            .sort((a,b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime());
        
        return [{ type: 'project' as const, ...project }, ...projectTasks];
    });

    const tasksWithDates = items.filter(item => item.type === 'task') as (Task & {type: 'task', startDate?: Date, dueDate?: Date})[];
    
    const fixedEndDate = new Date('2026-12-31');

    if (tasksWithDates.length === 0) {
      const startDate = new Date();
      const timelineDays = eachDayOfInterval({start: startDate, end: fixedEndDate});
      const totalDays = differenceInDays(fixedEndDate, startDate) + 1;
       const months = timelineDays.reduce((acc, day) => {
        const monthKey = format(day, 'MMMM yyyy', { locale: es });
        if (!acc[monthKey]) {
            acc[monthKey] = 0;
        }
        acc[monthKey]++;
        return acc;
    }, {} as Record<string, number>);
      return { chartItems: items, totalDays, timelineDays, months };
    }

    const allDates = tasksWithDates.flatMap(t => [startOfDay(new Date(t.startDate!)).getTime(), startOfDay(new Date(t.dueDate!)).getTime()]);

    const minDate = startOfDay(new Date(Math.min(...allDates)));
    const maxDate = startOfDay(new Date(Math.max(...allDates)));
    
    const projectStartDate = addDays(minDate, -2);
    const projectEndDate = maxDate > fixedEndDate ? addDays(maxDate, 5) : fixedEndDate;


    const totalDays = differenceInDays(projectEndDate, projectStartDate) + 1;
    const timelineDays = eachDayOfInterval({ start: projectStartDate, end: projectEndDate });

    const data = items.map(item => {
      if (item.type === 'project') {
          return item;
      }
      const task = item as Task & {type: 'task', startDate?: Date, dueDate?: Date};
      if (!task.startDate || !task.dueDate) return item;

      const taskStart = startOfDay(new Date(task.startDate!));
      const taskEnd = startOfDay(new Date(task.dueDate!));
      
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

    return { chartItems: data, totalDays, timelineDays, months };
  }, [tasks, projects]);
  
  const displayItems = useMemo(() => {
    const visibleItems: any[] = [];
    chartItems.forEach(item => {
      if (item.type === 'project') {
        visibleItems.push(item);
      } else if (item.project_id && expandedProjects.includes(item.project_id)) {
        visibleItems.push(item);
      }
    });
    return visibleItems;
  }, [chartItems, expandedProjects]);


  if (projects.length === 0) {
    return <div className="flex items-center justify-center h-full text-muted-foreground p-4">No hay proyectos para mostrar.</div>;
  }

  return (
    <div className="flex flex-col h-full">
        <PageHeader title="Gantt General">
            <div className='flex items-center gap-4 w-64'>
                <ZoomOut className='size-5' />
                <Slider
                    value={[dayWidth]}
                    onValueChange={(value) => setDayWidth(value[0])}
                    min={20}
                    max={100}
                    step={5}
                />
                <ZoomIn className='size-5' />
            </div>
        </PageHeader>
        <div className="flex h-full w-full border-t">
            {/* Left Panel: Task Details */}
            <div className="w-[350px] border-r flex-shrink-0 bg-card flex flex-col">
                <div className="h-[60px] flex-shrink-0 flex items-center p-2 border-b font-semibold bg-muted/50 sticky top-0 z-20">
                    <div className="w-full px-2">Nombre</div>
                </div>
                <div 
                    ref={leftPanelRef} 
                    className="flex-1 overflow-y-hidden"
                >
                {displayItems.map((item: any, index) => (
                    <div key={`${item.id}-${index}`} className="flex items-center border-b h-full" style={{ height: `${ROW_HEIGHT}px` }}>
                         {item.type === 'project' ? (
                            <div 
                                className="w-full px-2 text-sm font-bold truncate flex items-center gap-1 cursor-pointer hover:bg-muted/50 h-full"
                                title={item.name}
                                onClick={() => handleToggleProject(item.id)}
                             >
                                <ChevronRight className={cn('size-4 transition-transform', expandedProjects.includes(item.id) && 'rotate-90')} />
                                {item.name}
                            </div>
                         ) : (
                            <div className="w-full pl-8 pr-2 text-sm truncate" title={item.title}>{item.title}</div>
                         )}
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
                    
                    <div className="relative" style={{ height: displayItems.length * ROW_HEIGHT }}>
                       {/* Grid Background */}
                        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${totalDays}, ${dayWidth}px)` }}>
                            {timelineDays.map((_, index) => (
                                <div key={`grid-v-${index}`} className="border-r h-full"></div>
                            ))}
                        </div>
                        <div className="absolute inset-0 grid" style={{ gridTemplateRows: `repeat(${displayItems.length}, ${ROW_HEIGHT}px)` }}>
                            {displayItems.map((item) => (
                                <div key={`grid-h-${item.id}`} className={cn("border-b w-full", item.type === 'project' && 'bg-muted/30')}></div>
                            ))}
                        </div>
                        
                        {/* Task Bars */}
                        <div className="absolute inset-0">
                            {displayItems.map((item: any, index) => {
                                if (item.type === 'project' || !item.gantt) return null;
                                const task = item;
                                return (
                                    <div 
                                        key={task.id} 
                                        className="absolute h-[30px] rounded flex items-center px-2 border"
                                        title={task.title}
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
                                )
                            })}
                        </div>
                    </div>
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    </div>
  );
}
