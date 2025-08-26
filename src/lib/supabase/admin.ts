import { createClient } from '@supabase/supabase-js';

// Important: This file should not be used in the client-side code.
// It is intended for server-side operations only, where environment variables are secure.

export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);
