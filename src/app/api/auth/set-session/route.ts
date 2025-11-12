import { NextResponse } from 'next/server';

type SessionPayload = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  [key: string]: any;
};

function getProjectRefFromUrl(url?: string) {
  if (!url) return 'sb';
  try {
    const u = new URL(url);
    const host = u.host; // e.g. ytljrvcjstbuhrdothhf.supabase.co
    const parts = host.split('.');
    return parts[0] || 'sb';
  } catch (e) {
    return 'sb';
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const session: SessionPayload | undefined | null = body?.session || body?.data?.session || body;

    const projectRef = getProjectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const cookieName = `sb-${projectRef}-auth-token`;

    const res = NextResponse.json({ ok: true });

    if (!session || !session.access_token) {
      // No session: clear the cookie (logout)
      console.log(`[set-session] Clearing auth cookie: ${cookieName}`);
      res.cookies.delete(cookieName);
      return res;
    }

    // Store ONLY the access_token in the cookie (not the full JSON)
    // This way createServerClient can read it as a standard auth cookie
    const cookieValue = session.access_token;
    const expires = session.expires_at ? new Date(session.expires_at * 1000) : undefined;

    console.log(`[set-session] Setting auth cookie: ${cookieName}`);

    res.cookies.set({
      name: cookieName,
      value: cookieValue,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
      expires,
    });

    return res;
  } catch (err: any) {
    console.error(`[set-session] Error:`, err?.message || String(err));
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
