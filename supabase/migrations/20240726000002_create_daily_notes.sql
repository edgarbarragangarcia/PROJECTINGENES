-- supabase/migrations/20240726000002_create_daily_notes.sql

-- 1. Crear la tabla para las notas diarias, solo si no existe
CREATE TABLE IF NOT EXISTS public.daily_notes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  note text,
  "date" date NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  CONSTRAINT daily_notes_pkey PRIMARY KEY (id),
  CONSTRAINT daily_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT daily_notes_user_id_date_key UNIQUE (user_id, date) -- Un usuario solo puede tener una nota por día
);

-- 2. Habilitar la Seguridad a Nivel de Fila (RLS)
ALTER TABLE public.daily_notes ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas de RLS, solo si no existen

-- Los usuarios pueden ver sus propias notas
CREATE POLICY "Enable read access for user's own notes" ON public.daily_notes
AS PERMISSIVE FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Los usuarios pueden insertar sus propias notas
CREATE POLICY "Enable insert for user's own notes" ON public.daily_notes
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden actualizar sus propias notas
CREATE POLICY "Enable update for user's own notes" ON public.daily_notes
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden eliminar sus propias notas
CREATE POLICY "Enable delete for user's own notes" ON public.daily_notes
AS PERMISSIVE FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
