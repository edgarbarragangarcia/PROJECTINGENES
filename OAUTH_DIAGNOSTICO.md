# 🔍 Diagnóstico: OAuth Google + Chrome vs Safari

## Problemas Identificados

### 1️⃣ **Chrome NO funciona, Safari SÍ**
**Causa:** Chrome bloquea cookies de terceros por defecto en localhost (en producción es más permisivo)

```
Safari:  ✅ Permite cookies en localhost
Chrome:  ❌ Bloquea cookies en localhost (mismas razones que terceros)
```

**Solución:** En Chrome, habilitar:
- `chrome://flags` → buscar "SameSite" → marcar "Disabled"
- O usar `--disable-web-resources` al abrir Chrome
- O mejor: probar con `localhost:9003` usando HTTPS (local CA)

### 2️⃣ **Google OAuth NO redirige a Google**

**Problema raíz:** El cliente Supabase no está recibiendo la sesión de Google correctamente.

**Causas posibles:**

#### A) `redirectTo` URL mal configurada
```typescript
// En src/app/login/page.tsx, línea ~187
const origin = typeof (global as any).window !== 'undefined' ? (global as any).window.location.origin : 'server';
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${origin}/auth/callback`, // ← Aquí podría estar el problema
  },
});
```

**Problema:** En localhost, `origin` será `http://localhost:9003`, pero Supabase en la consola podría estar configurado con URL diferente.

#### B) Supabase Google OAuth no configurado correctamente
- ¿Está habilitado en Supabase Dashboard?
- ¿Credenciales de Google OAuth configuradas?
- ¿Redirect URI incluye `http://localhost:9003/auth/callback`?

#### C) El endpoint `/auth/callback` no está sincronizando la sesión
```typescript
// src/app/auth/callback/route.ts
export async function GET(request: Request) {
  const code = requestUrl.searchParams.get('code')
  
  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
    // ⚠️ NO está llamando a /api/auth/set-session para sincronizar a httpOnly cookie
  }
  
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
}
```

**Problema:** Después de OAuth, la sesión NO se guarda en la httpOnly cookie, entonces:
1. Supabase OK en cliente
2. Redirige a `/dashboard`
3. Middleware busca sesión en cookie
4. NO la encuentra (porque `/auth/callback` no la sincronizó)
5. Redirige de vuelta a `/login` ❌

## Soluciones

### ✅ Solución 1: Actualizar `/auth/callback` para sincronizar sesión

```typescript
// src/app/auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    try {
      await supabase.auth.exchangeCodeForSession(code)
      
      // 🆕 Obtener la sesión recién creada y sincronizarla
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // Llamar al API para sincronizar a httpOnly cookie
        const response = await fetch(`${requestUrl.origin}/api/auth/set-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session }),
        })
        
        if (!response.ok) {
          console.error('Failed to set session cookie:', await response.text())
        }
      }
    } catch (error) {
      console.error('Error exchanging code:', error)
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
}
```

### ✅ Solución 2: Usar URL fija en lugar de detectar origin

```typescript
// src/app/login/page.tsx, en handleGoogleSignIn()

const handleGoogleSignIn = async () => {
  setError(null)
  setIsLoading(true)

  try {
    console.log('🔵 Iniciando Google OAuth...')
    
    // Usar origin del cliente directamente, más confiable
    const redirectTo = `${window.location.origin}/auth/callback`
    console.log('📍 Redirect URL:', redirectTo)
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })

    if (error) {
      console.error('❌ OAuth Error:', error)
      setError(`OAuth Error: ${error.message}`)
      setIsLoading(false)
    } else {
      console.log('✅ OAuth redirect initiated')
    }
  } catch (err) {
    console.error('❌ Exception:', err)
    setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    setIsLoading(false)
  }
}
```

### ✅ Solución 3: Verificar configuración en Supabase Dashboard

1. Ir a `Supabase Dashboard` → `Authentication` → `Providers`
2. Verificar `Google`:
   - ✅ Habilitado (toggle ON)
   - ✅ Client ID y Client Secret correctos
   - ✅ Redirect URI: `http://localhost:9003/auth/callback` (localhost testing)
   - ✅ En producción: `https://projectingenes.vercel.app/auth/callback`

### ✅ Solución 4: Chrome + localhost

Para Chrome en localhost:
```bash
# Opción A: Deshabilitar restricciones de cookies
open -a Google\ Chrome --args --disable-site-isolation-trials

# Opción B: Usar HTTPS local (mejor)
# Instalar mkcert y generar certificado local
brew install mkcert
mkcert -install
mkcert localhost 127.0.0.1

# Actualizar next.config.ts para HTTPS local
```

O simplemente: **Usa Safari para testing, Chrome para producción** (en producción no hay estos problemas).

## Pasos para Verificar

1. Abre DevTools (F12 en Chrome, Cmd+Option+I en Safari)
2. Tab "Network" → busca solicitudes a `accounts.google.com`
3. Si NO aparecen: Google OAuth no se está llamando
4. Si aparecen pero con error 403/401: Credenciales de Google mal
5. Si redirige a Google pero luego a login: `/auth/callback` no sincroniza

## TL;DR

**El flujo correcto debería ser:**
```
Login → Click "Google" 
  ↓ (Supabase llama signInWithOAuth)
  ↓
Redirige a accounts.google.com 
  ↓
Usuario hace login en Google 
  ↓
Google redirige a /auth/callback?code=xxx 
  ↓
Backend intercambia code por session 
  ↓
Backend llama /api/auth/set-session (FALTABA ESTO) 
  ↓
Backend redirige a /dashboard 
  ↓
Middleware ve cookie con access_token 
  ↓
✅ Dashboard accesible
```

**Actualmente omite el paso de sincronizar sesión a cookie, por eso vuelve a login.**
