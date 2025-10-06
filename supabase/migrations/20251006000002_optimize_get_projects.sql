-- Drop the function if it exists
DROP FUNCTION IF EXISTS public.get_projects_for_user(uuid, text);

-- Create optimized function for fetching projects
CREATE OR REPLACE FUNCTION public.get_projects_for_user(p_user_id uuid, p_user_email text)
RETURNS SETOF projects
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin boolean;
BEGIN
    -- Check if user is admin
    SELECT (role = 'admin')::boolean INTO v_is_admin
    FROM profiles
    WHERE id = p_user_id;

    IF v_is_admin THEN
        -- Admin gets all projects
        RETURN QUERY 
        SELECT *
        FROM projects
        ORDER BY created_at DESC;
    ELSE
        -- Regular users get only their projects and related ones
        RETURN QUERY 
        SELECT DISTINCT p.*
        FROM projects p
        LEFT JOIN project_members pm ON p.id = pm.project_id
        WHERE 
            -- Projects they created
            p.user_id = p_user_id 
            -- Projects where they are the creator by email
            OR p.creator_email = p_user_email
            -- Projects where they are members
            OR pm.user_id = p_user_id
            -- Projects where they are assigned to tasks
            OR EXISTS (
                SELECT 1 
                FROM tasks t 
                WHERE t.project_id = p.id 
                AND (t.user_id = p_user_id OR t.assignees ? p_user_email)
            )
        ORDER BY p.created_at DESC;
    END IF;
END;
$$;