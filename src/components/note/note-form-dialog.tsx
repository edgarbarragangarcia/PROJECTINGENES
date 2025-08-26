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
import type { DailyNote } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const noteFormSchema = z.object({
  note: z.string().min(1, 'La nota no puede estar vacía.'),
});

type NoteFormValues = z.infer<typeof noteFormSchema>;

interface NoteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  note?: DailyNote;
}

export function NoteFormDialog({ open, onOpenChange, date, note }: NoteFormDialogProps) {
  const { upsertNote } = useDailyNotes();
  const { toast } = useToast();

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: {
      note: note?.note || '',
    },
  });

  const onSubmit = async (data: NoteFormValues) => {
    try {
      await upsertNote(data.note, date);
      toast({ title: 'Nota Guardada', description: `Tu nota para el ${format(date, 'PPP', { locale: es })} ha sido guardada.` });
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error al guardar la nota', description: error.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-headline">
            Nota para el {format(date, 'PPPP', { locale: es })}
          </DialogTitle>
          <DialogDescription>
            Añade o edita tu nota para este día.
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
                  <FormControl>
                    <Textarea placeholder="Escribe tus pensamientos, recordatorios o planes aquí..." className="resize-y min-h-[150px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar Nota</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
