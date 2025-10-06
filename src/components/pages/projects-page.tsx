'use client';

import { PageHeader } from '../layout/page-header';
import type { Project, ProjectWithProgress, Task } from '@/types';
import { Button } from '../ui/button';
import { MoreVertical, PlusCircle, Trash2, Edit, FileDown, LayoutGrid, List } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Progress } from '../ui/progress';
import { useProjects } from '@/hooks/use-projects';
import { useEffect, useState, useMemo } from 'react';
import { ProjectFormDialog } from '../project/project-form-dialog';
import Link from 'next/link';
import { Skeleton } from '../ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTasks } from '@/hooks/use-tasks';
import { ProjectChartComponent } from '../project/project-chart-component';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectListView } from '../project/project-list-view';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export default function ProjectsPage() {
  const { projects, loading, deleteProject } = useProjects();
  const { tasks, allUsers } = useTasks();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<ProjectWithProgress | undefined>();
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedCreator, setSelectedCreator] = useState('all');
  const { toast } = useToast();
  const supabase = createClient();

  console.log('Component Rendered. Initial loading state:', loading);

  const creators = useMemo(() => {
    const creatorMap = new Map<string, string>();
    (projects || []).forEach(p => {
      if (p && p.creator_email && p.creator_name) {
        creatorMap.set(p.creator_email, p.creator_name);
      }
    });
    return Array.from(creatorMap.entries()).map(([email, name]) => ({ email, name }));
  }, [projects]);


  const filteredProjects = useMemo(() => {
    console.log(`%cFiltering projects... (Input projects: ${projects.length}, Current user: ${currentUserEmail})`, 'color: blue');
    let userProjects = projects || [];

    if (!isAdmin && currentUserEmail) {
      const userTasks = tasks.filter(task => task.assignees?.includes(currentUserEmail));
      const assignedProjectIds = new Set(userTasks.map(task => task.project_id));
      
      userProjects = projects.filter(p => 
        p.creator_email === currentUserEmail || assignedProjectIds.has(p.id)
      );
    }
    
    if (isAdmin && selectedCreator !== 'all') {
       return userProjects.filter(p => p && p.creator_email === selectedCreator);
    }
    console.log(`%cFiltering finished. Output projects: ${userProjects.length}`, 'color: green');
    return userProjects;
  }, [projects, tasks, selectedCreator, isAdmin, currentUserEmail]);
  
  // Proyectos para mostrar en la UI (basado en selección)
  const projectsToShow = (filteredProjects || []).filter(p => p && selectedProjects.includes(p.id));

  // Proyectos disponibles para exportar (todos los filtrados)
  const projectsToExport = useMemo(() => {
    if (selectedProjects.length === 0) {
      // Si no hay proyectos seleccionados, exportar todos los filtrados
      return filteredProjects;
    }
    // Si hay proyectos seleccionados, exportar solo esos
    return filteredProjects.filter(p => p && selectedProjects.includes(p.id));
  }, [filteredProjects, selectedProjects]);

  useEffect(() => {
    console.log('Checking user session...');
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('User found:', user.email);
        setCurrentUserEmail(user.email || null);
        const currentUserProfile = allUsers.find(u => u.id === user.id);
        if (currentUserProfile?.role === 'admin') {
          setIsAdmin(true);
        }
      } else {
        console.error('User NOT found. Session might be invalid.');
        setCurrentUserEmail(null); // Explicitly set to null if no user
      }
    };
    if (allUsers.length > 0) {
      checkUser();
    }
  }, [supabase.auth, allUsers]);

  const handleEdit = (project: ProjectWithProgress) => {
    setProjectToEdit(project);
    setIsFormOpen(true);
  };
  
  const handleAddNew = () => {
    setProjectToEdit(undefined);
    setIsFormOpen(true);
  }

  const handleDelete = async (projectId: string, projectName: string) => {
    try {
      await deleteProject(projectId);
      toast({
        title: 'Proyecto Eliminado',
        description: `El proyecto "${projectName}" ha sido eliminado.`,
      });
      setSelectedProjects(prev => prev.filter(id => id !== projectId));
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al eliminar',
        description: error.message,
      });
    }
  };
  
  const handleDownloadPdf = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    
    const doc = new jsPDF({ orientation: 'landscape' });
    let yPos = 28;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Informe de Proyectos Seleccionados', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha de generación: ${format(new Date(), 'PPPP', {locale: es})}`, doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });
    
    yPos += 15;
    
  // Si no hay proyectos seleccionados o filtrados, mostrar mensaje
    if (projectsToExport.length === 0) {
      toast({
        title: "No hay proyectos para exportar",
        description: "Selecciona al menos un proyecto o asegúrate de que haya proyectos disponibles.",
        variant: "destructive"
      });
      return;
    }

    for (const project of projectsToExport) {
        if (yPos > 150) { 
            doc.addPage();
            yPos = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(project.name, 14, yPos);
        yPos += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Estado: ${project.status}`, 14, yPos);
        yPos += 5;
        
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100);
        const splitDescription = doc.splitTextToSize(project.description || 'Sin descripción.', 250);
        doc.text(splitDescription, 14, yPos);
        yPos += (splitDescription.length * 4) + 5;
        doc.setTextColor(0);

        doc.setFont('helvetica', 'bold');
        doc.text(`Nivel de Avance: ${project.progress}%`, 14, yPos);
        yPos += 10;
        doc.setFont('helvetica', 'normal');


        const projectTasks = tasks.filter(task => task.project_id === project.id);

        if (projectTasks.length > 0) {
            if (yPos > 180) {
                doc.addPage();
                yPos = 20;
            }
            const tableData = projectTasks.map(t => {
                const subtasksText = t.subtasks?.map(st => `${st.is_completed ? '[x]' : '[ ]'} ${st.title}`).join('\n') || 'N/A';
                return [
                    t.title || 'N/A',
                    t.description || 'N/A',
                    subtasksText,
                    t.assignees?.join(', ') || 'N/A',
                    t.status || 'N/A',
                    t.priority || 'N/A',
                    t.startDate ? format(new Date(t.startDate), 'dd/MM/yy') : 'N/A',
                    t.dueDate ? format(new Date(t.dueDate), 'dd/MM/yy') : 'N/A',
                ];
            });

            autoTable(doc, {
                head: [['Tarea', 'Descripción', 'Subtareas', 'Responsable', 'Estado', 'Prioridad', 'Fecha de inicio', 'Vencimiento']],
                body: tableData,
                startY: yPos,
                headStyles: { fillColor: [41, 128, 185] },
                styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
                columnStyles: {
                    0: { cellWidth: 30 }, // Tarea
                    1: { cellWidth: 'auto' }, // Descripción
                    2: { cellWidth: 40 }, // Subtareas
                    3: { cellWidth: 25 }, // Responsable
                    4: { cellWidth: 20 }, // Estado
                    5: { cellWidth: 20 }, // Prioridad
                    6: { cellWidth: 20 }, // Fecha de inicio
                    7: { cellWidth: 20 }, // Vencimiento
                }
            });

            yPos = (doc as any).lastAutoTable.finalY + 10;

            for (const task of projectTasks) {
                if (task.image_url) {
                    if (yPos > 150) { 
                        doc.addPage();
                        yPos = 20;
                    }
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`Imagen adjunta a la tarea: "${task.title}"`, 14, yPos);
                    yPos += 5;
                    try {
                        const response = await fetch(task.image_url);
                        const blob = await response.blob();
                        const reader = new FileReader();
                        await new Promise<void>((resolve, reject) => {
                           reader.onload = (e: any) => {
                                try {
                                    doc.addImage(e.target.result, 'PNG', 14, yPos, 90, 50);
                                    yPos += 55;
                                    resolve();
                                } catch (err) {
                                    reject(err);
                                }
                           };
                           reader.onerror = reject;
                           reader.readAsDataURL(blob);
                        });

                    } catch (e) {
                        doc.setFont('helvetica', 'normal');
                        doc.setTextColor(255,0,0);
                        doc.text('No se pudo cargar la imagen.', 14, yPos + 5);
                        yPos += 10;
                        doc.setTextColor(0);
                    }
                }
            }
            yPos += 10;
        } else {
            doc.setFontSize(9);
            doc.text('Este proyecto no tiene tareas.', 14, yPos);
            yPos += 15;
        }
    }
    doc.save(`informe-proyectos-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProjects(prev => 
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProjects(filteredProjects.map(p => p.id));
    } else {
      setSelectedProjects([]);
    }
  }

  const getStatusBadgeClass = (status: ProjectWithProgress['status']) => {
    switch (status) {
      case 'Completado':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600';
      case 'En Progreso':
        return 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500';
      case 'En Pausa':
        return 'bg-gray-500 hover:bg-gray-600 text-white border-gray-500';
      default:
        return ''; // Default outline style
    }
  };

  const renderCardView = () => (
     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProjects.map((project) => (
          <Card key={project.id} className={cn(
              "flex flex-col hover:shadow-lg transition-shadow duration-300 text-sm relative", 
              selectedProjects.includes(project.id) && "ring-2 ring-primary",
              project.status === 'Completado' && "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/20"
            )}>
            <div className="absolute top-2 right-2 z-10 bg-background/50 backdrop-blur-sm rounded-sm p-1">
                <Checkbox
                    id={`select-${project.id}`}
                    checked={selectedProjects.includes(project.id)}
                    onCheckedChange={() => handleSelectProject(project.id)}
                />
            </div>
            <div className="absolute top-2 left-2 z-10">
                <Badge className={cn("text-xs", getStatusBadgeClass(project.status))}>
                    {project.status}
                </Badge>
            </div>

            <Link href={`/projects/${project.id}`} className="block">
                <div className="aspect-[16/9] relative">
                     <Image 
                        src={project.image_url || `https://picsum.photos/400/225?random=${project.id}`}
                        alt={project.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover rounded-t-lg"
                        data-ai-hint="project image"
                     />
                </div>
            </Link>
            <CardHeader className="flex-row items-start justify-between gap-2 p-3">
                <div className="flex-1">
                    <Link href={`/projects/${project.id}`} className="hover:underline">
                        <CardTitle className="font-headline text-base line-clamp-1">{project.name}</CardTitle>
                    </Link>
                    <CardDescription className="line-clamp-2 text-xs mt-1">{project.description}</CardDescription>
                </div>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-7 flex-shrink-0">
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(project)}>
                        <Edit className="mr-2 size-4"/>
                        Editar
                      </DropdownMenuItem>
                       <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}>
                            <Trash2 className="mr-2 size-4"/>
                            Eliminar
                          </DropdownMenuItem>
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
                            <AlertDialogAction onClick={() => handleDelete(project.id, project.name)} className="bg-destructive hover:bg-destructive/90">
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
            </CardHeader>
            <CardContent className="flex-grow p-3 pt-0">
                <div className="space-y-2">
                    <div>
                        <div className="flex justify-between items-center mb-1 text-xs text-muted-foreground">
                            <span>Progreso</span>
                            <span>{project.progress}%</span>
                        </div>
                        <Progress value={project.progress} className="h-1.5" />
                    </div>
                </div>
            </CardContent>
             <CardFooter className="p-3 text-xs text-muted-foreground">
              Creado por: {project.creator_name || project.creator_email}
            </CardFooter>
          </Card>
        ))}
      </div>
  );

  const renderContent = () => {
    // Show loading skeleton if projects are loading OR if we are not an admin and don't know the current user's email yet.
    const isStillLoading = loading || (!isAdmin && !currentUserEmail);
    console.log('Render logic check. isStillLoading:', isStillLoading);

    if (isStillLoading && projects.length === 0) {
      console.log('Rendering: Loading Skeleton');
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
             <Card key={i}>
                <Skeleton className="h-[120px] w-full rounded-t-lg rounded-b-none" />
                <CardHeader className="p-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                </CardHeader>
                <CardContent className="p-3">
                    <Skeleton className="h-3 w-full mb-2" />
                    <Skeleton className="h-3 w-1/4" />
                </CardContent>
             </Card>
           ))}
        </div>
      );
    }

    if (!isStillLoading && filteredProjects.length === 0) {
      console.log('Rendering: No Projects Message');
      return (
        <div className="flex items-center justify-center h-full">
            <div className="text-center py-16 px-4 border-2 border-dashed rounded-lg">
                <h2 className="text-2xl font-semibold font-headline">¡Bienvenido a tus Proyectos!</h2>
                <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                    Parece que todavía no has creado ningún proyecto. ¡Empieza ahora para organizar tus tareas y alcanzar tus metas!
                </p>
                <Button className="mt-6" onClick={handleAddNew}>
                    <PlusCircle className="mr-2" />
                    Crea tu primer proyecto
                </Button>
            </div>
        </div>
      );
    }

    console.log('Rendering: Project List');
    const allSelected = selectedProjects.length === filteredProjects.length && filteredProjects.length > 0;

    return (
      <Tabs defaultValue="grid" className="w-full">
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
                <Checkbox 
                  id="select-all"
                  checked={allSelected}
                  onCheckedChange={(checked: boolean) => handleSelectAll(checked)}
                  aria-label="Seleccionar todo"
                />
                <label htmlFor="select-all" className="text-sm font-medium">
                  {selectedProjects.length > 0 
                   ? `${selectedProjects.length} de ${filteredProjects.length} seleccionado(s)`
                   : `Seleccionar todo`
                  }
                </label>
            </div>
            <TabsList>
                <TabsTrigger value="grid"><LayoutGrid className="size-4 mr-2"/> Tarjetas</TabsTrigger>
                <TabsTrigger value="list"><List className="size-4 mr-2"/> Lista</TabsTrigger>
            </TabsList>
        </div>
        <TabsContent value="grid">
            {renderCardView()}
        </TabsContent>
        <TabsContent value="list">
            <ProjectListView 
              projects={filteredProjects} 
              tasks={tasks} 
              onEdit={handleEdit} 
              onDelete={handleDelete}
              selectedProjects={selectedProjects}
              onSelectProject={handleSelectProject}
            />
        </TabsContent>
    </Tabs>
    );
  };

  return (
    <>
      <div className="flex flex-col h-full">
        <PageHeader title="Proyectos">
          <div className='flex items-center gap-2'>
            {isAdmin && (
              <Select value={selectedCreator} onValueChange={setSelectedCreator}>
                <SelectTrigger className="w-full md:w-[250px]">
                  <SelectValue placeholder="Filtrar por creador..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los creadores</SelectItem>
                  {creators.map(creator => (
                    <SelectItem key={creator.email} value={creator.email}>{creator.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {/* Desktop Buttons */}
            <div className="hidden md:flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleDownloadPdf} disabled={selectedProjects.length === 0}>
                    <FileDown />
                    {selectedProjects.length > 0 ? `Generar PDF (${selectedProjects.length})` : 'Generar PDF'}
                </Button>
                <Button size="sm" onClick={handleAddNew}>
                    <PlusCircle />
                    Añadir Proyecto
                </Button>
            </div>

            {/* Mobile Buttons */}
            <div className="md:hidden flex items-center gap-2">
                <Button size="sm" onClick={handleAddNew}>
                    <PlusCircle />
                    Añadir
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                            <MoreVertical />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleDownloadPdf} disabled={selectedProjects.length === 0}>
                            <FileDown className="mr-2" />
                            Generar PDF
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </div>
        </PageHeader>
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {renderContent()}
        </div>
      </div>
      {isFormOpen && <ProjectFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} project={projectToEdit} />}
      <div className="absolute -left-[9999px] top-0">
        {projectsToShow.map(project => (
          <div key={`chart-container-${project.id}`} id={`chart-for-project-${project.id}`} className="w-[600px] p-4 bg-background">
            <ProjectChartComponent 
              project={project} 
              tasks={tasks.filter(t => t.project_id === project.id)} 
            />
          </div>
        ))}
      </div>
    </>
  );
}

