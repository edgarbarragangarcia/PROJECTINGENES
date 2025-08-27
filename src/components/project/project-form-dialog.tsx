
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
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { Mic, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Progress } from '../ui/progress';


const projectFormSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  description: z.string().optional(),
  status: z.enum(projectStatuses),
  image_url: z.string().optional(),
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(projectToEdit?.image_url || null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);


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
          image_url: '',
        },
  });
  
  useEffect(() => {
    if (projectToEdit) {
      setImagePreview(projectToEdit.image_url || null);
      form.reset({
        name: projectToEdit.name,
        description: projectToEdit.description || '',
        status: projectToEdit.status,
        image_url: projectToEdit.image_url || '',
      });
    } else {
        form.reset({
          name: '',
          description: '',
          status: 'En Progreso',
          image_url: '',
        });
    }
  }, [projectToEdit, form]);

  const handleTranscript = (fieldName: 'name' | 'description') => (transcript: string) => {
    form.setValue(fieldName, (form.getValues(fieldName) || '') + transcript);
  };
  
  const nameSpeech = useSpeechRecognition(handleTranscript('name'));
  const descriptionSpeech = useSpeechRecognition(handleTranscript('description'));

  const onSubmit = async (data: ProjectFormValues) => {
    try {
        const submissionData: any = { ...data };

        if (imageFile) {
            submissionData.imageFile = imageFile;
            submissionData.onUploadProgress = setUploadProgress;
        } else if (imagePreview === null && projectToEdit?.image_url) {
            submissionData.image_url = null;
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
    } finally {
      setUploadProgress(null);
      setImageFile(null);
      setImagePreview(null);
    }
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
      setImageFile(null);
      setImagePreview(null);
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
                  <div className="relative">
                    <FormControl>
                      <Input placeholder="p. ej., QuantumLeap CRM" {...field} className="pr-10"/>
                    </FormControl>
                    {nameSpeech.isSupported && (
                      <Button type="button" size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={nameSpeech.isListening ? nameSpeech.stopListening : nameSpeech.startListening}>
                          <Mic className={cn("size-4", nameSpeech.isListening && "text-red-500")} />
                      </Button>
                    )}
                  </div>
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
                  <div className="relative">
                    <FormControl>
                      <Textarea placeholder="Añade una descripción detallada del proyecto..." className="resize-none pr-10" {...field} />
                    </FormControl>
                     {descriptionSpeech.isSupported && (
                      <Button type="button" size="icon" variant="ghost" className="absolute right-1 top-2 h-8 w-8" onClick={descriptionSpeech.isListening ? descriptionSpeech.stopListening : descriptionSpeech.startListening}>
                          <Mic className={cn("size-4", descriptionSpeech.isListening && "text-red-500")} />
                      </Button>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-2">
                <FormLabel>Imagen del Proyecto</FormLabel>
                 {imagePreview ? (
                    <div className="relative group">
                        <Image src={imagePreview} alt="Vista previa del proyecto" width={450} height={250} className="rounded-md object-cover"/>
                        <Button type="button" size="icon" variant="destructive" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleRemoveImage}>
                            <X className="size-4" />
                        </Button>
                    </div>
                ) : (
                    <div className="relative">
                        <FormControl>
                            <Input id="project-image" type="file" className="w-full h-10 pl-12" onChange={handleImageChange} accept="image/*"/>
                        </FormControl>
                        <Upload className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                    </div>
                )}
                 {uploadProgress !== null && (
                    <Progress value={uploadProgress} className="w-full h-2 mt-2" />
                )}
            </div>

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
              <Button type="submit" disabled={uploadProgress !== null && uploadProgress < 100}>
                {uploadProgress !== null && uploadProgress < 100 ? `Subiendo... ${uploadProgress}%` : projectToEdit ? 'Guardar Cambios' : 'Crear Proyecto'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
