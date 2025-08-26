-- 1. Eliminar la restricción UNIQUE que limita a una nota por día por usuario.
-- Se comprueba si la restricción existe antes de intentar eliminarla para evitar errores.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'daily_notes_user_id_date_key'
    AND    conrelid = 'public.daily_notes'::regclass
  ) THEN
    ALTER TABLE public.daily_notes DROP CONSTRAINT daily_notes_user_id_date_key;
  END IF;
END;
$$;

-- 2. Asegurarse de que la política de eliminación permita borrar notas específicas por su ID.
-- Se elimina la política existente y se vuelve a crear para garantizar que sea la correcta.
DROP POLICY IF EXISTS "Enable delete for user's own notes" ON public.daily_notes;
CREATE POLICY "Enable delete for user's own notes"
  ON public.daily_notes
  AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
