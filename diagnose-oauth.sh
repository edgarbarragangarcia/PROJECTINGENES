#!/bin/bash

# 🔍 Script de Diagnóstico para Google OAuth

echo "========================================="
echo "🔍 DIAGNÓSTICO GOOGLE OAUTH"
echo "========================================="
echo ""

# 1. Verificar variables de entorno
echo "1️⃣  VARIABLES DE ENTORNO"
echo "---"
if [ -f .env.local ]; then
    echo "✅ Archivo .env.local existe"
    echo ""
    echo "Contenido:"
    grep -E "SUPABASE|GOOGLE" .env.local || echo "❌ No hay variables SUPABASE o GOOGLE"
    echo ""
else
    echo "❌ NO existe .env.local"
fi

echo ""
echo "2️⃣  CONFIGURACIÓN SUPABASE"
echo "---"
echo "URL esperado: https://ytljrvcjstbuhrdothhf.supabase.co"
echo "Proyecto ID: ytljrvcjstbuhrdothhf"
echo ""
echo "✅ Verifica en: https://app.supabase.com/"
echo "   → Authentication → Providers → Google"
echo "   → Debe estar HABILITADO (ON)"
echo ""

echo ""
echo "3️⃣  GOOGLE CLOUD CONSOLE"
echo "---"
echo "Project ID: 200195319039"
echo ""
echo "✅ Verifica en: https://console.cloud.google.com/"
echo "   → APIs & Services → Credentials"
echo "   → Busca 'OAuth 2.0 Client IDs'"
echo ""
echo "Los Redirect URIs DEBEN ser:"
echo "   • https://ytljrvcjstbuhrdothhf.supabase.co/auth/v1/callback"
echo "   • https://projectingenes.vercel.app/auth/callback"
echo "   • http://localhost:9003/auth/callback"
echo ""

echo ""
echo "4️⃣  CÓDIGO CLIENTE"
echo "---"
grep -A 10 "handleGoogleSignIn" src/app/login/page.tsx | head -15
echo ""

echo ""
echo "========================================="
echo "🚀 PASOS PARA ARREGLAR"
echo "========================================="
echo ""
echo "1. Abre: https://console.cloud.google.com/"
echo "2. Verifica que los Redirect URIs están correctos"
echo "3. Abre: https://app.supabase.com/"
echo "4. Verifica que Google Provider está ON"
echo "5. Copia exactamente el Client ID y Secret de Google"
echo "6. Ingresa en Supabase → Providers → Google"
echo "7. Activa y guarda"
echo ""
echo "Si aún falla, corre:"
echo "   npm run dev"
echo "   Abre DevTools (F12)"
echo "   Haz click en 'Continuar con Google'"
echo "   Mira los logs en Console"
echo ""
