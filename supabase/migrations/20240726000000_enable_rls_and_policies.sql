-- Habilitar RLS para las tablas
alter table public.projects enable row level security;
alter table public.tasks enable row level security;

-- Eliminar políticas existentes si es necesario (para evitar errores en re-aplicación)
drop policy if exists "Allow authenticated users to view projects" on projects;
drop policy if exists "Allow user to create projects" on projects;
drop policy if exists "Allow user to update their own projects" on projects;
drop policy if exists "Allow user to delete their own projects" on projects;

drop policy if exists "Allow authenticated users to view tasks" on tasks;
drop policy if exists "Allow user to create tasks" on tasks;
drop policy if exists "Allow user to update their own tasks" on tasks;
drop policy if exists "Allow user to delete their own tasks" on tasks;

-- Políticas para la tabla 'projects'
create policy "Allow authenticated users to view projects" on projects for select using (
  auth.uid() = user_id or 
  (select auth.jwt() ->> 'email') in ('eabarragang@ingenes.com', 'ntorres@ingenes.com', 'edgarbarragangarcia@gmail.com')
);

create policy "Allow user to create projects" on projects for insert with check (
  auth.uid() = user_id
);

create policy "Allow user to update their own projects" on projects for update using (
  auth.uid() = user_id
);

create policy "Allow user to delete their own projects" on projects for delete using (
  auth.uid() = user_id
);

-- Políticas para la tabla 'tasks'
create policy "Allow authenticated users to view tasks" on tasks for select using (
  auth.uid() = user_id or
  (select auth.jwt() ->> 'email') in ('eabarragang@ingenes.com', 'ntorres@ingenes.com', 'edgarbarragangarcia@gmail.com')
);

create policy "Allow user to create tasks" on tasks for insert with check (
  auth.uid() = user_id
);

create policy "Allow user to update their own tasks" on tasks for update using (
  auth.uid() = user_id
);

create policy "Allow user to delete their own tasks" on tasks for delete using (
  auth.uid() = user_id
);
