#!/bin/bash

# Script de utilidad para monitorear autenticación
# Uso: ./auth-monitor.sh [comando]

COLOR_RESET='\033[0m'
COLOR_BOLD='\033[1m'
COLOR_YELLOW='\033[33m'
COLOR_BLUE='\033[34m'
COLOR_CYAN='\033[36m'
COLOR_GREEN='\033[32m'

# Crear directorio de logs si no existe
mkdir -p logs

show_menu() {
    clear
    echo -e "${COLOR_BLUE}${COLOR_BOLD}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║        🔐 MONITOR DE AUTENTICACIÓN - PROJECTINGENES       ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${COLOR_RESET}"
    echo ""
    echo -e "${COLOR_CYAN}Opciones:${COLOR_RESET}"
    echo "  1) 📡 Monitor en tiempo real (live)"
    echo "  2) 📝 Ver últimas líneas de log"
    echo "  3) 🧹 Limpiar logs"
    echo "  4) 🔍 Buscar en logs"
    echo "  5) 📊 Estadísticas"
    echo "  6) 🚀 Iniciar servidor + monitor"
    echo "  7) ❌ Salir"
    echo ""
}

show_live_monitor() {
    echo -e "${COLOR_BLUE}📡 Monitor en Tiempo Real${COLOR_RESET}"
    echo -e "${COLOR_CYAN}═══════════════════════════════════════════════════════${COLOR_RESET}"
    echo -e "${COLOR_YELLOW}(Presiona Ctrl+C para salir)${COLOR_RESET}"
    echo ""
    
    # Usar tail -f con colores
    tail -f logs/auth.log | while read -r line; do
        if echo "$line" | grep -q '"SUCCESS"'; then
            echo -e "${COLOR_GREEN}✅ $line${COLOR_RESET}"
        elif echo "$line" | grep -q '"ERROR"'; then
            echo -e "\033[31m❌ $line${COLOR_RESET}"
        elif echo "$line" | grep -q '"WARN"'; then
            echo -e "${COLOR_YELLOW}⚠️  $line${COLOR_RESET}"
        else
            echo "$line"
        fi
    done
}

show_tail() {
    lines=${1:-30}
    echo -e "${COLOR_BLUE}📝 Últimas $lines líneas de log${COLOR_RESET}"
    echo -e "${COLOR_CYAN}═══════════════════════════════════════════════════════${COLOR_RESET}"
    echo ""
    
    if [ ! -f "logs/auth.log" ]; then
        echo -e "${COLOR_YELLOW}No hay logs disponibles${COLOR_RESET}"
        return
    fi
    
    tail -n "$lines" logs/auth.log | while read -r line; do
        if echo "$line" | grep -q '"SUCCESS"'; then
            echo -e "${COLOR_GREEN}$line${COLOR_RESET}"
        elif echo "$line" | grep -q '"ERROR"'; then
            echo -e "\033[31m$line${COLOR_RESET}"
        elif echo "$line" | grep -q '"WARN"'; then
            echo -e "${COLOR_YELLOW}$line${COLOR_RESET}"
        else
            echo "$line"
        fi
    done
    
    echo ""
}

clear_logs() {
    echo -e "${COLOR_YELLOW}¿Estás seguro de que quieres limpiar los logs? (s/n)${COLOR_RESET}"
    read -r response
    
    if [ "$response" = "s" ] || [ "$response" = "S" ]; then
        > logs/auth.log
        echo -e "${COLOR_GREEN}✅ Logs limpiados${COLOR_RESET}"
    else
        echo -e "${COLOR_YELLOW}Cancelado${COLOR_RESET}"
    fi
    
    sleep 2
}

search_logs() {
    echo -e "${COLOR_BLUE}🔍 Buscar en logs${COLOR_RESET}"
    echo -e "${COLOR_CYAN}═══════════════════════════════════════════════════════${COLOR_RESET}"
    echo -n "Término de búsqueda: "
    read -r search_term
    
    if [ ! -f "logs/auth.log" ]; then
        echo -e "${COLOR_YELLOW}No hay logs disponibles${COLOR_RESET}"
        return
    fi
    
    echo ""
    grep "$search_term" logs/auth.log | while read -r line; do
        if echo "$line" | grep -q '"SUCCESS"'; then
            echo -e "${COLOR_GREEN}$line${COLOR_RESET}"
        elif echo "$line" | grep -q '"ERROR"'; then
            echo -e "\033[31m$line${COLOR_RESET}"
        else
            echo "$line"
        fi
    done
    
    echo ""
    echo -e "${COLOR_YELLOW}Presiona Enter para continuar...${COLOR_RESET}"
    read -r
}

show_stats() {
    echo -e "${COLOR_BLUE}📊 Estadísticas${COLOR_RESET}"
    echo -e "${COLOR_CYAN}═══════════════════════════════════════════════════════${COLOR_RESET}"
    echo ""
    
    if [ ! -f "logs/auth.log" ]; then
        echo -e "${COLOR_YELLOW}No hay logs disponibles${COLOR_RESET}"
        sleep 2
        return
    fi
    
    total_lines=$(wc -l < logs/auth.log)
    success_count=$(grep -c '"SUCCESS"' logs/auth.log 2>/dev/null || echo 0)
    error_count=$(grep -c '"ERROR"' logs/auth.log 2>/dev/null || echo 0)
    warn_count=$(grep -c '"WARN"' logs/auth.log 2>/dev/null || echo 0)
    info_count=$(grep -c '"INFO"' logs/auth.log 2>/dev/null || echo 0)
    
    echo -e "Total de eventos:    ${COLOR_BOLD}$total_lines${COLOR_RESET}"
    echo -e "✅ Éxitos:            ${COLOR_GREEN}${COLOR_BOLD}$success_count${COLOR_RESET}"
    echo -e "❌ Errores:           \033[31m${COLOR_BOLD}$error_count${COLOR_RESET}"
    echo -e "⚠️  Advertencias:     ${COLOR_YELLOW}${COLOR_BOLD}$warn_count${COLOR_RESET}"
    echo -e "ℹ️  Información:      ${COLOR_BOLD}$info_count${COLOR_RESET}"
    
    echo ""
    echo -e "${COLOR_YELLOW}Presiona Enter para continuar...${COLOR_RESET}"
    read -r
}

start_with_monitor() {
    echo -e "${COLOR_CYAN}🚀 Iniciando servidor y monitor...${COLOR_RESET}"
    echo ""
    
    # Limpiar logs
    > logs/auth.log
    
    # Iniciar servidor en segundo plano
    npm run dev > /dev/null 2>&1 &
    SERVER_PID=$!
    
    echo -e "${COLOR_GREEN}✅ Servidor iniciado (PID: $SERVER_PID)${COLOR_RESET}"
    echo -e "${COLOR_YELLOW}Esperando a que esté listo...${COLOR_RESET}"
    sleep 3
    
    echo ""
    show_live_monitor
    
    # Cuando se termina el monitor, matar el servidor
    kill $SERVER_PID 2>/dev/null
}

# Main loop
while true; do
    show_menu
    read -r choice
    
    case $choice in
        1)
            show_live_monitor
            ;;
        2)
            show_tail 30
            ;;
        3)
            clear_logs
            ;;
        4)
            search_logs
            ;;
        5)
            show_stats
            ;;
        6)
            start_with_monitor
            ;;
        7)
            echo -e "${COLOR_GREEN}Hasta luego! 👋${COLOR_RESET}"
            exit 0
            ;;
        *)
            echo -e "${COLOR_YELLOW}Opción inválida${COLOR_RESET}"
            sleep 1
            ;;
    esac
done
