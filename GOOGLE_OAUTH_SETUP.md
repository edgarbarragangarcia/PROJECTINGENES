# 🔐 GUÍA DEFINITIVA: Configurar Google OAuth en Supabase

## ⚠️ PROBLEMA PROBABLE

Google OAuth **NO funciona porque Supabase NO tiene habilitado el provider de Google correctamente**.

---

## ✅ SOLUCIÓN PASO A PASO

### PASO 1️⃣: Verifica Google Cloud Console

1. Abre: https://console.cloud.google.com/
2. En la barra de búsqueda arriba, busca: **"200195319039"** (tu Project ID)
3. Selecciona el proyecto
4. En el menú izquierdo: **APIs & Services** → **Credentials**
5. Busca tu OAuth 2.0 Client ID (debe decir "Web application")
6. Haz click en él
7. En **Authorized redirect URIs** verifica que están:
   ```
   https://ytljrvcjstbuhrdothhf.supabase.co/auth/v1/callback
   https://projectingenes.vercel.app/auth/callback
   http://localhost:9003/auth/callback
   ```
8. **Si NO están** → Añádelas todas → Click "SAVE"

**Nota:** Después de cambiar los URIs en Google Cloud, espera 5-10 minutos para que se propaguen.

---

### PASO 2️⃣: Habilita Google OAuth en Supabase (IMPORTANTE)

1. Abre: https://app.supabase.com/
2. Selecciona tu proyecto: **ytljrvcjstbuhrdothhf**
3. En el menú izquierdo: **Authentication** → **Providers**
4. Busca **"Google"** en la lista
5. Verifica que el toggle está **ON** (activado)
6. Si está OFF → Haz click para activarlo
7. Ingresa tus credenciales:
   - **Client ID**: Copia desde Google Cloud Console
   - **Client Secret**: Copia desde Google Cloud Console
8. Haz click **"Save"**

**SI NO VES EL TOGGLE EN ON, ESE ES TU PROBLEMA** ← Este es probablemente el error.

---

### PASO 3️⃣: Verifica que tu código está correcto

Tu código ya está correcto. El archivo `src/app/login/page.tsx` tiene:

```typescript
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${origin}/auth/callback`,
  },
});
```

Esto está bien.

---

## 🧪 CÓMO TESTEAR

1. Termina cualquier servidor anterior:
   ```bash
   pkill -f "next dev"
   ```

2. Inicia el servidor:
   ```bash
   npm run dev
   ```

3. Abre: http://localhost:9003/login

4. Abre DevTools (**F12**) → **Console**

5. Haz click en **"Continuar con Google"**

6. Observa los logs:
   ```
   🔵 Iniciando Google OAuth...
   📍 Redirect URL: /auth/callback
   🌐 Origin: http://localhost:9003
   ✅ OAuth redirect initiated
   ```

7. Si ves esos logs y te redirige a Google → **EL PROBLEMA ERA SUPABASE**

---

## 🚨 ERRORES COMUNES

### Error: "Error al intercambiar código"
- **Causa**: Los Redirect URIs en Google Cloud no coinciden
- **Solución**: Verifica que están exactamente iguales en Google Cloud

### Error: "OAuth Error"
- **Causa**: Google Provider NO está habilitado en Supabase
- **Solución**: Ve a Supabase Dashboard → Authentication → Providers → Google → Activa el toggle

### No pasa nada cuando haces click
- **Causa**: Client ID o Secret incorrectos en Supabase
- **Solución**: Copia exactamente desde Google Cloud (sin espacios)

### Te redirige a Google pero luego vuelve al login
- **Causa**: El callback route no está procesando el code correctamente
- **Solución**: Revisa que `/auth/callback` existe y está bien

---

## ✨ CHECKLIST FINAL

- [ ] Google Cloud Console tiene los 3 Redirect URIs
- [ ] Supabase Dashboard tiene Google Provider activado (ON)
- [ ] Client ID en Supabase es igual al de Google Cloud
- [ ] Client Secret en Supabase es igual al de Google Cloud
- [ ] Esperaste 5-10 minutos después de cambios en Google Cloud
- [ ] Tu código tiene `detectSessionInUrl: true` en cliente
- [ ] Tu callback route existe en `/auth/callback`

---

## 📞 SI NADA FUNCIONA

1. Ve a Supabase Dashboard
2. Authentication → Providers → Google
3. Screenshot de la configuración
4. Compara con los valores en tu `.env.local`
5. Si hay diferencias → Actualiza en Supabase

**El 99% de los problemas es que Google Provider NO está activado en Supabase.**
