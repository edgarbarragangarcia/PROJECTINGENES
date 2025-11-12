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
    const session: SessionPayload | undefined = body?.session || body?.data?.session || body;

    if (!session || !session.access_token) {
      return NextResponse.json({ error: 'No session provided' }, { status: 400 });
    }

    const projectRef = getProjectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const cookieName = `sb-${projectRef}-auth-token`;

    const cookieValue = JSON.stringify(session);

    const res = NextResponse.json({ ok: true });

    const expires = session.expires_at ? new Date(session.expires_at * 1000) : undefined;

    res.cookies.set({
      name: cookieName,
      value: cookieValue,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
      expires,
    });

    // Also set a short non-httpOnly mirror for debugging in dev (only if not prod)
    if (process.env.NODE_ENV !== 'production') {
      res.cookies.set({
        name: 'sb-auth-token-debug',
        value: cookieValue,
        httpOnly: false,
        secure: false,
        path: '/',
        sameSite: 'lax',
        expires,
      });
    }

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
