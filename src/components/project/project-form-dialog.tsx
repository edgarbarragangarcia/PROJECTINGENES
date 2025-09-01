
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
import { type ProjectWithProgress, projectStatuses, type UserStory } from '@/lib/types';
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
import { Mic, Upload, X, PlusCircle, Trash2, Library, ListChecks, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Progress } from '../ui/progress';
import { Label } from '../ui/label';
import { useUserStories } from '@/hooks/use-user-stories';
import { Separator } from '../ui/separator';

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

const userStoryFormSchema = z.object({
    name: z.string().min(1, 'El nombre es requerido.'),
    stakeholders: z.string().optional(),
    i_want_to: z.string().optional(),
    so_that: z.string().optional(),
});
type UserStoryFormValues = z.infer<typeof userStoryFormSchema>;

export function ProjectFormDialog({ open, onOpenChange, projectToEdit }: ProjectFormDialogProps) {
  const { addProject, updateProject } = useProjects();
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(projectToEdit?.image_url || null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const {
      userStories,
      addUserStory,
      updateUserStory,
      deleteUserStory,
  } = useUserStories();
  const [showUserStoryForm, setShowUserStoryForm] = useState(false);
  const [editingStory, setEditingStory] = useState<UserStory | null>(null);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<string[]>([]);
  const [currentCriterion, setCurrentCriterion] = useState('');

  const projectUserStories = userStories.filter(us => us.project_id === projectToEdit?.id);

  const projectForm = useForm<ProjectFormValues>({
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
  
  const userStoryForm = useForm<UserStoryFormValues>();

  useEffect(() => {
    if (projectToEdit) {
      setImagePreview(projectToEdit.image_url || null);
      projectForm.reset({
        name: projectToEdit.name,
        description: projectToEdit.description || '',
        status: projectToEdit.status,
        image_url: projectToEdit.image_url || '',
      });
    } else {
        projectForm.reset({
          name: '',
          description: '',
          status: 'En Progreso',
          image_url: '',
        });
    }
  }, [projectToEdit, projectForm]);

  const handleTranscript = (fieldName: 'name' | 'description') => (transcript: string) => {
    projectForm.setValue(fieldName, (projectForm.getValues(fieldName) || '') + transcript);
  };
  
  const nameSpeech = useSpeechRecognition(handleTranscript('name'));
  const descriptionSpeech = useSpeechRecognition(handleTranscript('description'));

  const onProjectSubmit = async (data: ProjectFormValues) => {
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
        projectForm.reset();
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

  const handleAddCriterion = () => {
    if (currentCriterion.trim()) {
      setAcceptanceCriteria([...acceptanceCriteria, currentCriterion.trim()]);
      setCurrentCriterion('');
    }
  };

  const handleRemoveCriterion = (index: number) => {
    setAcceptanceCriteria(acceptanceCriteria.filter((_, i) => i !== index));
  };

  const handleOpenStoryForm = (story: UserStory | null) => {
      setEditingStory(story);
      if (story) {
          userStoryForm.reset({
              name: story.name,
              stakeholders: story.stakeholders,
              i_want_to: story.i_want_to,
              so_that: story.so_that,
          });
          setAcceptanceCriteria(story.acceptance_criteria || []);
      } else {
          userStoryForm.reset({ name: '', stakeholders: '', i_want_to: '', so_that: ''});
          setAcceptanceCriteria([]);
      }
      setShowUserStoryForm(true);
  }

  const handleUserStorySubmit = async (data: UserStoryFormValues) => {
      if (!projectToEdit) return;

      const storyData = {
          ...data,
          acceptance_criteria: acceptanceCriteria,
          project_id: projectToEdit.id,
      };

      try {
          if (editingStory) {
              await updateUserStory(editingStory.id, storyData);
              toast({ title: 'Historia de Usuario Actualizada' });
          } else {
              await addUserStory(storyData);
              toast({ title: 'Historia de Usuario Añadida' });
          }
          setShowUserStoryForm(false);
          setEditingStory(null);
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Error al guardar', description: error.message });
      }
  };

  const handleDeleteStory = async (storyId: string) => {
      try {
          await deleteUserStory(storyId);
          toast({ title: 'Historia de Usuario Eliminada' });
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Error al eliminar', description: error.message });
      }
  }
  
  const isUploading = (uploadProgress !== null && uploadProgress < 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">{projectToEdit ? 'Editar Proyecto' : 'Añadir Nuevo Proyecto'}</DialogTitle>
          <DialogDescription>
            {projectToEdit ? "Actualiza los detalles de tu proyecto." : "Rellena los detalles para tu nuevo proyecto."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2 -mr-4 pl-1">
            <Form {...projectForm}>
            <form onSubmit={projectForm.handleSubmit(onProjectSubmit)} id="project-form" className="space-y-4">
                <FormField
                control={projectForm.control}
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
                control={projectForm.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <div className="relative">
                        <FormControl>
                        <Textarea placeholder="Añade una descripción detallada del proyecto..." className="resize-y min-h-[100px] pr-10" {...field} />
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
                            <Image src={imagePreview} alt="Vista previa del proyecto" width={450} height={250} className="rounded-md object-cover w-full max-h-48"/>
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
                control={projectForm.control}
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
            </form>
            </Form>
            
            {projectToEdit && (
                <div className="space-y-4 pt-4">
                    <Separator />
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold font-headline flex items-center gap-2"><Library /> Historias de Usuario</h3>
                        {!showUserStoryForm && <Button variant="outline" size="sm" onClick={() => handleOpenStoryForm(null)}><PlusCircle className="mr-2"/> Añadir</Button>}
                    </div>
                    
                    {!showUserStoryForm ? (
                       <div className="space-y-2">
                           {projectUserStories.length > 0 ? projectUserStories.map(story => (
                               <div key={story.id} className="flex items-center justify-between p-2 rounded-md border bg-muted/30">
                                   <p className="font-medium text-sm">{story.name}</p>
                                   <div className="flex items-center gap-1">
                                       <Button variant="ghost" size="icon" className="size-8" onClick={() => handleOpenStoryForm(story)}><Edit className="size-4"/></Button>
                                       <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => handleDeleteStory(story.id)}><Trash2 className="size-4"/></Button>
                                   </div>
                               </div>
                           )) : <p className="text-sm text-muted-foreground text-center py-4">No hay historias de usuario para este proyecto.</p>}
                       </div>
                    ) : (
                        <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
                            <h4 className="font-semibold text-base">{editingStory ? 'Editando' : 'Nueva'} Historia de Usuario</h4>
                             <Form {...userStoryForm}>
                                <form onSubmit={userStoryForm.handleSubmit(handleUserStorySubmit)} id="user-story-form" className="space-y-4">
                                    <FormField
                                        control={userStoryForm.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Nombre de la Historia</FormLabel>
                                            <FormControl>
                                                <Input placeholder="p.ej., Gestionar perfil de usuario" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={userStoryForm.control}
                                        name="stakeholders"
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Stakeholders</FormLabel>
                                            <FormControl>
                                                <Input placeholder="p.ej., Cliente, Equipo de Soporte" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={userStoryForm.control}
                                        name="i_want_to"
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Como usuario, quiero...</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="p.ej., editar mi información personal" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={userStoryForm.control}
                                        name="so_that"
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>...para...</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="p.ej., mantener mis datos actualizados" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="space-y-2">
                                        <Label>Criterios de Aceptación</Label>
                                        <div className="space-y-2">
                                            {acceptanceCriteria.map((criterion, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <ListChecks className="size-4 text-primary flex-shrink-0"/>
                                                <p className="text-sm flex-1">{criterion}</p>
                                                <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => handleRemoveCriterion(index)}>
                                                <Trash2 className="size-4 text-destructive" />
                                                </Button>
                                            </div>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input 
                                            placeholder="Añadir nuevo criterio..."
                                            value={currentCriterion}
                                            onChange={(e) => setCurrentCriterion(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddCriterion();
                                                }
                                            }}
                                            />
                                            <Button type="button" size="sm" onClick={handleAddCriterion}><PlusCircle/></Button>
                                        </div>
                                    </div>
                                </form>
                            </Form>
                             <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setShowUserStoryForm(false)}>Cancelar</Button>
                                <Button type="submit" form="user-story-form">Guardar Historia</Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>


        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="project-form" disabled={isUploading}>
            {isUploading ? `Subiendo...` : projectToEdit ? 'Guardar Cambios' : 'Crear Proyecto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
