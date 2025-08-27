

'use client';

import { PageHeader } from '../layout/page-header';
import type { Project, ProjectWithProgress, Task } from '@/lib/types';
import { Button } from '../ui/button';
import { MoreVertical, PlusCircle, Trash2, Edit, FileDown, LayoutGrid, List, GanttChartSquare } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Progress } from '../ui/progress';
import { useProjects } from '@/hooks/use-projects';
import { useEffect, useState, useRef } from 'react';
import { ProjectFormDialog } from '../project/project-form-dialog';
import Link from 'next/link';
import { Skeleton } from '../ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { createClient } from '@/lib/supabase/client';
import { adminEmails } from '@/providers/combined-provider';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTasks } from '@/hooks/use-tasks';
import { ProjectChartComponent } from '../project/project-chart-component';
import html2canvas from 'html2canvas';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectListView } from '../project/project-list-view';
import { Checkbox } from '@/components/ui/checkbox';
import { useRouter } from 'next/navigation';

export function ProjectsPage() {
  const { projects, loading, deleteProject } = useProjects();
  const { tasks } = useTasks();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<ProjectWithProgress | undefined>();
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const { toast } = useToast();
  const supabase = createClient();
  const router = useRouter();
  
  const projectsToShow = projects.filter(p => selectedProjects.includes(p.id));

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && adminEmails.includes(user.email || '')) {
        setIsAdmin(true);
      }
    };
    checkAdmin();
  }, [supabase.auth]);

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
  
  const getStatusBadgeVariant = (status: ProjectWithProgress['status']) => {
    switch (status) {
      case 'Completado': return 'default';
      case 'En Progreso': return 'default';
      case 'En Pausa': return 'outline';
      default: return 'outline';
    }
  };
  
  const handleDownloadPdf = async () => {
    const doc = new jsPDF();
    let yPos = 28;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Informe de Proyectos Seleccionados', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha de generación: ${format(new Date(), 'PPPP', {locale: es})}`, 105, yPos, { align: 'center' });
    
    yPos += 15;
    
    const projectsToExport = projects.filter(p => selectedProjects.includes(p.id));

    for (const project of projectsToExport) {
        if (yPos > 220) { 
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
        const splitDescription = doc.splitTextToSize(project.description || 'Sin descripción.', 180);
        doc.text(splitDescription, 14, yPos);
        yPos += (splitDescription.length * 4) + 5;
        doc.setTextColor(0);

        const chartElement = document.getElementById(`chart-for-project-${project.id}`);
        if (chartElement) {
            const canvas = await html2canvas(chartElement, { backgroundColor: null, scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 180;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            if (yPos + imgHeight > 280) {
              doc.addPage();
              yPos = 20;
            }

            doc.addImage(imgData, 'PNG', 14, yPos, imgWidth, imgHeight);
            yPos += imgHeight + 10;
        }

        const projectTasks = tasks.filter(task => task.projectId === project.id);

        if (projectTasks.length > 0) {
            if (yPos > 260) {
                doc.addPage();
                yPos = 20;
            }
            const tableData = projectTasks.map(t => {
                const subtasksString = (t.subtasks || [])
                    .map(st => `${st.is_completed ? '[x]' : '[ ]'} ${st.title}`)
                    .join('\n');
                return [
                    t.title,
                    t.status,
                    t.priority,
                    t.dueDate ? format(new Date(t.dueDate), 'dd/MM/yy') : 'N/A',
                    subtasksString || 'N/A'
                ];
            });

            autoTable(doc, {
                head: [['Tarea', 'Estado', 'Prioridad', 'Vencimiento', 'Subtareas']],
                body: tableData,
                startY: yPos,
                headStyles: { fillColor: [41, 128, 185] },
                styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
                columnStyles: {
                    0: { cellWidth: 40 }, // Tarea
                    1: { cellWidth: 25 }, // Estado
                    2: { cellWidth: 20 }, // Prioridad
                    3: { cellWidth: 25 }, // Vencimiento
                    4: { cellWidth: 'auto' }, // Subtareas
                }
            });

            yPos = (doc as any).lastAutoTable.finalY + 10;

            for (const task of projectTasks) {
                if (task.image_url) {
                    doc.addPage();
                    yPos = 20;
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`Imagen adjunta a la tarea: "${task.title}"`, 14, yPos);
                    yPos += 10;
                    try {
                        const response = await fetch(task.image_url);
                        const blob = await response.blob();
                        const reader = new FileReader();
                        await new Promise<void>((resolve) => {
                           reader.onload = (e: any) => {
                                doc.addImage(e.target.result, 'PNG', 14, yPos, 90, 50);
                                resolve();
                           };
                           reader.readAsDataURL(blob);
                        });

                    } catch (e) {
                        doc.setFont('helvetica', 'normal');
                        doc.setTextColor(255,0,0);
                        doc.text('No se pudo cargar la imagen.', 14, yPos + 10);
                        doc.setTextColor(0);
                    }
                }
            }
            yPos = doc.internal.pageSize.height - 20;


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
      setSelectedProjects(projects.map(p => p.id));
    } else {
      setSelectedProjects([]);
    }
  }

  const getStatusBadgeClass = (status: ProjectWithProgress['status']) => {
    switch (status) {
      case 'Completado': 
        return 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600';
      case 'En Progreso': 
        return 'bg-green-500 hover:bg-green-600 text-white border-green-500';
      case 'En Pausa': 
        return ''; // Default outline style
      default: 
        return ''; // Default outline style
    }
  };

  const renderCardView = () => (
     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {projects.map((project) => (
          <Card key={project.id} className={cn("flex flex-col hover:shadow-lg transition-shadow duration-300 text-sm relative", selectedProjects.includes(project.id) && "ring-2 ring-primary")}>
             <div className="absolute top-2 right-2 z-10 bg-background/50 backdrop-blur-sm rounded-sm p-1">
                <Checkbox
                    id={`select-${project.id}`}
                    checked={selectedProjects.includes(project.id)}
                    onCheckedChange={() => handleSelectProject(project.id)}
                />
            </div>
            <Link href={`/projects/${project.id}`} className="block">
                <div className="aspect-[16/9] relative">
                     <Image 
                        src={project.image_url || `https://picsum.photos/400/225?random=${project.id}`}
                        alt={project.name}
                        fill
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
                     <div>
                        <span className="text-xs text-muted-foreground">Estado</span>
                        <div className="mt-1">
                             <Badge 
                                variant={getStatusBadgeVariant(project.status)} 
                                className={cn("text-xs", getStatusBadgeClass(project.status))}
                              >
                                {project.status}
                              </Badge>
                        </div>
                    </div>
                </div>
            </CardContent>
          </Card>
        ))}
      </div>
  );

  const renderContent = () => {
    if (loading) {
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

    if (projects.length === 0) {
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

    const allSelected = selectedProjects.length === projects.length && projects.length > 0;
    const isIndeterminate = selectedProjects.length > 0 && !allSelected;


    return (
      <Tabs defaultValue="grid" className="w-full">
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
                <Checkbox 
                  id="select-all"
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Seleccionar todo"
                />
                <label htmlFor="select-all" className="text-sm font-medium">
                  {selectedProjects.length > 0 
                   ? `${selectedProjects.length} de ${projects.length} seleccionado(s)`
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
              projects={projects} 
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
              <>
                <Button size="sm" variant="outline" onClick={handleDownloadPdf} disabled={selectedProjects.length === 0}>
                  <FileDown />
                  {selectedProjects.length > 0 ? `Generar PDF (${selectedProjects.length})` : 'Generar PDF'}
                </Button>
              </>
            )}
            <Button size="sm" onClick={handleAddNew}>
              <PlusCircle />
              Añadir Proyecto
            </Button>
          </div>
        </PageHeader>
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {renderContent()}
        </div>
      </div>
      {isFormOpen && <ProjectFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} projectToEdit={projectToEdit} />}
      <div className="absolute -left-[9999px] top-0">
        {projectsToShow.map(project => (
          <div key={`chart-container-${project.id}`} id={`chart-for-project-${project.id}`} className="w-[600px] p-4 bg-background">
            <ProjectChartComponent 
              project={project} 
              tasks={tasks.filter(t => t.projectId === project.id)} 
            />
          </div>
        ))}
      </div>
    </>
  );
}
