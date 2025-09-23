import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(() => null);
    // Print to server logs (Vercel will capture this)
    console.error('[client-error]', JSON.stringify(payload, null, 2));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[client-error] failed to log', e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
