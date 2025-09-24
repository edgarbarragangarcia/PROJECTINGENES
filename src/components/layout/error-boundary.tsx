'use client';

import React from 'react';

type State = { hasError: boolean; error?: Error };

export class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production, send errors to the server so they appear in Vercel logs
    try {
      if (process.env.NODE_ENV === 'production') {
        fetch('/api/log-client-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ts: new Date().toISOString(), message: error.message, stack: error.stack, info }),
        }).catch(() => {});
      } else {
        // in dev, still log to console
        // eslint-disable-next-line no-console
        console.error('Captured client error', error, info);
      }
    } catch (e) {
      // ignore
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24 }}>
          <h2>Application error: an unexpected client-side exception has occurred.</h2>
          <p>Please check the browser console for more information.</p>
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <details style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>
              <summary style={{ cursor: 'pointer' }}>Error details (development only)</summary>
              <div><strong>Message:</strong> {this.state.error.message}</div>
              <pre style={{ marginTop: 8 }}>{this.state.error.stack}</pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

export default ErrorBoundary;
