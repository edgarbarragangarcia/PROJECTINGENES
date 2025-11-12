# 🔖 REFERENCIA RÁPIDA

## Comandos Útiles

```bash
# Iniciar servidor
npm run dev

# Limpiar caché y reiniciar
rm -rf .next && npm run dev

# Build de producción
npm run build

# Ver logs de middleware
# Abre terminal donde corre npm run dev
# Busca líneas con: [middleware], [login], [auth/callback]
```

---

## URLs Importantes

```
Login:     http://localhost:9003/login
Dashboard: http://localhost:9003/dashboard
Callback:  http://localhost:9003/auth/callback

(En producción, reemplaza localhost:9003 con tu dominio)
```

---

## Variables de Entorno (.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ytljrvcjstbuhrdothhf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
GOOGLE_CLIENT_ID=200195319039-...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
```

---

## Archivos Críticos

```
src/middleware.ts              - Autenticación en cada request
src/app/auth/callback/route.ts - Google OAuth callback
src/app/login/page.tsx         - UI de login
src/app/sw.ts                  - Service Worker
src/lib/supabase/client.ts     - Cliente de Supabase
```

---

## Logs a Buscar

| Log | Significado | Acción |
|-----|-------------|--------|
| `[login] 🔵 Starting` | User clicó Google | Normal |
| `[auth/callback] 🔐` | Volvemos de Google | Normal |
| `[auth/callback] ✅` | Sesión creada | OK |
| `[auth/callback] ❌` | Error en sesión | PROBLEMA |
| `[middleware] User authenticated` | Sesión validada | OK |
| `[middleware] No user found` | Sin sesión | Normal en /login |

---

## DevTools Shortcuts

```
F12                    - Abre DevTools
Cmd+Shift+R (Mac)      - Hard refresh
Ctrl+Shift+R (Windows) - Hard refresh
Cmd+Option+J (Mac)     - Console
Ctrl+Shift+J (Windows) - Console
```

---

## Checklist de Debugging

Si algo no funciona:

```
1. ¿Ves logs?
   → F12 → Console → Busca [login], [auth/callback], [middleware]

2. ¿Set-cookie en Network?
   → F12 → Network → Filtra /auth/callback → Response Headers

3. ¿Cookie en Application?
   → F12 → Application → Cookies → localhost:9003

4. ¿Hard refresh?
   → Cmd+Shift+R (Mac) o Ctrl+Shift+R (Windows)

5. ¿.env.local actualizado?
   → Reinicia server: npm run dev

6. ¿Navegador bloqueando cookies?
   → Chrome Settings → Cookies de terceros → Permitir
```

---

## Errores Comunes

```
Error: "entries is not a function"
Solución: Ya corregido en middleware.ts

Error: "navigation preload cancelled"
Solución: Ya corregido en sw.ts

Error: "secure cookie in HTTP"
Solución: Automático con NODE_ENV detection

Error: "Cookie de terceros"
Solución: Permite en Chrome settings
```

---

## Validation Rápida

```javascript
// ¿Hay sesión?
const {createClient} = await import('/src/lib/supabase/client.ts');
const supabase = createClient();
const {data} = await supabase.auth.getSession();
console.log(data.session ? '✅' : '❌');

// ¿Hay cookie?
console.log(document.cookie.includes('sb-') ? '✅' : '❌');

// ¿SW está activo?
const regs = await navigator.serviceWorker.getRegistrations();
console.log(regs.length > 0 ? '✅' : '❌');
```

---

## Flujo en 10 Segundos

```
1. User abre /login
2. User clica "Google"
3. Redirige a Google
4. User confirma identidad
5. Google redirige a /auth/callback?code=...
6. /auth/callback valida código
7. Supabase crea sesión
8. Cookies se guardan
9. Redirige a /dashboard
10. Middleware valida sesión
11. Dashboard cargado ✅
```

---

## Mejores Prácticas

```
✅ HACER:
- Hard refresh después de cambios en middleware
- Revisar logs en consola cuando algo falla
- Verificar Network tab para ver cookies
- Limpiar caché con rm -rf .next

❌ NO HACER:
- Cambiar secure: true sin necesidad
- Remover logging sin reemplazo
- Ignorar errores en consola
- Olvidar agregar variables a .env.local
```

---

## Soporte Rápido

1. **Lee SOLUCION_COMPLETA.md** - Explicación detallada
2. **Lee CASOS_DE_PRUEBA.md** - Cómo validar cada parte
3. **Busca logs** - [login], [auth/callback], [middleware]
4. **Verifica Network** - Response headers con set-cookie
5. **Limpia caché** - rm -rf .next && npm run dev

---

## Stack Usado

- **Framework**: Next.js 15
- **Auth**: Supabase Auth (Google OAuth)
- **Middleware**: Next.js Server Middleware
- **PWA**: Service Worker + Serwist
- **DB**: Supabase PostgreSQL
- **Styling**: Tailwind CSS

---

## Contacto / Escalado

Si necesitas ayuda:
1. Consulta la documentación dentro de cada archivo
2. Lee los comentarios en el código (hay muchos)
3. Revisa los logs en consola (muy descriptivos)
4. Sigue CASOS_DE_PRUEBA.md paso a paso

---

**¡Listo! Ahora tienes una referencia rápida de todo. 🚀**

