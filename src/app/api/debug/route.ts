import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (e) {
              // ignore if running in a context where cookies cannot be set
            }
          },
          remove(name: string, options) {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch (e) {
              // ignore
            }
          }
        }
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ user: null, tasks: [], projects: [] });
    }

    // Fetch tasks the server can see for this user
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*, subtasks(*)')
      .or(`user_id.eq.${user.id},assignees.cs.["${user.email}"]`)
      .order('created_at', { ascending: false });

    // Try RPC to get projects the user has access to (works with RLS)
    let projects: any[] = [];
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_projects_for_user', {
        p_user_id: user.id,
        p_user_email: user.email || ''
      });
      if (!rpcError && rpcData) projects = rpcData as any[];
    } catch (e) {
      // ignore rpc failure, fallback to owned projects and related projects
    }

    if (projects.length === 0) {
      const { data: owned } = await supabase.from('projects').select('*').eq('user_id', user.id);
      projects = owned || [];
    }

    return NextResponse.json({ user, tasks: tasks || [], projects });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
