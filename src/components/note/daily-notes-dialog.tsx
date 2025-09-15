
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
import type { DailyNote } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { NoteFormDialog } from './note-form-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';

interface DailyNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
}

export function DailyNotesDialog({ open, onOpenChange, date }: DailyNotesDialogProps) {
  const { getNotesByDate, deleteNote: deleteNoteById } = useDailyNotes();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState<DailyNote | undefined>(undefined);

  const notesForDate = getNotesByDate(date);

  const handleAddNew = () => {
    setNoteToEdit(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (note: DailyNote) => {
    setNoteToEdit(note);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNoteById(id);
      toast({ title: 'Nota Eliminada', description: 'La nota ha sido eliminada correctamente.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error al eliminar', description: error.message });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline">
              Notas del {format(date, 'PPPP', { locale: es })}
            </DialogTitle>
            <DialogDescription>
              Aquí puedes ver, añadir, editar o eliminar tus notas para este día.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] my-4 pr-4">
            <div className="space-y-3">
              {notesForDate.length > 0 ? (
                notesForDate.map((note) => (
                  <div key={note.id} className="flex items-start justify-between gap-4 p-3 rounded-md bg-muted/50">
                    <p className="text-sm whitespace-pre-wrap flex-1">{note.note}</p>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => handleEdit(note)}>
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
                            <AlertDialogAction onClick={() => handleDelete(note.id)} className="bg-destructive hover:bg-destructive/90">
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No hay notas para este día.
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className='sm:justify-between items-center'>
            <p className='text-sm text-muted-foreground'>{notesForDate.length} nota(s)</p>
            <div className='flex gap-2'>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
              <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2" />
                Añadir Nota
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {isFormOpen && (
        <NoteFormDialog
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          date={date}
          noteToEdit={noteToEdit}
        />
      )}
    </>
  );
}
