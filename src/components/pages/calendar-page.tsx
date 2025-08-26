'use client';

import { PageHeader } from '../layout/page-header';
import { useTasks } from '@/hooks/use-tasks';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, isSameMonth, getDay, isWithinInterval, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Task, Status } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TaskFormDialog } from '../task/task-form-dialog';

const statusColors: { [key in Status]: string } = {
  'Backlog': 'bg-amber-400/70',
  'Todo': 'bg-sky-400/70',
  'In Progress': 'bg-orange-400/70',
  'Done': 'bg-green-400/70',
  'Cancelled': 'bg-red-400/70',
};

export function CalendarPage() {
  const { tasks } = useTasks();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startingDay = getDay(monthStart); // Sunday = 0, Monday = 1...

  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const tasksByDay = useMemo(() => {
    const dailyTasks = new Map<string, Task[]>();
    tasks.forEach(task => {
      if (task.startDate && task.dueDate) {
        const interval = { start: new Date(task.startDate), end: new Date(task.dueDate) };
        const daysInTask = eachDayOfInterval(interval);
        daysInTask.forEach(day => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const existingTasks = dailyTasks.get(dayKey) || [];
          dailyTasks.set(dayKey, [...existingTasks, task]);
        });
      } else if (task.dueDate) { // For tasks without a start date
        const dayKey = format(new Date(task.dueDate), 'yyyy-MM-dd');
        const existingTasks = dailyTasks.get(dayKey) || [];
        dailyTasks.set(dayKey, [...existingTasks, task]);
      }
    });
    return dailyTasks;
  }, [tasks]);

  const handleTaskClick = (task: Task) => {
    setEditingTask(task);
  };
  
  const getTaskPosition = (day: Date, task: Task): number => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const tasksForDay = (tasksByDay.get(dayKey) || [])
      .filter(t => t.startDate && t.dueDate && isWithinInterval(day, { start: new Date(t.startDate), end: new Date(t.dueDate) }))
      .sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const pos = tasksForDay.findIndex(t => t.id === task.id);
    return pos >= 0 ? pos : 0;
  };


  return (
    <div className="flex flex-col">
      <PageHeader title="Calendario">
         <div className='flex items-center gap-2'>
            <Button variant="outline" size="icon" onClick={handlePrevMonth}><ChevronLeft/></Button>
            <h2 className='text-xl font-headline w-48 text-center'>{format(currentDate, 'MMMM yyyy', { locale: es })}</h2>
            <Button variant="outline" size="icon" onClick={handleNextMonth}><ChevronRight/></Button>
         </div>
      </PageHeader>
      <div className="flex-1 grid grid-cols-7 grid-rows-6 border-t border-l">
        {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
            <div key={day} className="p-2 border-b border-r text-center font-semibold text-sm bg-muted/50">{day}</div>
        ))}
        {Array.from({ length: startingDay === 0 ? 6 : startingDay - 1 }).map((_, i) => <div key={`empty-${i}`} className="border-b border-r bg-muted/20"></div>)}
        {daysInMonth.map((day) => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const dayTasks = tasks.filter(t => t.startDate && t.dueDate && isSameDay(new Date(t.startDate), day));
          return (
            <div key={day.toString()} className={cn("relative border-b border-r p-1.5 min-h-[80px] flex flex-col",
              isSameMonth(day, new Date()) ? 'bg-background' : 'bg-muted/30',
              isSameDay(day, new Date()) && 'bg-blue-50 dark:bg-blue-950'
            )}>
              <time dateTime={day.toString()} className={cn("font-medium", isSameDay(day, new Date()) && 'text-primary font-bold')}>
                {format(day, 'd')}
              </time>
              <div className="mt-1 flex-1 relative">
                {dayTasks.map((task) => (
                   <div 
                        key={task.id}
                        className={cn(
                            "absolute text-xs p-1 rounded-md text-black/80 font-medium truncate cursor-pointer hover:opacity-80",
                            statusColors[task.status]
                        )}
                        style={{
                            width: `calc(${differenceInDays(new Date(task.dueDate!), new Date(task.startDate!)) + 1} * 100% + ${differenceInDays(new Date(task.dueDate!), new Date(task.startDate!))} * 1px)`,
                            top: `${getTaskPosition(day, task) * 24}px`,
                            zIndex: getTaskPosition(day, task) + 1
                        }}
                        onClick={() => handleTaskClick(task)}
                        title={task.title}
                    >
                        {task.title}
                    </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
       {editingTask && (
        <TaskFormDialog
          open={!!editingTask}
          onOpenChange={(isOpen) => !isOpen && setEditingTask(null)}
          taskToEdit={editingTask}
          projectId={editingTask.projectId}
        />
      )}
    </div>
  );
}
