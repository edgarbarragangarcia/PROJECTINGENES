#!/bin/bash

# Monitor de autenticación en tiempo real
# Muestra los eventos de autenticación a medida que ocurren

LOG_FILE="logs/auth.log"
COLOR_RESET='\033[0m'
COLOR_BOLD='\033[1m'
COLOR_RED='\033[31m'
COLOR_GREEN='\033[32m'
COLOR_YELLOW='\033[33m'
COLOR_BLUE='\033[34m'
COLOR_MAGENTA='\033[35m'
COLOR_CYAN='\033[36m'

# Borrar logs anteriores
echo -e "${COLOR_BLUE}${COLOR_BOLD}🔍 Monitor de Autenticación PROJECTINGENES${COLOR_RESET}"
echo -e "${COLOR_CYAN}═══════════════════════════════════════════════════════${COLOR_RESET}"
echo ""

# Crear archivo de log si no existe
if [ ! -f "$LOG_FILE" ]; then
    mkdir -p logs
    touch "$LOG_FILE"
    echo -e "${COLOR_YELLOW}📝 Archivo de log creado: $LOG_FILE${COLOR_RESET}"
fi

# Función para procesar líneas de log
process_log_line() {
    local line="$1"
    
    # Extraer componentes JSON
    if echo "$line" | grep -q '{"sessionId"'; then
        local level=$(echo "$line" | grep -o '"level":"[^"]*"' | cut -d'"' -f4)
        local component=$(echo "$line" | grep -o '"component":"[^"]*"' | cut -d'"' -f4)
        local message=$(echo "$line" | grep -o '"message":"[^"]*"' | cut -d'"' -f4 | sed 's/\\u0027/'\''/g')
        local timestamp=$(echo "$line" | grep -o '"timestamp":"[^"]*"' | cut -d'"' -f4)
        
        # Extraer hora
        local time=$(echo "$timestamp" | grep -o '[0-9][0-9]:[0-9][0-9]:[0-9][0-9]' || echo "")
        
        # Colorear por nivel
        local color_level=$COLOR_RESET
        local symbol=""
        
        case "$level" in
            "INFO")
                color_level=$COLOR_BLUE
                symbol="ℹ️ "
                ;;
            "DEBUG")
                color_level=$COLOR_CYAN
                symbol="🔍"
                ;;
            "WARN")
                color_level=$COLOR_YELLOW
                symbol="⚠️ "
                ;;
            "ERROR")
                color_level=$COLOR_RED
                symbol="❌"
                ;;
            "SUCCESS")
                color_level=$COLOR_GREEN
                symbol="✅"
                ;;
        esac
        
        # Imprimir línea formateada
        echo -e "${COLOR_CYAN}[$time]${COLOR_RESET} $symbol ${color_level}${COLOR_BOLD}$level${COLOR_RESET} ${COLOR_MAGENTA}[$component]${COLOR_RESET} $message"
    fi
}

echo -e "${COLOR_YELLOW}📡 Esperando eventos de autenticación...${COLOR_RESET}"
echo -e "${COLOR_CYAN}(Presiona Ctrl+C para salir)${COLOR_RESET}"
echo ""

# Usar tail -f para seguir el archivo en tiempo real
tail -f "$LOG_FILE" | while IFS= read -r line; do
    process_log_line "$line"
done
