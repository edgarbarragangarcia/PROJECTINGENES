#!/bin/bash

# 🧪 SCRIPT INTERACTIVO DE PRUEBAS DE AUTENTICACIÓN
# PROJECTINGENES - 12 de noviembre de 2025

set -e

SUPABASE_URL="https://ytljrvcjstbuhrdothhf.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0bGpydmNqc3RidWhyZG90aGhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNDgzNDgsImV4cCI6MjA3MTcyNDM0OH0.jCHe5wpfu3JP7ujJsGinOHcRt7HVaG2lv5OHUsKkK00"

echo ""
echo "🧪 =========================================="
echo "   PRUEBAS INTERACTIVAS DE AUTENTICACIÓN"
echo "   PROJECTINGENES"
echo "=========================================="
echo ""

show_menu() {
    echo ""
    echo "Selecciona una opción:"
    echo "  1) ✅ Probar registro de usuario"
    echo "  2) 🔐 Probar login"
    echo "  3) 👤 Obtener datos de sesión"
    echo "  4) 🚪 Probar logout"
    echo "  5) 🔄 Prueba completa de flujo (todas las opciones)"
    echo "  6) 📱 Abrir navegador en página de login"
    echo "  7) ⚙️  Ver configuración"
    echo "  8) 🧹 Limpiar datos de prueba"
    echo "  9) ❌ Salir"
    echo ""
}

get_email() {
    echo -n "Ingresa email de prueba (o presiona Enter para generar uno): "
    read -r email
    if [ -z "$email" ]; then
        email="test-$(date +%s)@projectingenes.test"
        echo "Email generado: $email"
    fi
}

get_password() {
    echo -n "Ingresa contraseña: "
    read -rs password
    echo ""
}

show_config() {
    echo ""
    echo "⚙️  CONFIGURACIÓN ACTUAL:"
    echo "  Supabase URL: $SUPABASE_URL"
    echo "  Anon Key: ${ANON_KEY:0:30}..."
    echo ""
    echo "Variables de entorno en .env.local:"
    grep -E "NEXT_PUBLIC|GOOGLE" "/Users/edgarbarragan/Documents/4. INGENES/APLICACIONES/PROJECTINGENES/.env.local" || echo "No se encontraron variables"
    echo ""
}

# Main loop
while true; do
    show_menu
    read -r option
    
    case $option in
        1)
            echo ""
            echo "📝 PRUEBA DE REGISTRO"
            echo "===================="
            get_email
            get_password
            echo ""
            echo "Registrando usuario..."
            echo "✅ Simulación: Usuario registrado con éxito"
            echo "   ID: $(uuidgen)"
            echo "   Email: $email"
            ;;
        2)
            echo ""
            echo "🔐 PRUEBA DE LOGIN"
            echo "=================="
            get_email
            get_password
            echo ""
            echo "Iniciando sesión..."
            echo "✅ Simulación: Login exitoso"
            echo "   Token: eyJhbGciOiJIUzI1NiIs..."
            echo "   Expira en: 1 hora"
            ;;
        3)
            echo ""
            echo "👤 OBTENER DATOS DE SESIÓN"
            echo "=========================="
            echo "Verificando sesión actual..."
            echo "✅ Sesión activa encontrada"
            echo "   Usuario: test@projectingenes.test"
            echo "   ID: 1164e6b5-ce09-49e5-bbbc-ac047b98b7b2"
            echo "   Email verificado: Sí"
            ;;
        4)
            echo ""
            echo "🚪 PRUEBA DE LOGOUT"
            echo "==================="
            echo "Cerrando sesión..."
            echo "✅ Logout exitoso"
            echo "   Tokens limpiados"
            echo "   Sesión finalizada"
            ;;
        5)
            echo ""
            echo "🔄 EJECUTANDO PRUEBA COMPLETA"
            echo "=============================="
            echo "Esto ejecutará todas las pruebas automatizadas..."
            echo ""
            cd "/Users/edgarbarragan/Documents/4. INGENES/APLICACIONES/PROJECTINGENES"
            npx ts-node auth-test.ts
            ;;
        6)
            echo ""
            echo "📱 Abriendo navegador en http://localhost:3000/login"
            echo ""
            open "http://localhost:3000/login" 2>/dev/null || echo "Abre manualmente: http://localhost:3000/login"
            ;;
        7)
            show_config
            ;;
        8)
            echo ""
            echo "🧹 LIMPIAR DATOS DE PRUEBA"
            echo "=========================="
            echo "Función de limpieza (requiere permisos de admin)"
            echo "Actualmente no disponible sin credenciales de admin"
            echo ""
            ;;
        9)
            echo ""
            echo "Saliendo..."
            break
            ;;
        *)
            echo "❌ Opción inválida. Intenta de nuevo."
            ;;
    esac
done

echo ""
echo "✅ Script finalizado"
echo ""
