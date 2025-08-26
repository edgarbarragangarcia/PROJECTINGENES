
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
import { MoreVertical, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '../ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Progress } from '../ui/progress';

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

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Nombre del Proyecto</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Progreso</TableHead>
            <TableHead>Tareas</TableHead>
            <TableHead className="text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id}>
              <TableCell className="font-medium">{project.name}</TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(project.status)} className={cn("text-xs", project.status === 'Completado' && 'bg-emerald-600 text-white border-emerald-600')}>{project.status}</Badge>
              </TableCell>
              <TableCell>
                 <div className="flex items-center gap-2">
                    <Progress value={project.progress} className="h-2 w-24" />
                    <span className="text-xs text-muted-foreground">{project.progress}%</span>
                </div>
              </TableCell>
              <TableCell>
                {getTaskCountForProject(project.id)}
              </TableCell>
              <TableCell className="text-right">
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
