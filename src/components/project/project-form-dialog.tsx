'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProjects } from '@/hooks/use-projects';
import { useTasks } from '@/hooks/use-tasks';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { createClient } from '@/lib/supabase/client';

interface ProjectFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    project?: {
        id: string;
        name: string;
        description?: string;
        status: 'En Progreso' | 'Completado' | 'En Pausa';
        user_id: string;
        progress: number;
    };
}

const formSchema = z.object({
    name: z.string().min(1, 'El nombre es obligatorio'),
    description: z.string().optional(),
    status: z.enum(['En Progreso', 'Completado', 'En Pausa']).default('En Progreso'),
    user_id: z.string().optional(),
    progress: z.number().default(0)
});

type FormData = z.infer<typeof formSchema>;

export function ProjectFormDialog({ open, onOpenChange, project }: ProjectFormDialogProps) {
    const { addProject, updateProject } = useProjects();
    const { allUsers } = useTasks();
    const { toast } = useToast();
    const supabase = createClient();
    const [currentUser, setCurrentUser] = useState<any>(null);

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: project?.name || '',
            description: project?.description || '',
            status: project?.status || 'En Progreso',
            user_id: project?.user_id,
            progress: project?.progress || 0,
        },
    });

    // Reset form when project changes
    useEffect(() => {
        if (project) {
            form.reset({
                name: project.name,
                description: project.description || '',
                status: project.status,
                user_id: project.user_id,
                progress: project.progress,
            });
        }
    }, [project, form]);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError) throw authError;
                
                if (!user) {
                    throw new Error('Usuario no autenticado');
                }

                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role, email, full_name')
                    .eq('id', user.id)
                    .single();
                
                if (profileError) throw profileError;

                setCurrentUser({
                    ...user,
                    role: profile?.role,
                    email: profile?.email || user.email,
                    full_name: profile?.full_name || user.user_metadata?.full_name
                });
            } catch (error) {
                console.error('Error fetching user:', error);
                toast({
                    variant: 'destructive',
                    title: 'Error de autenticación',
                    description: 'Por favor, inicia sesión nuevamente.'
                });
            }
        };
        fetchUser();
    }, [supabase, toast]);

    const isAdmin = useMemo(() => currentUser?.role === 'admin', [currentUser]);

    useEffect(() => {
        if (!isAdmin && currentUser) {
            form.setValue('user_id', currentUser.id);
        }
    }, [isAdmin, currentUser, form]);

    const onSubmit = async (values: FormData) => {
        try {
            // Verificar si tenemos un usuario actual
            if (!currentUser || !currentUser.id) {
                // Intentar obtener el usuario actual nuevamente
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    throw new Error('Por favor, inicia sesión para crear un proyecto.');
                }
                // Actualizar el usuario actual si lo encontramos
                setCurrentUser(user);
            }

            const userIdToAssign = values.user_id || currentUser?.id;
            if (!userIdToAssign) {
                throw new Error('No se pudo determinar el responsable del proyecto. Por favor, inicia sesión nuevamente.');
            }

            const submissionData = {
                name: values.name,
                description: values.description || '',
                status: values.status,
                progress: values.progress || 0,
                user_id: userIdToAssign,
                creator_email: currentUser?.email || '',
                creator_name: currentUser?.full_name || currentUser?.email || '',
                image_url: '' // Campo requerido por la interfaz Project
            };

            if (project?.id) {
                await updateProject(project.id, submissionData);
                toast({ title: 'Proyecto actualizado', description: `El proyecto "${values.name}" ha sido actualizado.` });
            } else {
                await addProject(submissionData);
                toast({ title: 'Proyecto creado', description: `El proyecto "${values.name}" ha sido creado.` });
            }
            
            form.reset();
            onOpenChange(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error al crear proyecto', description: error.message });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{project ? 'Editar Proyecto' : 'Nuevo Proyecto'}</DialogTitle>
                    <DialogDescription>
                        {project 
                            ? 'Modifica los detalles del proyecto.'
                            : 'Completa los detalles para crear un nuevo proyecto.'
                        }
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
                                        <Input placeholder="Ej: Diseño de la nueva web" {...field} />
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
                                    <FormLabel>Descripción (Opcional)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Describe brevemente el objetivo del proyecto." {...field} />
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
                                    <FormLabel>Estado del Proyecto</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona un estado" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="En Progreso">En Progreso</SelectItem>
                                            <SelectItem value="Completado">Completado</SelectItem>
                                            <SelectItem value="En Pausa">En Pausa</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {isAdmin && (
                            <FormField
                                control={form.control}
                                name="user_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Responsable del Proyecto</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona un usuario" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {allUsers.map(user => (
                                                    <SelectItem key={user.id} value={user.id!}>
                                                        {user.full_name || user.email}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                            <Button type="submit">
                                {project ? 'Guardar Cambios' : 'Crear Proyecto'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
