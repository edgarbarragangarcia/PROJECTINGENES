
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDailyNotes } from '@/hooks/use-daily-notes';
import type { DailyNote, Task } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle, Edit, Trash2, ListChecks, StickyNote } from 'lucide-react';
import { NoteFormDialog } from './note-form-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { PriorityIcon } from '../task/priority-icon';
import { Separator } from '../ui/separator';

interface DailySummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  tasks: Task[];
  notes: DailyNote[];
  onEditTask: (task: Task) => void;
}

export function DailySummaryDialog({ open, onOpenChange, date, tasks, notes, onEditTask }: DailySummaryDialogProps) {
  const { deleteNote } = useDailyNotes();
  const { toast } = useToast();
  const [isNoteFormOpen, setIsNoteFormOpen] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState<DailyNote | undefined>(undefined);

  const handleAddNewNote = () => {
    setNoteToEdit(undefined);
    setIsNoteFormOpen(true);
  };

  const handleEditNote = (note: DailyNote) => {
    setNoteToEdit(note);
    setIsNoteFormOpen(true);
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await deleteNote(id);
      toast({ title: 'Nota Eliminada', description: 'La nota ha sido eliminada correctamente.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error al eliminar', description: error.message });
    }
  };
  
  const getPriorityBadgeVariant = (priority: Task['priority']) => {
    switch (priority) {
      case 'High': return 'destructive';
      case 'Medium': return 'secondary';
      case 'Low': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline">
              Resumen del {format(date, 'PPPP', { locale: es })}
            </DialogTitle>
            <DialogDescription>
              Actividades y notas para este día.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] my-4 pr-4">
            <div className="space-y-6">
                <div>
                    <h3 className='font-semibold mb-3 flex items-center gap-2'><ListChecks className='size-5 text-primary'/> Tareas del Día</h3>
                     <div className="space-y-2">
                        {tasks.length > 0 ? (
                            tasks.map((task) => (
                            <div key={task.id} className="flex items-start justify-between gap-4 p-3 rounded-md bg-muted/50 cursor-pointer hover:bg-muted" onClick={() => onEditTask(task)}>
                                <div>
                                    <p className="font-medium">{task.title}</p>
                                    <div className='flex items-center gap-2 mt-1'>
                                        <Badge variant="outline">{task.status}</Badge>
                                        <Badge variant={getPriorityBadgeVariant(task.priority)} className="flex items-center gap-1.5">
                                            <PriorityIcon priority={task.priority} className="size-3" />
                                            {task.priority === 'High' ? 'Alta' : task.priority === 'Medium' ? 'Media' : 'Baja'}
                                        </Badge>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="size-8 flex-shrink-0">
                                    <Edit className="size-4" />
                                </Button>
                            </div>
                            ))
                        ) : (
                            <div className="text-center text-muted-foreground py-4 text-sm">
                                No hay tareas para este día.
                            </div>
                        )}
                    </div>
                </div>
                
                <Separator />

                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className='font-semibold flex items-center gap-2'><StickyNote className='size-5 text-primary'/> Notas</h3>
                        <Button variant="outline" size="sm" onClick={handleAddNewNote}><PlusCircle className='mr-2'/> Nueva Nota</Button>
                    </div>
                     <div className="space-y-2">
                        {notes.length > 0 ? (
                            notes.map((note) => (
                            <div key={note.id} className="flex items-start justify-between gap-4 p-3 rounded-md bg-muted/50">
                                <p className="text-sm whitespace-pre-wrap flex-1">{note.note}</p>
                                <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="size-8" onClick={() => handleEditNote(note)}>
                                    <Edit className="size-4" />
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive">
                                        <Trash2 className="size-4" />
                                    </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                        Esta acción no se puede deshacer. La nota se eliminará permanentemente.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteNote(note.id)} className="bg-destructive hover:bg-destructive/90">
                                        Eliminar
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                </div>
                            </div>
                            ))
                        ) : (
                            <div className="text-center text-muted-foreground py-4 text-sm">
                                No hay notas para este día.
                            </div>
                        )}
                    </div>
                </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {isNoteFormOpen && (
        <NoteFormDialog
          open={isNoteFormOpen}
          onOpenChange={setIsNoteFormOpen}
          date={date}
          noteToEdit={noteToEdit}
        />
      )}
    </>
  );
}
