
'use client';

import { useTasks } from '@/hooks/use-tasks';
import { PageHeader } from '@/components/layout/page-header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function UserManagementPage() {
  const { allUsers, updateUserRole } = useTasks();
  const { toast } = useToast();

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      await updateUserRole(userId, newRole);
      toast({
        title: 'Rol actualizado',
        description: 'El rol del usuario ha sido actualizado correctamente.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al actualizar el rol',
        description: error.message,
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Gestión de Usuarios" />
      <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol Actual</TableHead>
                <TableHead className="w-[200px]">Cambiar Rol</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name || 'N/A'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role === 'admin' ? 'Administrador' : 'Usuario'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      defaultValue={user.role || 'user'}
                      onValueChange={(value: 'admin' | 'user') => handleRoleChange(user.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar un rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuario</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
