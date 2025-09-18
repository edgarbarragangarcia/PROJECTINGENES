'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useProjects } from '@/hooks/use-projects';
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
});

export function ProjectFormDialog({ open, onOpenChange }: ProjectFormDialogProps) {
    const { createProject } = useProjects();
    const { toast } = useToast();
    const supabase = createClient();
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            description: '',
            status: 'Activo',
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Debes iniciar sesión para crear un proyecto');

            await createProject({ ...values, user_id: user.id });
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
