# 🔍 Diagnóstico: Error al Intercambiar Código de Google OAuth

## El Problema

En Vercel, cuando intentas hacer login con Google, ves:
```
❌ Error al intercambiar código
```

En localhost funcionaría, pero en Vercel falla.

## Causas Posibles (En Orden de Probabilidad)

### 1️⃣ **Google OAuth Redirect URL no configurada** (MÁS PROBABLE)

Google OAuth requiere que la URL de redirección esté registrada exactamente.

**Verifica en Google Cloud Console:**

```
Google Cloud Console
  → APIs & Services
  → OAuth 2.0 Credentials
  → Tu aplicación
  → Authorized redirect URIs
```

**Debería incluir:**
```
https://projectingenes.vercel.app/auth/callback
https://projectingenes.vercel.app/  (opcional pero recomendado)
```

❌ **Si no está aquí, Google rechazará el request**

---

### 2️⃣ **Variables de entorno en Vercel incorrectas**

Las variables pueden no estar sincronizadas en producción.

**Verifica en Vercel:**
```
Project Settings
  → Environment Variables
```

**Debería tener:**
- `NEXT_PUBLIC_SUPABASE_URL` ✓
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✓

❌ **Si faltan o tienen valores equivocados, Supabase no puede configurar Google OAuth**

---

### 3️⃣ **Google OAuth no está habilitado en Supabase**

**Verifica en Dashboard de Supabase:**
```
Authentication
  → Providers
  → Google
```

**Asegúrate de:**
- ✓ Google está ENABLED
- ✓ Client ID y Secret están configurados correctamente
- ✓ Redirect URL en Supabase es: `https://projectingenes.vercel.app/auth/callback`

---

### 4️⃣ **CORS o problemas de sesión**

Si Google autoriza pero Supabase no puede crear sesión.

---

## Cómo Diagnosticar

### Paso 1: Revisar los Logs de Vercel

En Vercel Dashboard:
```
tu-proyecto
  → Deployments
  → Haz click en el último deploy
  → Logs
  → Busca "[auth/callback]" en Function logs
```

**Mira específicamente:**
- ¿Qué dice `exchangeError`?
- ¿Se recibió el código?
- ¿Hay errores de red?

### Paso 2: Abre la Consola del Navegador

En Vercel:
1. Presiona F12 (DevTools)
2. Vuelve a intentar login con Google
3. Mira la pestaña "Network"
4. Busca el request a `/auth/callback`
5. Revisa la respuesta

### Paso 3: Verifica Google Cloud

```
Google Cloud Console
  → OAuth 2.0 Credentials
  → Tu app
  → ¿Authorized redirect URIs incluye tu URL de Vercel?
```

---

## Solución Rápida

Si crees que es el problema de Redirect URL en Google:

1. **Ve a Google Cloud Console**
2. **Edita tu OAuth 2.0 credential**
3. **Agrega esta URL:**
   ```
   https://projectingenes.vercel.app/auth/callback
   ```
4. **Guarda cambios**
5. **Espera 2-5 minutos** (Google puede tardar)
6. **Prueba de nuevo**

---

## Información que Necesito

Para poder ayudarte, ejecuta estos comandos y comparte los resultados:

### 1. Verifica las variables en tu .env.local (LOCAL)

```bash
grep -E "SUPABASE|GOOGLE" /path/a/.env.local | head -20
```

### 2. Mira los logs exactos de Vercel

**En el navegador, abre la URL con error:**
```
https://projectingenes.vercel.app/login?error=exchange_failed
```

**Abre DevTools (F12) → Network → encuentra `/auth/callback`**

**Copia la respuesta completa**

### 3. Revisa Supabase

¿Qué aparece en:
```
Supabase Dashboard
  → Authentication
  → Providers
  → Google
```

¿Está habilitado? ¿Tiene Client ID y Secret?

---

## Próximos Pasos

Comparte:

1. **Logs de Vercel** (la línea exacta del error)
2. **Confirmación de que Google Redirect URI está configurada** en Google Cloud
3. **Si Supabase tiene Google OAuth habilitado**

Con esa info puedo resolver esto en minutos. 🎯

---

**Fecha**: 12 de noviembre de 2025
**Status**: Esperando diagnóstico
