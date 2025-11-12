# 🔍 GUÍA DE DEPURACIÓN: OAUTH EN SAFARI

**Fecha:** 12 de noviembre de 2025  
**Objetivo:** Diagnosticar por qué Google OAuth no abre en Safari

---

## 📋 CHECKLIST ANTES DE PROBAR

### Servidor
- ✅ Dev server corriendo en `http://localhost:9003`
- ✅ AuthSyncProvider integrado (escucha cambios de sesión)
- ✅ POST `/api/auth/set-session` implementado (sync de cookies)
- ✅ `/auth/callback` intercambia código OAuth por sesión
- ✅ Middleware valida sesión desde cookie httpOnly

### Cliente
- ✅ `signInWithOAuth` sin await sincrónico (promise-based)
- ✅ `location.assign(redirectUrl)` para navegación user-gesture
- ✅ Console logs detallados en login-content.tsx

---

## 🧪 PASOS DE PRUEBA EN SAFARI

### 1️⃣ PREPARACIÓN INICIAL

```
1. Abre Safari Developer Tools:
   - Safari → Preferences → Advanced → ✅ Show Develop menu in menu bar
   - Develop → Enable Remote Debugging (si usas el simulador/otro device)

2. Abre DevTools:
   - Opción 1: Develop → Show Web Inspector
   - Opción 2: Command + Option + I
```

### 2️⃣ VERIFICAR ESTADO INICIAL

**En Safari DevTools - Elements tab:**
```
1. Revisa Storage → Cookies:
   - ❌ No debería haber `sb-*` cookie aún (no autenticado)
   
2. Revisa Storage → Local Storage:
   - Vacío (esperado con httpOnly cookie strategy)
```

**En Safari Console:**
```
1. Verifica que el app cargó:
   - Deberías ver "[AuthSync]" logs
   - Mensaje: "[AuthSync] No session, clearing server cookie..." (primer load)
```

---

### 3️⃣ HACER CLICK EN "CONTINUAR CON GOOGLE"

**Comportamiento esperado:**

✅ **DESEADO (funciona):**
```
1. Console ve:
   [login] 🔵 Starting Google OAuth...
   [login] Redirect URL: http://localhost:9003/auth/callback
   [login] ▶️ Async redirect to OAuth URL https://accounts.google.com/...

2. Safari abre nueva ventana/tab a accounts.google.com
3. Usuario inicia sesión con Google
4. Google redirige a http://localhost:9003/auth/callback?code=...
5. Callback intercambia código por sesión
6. AuthSyncProvider POST /api/auth/set-session → cookie httpOnly creada
7. Middleware ve cookie → redirige a /dashboard
8. Usuario ve dashboard 🎉
```

❌ **PROBLEMA (lo que reportaste):**
```
1. Click en "Continuar con Google" → nada sucede
2. Console ve:
   [login] 🔵 Starting Google OAuth...
   Pero NO ve el redirect URL
3. Safari NO abre accounts.google.com
4. Posibles causas:
   a) Safari bloqueó popup/redirección (user gesture issue)
   b) ITP (Intelligent Tracking Prevention) bloqueó la navegación
   c) Cookie policy differences
   d) signInWithOAuth devolvió error silenciosamente
```

---

## 🔧 QIFICACIÓN DE PROBLEMAS

### Problema A: "Nada sucede al hacer click"

**Causa probable:** Safari bloqueó navegación porque no es percibida como user-gesture.

**Solución:**
```
Revisamos src/app/login/login-content.tsx línea ~180:

// ✅ ACTUAL (correcto):
const promise = supabase.auth.signInWithOAuth({...});
promise.then((res: any) => {
  const redirectUrl = res?.data?.url;
  if (redirectUrl) {
    (globalThis as any).location.assign(redirectUrl); // ✅ En contexto user
  }
});

// ❌ INCORRECTO (Safari bloquea):
const { data } = await supabase.auth.signInWithOAuth({...});
location.assign(data.url); // ❌ Después de await = no user gesture
```

**Verificación:**
1. Abre DevTools → Console
2. Escribe: `console.log(typeof location)` → debe retornar "object"
3. Escribe: `location.href` → debe retornar URL actual
4. Si ambos funcionan, `location.assign()` debería funcionar

---

### Problema B: "Error de CORS o timeout"

**En DevTools - Network tab:**
```
1. Busca solicitud POST a https://accounts.google.com
2. Si está en rojo o muestra error CORS → issue de OAuth provider
3. Si no está → la llamada nunca se hizo (error antes)
```

**En DevTools - Console:**
```
1. Busca errores como:
   - "[login] ❌ Google OAuth error: ..."
   - "NotAllowedError: User cancelled the authentication dialog"
   - "DOMException: The request is not allowed by the user agent or the platform..."
```

---

### Problema C: "Se abre Google, pero no redirige de vuelta"

**Pasos:**
1. En Network tab, busca solicitud a `/auth/callback?code=...`
2. Si está en rojo (error):
   ```
   DevTools → Network → Click en /auth/callback
   Response tab → lee el error JSON
   ```
3. Si es 200 pero no redirige a /dashboard:
   ```
   Server logs:
   - grep para "[set-session] Setting auth cookie:"
   - grep para "[middleware] Processing request for: /dashboard"
   ```

---

## 📊 RECOLECTAR DIAGNÓSTICO

### Logs que necesitamos:

**1. Client Logs (Safari Console):**
```
[login] 🔵 Starting Google OAuth...
[login] Redirect URL: ...
[login] ▶️ Async redirect to OAuth URL ...
[AuthSync] Auth state changed: SIGNED_IN
[AuthSync] Session detected, syncing to server...
[AuthSync] ✅ Session synced to server
```

**2. Server Logs (npm run dev terminal):**
```
[middleware] Processing request for: /auth/callback
POST /api/auth/set-session 200
[set-session] Setting auth cookie: sb-ytljrvcjstbuhrdothhf-auth-token
[middleware] Processing request for: /dashboard
[middleware] Auth cookie present: true
✅ User validated, allowing access to /dashboard
```

**3. DevTools - Cookies (Application tab):**
```
ANTES de login:
- ❌ No `sb-*` cookie

DESPUÉS de Google login + callback:
- ✅ Debería haver `sb-ytljrvcjstbuhrdothhf-auth-token` con valor base64
- ✅ HttpOnly: Sí
- ✅ Secure: Sí (en prod) / No (en dev)
- ✅ SameSite: Lax
```

---

## ✅ PASOS PARA REPRODUCIR EL FIX

1. **Abre Safari**, ve a `http://localhost:9003/login`

2. **Abre DevTools** (Cmd+Option+I)
   - Pestaña "Console" abierta para ver logs

3. **Haz click en "Continuar con Google"**

4. **Recopila logs:**
   - Console logs (cliente)
   - Network tab (solicitudes)
   - Cookies (DevTools → Storage → Cookies)

5. **Si falla:**
   - Copia el error exacto del console
   - Nota el comportamiento (popup bloqueado, navegación no sucedió, etc.)
   - Revisa server logs en terminal

6. **Si funciona:**
   - Deberías ser redirigido a /dashboard
   - En DevTools → Storage → Cookies deberías ver `sb-auth-token`
   - En console verías `[AuthSync] ✅ Session synced to server`

---

## 🎯 RESULTADO ESPERADO

**Usuario completa flujo:**
```
1. Login page (/login)
2. Click "Continuar con Google"
3. Se abre accounts.google.com
4. Usuario completa sign-in de Google
5. Google redirige a /auth/callback?code=...
6. /auth/callback intercambia código → sesión
7. AuthSyncProvider POSTea a /api/auth/set-session
8. Cookie httpOnly se crea en servidor
9. Middleware ve cookie → valida usuario
10. Redirige a /dashboard
11. ✅ Usuario en dashboard autenticado
```

---

## 📞 PRÓXIMOS PASOS SI SIGUE FALLANDO

Si después de probar estos pasos sigue sin funcionar en Safari:

1. **Crear página debug temporaria:**
   ```
   Nueva ruta: /auth/debug-callback
   Muestra: session JSON + cookies observadas
   ```

2. **Verificar ITP (Intelligent Tracking Prevention):**
   ```
   Safari Preferences → Privacy → Prevent cross-site tracking
   Toggle OFF temporalmente para probar
   ```

3. **Probar con Safari en modo privado:**
   ```
   Safari File → Open Private Window
   Algunos bugs de cookies/storage no aparecen en private mode
   ```

4. **Comparar con Chrome:**
   ```
   Chrome: ✅ funciona
   Safari: ❌ no funciona
   → Indica issue específico de Safari (ITP, user gesture, cookie policy)
   ```

---

**Documento creado:** 12 de noviembre de 2025  
**Versión:** 1.0
