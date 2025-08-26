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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { type ProjectWithProgress, projectStatuses } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useProjects } from '@/hooks/use-projects';


const projectFormSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  description: z.string().optional(),
  status: z.enum(projectStatuses),
  image_url: z.string().url("Debe ser una URL válida.").optional().or(z.literal('')),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectToEdit?: ProjectWithProgress;
}

export function ProjectFormDialog({ open, onOpenChange, projectToEdit }: ProjectFormDialogProps) {
  const { addProject, updateProject } = useProjects();
  const { toast } = useToast();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: projectToEdit
      ? { 
        name: projectToEdit.name,
        description: projectToEdit.description || '',
        status: projectToEdit.status,
        image_url: projectToEdit.image_url || '',
       }
      : {
          name: '',
          description: '',
          status: 'En Progreso',
          image_url: `https://picsum.photos/600/400?random=${Date.now()}`
        },
  });

  const onSubmit = async (data: ProjectFormValues) => {
    try {
        const submissionData = {
            ...data,
            description: data.description || '',
            image_url: data.image_url || `https://picsum.photos/600/400?random=${Date.now()}`
        }

        if (projectToEdit) {
            await updateProject(projectToEdit.id, submissionData);
            toast({ title: 'Proyecto Actualizado', description: `"${data.name}" ha sido actualizado.`});
        } else {
            await addProject(submissionData);
            toast({ title: 'Proyecto Creado', description: `"${data.name}" ha sido creado.`});
        }
        form.reset();
        onOpenChange(false);
    } catch(error: any) {
        toast({ variant: 'destructive', title: 'Error al guardar el proyecto', description: error.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-headline">{projectToEdit ? 'Editar Proyecto' : 'Añadir Nuevo Proyecto'}</DialogTitle>
          <DialogDescription>
            {projectToEdit ? "Actualiza los detalles de tu proyecto." : "Rellena los detalles para tu nuevo proyecto."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Proyecto</FormLabel>
                  <FormControl>
                    <Input placeholder="p. ej., QuantumLeap CRM" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Añade una descripción detallada del proyecto..." className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL de la Imagen</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/image.png" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projectStatuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">{projectToEdit ? 'Guardar Cambios' : 'Crear Proyecto'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
