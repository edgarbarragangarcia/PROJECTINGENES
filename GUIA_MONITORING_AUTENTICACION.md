# 🔐 SISTEMA DE MONITOREO DE AUTENTICACIÓN

## 📋 Descripción

Este sistema te permite ver paso a paso todo lo que ocurre cuando un usuario se autentica en PROJECTINGENES, directamente en la terminal.

---

## 🚀 Cómo Usar

### Opción 1: Monitor Interactivo Completo

```bash
./auth-monitor.sh
```

Esto abre un menú interactivo con opciones para:
- 📡 Ver logs en tiempo real
- 📝 Ver últimas líneas
- 🧹 Limpiar logs
- 🔍 Buscar en logs
- 📊 Ver estadísticas
- 🚀 Iniciar servidor + monitor automáticamente

### Opción 2: Monitor en Tiempo Real Simple

```bash
# Opción A: Usando bash
./monitor-auth.sh

# Opción B: Usando Node.js
npx ts-node monitor-auth.ts
```

### Opción 3: Ver Logs Existentes

```bash
# Últimas 30 líneas
tail -30 logs/auth.log

# Seguir logs en tiempo real
tail -f logs/auth.log

# Ver archivo completo
cat logs/auth.log
```

---

## 🎯 Flujo Completo de Prueba

### Paso 1: Limpiar logs anteriores

```bash
./auth-monitor.sh  # Seleccionar opción 3 (Limpiar logs)
```

o

```bash
> logs/auth.log
```

### Paso 2: Iniciar monitor en una terminal

```bash
./auth-monitor.sh  # Seleccionar opción 1 (Monitor en tiempo real)
```

o en otra terminal:

```bash
./monitor-auth.sh
```

### Paso 3: En otra terminal, iniciar servidor

```bash
npm run dev
```

### Paso 4: Abrir navegador y hacer login

```bash
open http://localhost:3000/login
```

### Paso 5: Completar login

1. Ingresa credenciales:
   - Email: `demo@projectingenes.test`
   - Contraseña: `Demo@12345`

2. Observa los logs en el monitor

---

## 📊 Qué Ves en los Logs

### Ejemplo de Log Exitoso:

```
[12:34:56] ℹ️  INFO [CLIENT_INIT] 🚀 Sesión de cliente iniciada
[12:34:57] 🔍 DEBUG [LOGIN_PAGE] Verificando sesión existente
[12:34:57] ℹ️  INFO [LOGIN_FORM] Email ingresado: user@example.com
[12:34:58] ⏱️  DEBUG [TIMER] Iniciando: SignIn
[12:34:58] ✅ SUCCESS [SUPABASE] Autenticación exitosa
[12:34:58] ⏱️  DEBUG [TIMER] Completado: SignIn (1523ms)
[12:34:59] ✅ SUCCESS [ROUTER] Redirigiendo a /dashboard
[12:34:59] ✅ SUCCESS [LOGIN_PAGE] Login completado exitosamente
```

### Componentes del Log:

- **`[Hora]`** - Hora exacta del evento
- **`Símbolo`** - Indica el tipo (✅ éxito, ❌ error, ⚠️ advertencia, 🔍 debug, ℹ️ info)
- **`[NIVEL]`** - INFO, DEBUG, WARN, ERROR, o SUCCESS
- **`[COMPONENTE]`** - Dónde ocurrió el evento (CLIENT, SUPABASE, ROUTER, etc.)
- **`Mensaje`** - Descripción del evento
- **`(XXms)`** - Tiempo que tomó la operación

---

## 🔍 Interpretando Eventos Comunes

### ✅ Login Exitoso

```
✅ SUCCESS [SUPABASE] Autenticación exitosa
✅ SUCCESS [ROUTER] Redirigiendo a /dashboard
```

### ❌ Login Fallido

```
❌ ERROR [SUPABASE] Credenciales inválidas
❌ ERROR [LOGIN_PAGE] Error en autenticación: Invalid credentials
```

### ⚠️ Advertencias

```
⚠️  WARN [SESSION] Sesión a punto de expirar
⚠️  WARN [TOKEN] Token próximo a expirar en 5 minutos
```

### 🔍 Debugging

```
🔍 DEBUG [SUPABASE] Enviando credenciales a Supabase
🔍 DEBUG [STORAGE] Guardando sesión en localStorage
🔍 DEBUG [MIDDLEWARE] Validando token JWT
```

---

## 📈 Estadísticas

Ver estadísticas de eventos:

```bash
./auth-monitor.sh  # Seleccionar opción 5 (Estadísticas)
```

Verás:
- Total de eventos
- Cantidad de ✅ éxitos
- Cantidad de ❌ errores  
- Cantidad de ⚠️ advertencias
- Cantidad de ℹ️ información

---

## 🔎 Búsquedas Útiles

### Buscar todos los logins exitosos

```bash
grep '"SUCCESS"' logs/auth.log | grep "SUPABASE"
```

### Buscar errores de autenticación

```bash
grep '"ERROR"' logs/auth.log
```

### Buscar logs de un usuario específico

```bash
grep "demo@projectingenes.test" logs/auth.log
```

### Buscar logs por componente

```bash
grep '"component":"ROUTER"' logs/auth.log
```

### Contar eventos por tipo

```bash
echo "Éxitos: $(grep -c '"SUCCESS"' logs/auth.log)"
echo "Errores: $(grep -c '"ERROR"' logs/auth.log)"
echo "Advertencias: $(grep -c '"WARN"' logs/auth.log)"
```

---

## 📝 Estructura del Log

Cada evento se almacena como JSON con la siguiente estructura:

```json
{
  "sessionId": "session-1762967099371-abc123def",
  "timestamp": "2025-11-12T12:34:56.789Z",
  "level": "SUCCESS",
  "component": "SUPABASE",
  "message": "Autenticación exitosa",
  "data": {
    "email": "user@example.com",
    "userId": "12345"
  },
  "duration": 1523
}
```

### Campos:

- `sessionId` - ID único de la sesión del usuario
- `timestamp` - Hora ISO del evento
- `level` - Nivel de severidad (INFO, DEBUG, WARN, ERROR, SUCCESS)
- `component` - Componente que generó el evento
- `message` - Descripción del evento
- `data` - Datos adicionales (opcional)
- `duration` - Duración en ms (para operaciones temporizadas)

---

## 🛠️ Troubleshooting

### "No hay logs disponibles"

**Causa**: El archivo de logs no existe o está vacío.

**Solución**:
```bash
# Crear archivo de logs
touch logs/auth.log

# O iniciar el monitor que lo creará automáticamente
./auth-monitor.sh
```

### "Monitor no muestra eventos"

**Causa**: El servidor no está corriendo o no está generando logs.

**Solución**:
1. Verifica que `npm run dev` esté ejecutándose
2. Haz un login en la aplicación
3. Espera a que se generen los logs

### "Ver solo eventos de una sesión específica"

```bash
SESSION_ID="session-1762967099371-abc123def"
grep "$SESSION_ID" logs/auth.log
```

---

## 📊 Comandos Rápidos

```bash
# Ver últimos 50 eventos
tail -50 logs/auth.log

# Ver eventos de los últimos 5 minutos
find logs/auth.log -newermt "5 minutes ago"

# Contar total de eventos
wc -l logs/auth.log

# Ver solo errores
grep '"ERROR"' logs/auth.log

# Ver solo éxitos
grep '"SUCCESS"' logs/auth.log

# Ver logs con formato bonito
cat logs/auth.log | jq '.'

# Exportar logs a CSV
cat logs/auth.log | jq -r '[.timestamp, .level, .component, .message] | @csv' > auth.csv
```

---

## 🎓 Ejemplos de Uso

### Ejemplo 1: Verificar flujo de login completo

```bash
# Terminal 1: Monitor
./auth-monitor.sh

# Terminal 2: Servidor
npm run dev

# Terminal 3: Login en navegador
# Abre http://localhost:3000/login
# Ingresa credenciales
# Observa los logs en Terminal 1
```

### Ejemplo 2: Debuggear error de redirección

```bash
# Ver solo logs de ROUTER
grep '"component":"ROUTER"' logs/auth.log | cat

# Ver secuencia completa
grep -E '"ROUTER"|"LOGIN_PAGE"' logs/auth.log
```

### Ejemplo 3: Analizar rendimiento

```bash
# Ver operaciones más lentas (>1000ms)
cat logs/auth.log | jq 'select(.duration > 1000)'

# Promedio de tiempo de login
cat logs/auth.log | jq '.duration | add / length'
```

---

## 📚 Documentación Adicional

- Archivo de logger: `src/lib/auth-logger.ts`
- Logger del cliente: `src/lib/client-auth-logger.ts`
- API de logs: `src/app/api/log/route.ts`
- Script monitor: `monitor-auth.sh` / `monitor-auth.ts`
- Herramienta interactiva: `auth-monitor.sh`

---

## 🎯 Conclusión

Con este sistema puedes:
- ✅ Ver exactamente qué ocurre durante la autenticación
- ✅ Debuggear problemas de forma visual
- ✅ Medir rendimiento de operaciones
- ✅ Auditar eventos de seguridad
- ✅ Identificar cuellos de botella

¡Ahora puedes seguir cada paso del proceso de autenticación en tiempo real! 🚀
