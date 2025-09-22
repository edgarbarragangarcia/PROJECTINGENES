
'use client';

import { useEffect, useState } from 'react';
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
import { useTasks } from '@/hooks/use-tasks';
import { type Task, priorities, statuses } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Mic, Plus, Trash2, Upload, X, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { es } from 'date-fns/locale';
import { Label } from '@/components/ui/label';
import { useProjects } from '@/hooks/use-projects';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Progress } from '../ui/progress';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '../ui/command';
import { Badge } from '../ui/badge';

const translatedPriorities = {
  'Low': 'Baja',
  'Medium': 'Media',
  'High': 'Alta',
} as const;

const subtaskSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  is_completed: z.boolean(),
});

const taskFormSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres.'),
  description: z.string().optional(),
  status: z.enum(statuses),
  priority: z.enum(priorities),
  startDate: z.date().optional(),
  dueDate: z.date().optional(),
  project_id: z.string({ required_error: 'Debes seleccionar un proyecto.'}).uuid("Debes seleccionar un proyecto válido."),
  assignees: z.array(z.string()).optional(),
  subtasks: z.array(subtaskSchema).optional(),
  image_url: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskToEdit?: Task;
  projectId?: string;
}

const predefinedTitles = [
  'Desarrollo de historia de usuario',
  'Desarrollo de prototipo',
  'Test de prototipo',
  'Ajustes al prototipo',
  'Documentación',
  'Arquitectura del agente',
] as const;

export function TaskFormDialog({ 
  open, 
  onOpenChange, 
  taskToEdit, 
  projectId 
}: TaskFormDialogProps) {
  const { addTask, updateTask, allUsers } = useTasks();
  const { projects } = useProjects();
  const { toast } = useToast();
  const [subtaskInput, setSubtaskInput] = useState('');
  const [currentSubtasks, setCurrentSubtasks] = useState<{id?: string, title: string, is_completed: boolean}[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  
  const isProjectContext = !!projectId;

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'Todo',
      priority: 'Medium',
      startDate: undefined,
      dueDate: undefined,
      project_id: projectId || '',
      assignees: [],
      subtasks: [],
      image_url: '',
    },
  });
  
  useEffect(() => {
    if (taskToEdit) {
      setCurrentSubtasks(taskToEdit.subtasks || []);
      setImagePreview(taskToEdit.image_url || null);
      form.reset({
        title: taskToEdit.title,
        description: taskToEdit.description || '',
        status: taskToEdit.status,
        priority: taskToEdit.priority,
        startDate: taskToEdit.startDate ? new Date(taskToEdit.startDate) : undefined,
        dueDate: taskToEdit.dueDate ? new Date(taskToEdit.dueDate) : undefined,
        project_id: taskToEdit.project_id,
        assignees: taskToEdit.assignees || [],
        subtasks: taskToEdit.subtasks || [],
        image_url: taskToEdit.image_url || '',
      });
    } else {
       form.reset({
          title: '',
          description: '',
          status: 'Todo',
          priority: 'Medium',
          startDate: undefined,
          dueDate: undefined,
          project_id: projectId || '',
          assignees: [],
          subtasks: [],
          image_url: '',
        });
        setCurrentSubtasks([]);
        setImagePreview(null);
    }
  }, [taskToEdit, projectId, form]);

  const handleTranscript = (fieldName: 'title' | 'description') => (transcript: string) => {
    form.setValue(fieldName, (form.getValues(fieldName) || '') + transcript);
  };
  
  const titleSpeech = useSpeechRecognition(handleTranscript('title'));
  const descriptionSpeech = useSpeechRecognition(handleTranscript('description'));

  useEffect(() => {
    if (projectId && !form.getValues('project_id')) {
      form.setValue('project_id', projectId);
    }
  }, [projectId, form]);

  // When the dialog is open on mobile, prevent background scrolling and
  // try to prevent pinch-zoom by updating the viewport meta tag. We also
  // block touchmove/wheel events that originate outside the dialog content
  // so the background doesn't move while the modal is open.
  useEffect(() => {
    const doc = (globalThis as any).document;
    if (!doc) return;

    let prevBodyOverflow = '';
    let createdViewport = false;
    let prevViewportContent: string | null = null;

    const contentEl = () => doc.getElementById('task-form-dialog-content');

    const enableBlocking = () => {
      prevBodyOverflow = doc.body.style.overflow || '';
      doc.body.style.overflow = 'hidden';

      const viewportMeta = doc.querySelector('meta[name="viewport"]');
      if (viewportMeta) {
        prevViewportContent = viewportMeta.getAttribute('content');
        try {
          viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        } catch (e) {
          // ignore
        }
      } else {
        const m = doc.createElement('meta');
        m.name = 'viewport';
        m.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        doc.head.appendChild(m);
        createdViewport = true;
      }

      // We avoid adding global touch/wheel/gesture listeners because those
      // interfered with popovers (calendar) which render outside the dialog
      // (portal). Rely on body overflow:hidden and touch-action on the dialog
      // content to prevent horizontal panning.

      return () => {
        doc.body.style.overflow = prevBodyOverflow;
        if (createdViewport) {
          const v = doc.querySelector('meta[name="viewport"]');
          if (v && v.parentNode) v.parentNode.removeChild(v);
        } else if (prevViewportContent !== null) {
          const v = doc.querySelector('meta[name="viewport"]');
          if (v) v.setAttribute('content', prevViewportContent);
        }
      };
    };

    let cleanup: (() => void) | undefined;
    if (open) {
      cleanup = enableBlocking();
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, [open]);

  const onSubmit = async (data: TaskFormValues) => {
    try {
      if (!data.project_id) {
        toast({
          variant: 'destructive',
          title: 'Error de Validación',
          description: 'Es necesario seleccionar un proyecto para crear la tarea.'
        });
        return;
      }
      
      const submissionData: any = {
        ...data,
        subtasks: currentSubtasks,
        assignees: data.assignees || [],
      };
      
      if (imageFile) {
        submissionData.imageFile = imageFile;
        submissionData.onUploadProgress = setUploadProgress;
      } else if (imagePreview === null) {
        submissionData.image_url = null;
      }


      if (taskToEdit) {
        await updateTask(taskToEdit.id, submissionData);
        toast({ 
          title: 'Tarea Actualizada', 
          description: `"${data.title}" ha sido actualizada.`
        });
      } else {
        const created = await addTask(submissionData);
        toast({ 
          title: 'Tarea Creada', 
          description: `"${data.title}" ha sido añadida a tu tablero (id: ${created.id}).`
        });
      }
      
      form.reset({
        title: '',
        description: '',
        status: 'Todo',
        priority: 'Medium',
        startDate: undefined,
        dueDate: undefined,
        project_id: projectId || '',
        assignees: [],
        subtasks: [],
        image_url: '',
      });
      setCurrentSubtasks([]);
      setImageFile(null);
      setImagePreview(null);
      setUploadProgress(null);
      onOpenChange(false);
    } catch(error: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Error al guardar la tarea', 
        description: error.message 
      });
      setUploadProgress(null);
    }
  };

  const handleAddSubtask = () => {
    if (subtaskInput.trim() !== '') {
      setCurrentSubtasks(prev => [...prev, { title: subtaskInput, is_completed: false }]);
      setSubtaskInput('');
    }
  };
  
  const handleRemoveSubtask = (index: number) => {
    setCurrentSubtasks(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleSubtaskCheckedChange = (checked: boolean, index: number) => {
     setCurrentSubtasks(prev => prev.map((st, i) => i === index ? { ...st, is_completed: checked } : st));
  }
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const input = e.target as any;
  const file = input.files?.[0];
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
      form.setValue('image_url', '');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent id="task-form-dialog-content" className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto overflow-x-hidden" style={{ overscrollBehavior: 'contain' }}>
        <DialogHeader>
          <DialogTitle className="font-headline">
            {taskToEdit ? 'Editar Tarea' : 'Añadir Nueva Tarea'}
          </DialogTitle>
          <DialogDescription>
            {taskToEdit 
              ? "Actualiza los detalles de tu tarea." 
              : "Rellena los detalles para tu nueva tarea."
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             {!isProjectContext && (
               <FormField
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proyecto</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar un proyecto" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                   <div className="relative">
                    <FormControl>
                      <Input 
                        placeholder="p. ej., Diseñar nuevo logo" 
                        {...field} 
                        className="pr-10"
                      />
                    </FormControl>
                    {titleSpeech.isSupported && (
                      <Button type="button" size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={titleSpeech.isListening ? titleSpeech.stopListening : titleSpeech.startListening}>
                          <Mic className={cn("size-4", titleSpeech.isListening && "text-red-500")} />
                      </Button>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label>O elige un título predefinido</Label>
              <div className="flex flex-wrap gap-2">
                {predefinedTitles.map((title) => (
                  <Button
                    key={title}
                    type="button"
                    variant="outline"
                    size="sm"
                    className='text-xs h-8'
                    onClick={() => form.setValue('title', title, { shouldValidate: true })}
                  >
                    {title}
                  </Button>
                ))}
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Textarea 
                        placeholder="Añade una descripción más detallada..." 
                        className="resize-none pr-10" 
                        {...field} 
                      />
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
                <Label htmlFor="task-image">Adjuntar Imagen</Label>
                {imagePreview ? (
                    <div className="relative group">
                        <Image src={imagePreview} alt="Vista previa de la tarea" width={450} height={250} className="rounded-md object-contain max-w-full h-auto"/>
                        <Button type="button" size="icon" variant="destructive" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleRemoveImage}>
                            <X className="size-4" />
                        </Button>
                    </div>
                ) : (
                    <div className="relative">
                        <Input id="task-image" type="file" className="w-full h-10 pl-12" onChange={handleImageChange} accept="image/*"/>
                        <Upload className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                    </div>
                )}
                 {uploadProgress !== null && (
                    <Progress value={uploadProgress} className="w-full h-2 mt-2" />
                )}
            </div>


            <div className="space-y-2">
              <Label>Subtareas</Label>
              <div className="space-y-2">
                {currentSubtasks.map((subtask, index) => (
                  <div key={subtask.id || index} className="flex items-center gap-2">
                    <Checkbox 
                      id={`subtask-${index}`} 
                      checked={subtask.is_completed}
                      onCheckedChange={(checked) => handleSubtaskCheckedChange(!!checked, index)}
                    />
                    <label htmlFor={`subtask-${index}`} className={cn("flex-1 text-sm", subtask.is_completed && "line-through text-muted-foreground")}>
                      {subtask.title}
                    </label>
                    <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => handleRemoveSubtask(index)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  placeholder="Añadir nueva subtarea..."
                  value={subtaskInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubtaskInput((e.target as any).value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddSubtask}><Plus/></Button>
              </div>
            </div>

            <FormField
              control={form.control}
              name="assignees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsables</FormLabel>
                   <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between h-auto",
                            !field.value?.length && "text-muted-foreground"
                          )}
                        >
                          <div className="flex gap-1 flex-wrap">
                            {field.value && field.value.length > 0
                              ? allUsers
                                .filter(user => user.email && field.value?.includes(user.email))
                                .map(user => (
                                    <Badge
                                      variant="secondary"
                                      key={user.id}
                                      className="mr-1"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        const newValue = field.value?.filter(v => v !== user.email) || [];
                                        field.onChange(newValue);
                                      }}
                                    >
                                      {user.full_name || user.email}
                                      <X className="ml-1 h-3 w-3" />
                                    </Badge>
                                ))
                              : "Seleccionar responsables..."}
                          </div>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[450px] p-0">
                      <Command>
                        <CommandInput placeholder="Buscar usuario..." />
                        <CommandEmpty>No se encontró ningún usuario.</CommandEmpty>
                        <CommandGroup>
                          {allUsers.map((user) => (
                            <CommandItem
                              value={user.email || user.id}
                              key={user.id}
                              onSelect={() => {
                                if (!user.email) return;
                                const selectedValues = field.value || [];
                                const isSelected = selectedValues.includes(user.email);
                                if (isSelected) {
                                  field.onChange(selectedValues.filter(v => v !== user.email));
                                } else {
                                  field.onChange([...selectedValues, user.email]);
                                }
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value?.includes(user.email || '')
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {user.full_name || user.email}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statuses.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Prioridad</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar prioridad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorities.map((p) => (
                          <SelectItem key={p} value={p}>
                            {translatedPriorities[p]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Fecha de Inicio</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value 
                              ? format(field.value, 'PPP', { locale: es }) 
                              : <span>Elige una fecha</span>
                            }
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Fecha de Vencimiento</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value 
                              ? format(field.value, 'PPP', { locale: es }) 
                              : <span>Elige una fecha</span>
                            }
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={uploadProgress !== null && uploadProgress < 100}>
                {uploadProgress !== null && uploadProgress < 100 ? `Subiendo... ${uploadProgress}%` : taskToEdit ? 'Guardar Cambios' : 'Crear Tarea'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
