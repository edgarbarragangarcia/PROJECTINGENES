
'use client';

import type { ProjectWithProgress, Task } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Edit, Trash2, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '../ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Progress } from '../ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProjectListViewProps {
  projects: ProjectWithProgress[];
  tasks: Task[];
  onEdit: (project: ProjectWithProgress) => void;
  onDelete: (projectId: string, projectName: string) => void;
}

export function ProjectListView({ projects, tasks, onEdit, onDelete }: ProjectListViewProps) {
  
  const getStatusBadgeVariant = (status: ProjectWithProgress['status']) => {
    switch (status) {
      case 'Completado': return 'default';
      case 'En Progreso': return 'secondary';
      case 'En Pausa': return 'outline';
      default: return 'outline';
    }
  };

  const getTaskCountForProject = (projectId: string) => {
    return tasks.filter(task => task.projectId === projectId).length;
  }
  
  const getTasksForProject = (projectId: string) => {
    return tasks.filter(task => task.projectId === projectId);
  }

  return (
    <div className="border rounded-lg">
      <div className="px-4 py-2 bg-muted/50 rounded-t-lg">
        <div className="grid grid-cols-12 items-center">
            <div className="col-span-5 font-medium text-sm text-muted-foreground">Nombre del Proyecto</div>
            <div className="col-span-2 font-medium text-sm text-muted-foreground">Estado</div>
            <div className="col-span-3 font-medium text-sm text-muted-foreground">Progreso</div>
            <div className="col-span-1 font-medium text-sm text-muted-foreground">Tareas</div>
            <div className="col-span-1"></div>
        </div>
      </div>
      <Accordion type="multiple" className="w-full">
        {projects.map((project) => (
          <AccordionItem value={project.id} key={project.id}>
             <div className="grid grid-cols-12 items-center px-4 py-2 border-b hover:bg-muted/50 transition-colors">
                <AccordionTrigger className="col-span-5 py-0 justify-start">
                  <div className="flex items-center gap-2">
                     <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                     <span className="font-medium text-base">{project.name}</span>
                  </div>
                </AccordionTrigger>
                <div className="col-span-2">
                  <Badge variant={getStatusBadgeVariant(project.status)} className={cn("text-xs", project.status === 'Completado' && 'bg-emerald-600 text-white border-emerald-600')}>{project.status}</Badge>
                </div>
                <div className="col-span-3">
                   <div className="flex items-center gap-2">
                      <Progress value={project.progress} className="h-2 w-full max-w-[150px]" />
                      <span className="text-xs text-muted-foreground">{project.progress}%</span>
                  </div>
                </div>
                <div className="col-span-1">
                  {getTaskCountForProject(project.id)}
                </div>
                <div className="col-span-1 flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(project)}>
                        <Edit className="mr-2 size-4" />
                        Editar
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}>
                            <Trash2 className="mr-2 size-4" />
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
                            <AlertDialogAction onClick={() => onDelete(project.id, project.name)} className="bg-destructive hover:bg-destructive/90">
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
            </div>
            <AccordionContent>
              <div className="bg-slate-50 dark:bg-slate-900/50 px-8 py-4 border-b">
                 {getTasksForProject(project.id).length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tarea</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Prioridad</TableHead>
                          <TableHead>Vencimiento</TableHead>
                          <TableHead>Responsable</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getTasksForProject(project.id).map(task => (
                          <TableRow key={task.id}>
                            <TableCell>{task.title}</TableCell>
                            <TableCell><Badge variant='outline'>{task.status}</Badge></TableCell>
                            <TableCell>{task.priority}</TableCell>
                            <TableCell>{task.dueDate ? format(task.dueDate, 'dd MMM yyyy', {locale: es}) : 'N/A'}</TableCell>
                            <TableCell>{task.assignee || 'N/A'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                 ) : (
                    <p className="text-center text-sm text-muted-foreground py-4">Este proyecto aún no tiene tareas.</p>
                 )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
