
'use client';

import { PageHeader } from '../layout/page-header';
import type { Project, ProjectWithProgress, Task } from '@/lib/types';
import { Button } from '../ui/button';
import { MoreVertical, PlusCircle, Trash2, Edit, FileDown } from 'lucide-react';
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

export function ProjectsPage() {
  const { projects, loading, deleteProject } = useProjects();
  const { tasks } = useTasks();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<ProjectWithProgress | undefined>();
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartProject, setChartProject] = useState<ProjectWithProgress | null>(null);

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
      case 'En Progreso': return 'secondary';
      case 'En Pausa': return 'outline';
      default: return 'outline';
    }
  };
  
  const handleDownloadPdf = async () => {
    const doc = new jsPDF();
    let yPos = 28;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Informe General de Proyectos', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha de generación: ${format(new Date(), 'PPPP', {locale: es})}`, 105, yPos, { align: 'center' });
    
    yPos += 15;

    for (const project of projects) {
        if (yPos > 220) { // Check space before adding content
            doc.addPage();
            yPos = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(project.name, 14, yPos);
        yPos += 7;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Estado: ${project.status} | Progreso: ${project.progress}%`, 14, yPos);
        yPos += 10;

        // Render chart and add as image
        if (chartRef.current) {
            setChartProject(project);
            // Give it a moment to render with the new data
            await new Promise(resolve => setTimeout(resolve, 50)); 
            const canvas = await html2canvas(chartRef.current, { backgroundColor: null });
            const imgData = canvas.toDataURL('image/png');
            
            // Calculate aspect ratio
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
            const tableData = projectTasks.map(t => [
                t.title,
                t.status,
                t.priority,
                t.dueDate ? format(t.dueDate, 'dd/MM/yyyy') : 'N/A'
            ]);

            autoTable(doc, {
                head: [['Tarea', 'Estado', 'Prioridad', 'Fecha de Vencimiento']],
                body: tableData,
                startY: yPos,
                headStyles: { fillColor: [41, 128, 185] },
                styles: { fontSize: 8 },
                columnStyles: {
                    0: { cellWidth: 'auto' },
                    1: { cellWidth: 30 },
                    2: { cellWidth: 25 },
                    3: { cellWidth: 30 },
                }
            });

            const finalY = (doc as any).lastAutoTable.finalY;
            yPos = finalY + 15;
        } else {
            doc.setFontSize(9);
            doc.text('Este proyecto no tiene tareas.', 14, yPos);
            yPos += 15;
        }
    }
    setChartProject(null); // Clean up after finishing
    doc.save(`informe-proyectos-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };


  const renderContent = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
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

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {projects.map((project) => (
          <Card key={project.id} className="flex flex-col hover:shadow-lg transition-shadow duration-300 text-sm">
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
                             <Badge variant={getStatusBadgeVariant(project.status)} className={cn("text-xs", project.status === 'Completado' && 'bg-emerald-600 text-white border-emerald-600')}>{project.status}</Badge>
                        </div>
                    </div>
                </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col h-full">
        <PageHeader title="Proyectos">
          <div className='flex items-center gap-2'>
            {isAdmin && (
              <Button size="sm" variant="outline" onClick={handleDownloadPdf}>
                <FileDown />
                Generar Informe PDF
              </Button>
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
      <div ref={chartRef} className="absolute -left-[9999px] top-0 w-[600px]">
        {chartProject && (
          <ProjectChartComponent 
            project={chartProject} 
            tasks={tasks.filter(t => t.projectId === chartProject.id)} 
          />
        )}
      </div>
    </>
  );
}
