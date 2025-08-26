

'use client';

import { PageHeader } from '../layout/page-header';
import { useTasks } from '@/hooks/use-tasks';
import { useState, useMemo, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, isSameMonth, getDay, isWithinInterval, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Task, Status, DailyNote } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, NotebookPen, Plus } from 'lucide-react';
import { TaskFormDialog } from '../task/task-form-dialog';
import { DailyNotesDialog } from '../note/daily-notes-dialog';
import { useDailyNotes } from '@/hooks/use-daily-notes';
import { useToast } from '@/hooks/use-toast';

const GoogleCalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="size-4 mr-2" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M21 12.2c0-.67-.06-1.31-.17-1.94H12.2v3.67h5.02a4.34 4.34 0 0 1-1.88 2.86v2.39h3.07c1.79-1.65 2.82-4.08 2.82-6.98z"/>
    <path fill="#34A853" d="M12.2 22c2.7 0 4.96-0.89 6.62-2.41l-3.07-2.39c-.89.6-2.02.95-3.55.95-2.73 0-5.04-1.84-5.87-4.32H3.1v2.47C4.78 20.08 8.24 22 12.2 22z"/>
    <path fill="#FBBC05" d="M6.33 13.75a6.14 6.14 0 0 1 0-3.5V7.78H3.1c-1.18 2.36-1.18 5.08 0 7.44l3.23-2.47z"/>
    <path fill="#EA4335" d="M12.2 5.92c1.47 0 2.78.51 3.82 1.49l2.72-2.72C17.16 2.22 14.9 1 12.2 1 8.24 1 4.78 2.92 3.1 6.25l3.23 2.47c.83-2.48 3.14-4.32 5.87-4.32z"/>
  </svg>
);


const statusColors: { [key in Status]: string } = {
  'Backlog': 'bg-amber-400/70',
  'Todo': 'bg-sky-400/70',
  'In Progress': 'bg-orange-400/70',
  'Done': 'bg-green-400/70',
  'Cancelled': 'bg-red-400/70',
};

export function CalendarPage() {
  const { tasks } = useTasks();
  const { getNotesByDate } = useDailyNotes();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedDateForNotes, setSelectedDateForNotes] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  const { daysInGrid, monthStart } = useMemo(() => {
    if (!currentDate) {
      return { daysInGrid: [], monthStart: null };
    }
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    
    // Ajustar para que la semana empiece en Lunes
    const dayOfWeek = monthStart.getDay();
    const diff = (dayOfWeek === 0) ? 6 : dayOfWeek - 1; // Lunes = 0, Domingo = 6
    const startDate = subDays(monthStart, diff);

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
  
  const handleGoogleConnect = () => {
    toast({
      title: "Próximamente",
      description: "La integración con Google Calendar está en desarrollo.",
    });
  };

  if (!currentDate || !monthStart) {
    return <div className="flex-1 flex items-center justify-center">Cargando calendario...</div>
  }


  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Calendario">
         <div className='flex items-center gap-2'>
             <Button variant="outline" size="sm" onClick={handleGoogleConnect}>
                <GoogleCalendarIcon />
                Conectar con Google
             </Button>
            <Button variant="outline" size="icon" onClick={handlePrevMonth}><ChevronLeft/></Button>
            <h2 className='text-xl font-headline w-48 text-center capitalize'>{format(currentDate, 'MMMM yyyy', { locale: es })}</h2>
            <Button variant="outline" size="icon" onClick={handleNextMonth}><ChevronRight/></Button>
         </div>
      </PageHeader>
      <div className="flex-1 overflow-auto p-4 md:px-8 lg:px-12">
        <div className="grid grid-cols-7 border-t border-l max-w-7xl mx-auto">
          {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
              <div key={day} className="p-2 border-b border-r text-center font-semibold text-sm bg-muted/50">{day}</div>
          ))}
          {daysInGrid.map((day) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayTasks = tasks.filter(t => t.startDate && t.dueDate && isSameDay(new Date(t.startDate), day));
            const dayNotes = getNotesByDate(day);
            return (
              <div 
                key={day.toISOString()} 
                className={cn("relative border-b border-r p-1.5 min-h-[100px] flex flex-col group",
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
                  <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setSelectedDateForNotes(day)}>
                    <NotebookPen className="size-4" />
                  </Button>
                </div>
                <div className="mt-1 flex-1 relative space-y-1 overflow-hidden">
                   {dayNotes.slice(0, 2).map(note => (
                     <div key={note.id} className='text-xs p-1 bg-yellow-100 dark:bg-yellow-900/50 rounded-sm line-clamp-1' title={note.note}>
                        - {note.note}
                      </div>
                   ))}
                   {dayNotes.length > 2 && (
                      <div className='text-xs text-muted-foreground font-medium'>
                        y {dayNotes.length - 2} más...
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
                              top: `${getTaskPosition(day, task) * 24 + (dayNotes.length * 20)}px`, // Offset by notes height
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
      {selectedDateForNotes && (
        <DailyNotesDialog
          open={!!selectedDateForNotes}
          onOpenChange={(isOpen) => !isOpen && setSelectedDateForNotes(null)}
          date={selectedDateForNotes}
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
