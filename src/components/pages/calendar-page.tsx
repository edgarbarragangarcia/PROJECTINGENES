
'use client';

import { PageHeader } from '../layout/page-header';
import { useTasks } from '@/hooks/use-tasks';
import { useState, useMemo, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, isSameMonth, subDays, addDays, isWithinInterval, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Task, Status, DailyNote } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, NotebookPen } from 'lucide-react';
import { TaskFormDialog } from '../task/task-form-dialog';
import { DailyNotesDialog } from '../note/daily-notes-dialog';
import { useDailyNotes } from '@/hooks/use-daily-notes';
import { useToast } from '@/hooks/use-toast';
import { useGoogleCalendar } from '@/hooks/use-google-calendar';

const GoogleCalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="size-4 mr-2" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M21 12.2c0-.67-.06-1.31-.17-1.94H12.2v3.67h5.02a4.34 4.34 0 0 1-1.88 2.86v2.39h3.07c1.79-1.65 2.82-4.08 2.82-6.98z"/>
    <path fill="#34A853" d="M12.2 22c2.7 0 4.96-0.89 6.62-2.41l-3.07-2.39c-.89.6-2.02.95-3.55.95-2.73 0-5.04-1.84-5.87-4.32H3.1v2.47C4.78 20.08 8.24 22 12.2 22z"/>
    <path fill="#FBBC05" d="M6.33 13.75a6.14 6.14 0 0 1 0-3.5V7.78H3.1c-1.18 2.36-1.18 5.08 0 7.44l3.23-2.47z"/>
    <path fill="#EA4335" d="M12.2 5.92c1.47 0 2.78.51 3.82 1.49l2.72-2.72C17.16 2.22 14.9 1 12.2 1 8.24 1 4.78 2.92 3.1 6.25l3.23 2.47c.83-2.48 3.14-4.32 5.87-4.32z"/>
  </svg>
);

const statusColors: { [key in Status]: string } = {
  'Backlog': 'bg-amber-500/80',
  'Todo': 'bg-sky-500/80',
  'In Progress': 'bg-orange-500/80',
  'Done': 'bg-green-500/80',
};

const chunkArray = <T,>(array: T[], size: number): T[][] => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export function CalendarPage() {
  const { tasks } = useTasks();
  const { getNotesByDate } = useDailyNotes();
  const { toast } = useToast();
  const { getCalendarEvents } = useGoogleCalendar();
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedDateForNotes, setSelectedDateForNotes] = useState<Date | null>(null);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  const { monthStart, monthEnd, weeks } = useMemo(() => {
    if (!currentDate) {
      return { daysInGrid: [], monthStart: null, monthEnd: null, weeks: [] };
    }
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    
    const dayOfWeek = monthStart.getDay();
    const diff = (dayOfWeek === 0) ? 6 : dayOfWeek - 1; 
    const startDate = subDays(monthStart, diff);
    const endDate = addDays(startDate, 41);
    
    const daysInGrid = eachDayOfInterval({ start: startDate, end: endDate });
    const weeks = chunkArray(daysInGrid, 7);
    return { daysInGrid, monthStart, monthEnd, weeks };
  }, [currentDate]);

  const handleNextMonth = () => currentDate && setCurrentDate(addMonths(currentDate, 1));
  const handlePrevMonth = () => currentDate && setCurrentDate(subMonths(currentDate, 1));
  
  const getTasksForDay = (day: Date) => {
    return tasks.filter(task => {
      const taskStart = task.startDate ? startOfDay(task.startDate) : null;
      const taskDue = task.dueDate ? startOfDay(task.dueDate) : null;
      const currentDay = startOfDay(day);

      if (taskStart && taskDue) {
        return isWithinInterval(currentDay, { start: taskStart, end: taskDue });
      }
      if (taskDue) {
        return isSameDay(currentDay, taskDue);
      }
      return false;
    }).sort((a,b) => (a.startDate?.getTime() || 0) - (b.startDate?.getTime() || 0));
  };
  
  const googleEventsByDay = useMemo(() => {
    const dailyEvents = new Map<string, any[]>();
    googleEvents.forEach(event => {
      const eventDate = event.start.date || event.start.dateTime;
      if (eventDate) {
        const dayKey = format(new Date(eventDate), 'yyyy-MM-dd');
        const existingEvents = dailyEvents.get(dayKey) || [];
        dailyEvents.set(dayKey, [...existingEvents, event]);
      }
    });
    return dailyEvents;
  }, [googleEvents]);

  const handleTaskClick = (task: Task) => {
    setEditingTask(task);
  };
  
  const handleGoogleConnect = async () => {
    if (!monthStart || !monthEnd) return;
    try {
      const events = await getCalendarEvents('primary', monthStart.toISOString(), monthEnd.toISOString());
      setGoogleEvents(events.items || []);
      toast({
        title: "Sincronización Exitosa",
        description: "Se han cargado los eventos de tu calendario principal de Google.",
      });
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: "Error de Sincronización",
        description: error.message || "No se pudieron obtener los eventos de Google Calendar.",
      });
    }
  };

  useEffect(() => {
    if (googleEvents.length > 0 && monthStart && monthEnd) {
      handleGoogleConnect();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  if (!currentDate || !monthStart) {
    return <div className="flex-1 flex items-center justify-center">Cargando calendario...</div>
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Calendario">
         <div className='flex items-center gap-2'>
             <Button variant="outline" size="sm" onClick={handleGoogleConnect}>
                <GoogleCalendarIcon />
                Sincronizar Calendarios
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
          {weeks.map((week, weekIndex) => week.map((day) => {
                 const dayTasks = getTasksForDay(day);
                 const dayNotes = getNotesByDate(day);
                 const dayGgEvents = googleEventsByDay.get(format(day, 'yyyy-MM-dd')) || [];
                 const maxTasksToShow = 1;

                 return (
                  <div 
                    key={day.toISOString()} 
                    className={cn("relative border-b border-r p-1.5 h-40 flex flex-col group", // increased height
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
                     <div className="mt-1 flex-1 space-y-0.5 overflow-hidden">
                       {dayTasks.slice(0, maxTasksToShow).map(task => (
                         <div 
                          key={task.id}
                          className={cn("text-xs p-1 rounded-sm text-white font-medium truncate cursor-pointer", statusColors[task.status])}
                          title={task.title}
                          onClick={() => handleTaskClick(task)}
                         >
                           {task.title}
                         </div>
                       ))}
                       {dayTasks.length > maxTasksToShow && (
                         <div className='text-xs text-muted-foreground font-medium pt-1'>
                            y {dayTasks.length - maxTasksToShow} más tareas...
                          </div>
                       )}
                       {dayNotes.slice(0, 1).map(note => (
                         <div key={note.id} className='text-xs p-1 bg-yellow-100 dark:bg-yellow-900/50 rounded-sm line-clamp-1' title={note.note}>
                            - {note.note}
                          </div>
                       ))}
                       {dayNotes.length > 1 && (
                          <div className='text-xs text-muted-foreground font-medium'>
                            y {dayNotes.length - 1} más notas...
                          </div>
                       )}
                       {dayGgEvents.map((event) => (
                        <div 
                          key={event.id}
                          className="text-xs p-1 rounded-sm bg-gray-200 dark:bg-gray-700 font-medium truncate"
                          title={event.summary}
                        >
                          {event.summary}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }))}
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
