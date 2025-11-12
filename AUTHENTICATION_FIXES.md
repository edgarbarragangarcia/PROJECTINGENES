# Authentication & Service Worker Fixes

## Issues Fixed

### 1. Service Worker Navigation Preload Error
**Error**: "Failed to enable or disable navigation preload: The registration does not have an active worker."

**Root Cause**: The SW was trying to enable navigation preload at module load time before the worker was properly installed and activated.

**Solution**: Moved navigation preload enable to the `activate` event listener, ensuring it only runs after the worker is active.

```typescript
// Before (WRONG):
if (self.registration.navigationPreload) {
  await self.registration.navigationPreload.enable()
}

// After (CORRECT):
self.addEventListener('activate', () => {
  self.clients.claim()
  if (self.registration.navigationPreload) {
    self.registration.navigationPreload.enable()
  }
})
```

**Files Changed**:
- `src/app/sw.ts` - Fixed SW lifecycle management

### 2. Service Worker Registration Excluded from Middleware
The middleware was intercepting SW requests and causing redirects.

**Solution**: Updated middleware matcher to exclude:
- `sw.js` - Service Worker script
- `workbox*` - Workbox cache files

**Files Changed**:
- `src/middleware.ts` - Updated matcher pattern

## Authentication Flow Debugging

### Expected Flow for Google OAuth:
1. User clicks "Continuar con Google" on `/login`
2. `supabase.auth.signInWithOAuth()` redirects to Google
3. User authenticates with Google
4. Google redirects to `/auth/callback?code=...`
5. `/auth/callback` exchanges code for session
6. Session cookies are set
7. User redirected to `/dashboard`
8. Middleware validates session from cookies
9. Dashboard loads

### Potential Issues to Check:

**If stuck on Google login page:**
- ❌ Google OAuth credentials not set in Supabase
- ❌ Redirect URL not whitelisted in Google Cloud Console
- ❌ Google credentials expired (last login Oct 13)

**If redirected back to login after Google auth:**
- ❌ Session cookies not being set
- ❌ Middleware not reading cookies correctly
- ❌ Supabase session verification failing

### How to Verify Supabase Connection:

```bash
# In browser console:
const { createClient } = await import('/lib/supabase/client.js')
const supabase = createClient()
const { data: { session } } = await supabase.auth.getSession()
console.log('Current session:', session)

# Check cookies:
document.cookie
```

## Next Steps

1. **Verify Google OAuth Configuration**:
   - Go to Supabase Dashboard → Authentication → Providers
   - Check Google provider is enabled
   - Verify Client ID matches `GOOGLE_CLIENT_ID` in `.env.local`
   - Confirm redirect URL in Google Cloud Console includes your domain

2. **Check Supabase Connection**:
   - Open browser DevTools
   - Go to Network tab
   - Try Google login
   - Look for requests to `ytljrvcjstbuhrdothhf.supabase.co`
   - Check for 200 OK responses

3. **Review Logs**:
   - Check server console logs (terminal where `npm run dev` runs)
   - Look for `[auth/callback]` debug messages
   - Verify `exchangeCodeForSession` completes successfully

## Configuration Files

### Environment Variables (`/.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL`: https://ytljrvcjstbuhrdothhf.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Configured (verify in Supabase dashboard)
- `GOOGLE_CLIENT_ID`: 200195319039-o6hpcl23sitvssi47ms76h4rn3p0ha6k.apps.googleusercontent.com

### Key Files
- `src/middleware.ts` - Auth and routing logic
- `src/app/auth/callback/route.ts` - OAuth callback handler
- `src/app/login/page.tsx` - Login UI and OAuth trigger
- `src/app/sw.ts` - Service Worker setup
- `src/lib/supabase/client.ts` - Supabase client initialization

