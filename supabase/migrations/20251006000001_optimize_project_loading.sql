-- Crear la función que obtiene proyectos para un usuario
CREATE OR REPLACE FUNCTION public.get_projects_for_user(p_user_id uuid, p_user_email text)
RETURNS SETOF projects
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar si el usuario es admin
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id 
    AND role = 'admin'
  ) THEN
    -- Si es admin, retornar todos los proyectos
    RETURN QUERY SELECT * FROM projects ORDER BY created_at DESC;
  ELSE
    -- Si no es admin, retornar solo sus proyectos y donde es miembro
    RETURN QUERY 
    SELECT DISTINCT p.*
    FROM projects p
    LEFT JOIN project_members pm ON p.id = pm.project_id
    WHERE 
      p.user_id = p_user_id 
      OR p.creator_email = p_user_email
      OR pm.user_id = p_user_id
    ORDER BY p.created_at DESC;
  END IF;
END;
$$;