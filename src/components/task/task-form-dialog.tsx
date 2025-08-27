
'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
import { CalendarIcon, Sparkles, Wand2, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { suggestTaskPriority, type SuggestTaskPriorityOutput } from '@/ai/flows/suggest-task-priority';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { es } from 'date-fns/locale';
import { Label } from '@/components/ui/label';
import { useProjects } from '@/hooks/use-projects';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';

const translatedPriorities = {
  'Low': 'Baja',
  'Medium': 'Media',
  'High': 'Alta',
} as const;

const taskFormSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres.'),
  description: z.string().optional(),
  status: z.enum(statuses),
  priority: z.enum(priorities),
  startDate: z.date().optional(),
  dueDate: z.date().optional(),
  projectId: z.string().uuid("Debes seleccionar un proyecto válido."),
  assignee: z.string().optional(),
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
  const { addTask, updateTask } = useTasks();
  const { projects } = useProjects();
  const { toast } = useToast();
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestTaskPriorityOutput | null>(null);
  
  const isProjectContext = !!projectId;

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: taskToEdit
      ? { 
          title: taskToEdit.title,
          description: taskToEdit.description || '',
          status: taskToEdit.status,
          priority: taskToEdit.priority,
          startDate: taskToEdit.startDate,
          dueDate: taskToEdit.dueDate,
          projectId: taskToEdit.projectId,
          assignee: taskToEdit.assignee || '',
        }
      : {
          title: '',
          description: '',
          status: 'Todo',
          priority: 'Medium',
          startDate: undefined,
          dueDate: undefined,
          projectId: projectId || '',
          assignee: '',
        },
  });

  const handleTranscript = (fieldName: 'title' | 'description' | 'assignee') => (transcript: string) => {
    form.setValue(fieldName, (form.getValues(fieldName) || '') + transcript);
  };
  
  const titleSpeech = useSpeechRecognition(handleTranscript('title'));
  const descriptionSpeech = useSpeechRecognition(handleTranscript('description'));
  const assigneeSpeech = useSpeechRecognition(handleTranscript('assignee'));


  const descriptionValue = useWatch({ 
    control: form.control, 
    name: 'description' 
  });

  useEffect(() => {
    if (projectId && !form.getValues('projectId')) {
      form.setValue('projectId', projectId);
    }
  }, [projectId, form]);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (descriptionValue && descriptionValue.length > 20) {
        setIsSuggesting(true);
        try {
          const result = await suggestTaskPriority({ 
            description: descriptionValue 
          });
          setSuggestion(result);
        } catch (error) {
          console.error("La sugerencia de IA falló:", error);
          toast({ 
            variant: 'destructive', 
            title: 'Error de Sugerencia de IA', 
            description: 'No se pudo obtener la sugerencia de prioridad de la IA.' 
          });
        } finally {
          setIsSuggesting(false);
        }
      } else {
        setSuggestion(null);
      }
    }, 1500);

    return () => clearTimeout(handler);
  }, [descriptionValue, toast]);

  const onSubmit = async (data: TaskFormValues) => {
    try {
      if (!data.projectId) {
        toast({
          variant: 'destructive',
          title: 'Error de Validación',
          description: 'Es necesario seleccionar un proyecto para crear la tarea.'
        });
        return;
      }
      
      const submissionData: Omit<Task, 'id' | 'created_at' | 'user_id'> = {
        ...data,
        project_id: data.projectId,
        description: data.description || '',
        startDate: data.startDate,
        dueDate: data.dueDate,
        assignee: data.assignee || '',
      };

      if (taskToEdit) {
        await updateTask(taskToEdit.id, submissionData);
        toast({ 
          title: 'Tarea Actualizada', 
          description: `"${data.title}" ha sido actualizada.`
        });
      } else {
        await addTask(submissionData);
        toast({ 
          title: 'Tarea Creada', 
          description: `"${data.title}" ha sido añadida a tu tablero.`
        });
      }
      
      form.reset({
        title: '',
        description: '',
        status: 'Todo',
        priority: 'Medium',
        startDate: undefined,
        dueDate: undefined,
        projectId: projectId || '',
        assignee: '',
      });
      
      onOpenChange(false);
    } catch(error: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Error al guardar la tarea', 
        description: error.message 
      });
    }
  };

  const handleApplySuggestion = () => {
    if (suggestion) {
      form.setValue('priority', suggestion.priority);
      setSuggestion(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
                name="projectId"
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

            <FormField
              control={form.control}
              name="assignee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsable</FormLabel>
                   <div className="relative">
                    <FormControl>
                      <Input 
                        placeholder="p. ej., nombre@ejemplo.com" 
                        {...field} 
                        className="pr-10"
                      />
                    </FormControl>
                     {assigneeSpeech.isSupported && (
                        <Button type="button" size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={assigneeSpeech.isListening ? assigneeSpeech.stopListening : assigneeSpeech.startListening}>
                          <Mic className={cn("size-4", assigneeSpeech.isListening && "text-red-500")} />
                        </Button>
                      )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {isSuggesting && (
              <div className="flex items-center text-sm text-muted-foreground gap-2">
                <Sparkles className="size-4 animate-pulse" /> 
                La IA está analizando tu descripción...
              </div>
            )}

            {suggestion && (
              <Alert className="bg-accent/30 border-accent/50">
                <AlertTitle className="flex items-center gap-2 font-semibold">
                  <Wand2 className="size-4" />
                  Sugerencia de IA
                </AlertTitle>
                <AlertDescription className="flex items-center justify-between mt-2">
                  <p>
                    ¿Establecer prioridad en{' '}
                    <strong>{translatedPriorities[suggestion.priority]}</strong>?{' '}
                    <span className="text-xs">({suggestion.reasoning})</span>
                  </p>
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline" 
                    onClick={handleApplySuggestion}
                  >
                    Aplicar
                  </Button>
                </AlertDescription>
              </Alert>
            )}

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
              <Button type="submit">
                {taskToEdit ? 'Guardar Cambios' : 'Crear Tarea'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
