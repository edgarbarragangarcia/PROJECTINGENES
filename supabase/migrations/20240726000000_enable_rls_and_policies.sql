-- Habilitar RLS en la tabla de proyectos si aún no está habilitada
alter table public.projects enable row level security;

-- Eliminar la política anterior si existe, para evitar conflictos
drop policy if exists "Allow authenticated users to read projects" on public.projects;

-- Crear la nueva política de SELECT
create policy "Allow authenticated users to read projects"
on public.projects for select
to authenticated
using (
  -- El usuario puede ver el proyecto si es el propietario
  auth.uid() = user_id OR
  -- O si el email del usuario está en la lista de administradores
  auth.email() IN ('eabarragang@ingenes.com', 'ntorres@ingenes.com')
);

-- Asegurarse de que los usuarios puedan crear proyectos
drop policy if exists "Allow authenticated users to create projects" on public.projects;
create policy "Allow authenticated users to create projects"
on public.projects for insert
to authenticated
with check (auth.uid() = user_id);

-- Asegurarse de que los usuarios puedan actualizar sus propios proyectos
drop policy if exists "Allow authenticated users to update their own projects" on public.projects;
create policy "Allow authenticated users to update their own projects"
on public.projects for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Asegurarse de que los usuarios puedan eliminar sus propios proyectos
drop policy if exists "Allow authenticated users to delete their own projects" on public.projects;
create policy "Allow authenticated users to delete their own projects"
on public.projects for delete
to authenticated
using (auth.uid() = user_id);
