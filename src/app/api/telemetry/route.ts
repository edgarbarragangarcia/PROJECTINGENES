import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const TELEMETRY_FILE = path.join(process.cwd(), 'telemetry.log');

export async function POST(req: Request) {
  try {
    // Only accept in development to avoid storing prod telemetry locally
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ ok: false }, { status: 403 });
    }

    const data = await req.json();
    fs.appendFileSync(TELEMETRY_FILE, JSON.stringify(data) + '\n');
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ ok: false }, { status: 403 });
    }

    if (!fs.existsSync(TELEMETRY_FILE)) return NextResponse.json({ events: [] });
    const content = fs.readFileSync(TELEMETRY_FILE, 'utf-8').trim();
    if (!content) return NextResponse.json({ events: [] });
    const lines = content.split('\n').slice(-200).filter(Boolean);
    const events = lines.map(l => {
      try { return JSON.parse(l); } catch { return l; }
    }).reverse();
    return NextResponse.json({ events });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
