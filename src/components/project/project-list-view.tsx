'use client';

import type { ProjectWithProgress, Task } from '@/types';
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
import { Checkbox } from '../ui/checkbox';
import Link from 'next/link';

interface ProjectListViewProps {
  projects: ProjectWithProgress[];
  tasks: Task[];
  onEdit: (project: ProjectWithProgress) => void;
  onDelete: (projectId: string, projectName: string) => void;
  selectedProjects: string[];
  onSelectProject: (projectId: string) => void;
}

export function ProjectListView({ projects, tasks, onEdit, onDelete, selectedProjects, onSelectProject }: ProjectListViewProps) {
  
  const getStatusBadgeVariant = (status: ProjectWithProgress['status']) => {
    switch (status) {
      case 'Completado': return 'default';
      case 'En Progreso': return 'default';
      case 'En Pausa': return 'outline';
      default: return 'outline';
    }
  };

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

  const getTaskCountForProject = (projectId: string) => {
    return tasks.filter(task => task.project_id === projectId).length;
  }
  
  const getTasksForProject = (projectId: string) => {
    return tasks.filter(task => task.project_id === projectId);
  }

  return (
    <div className="border rounded-lg">
      <div className="px-4 py-2 bg-muted/50 rounded-t-lg">
        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-12 items-center">
            <div className="col-span-5 font-medium text-sm text-muted-foreground flex items-center gap-4">
                <span className='pl-8'>Nombre del Proyecto</span>
            </div>
            <div className="col-span-2 font-medium text-sm text-muted-foreground">Estado</div>
            <div className="col-span-3 font-medium text-sm text-muted-foreground">Progreso</div>
            <div className="col-span-1 font-medium text-sm text-muted-foreground">Tareas</div>
            <div className="col-span-1"></div>
        </div>
        {/* Mobile header (simple) */}
        <div className="md:hidden flex items-center justify-between">
          <div className="font-medium text-sm">Proyectos</div>
          <div className="text-xs text-muted-foreground">Toca un proyecto para ver detalles</div>
        </div>
      </div>
      <Accordion type="multiple" className="w-full">
        {projects.map((project) => (
          <AccordionItem value={project.id} key={project.id}>
        {/* Desktop row */}
        <div className="hidden md:grid grid-cols-12 items-center px-4 py-2 border-b hover:bg-muted/50 transition-colors">
          <div className="col-span-5 py-0 justify-start flex items-center gap-3 min-w-0">
                 <Checkbox 
                   id={`select-list-${project.id}`}
                   checked={selectedProjects.includes(project.id)}
                   onCheckedChange={() => onSelectProject(project.id)}
                 />
                 <AccordionTrigger className='py-0 flex-1 min-w-0 justify-start [&_svg]:data-[state=closed]:-rotate-90'>
                   <div className="flex items-center gap-2 min-w-0">
                      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                      <Link href={`/projects/${project.id}`} className="font-medium text-base truncate block hover:underline">{project.name}</Link>
                   </div>
                 </AccordionTrigger>
               </div>
               <div className="col-span-2">
                  <Badge 
                     variant={getStatusBadgeVariant(project.status)} 
                     className={cn("text-xs", getStatusBadgeClass(project.status))}
                   >
                     {project.status}
                   </Badge>
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

           {/* Mobile compact row: title + progress under title, badge/menu to the right */}
           <div className="md:hidden flex flex-col px-4 py-3 border-b hover:bg-muted/50 transition-colors overflow-hidden">
             <div className="flex items-start justify-between gap-2">
               <div className="flex items-start gap-3 min-w-0">
                 <Checkbox 
                   id={`select-list-mobile-${project.id}`}
                   checked={selectedProjects.includes(project.id)}
                   onCheckedChange={() => onSelectProject(project.id)}
                 />
                 <div className="min-w-0 flex-1">
                   <AccordionTrigger className='py-0 flex-1 min-w-0 justify-start [&_svg]:data-[state=closed]:-rotate-90'>
                     <div className="flex items-center gap-2 min-w-0">
                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                        <Link href={`/projects/${project.id}`} className="font-medium text-sm truncate block hover:underline">{project.name}</Link>
                     </div>
                   </AccordionTrigger>
                   <div className="mt-2">
                     <div className="flex items-center gap-2">
                       <Progress value={project.progress} className="h-2 w-full" />
                       <span className="text-xs text-muted-foreground">{project.progress}%</span>
                     </div>
                   </div>
                 </div>
               </div>
               <div className="flex flex-col items-end gap-2 ml-2">
                 <Badge variant={getStatusBadgeVariant(project.status)} className={cn("text-xs whitespace-nowrap", getStatusBadgeClass(project.status))}>{project.status}</Badge>
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
             <div className="mt-2 text-sm text-muted-foreground pl-10">{getTaskCountForProject(project.id)} tareas</div>
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
                            <TableCell>{task.dueDate ? format(new Date(task.dueDate), 'dd MMM yyyy', {locale: es}) : 'N/A'}</TableCell>
                            <TableCell>{Array.isArray(task.assignees) ? task.assignees.join(', ') : task.assignees || 'N/A'}</TableCell>
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
