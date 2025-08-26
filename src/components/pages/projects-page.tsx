
'use client';

import { PageHeader } from '../layout/page-header';
import type { ProjectWithProgress } from '@/lib/types';
import { Button } from '../ui/button';
import { MoreVertical, PlusCircle, Trash2, Edit, FileDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Progress } from '../ui/progress';
import { useProjects } from '@/hooks/use-projects';
import { useEffect, useState } from 'react';
import { ProjectFormDialog } from '../project/project-form-dialog';
import Link from 'next/link';
import { Skeleton } from '../ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { createClient } from '@/lib/supabase/client';
import { adminEmails } from '@/providers/combined-provider';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTasks } from '@/hooks/use-tasks';

export function ProjectsPage() {
  const { projects, loading, deleteProject } = useProjects();
  const { tasks } = useTasks();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<ProjectWithProgress | undefined>();
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

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
    } catch (error: any) => {
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
  
  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    let yPos = 28;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Informe General de Proyectos', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha de generación: ${format(new Date(), 'PPPP', {locale: es})}`, 105, yPos, { align: 'center' });
    
    yPos += 15;

    projects.forEach(project => {
        if (yPos > 260) {
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
        yPos += 5;

        const projectTasks = tasks.filter(task => task.projectId === project.id);

        if (projectTasks.length > 0) {
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
    });


    doc.save(`informe-proyectos-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };


  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
             <div key={i} className="flex items-center gap-4 p-4 border rounded-md">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-6 w-1/4" />
             </div>
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
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Nombre del Proyecto</TableHead>
              <TableHead className="w-[30%]">Progreso</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="font-medium">
                  <Link href={`/projects/${project.id}`} className="hover:underline">
                    {project.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={project.progress} className="h-2 w-full" />
                    <span className="text-xs text-muted-foreground">{project.progress}%</span>
                  </div>
                </TableCell>
                <TableCell>
                    <Badge variant={getStatusBadgeVariant(project.status)} className={cn(project.status === 'Completado' && 'bg-emerald-600 text-white border-emerald-600')}>{project.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
      <div className="flex-1 overflow-auto p-6">
         {renderContent()}
      </div>
    </div>
    {isFormOpen && <ProjectFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} projectToEdit={projectToEdit} />}
    </>
  );
}
