declare module 'next/server' {
  // Minimal, loose typings for Next.js server helpers used in the app.
  // Keep these permissive to avoid blocking the editor when Next's own
  // declarations aren't available to the TypeScript server.

  export const NextResponse: any
  export type NextRequest = any
  export default NextResponse
}
