
'use client';

import { PageHeader } from '../layout/page-header';
import { useTasks } from '@/hooks/use-tasks';
import { useState, useMemo, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, isSameMonth, getDay, isWithinInterval, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Task, Status, DailyNote } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, NotebookPen } from 'lucide-react';
import { TaskFormDialog } from '../task/task-form-dialog';
import { NoteFormDialog } from '../note/note-form-dialog';
import { useDailyNotes } from '@/hooks/use-daily-notes';

const statusColors: { [key in Status]: string } = {
  'Backlog': 'bg-amber-400/70',
  'Todo': 'bg-sky-400/70',
  'In Progress': 'bg-orange-400/70',
  'Done': 'bg-green-400/70',
  'Cancelled': 'bg-red-400/70',
};

export function CalendarPage() {
  const { tasks } = useTasks();
  const { getNoteByDate } = useDailyNotes();
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingNoteForDate, setEditingNoteForDate] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  const { daysInGrid, monthStart } = useMemo(() => {
    if (!currentDate) {
      return { daysInGrid: [], monthStart: null };
    }
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = monthStart.getDay() === 0 ? subDays(monthStart, 6) : subDays(monthStart, monthStart.getDay() - 1);
    const endDate = addDays(startDate, 41);
    const daysInGrid = eachDayOfInterval({ start: startDate, end: endDate });
    return { daysInGrid, monthStart };
  }, [currentDate]);


  const handleNextMonth = () => currentDate && setCurrentDate(addMonths(currentDate, 1));
  const handlePrevMonth = () => currentDate && setCurrentDate(subMonths(currentDate, 1));

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

  if (!currentDate || !monthStart) {
    return <div className="flex-1 flex items-center justify-center">Cargando calendario...</div>
  }


  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Calendario">
         <div className='flex items-center gap-2'>
            <Button variant="outline" size="icon" onClick={handlePrevMonth}><ChevronLeft/></Button>
            <h2 className='text-xl font-headline w-48 text-center'>{format(currentDate, 'MMMM yyyy', { locale: es })}</h2>
            <Button variant="outline" size="icon" onClick={handleNextMonth}><ChevronRight/></Button>
         </div>
      </PageHeader>
      <div className="flex-1 overflow-auto p-4 md:px-8 lg:px-12">
        <div className="grid grid-cols-7 grid-rows-6 border-t border-l max-w-7xl mx-auto">
          {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
              <div key={day} className="p-2 border-b border-r text-center font-semibold text-sm bg-muted/50">{day}</div>
          ))}
          {daysInGrid.map((day) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayTasks = tasks.filter(t => t.startDate && t.dueDate && isSameDay(new Date(t.startDate), day));
            const note = getNoteByDate(day);
            return (
              <div 
                key={day.toISOString()} 
                className={cn("relative border-b border-r p-1.5 min-h-[80px] flex flex-col group",
                !isSameMonth(day, currentDate) && 'bg-muted/30',
                isSameDay(day, new Date()) && 'bg-blue-50 dark:bg-blue-950'
              )}>
                <div className='flex justify-between items-center'>
                  <time dateTime={day.toISOString()} className={cn(
                    "font-medium text-sm", 
                    isSameDay(day, new Date()) && 'text-primary font-bold',
                    !isSameMonth(day, currentDate) && 'text-muted-foreground'
                  )}>
                    {format(day, 'd')}
                  </time>
                  <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setEditingNoteForDate(day)}>
                    <NotebookPen className="size-4" />
                  </Button>
                </div>
                <div className="mt-1 flex-1 relative">
                  {note && (
                    <div className='text-xs p-1 bg-yellow-100 dark:bg-yellow-900/50 rounded-sm mb-1 line-clamp-2' title={note.note}>
                      {note.note}
                    </div>
                  )}
                  {dayTasks.map((task) => (
                    <div 
                          key={task.id}
                          className={cn(
                              "absolute text-xs p-1 rounded-md text-black/80 font-medium truncate cursor-pointer hover:opacity-80",
                              statusColors[task.status]
                          )}
                          style={{
                              width: `calc(${differenceInDays(new Date(task.dueDate!), new Date(task.startDate!)) + 1} * 100% + ${differenceInDays(new Date(task.dueDate!), new Date(task.startDate!))}px)`,
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
      </div>
       {editingTask && (
        <TaskFormDialog
          open={!!editingTask}
          onOpenChange={(isOpen) => !isOpen && setEditingTask(null)}
          taskToEdit={editingTask}
          projectId={editingTask.projectId}
        />
      )}
      {editingNoteForDate && (
        <NoteFormDialog
          open={!!editingNoteForDate}
          onOpenChange={(isOpen) => !isOpen && setEditingNoteForDate(null)}
          date={editingNoteForDate}
          note={getNoteByDate(editingNoteForDate)}
        />
      )}
    </div>
  );
}

function subDays(date: Date, amount: number): Date {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() - amount);
  return newDate;
}

function addDays(date: Date, amount: number): Date {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + amount);
    return newDate;
}
