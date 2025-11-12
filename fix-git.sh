#!/bin/bash
# Este script está diseñado para preparar el proyecto para un push limpio a GitHub.
# Reinicia el repositorio local, añade todos los archivos y crea un commit significativo.

echo "--- Preparando el proyecto para subir a GitHub ---"

# Paso 1: Eliminar la configuración de Git existente (si la hay)
if [ -d ".git" ]; then
  echo "1. Configuración .git existente encontrada. Eliminándola para un reinicio limpio..."
  rm -rf .git
  echo "   Repositorio .git local eliminado."
else
  echo "1. No se encontró configuración .git. Procediendo a inicializar."
fi

# Paso 2: Inicializar un nuevo repositorio de Git en la rama 'main'
echo "2. Inicializando un nuevo repositorio de Git..."
git init -b main
echo "   Repositorio inicializado en la rama 'main'."

# Paso 3: Añadir todos los archivos al nuevo repositorio
echo "3. Añadiendo todos los archivos del proyecto al área de preparación (stage)..."
git add .
echo "   Todos los archivos han sido añadidos."

# Paso 4: Crear el commit con un mensaje descriptivo
echo "4. Creando el commit con los últimos cambios..."
git commit -m "feat: Corregir redirección de autenticación en el middleware para Vercel"
echo "   Commit creado exitosamente."

echo ""
echo "--- ¡ACCIÓN REQUERIDA! ---"
echo "El proyecto está listo en tu entorno local. Ahora, solo necesitas conectarlo a GitHub y subirlo (hacer push)."
echo ""
echo "Copia y pega los siguientes dos comandos en tu terminal, uno por uno:"
echo ""
echo "1. Conecta tu repositorio local al remoto en GitHub:"
echo "   git remote add origin https://github.com/edgarbarragangarcia/PROJECTINGENES.git"
echo ""
echo "2. Sube tus archivos a la rama 'main' en GitHub:"
echo "   git push -u origin main -f"
echo ""
echo "NOTA: Usamos '-f' (force) en el push porque hemos reiniciado el historial de Git. Esto es seguro para este caso de uso."
echo ""
