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
}

const formSchema = z.object({
    name: z.string().min(1, 'El nombre es obligatorio'),
    description: z.string().optional(),
    status: z.enum(['Activo', 'Inactivo', 'Completado']).default('Activo'),
    user_id: z.string().optional(),
});

export function ProjectFormDialog({ open, onOpenChange }: ProjectFormDialogProps) {
    const { createProject } = useProjects();
    const { allUsers } = useTasks();
    const { toast } = useToast();
    const supabase = createClient();
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
                setCurrentUser({ ...user, role: profile?.role });
            }
        };
        fetchUser();
    }, [supabase]);

    const isAdmin = useMemo(() => currentUser?.role === 'admin', [currentUser]);
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            description: '',
            status: 'Activo',
            user_id: undefined,
        },
    });

    useEffect(() => {
        if (!isAdmin && currentUser) {
            form.setValue('user_id', currentUser.id);
        }
    }, [isAdmin, currentUser, form]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            const userIdToAssign = values.user_id || currentUser?.id;
            if (!userIdToAssign) throw new Error('No se pudo determinar el responsable del proyecto.');

            await createProject({ ...values, user_id: userIdToAssign });
            toast({ title: 'Proyecto creado', description: `El proyecto "${values.name}" ha sido creado.` });
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
                    <DialogTitle>Nuevo Proyecto</DialogTitle>
                    <DialogDescription>Completa los detalles para crear un nuevo proyecto.</DialogDescription>
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
                            <Button type="submit">Crear Proyecto</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
