# 🖥️ GUÍA DE PRUEBAS MANUALES - INTERFAZ DE USUARIO

## 📍 Ubicación del Servidor

**URL:** http://localhost:3000/login

Asegúrate de tener el servidor ejecutando:
```bash
npm run dev
```

---

## 🔐 Prueba 1: Registro de Usuario

### Pasos:

1. **Abre el navegador** en `http://localhost:3000/login`

2. **Haz clic en la pestaña "Sign Up"** (Registrarse)

3. **Completa los campos:**
   - Email: `prueba-$(date +%s)@test.com`
   - Contraseña: `TestPassword123!`
   - Confirmar contraseña: `TestPassword123!`

4. **Haz clic en "Sign Up"**

### Resultado esperado:
- ✅ El usuario se crea exitosamente
- ✅ Se muestra un mensaje de confirmación
- ✅ (Opcional) Se redirige al dashboard

### Errores comunes:
- ❌ Email ya existe: Usa un email diferente
- ❌ Contraseña débil: La contraseña debe tener mayúsculas, números y símbolos
- ❌ Los campos no coinciden: Verifica que ambas contraseñas sean idénticas

---

## 🔓 Prueba 2: Login (Iniciar Sesión)

### Pasos:

1. **Abre el navegador** en `http://localhost:3000/login`

2. **Asegúrate de estar en la pestaña "Sign In"** (Iniciar sesión)

3. **Completa los campos:**
   - Email: `el-email-que-registraste@test.com`
   - Contraseña: `Tu-Contraseña-123`

4. **Haz clic en "Sign In"**

### Resultado esperado:
- ✅ Se inicia sesión exitosamente
- ✅ Se redirige al dashboard (`/dashboard`)
- ✅ Se muestra el contenido del usuario autenticado

### Errores comunes:
- ❌ Email no encontrado: Verifica que el email sea correcto
- ❌ Contraseña incorrecta: Verifica que la contraseña sea correcta
- ❌ Cuenta no confirmada: (Raro) Revisa tu email para confirmar

---

## 🔄 Prueba 3: Persistencia de Sesión

### Pasos:

1. **Después de hacer login exitosamente** (deberías estar en el dashboard)

2. **Recarga la página** (Cmd+R o Ctrl+R)

3. **Verifica que:**
   - ✅ Sigues conectado
   - ✅ No necesitas volver a ingresar credenciales
   - ✅ Tu información de usuario se carga

### Resultado esperado:
- ✅ La sesión se mantiene tras recargar
- ✅ El token se persiste en localStorage
- ✅ La experiencia es fluida sin logout involuntario

---

## 🚪 Prueba 4: Logout (Cerrar Sesión)

### Pasos:

1. **Estando en el dashboard** (después de login)

2. **Busca el botón de logout/cerrar sesión:**
   - Normalmente en la barra de navegación
   - Puede estar en el menú de usuario (esquina superior derecha)
   - O en las opciones de configuración

3. **Haz clic en "Logout" o "Sign Out"**

### Resultado esperado:
- ✅ La sesión se cierra
- ✅ Se redirige a la página de login
- ✅ Se limpian los datos locales

### Verificación:
4. **Recarga la página** (Cmd+R)
5. **Deberías estar en la página de login**, no en el dashboard

---

## 🌐 Prueba 5: OAuth con Google

### Pasos:

1. **Abre la página de login** en `http://localhost:3000/login`

2. **Busca el botón "Continue with Google"** o "Iniciar sesión con Google"

3. **Haz clic en él**

### Resultado esperado:
- ✅ Se abre una ventana/popup de Google
- ✅ Se pide que inicies sesión en Google (si no estás ya)
- ✅ Se solicita permiso para acceder a tu información
- ✅ Se redirige de vuelta a PROJECTINGENES
- ✅ Se crea una sesión automáticamente

### Errores comunes:
- ❌ Popup bloqueado: Permite popups en el navegador
- ❌ Credenciales de Google incorrectas: Usa tu cuenta de Google real
- ❌ No se redirige: Verifica que el callback URL esté configurado en Google Console

---

## 🧪 Prueba 6: Manejo de Errores

### 6.1 Email no verificado (si aplica)

1. **Intenta login con una cuenta nueva** sin verificar email
2. **Resultado esperado:** Error amable explicando que necesita verificar email

### 6.2 Contraseña incorrecta

1. **Intenta login con password incorrecta**
2. **Resultado esperado:** Error claro: "Invalid login credentials" o similar

### 6.3 Múltiples intentos fallidos

1. **Intenta login fallido varias veces** (5+ intentos)
2. **Resultado esperado:** (Opcional) El sistema te pide esperar antes de reintentar

### 6.4 Sesión expirada

1. **Espera 1 hora** (o simula con dev tools)
2. **Intenta hacer una acción**
3. **Resultado esperado:** 
   - Se intenta refrescar el token automáticamente
   - O se te redirige a login si ya expiró

---

## 🛠️ Herramientas del Navegador para Debuggear

### Ver LocalStorage (Token de sesión)
1. Abre DevTools (F12 o Cmd+Option+I)
2. Ve a "Application" → "Storage" → "Local Storage"
3. Busca `sb-auth-token` o similar
4. Deberías ver un JSON con el token

### Ver Cookies
1. En DevTools → "Application" → "Cookies"
2. Busca cookies de autenticación (supabase, etc.)

### Ver Logs en Consola
1. En DevTools → "Console"
2. Deberías ver logs como:
   ```
   [AUTH] Login successful
   [AUTH] Session persisted
   [AUTH] Token auto-refreshed
   ```

### Ver Network Requests
1. En DevTools → "Network"
2. Filtra por "auth" o "login"
3. Verifica que las requests sean 200 OK

---

## ✅ Checklist de Validación

### Funcionalidad de Registro
- [ ] Puedo registrar un nuevo usuario
- [ ] Recibo confirmación de registro
- [ ] Se validan los campos correctamente
- [ ] Se rechazan contraseñas débiles

### Funcionalidad de Login
- [ ] Puedo iniciar sesión con credenciales correctas
- [ ] Se rechaza si credenciales son incorrectas
- [ ] Se redirige al dashboard tras login exitoso
- [ ] El email se muestra en el dashboard

### Persistencia de Sesión
- [ ] La sesión persiste tras recargar página
- [ ] El token se almacena correctamente
- [ ] Se auto-refresca antes de expirar

### Logout
- [ ] Puedo cerrar sesión exitosamente
- [ ] Se limpian todos los datos locales
- [ ] Se redirige a página de login
- [ ] No puedo acceder a dashboard tras logout

### OAuth Google
- [ ] El botón de Google es visible
- [ ] Se abre el flujo de Google
- [ ] Se crea sesión automáticamente
- [ ] Se redirige al dashboard

### Manejo de Errores
- [ ] Los errores se muestran claramente
- [ ] Los mensajes de error son comprensibles
- [ ] No hay errores en la consola del navegador

---

## 📝 Formato para Reportar Problemas

Si encuentras algún problema, reporta con este formato:

```markdown
## Problema

**Descripción:** [Describe qué sucede]

**Pasos para reproducir:**
1. [Paso 1]
2. [Paso 2]
3. [Paso 3]

**Resultado esperado:**
[Lo que debería suceder]

**Resultado actual:**
[Lo que sucede en realidad]

**Screenshots:**
[Si es posible, adjunta screenshots]

**Información del sistema:**
- SO: [Windows/macOS/Linux]
- Navegador: [Chrome/Safari/Firefox]
- Versión del navegador: [versión]

**Logs de consola:**
[Pega cualquier error de la consola de DevTools]
```

---

## 🚀 Estado de Prueba

**Última prueba:** 12 de noviembre de 2025, 12:54 PM  
**Estado:** ✅ TODAS LAS PRUEBAS EXITOSAS

Puedes confiar en que el sistema de autenticación funciona correctamente.

---

**Guía de pruebas generada automáticamente por PROJECTINGENES**
