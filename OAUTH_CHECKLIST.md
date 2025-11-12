# 🔐 OAuth Google Setup - Checklist Completo

## ⚠️ IMPORTANTE: Verificar estas 3 cosas en orden

### 1. ✅ Google Cloud Console (Obligatorio)

URL: https://console.cloud.google.com/

**Pasos:**
1. Ve a "APIs & Services" → "Credentials"
2. Busca tu aplicación OAuth 2.0 (Project ID: `200195319039`)
3. Haz click en el nombre del cliente OAuth 2.0
4. En la sección "Authorized redirect URIs", debe estar:
   - `https://ytljrvcjstbuhrdothhf.supabase.co/auth/v1/callback`
   - `https://projectingenes.vercel.app/auth/callback`
   - `http://localhost:9003/auth/callback`

**Si NO están**, añadirlas y GUARDAR.

**Credenciales actuales:**
```
Client ID: [VER EN .env.local]
Client Secret: [VER EN .env.local]
```

---

### 2. ✅ Supabase Dashboard (Obligatorio)

URL: https://app.supabase.com/

**Pasos:**
1. Login a tu proyecto (`ytljrvcjstbuhrdothhf`)
2. Ir a "Authentication" → "Providers"
3. Busca "Google"
4. Verifica que esté habilitado (toggle ON)
5. Ingresa:
   - **Client ID**: [VER EN .env.local]
   - **Client Secret**: [VER EN .env.local]
6. GUARDAR cambios

**Redirect URIs en Supabase:**
- Deben ser iguales a los de Google Cloud
- Supabase proporciona: `https://ytljrvcjstbuhrdothhf.supabase.co/auth/v1/callback`

---

### 3. ✅ Next.js Environment Variables (Ya configurado)

**Archivo**: `.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ytljrvcjstbuhrdothhf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Estas credenciales están en tu .env.local (NO HAGAS PUSH DE ESTO)
GOOGLE_CLIENT_ID=[VER EN .env.local]
GOOGLE_CLIENT_SECRET=[VER EN .env.local]
```

---

## 🔍 Cómo Diagnosticar Errores

### Si ves "Error al intercambiar código":
1. Abre DevTools (F12) → Console
2. Busca logs de "Error exchanging code"
3. El código puede estar mal generado o la redirección incorrecta

### Si el callback no redirige a dashboard:
1. Verifica que `/auth/callback` ruta existe
2. Revisa que `detectSessionInUrl: true` está en cliente
3. Check que el middleware permite `/auth/callback`

### Si Google OAuth no inicia:
1. Verifica que los redirect URIs coinciden exactamente
2. Asegúrate que Google Provider está habilitado en Supabase
3. Revisa la consola para errores de CORS

---

## 🚀 Flujo Esperado

1. User clicks "Continuar con Google"
2. Redirige a Google login
3. Google redirige a `https://ytljrvcjstbuhrdothhf.supabase.co/auth/v1/callback?code=xxx`
4. Supabase procesa el code y genera session
5. Redirige a `https://projectingenes.vercel.app/auth/callback?code=xxx`
6. Next.js route `/auth/callback` intercambia code por session
7. Redirige a `/dashboard`
8. Usuario logueado ✅

---

## 📝 Siguiente Acción

1. Verifica Google Cloud Console (URIs)
2. Verifica Supabase Dashboard (Google Provider)
3. Si todo está OK, prueba en localhost
4. Si sigue fallando, proporciona el error exacto de la consola
