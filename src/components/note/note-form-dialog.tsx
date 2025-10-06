
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useDailyNotes } from '@/hooks/use-daily-notes';
import type { DailyNote } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2, Mic } from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { cn } from '@/lib/utils';

const noteFormSchema = z.object({
  note: z.string().min(1, 'La nota no puede estar vacía.'),
});

type NoteFormValues = z.infer<typeof noteFormSchema>;

interface NoteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  noteToEdit?: DailyNote;
}

export function NoteFormDialog({ open, onOpenChange, date, noteToEdit }: NoteFormDialogProps) {
  const { addNote, updateNote, deleteNote } = useDailyNotes();
  const { toast } = useToast();

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: {
      note: noteToEdit?.note || '',
    },
  });

  const handleTranscript = (transcript: string) => {
    form.setValue('note', (form.getValues('note') || '') + transcript);
  };
  const speech = useSpeechRecognition(handleTranscript);

  const onSubmit = async (data: NoteFormValues) => {
    try {
      if (noteToEdit) {
        await updateNote(noteToEdit.id, data.note);
        toast({ title: 'Nota Actualizada', description: 'Tu nota ha sido actualizada.' });
      } else {
        await addNote(data.note, date);
        toast({ title: 'Nota Añadida', description: `Tu nota para el ${format(date, 'PPP', { locale: es })} ha sido guardada.` });
      }
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error al guardar la nota', description: error.message });
    }
  };

  const handleDelete = async () => {
    if (!noteToEdit) return;
    try {
      await deleteNote(noteToEdit.id);
      toast({ title: 'Nota Eliminada', description: `Tu nota ha sido eliminada.` });
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error al eliminar la nota', description: error.message });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-headline">
            {noteToEdit ? 'Editar Nota' : 'Añadir Nota'} del {format(date, 'PPP', { locale: es })}
          </DialogTitle>
          <DialogDescription>
            {noteToEdit ? 'Edita tu nota.' : 'Añade una nueva nota para este día.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nota</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Textarea placeholder="Escribe tus pensamientos, recordatorios o planes aquí..." className="resize-y min-h-[150px] pr-10" {...field} />
                    </FormControl>
                    {speech.isSupported && (
                      <Button type="button" size="icon" variant="ghost" className="absolute right-1 top-2 h-8 w-8" onClick={speech.isListening ? speech.stopListening : speech.startListening}>
                        <Mic className={cn("size-4", speech.isListening && "text-red-500")} />
                      </Button>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="sm:justify-between gap-2">
              <div>
                {noteToEdit && (
                   <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="destructive" size="sm">
                        <Trash2 className="size-4 mr-2" />
                        Eliminar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro de que quieres eliminar esta nota?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. La nota se borrará permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Eliminar Nota
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <div className='flex gap-2'>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{noteToEdit ? 'Guardar Cambios' : 'Añadir Nota'}</Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
