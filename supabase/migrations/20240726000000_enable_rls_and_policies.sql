-- 1. Habilitar RLS en la tabla 'projects'
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 2. Crear una política para permitir a los usuarios autenticados leer todos los proyectos
CREATE POLICY "Allow authenticated users to read projects"
ON public.projects
FOR SELECT
TO authenticated
USING (true);

-- 3. Crear una política para permitir a los usuarios crear sus propios proyectos
CREATE POLICY "Allow individual user to create their own projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4. Crear una política para permitir a los usuarios actualizar sus propios proyectos
CREATE POLICY "Allow individual user to update their own projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 5. Crear una política para permitir a los usuarios eliminar sus propios proyectos
CREATE POLICY "Allow individual user to delete their own projects"
ON public.projects
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 6. Habilitar RLS en la tabla 'tasks'
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 7. Crear políticas para tareas (similar a proyectos)
CREATE POLICY "Allow authenticated users to read tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow individual user to create their own tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow individual user to update their own tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Allow individual user to delete their own tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 8. Política para leer perfiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
