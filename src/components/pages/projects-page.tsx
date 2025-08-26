'use client';

import { PageHeader } from '../layout/page-header';
import type { ProjectWithProgress } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import Image from 'next/image';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { MoreVertical, PlusCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Progress } from '../ui/progress';
import { useProjects } from '@/hooks/use-projects';
import { useState } from 'react';
import { ProjectFormDialog } from '../project/project-form-dialog';
import Link from 'next/link';
import { Skeleton } from '../ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';


function ProjectCard({ project }: { project: ProjectWithProgress }) {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const { deleteProject } = useProjects();
    const { toast } = useToast();
    const isCompleted = project.status === 'Completado' || project.progress === 100;

    const getStatusBadgeVariant = (status: ProjectWithProgress['status']) => {
        switch (status) {
          case 'Completado': return 'default';
          case 'En Progreso': return 'secondary';
          case 'En Pausa': return 'outline';
          default: return 'outline';
        }
    };
    
    const handleDelete = async () => {
        try {
            await deleteProject(project.id);
            toast({
                title: 'Proyecto Eliminado',
                description: `El proyecto "${project.name}" ha sido eliminado.`,
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error al eliminar',
                description: error.message,
            });
        }
    };

    return (
    <>
      <Card className={cn(
          "overflow-hidden flex flex-col transition-all hover:shadow-lg group w-full",
          isCompleted && "bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800"
      )}>
          <CardHeader className="p-0 relative">
            <Link href={`/projects/${project.id}`} className="block">
              <Image
                src={project.image_url || 'https://picsum.photos/600/400'}
                alt={project.name}
                width={600}
                height={400}
                className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                data-ai-hint="imagen del proyecto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            </Link>
             <div className="absolute top-2 right-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="size-8 bg-black/30 hover:bg-black/50 border-0 text-white">
                            <MoreVertical className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setIsFormOpen(true)}>Editar</DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}>Eliminar</DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Esto eliminará permanentemente el proyecto y todas sus tareas asociadas.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                </DropdownMenu>
              </div>
               <div className="absolute bottom-0 left-0 p-4">
                  <Badge variant={getStatusBadgeVariant(project.status)} className={cn(isCompleted && 'bg-emerald-600 text-white border-emerald-600')}>{project.status}</Badge>
              </div>
            </CardHeader>
            <Link href={`/projects/${project.id}`} className="flex flex-col flex-grow">
            <CardContent className="p-4 flex-grow flex flex-col">
                <CardTitle className="text-lg font-headline mb-1">{project.name}</CardTitle>
                <div className="flex-1 h-10">
                  <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                </div>
            </CardContent>
            <CardFooter className="p-4 pt-0">
               <div className="w-full">
                    <div className='flex justify-between items-center mb-1 text-sm text-muted-foreground'>
                        <span>Progreso</span>
                        <span className="font-semibold text-foreground">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} aria-label={`${project.progress}% de progreso`} className={cn(isCompleted && '[&>div]:bg-emerald-500')} />
                </div>
            </CardFooter>
          </Link>
      </Card>
      {isFormOpen && <ProjectFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} projectToEdit={project} />}
    </>
    );
  }

export function ProjectsPage() {
  const { projects, loading } = useProjects();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
         {Array.from({ length: 4 }).map((_, i) => (
           <Card key={i}>
             <Skeleton className="h-48 w-full" />
             <CardContent className="p-4 space-y-2">
               <Skeleton className="h-6 w-3/4" />
               <Skeleton className="h-4 w-full" />
               <Skeleton className="h-4 w-1/2" />
             </CardContent>
             <CardFooter className="p-4">
                <Skeleton className="h-8 w-full" />
             </CardFooter>
           </Card>
         ))}
        </div>
      );
    }

    if (projects.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
            <div className="text-center py-16 px-4 border-2 border-dashed rounded-lg">
                <h2 className="text-2xl font-semibold font-headline">¡Bienvenido a tus Proyectos!</h2>
                <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                    Parece que todavía no has creado ningún proyecto. ¡Empieza ahora para organizar tus tareas y alcanzar tus metas!
                </p>
                <Button className="mt-6" onClick={() => setIsFormOpen(true)}>
                    <PlusCircle className="mr-2" />
                    Crea tu primer proyecto
                </Button>
            </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    );
  };

  return (
    <>
    <div className="flex flex-col h-full">
       <PageHeader title="Proyectos">
          <Button size="sm" onClick={() => setIsFormOpen(true)}>
            <PlusCircle />
            Añadir Proyecto
          </Button>
      </PageHeader>
      <div className="flex-1 overflow-auto p-6">
         {renderContent()}
      </div>
    </div>
    {isFormOpen && <ProjectFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} />}
    </>
  );
}
