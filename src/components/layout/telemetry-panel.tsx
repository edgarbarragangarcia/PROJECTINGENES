'use client';

import { useEffect, useState } from 'react';

export default function TelemetryPanel() {
  const [events, setEvents] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    let mounted = true;
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/telemetry');
        const json = await res.json();
        if (mounted) setEvents(json.events || []);
      } catch (e) {
        // ignore
      }
    };
    fetchEvents();
    const id = setInterval(fetchEvents, 3000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div style={{ position: 'fixed', right: 12, bottom: 84, zIndex: 60 }}>
      <div style={{ width: 320, background: 'rgba(0,0,0,0.6)', color: 'white', padding: 8, borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>Telemetry</strong>
          <button onClick={() => setOpen(o => !o)} style={{ background: 'transparent', color: 'white' }}>{open ? 'Close' : 'Open'}</button>
        </div>
        {open && (
          <div style={{ marginTop: 8, maxHeight: 300, overflow: 'auto', fontSize: 12 }}>
            {events.length === 0 ? (
              <div>No events</div>
            ) : (
              events.slice(0, 100).map((e, i) => (
                <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ opacity: 0.8 }}>{e.ts}</div>
                  <div><strong>{e.type}</strong></div>
                  <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(e.payload)}</pre>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
