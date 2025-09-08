#!/bin/bash
# Este script está diseñado para solucionar el problema "nothing to commit"
# eliminando la configuración de Git actual y reiniciándola correctamente.

echo "--- Solucionando problema de Git ---"

# Paso 1: Eliminar la configuración de Git existente (si la hay)
if [ -d ".git" ]; then
  echo "Encontrada configuración .git existente. Eliminándola..."
  rm -rf .git
  echo ".git eliminado."
else
  echo "No se encontró configuración .git. Procediendo a inicializar."
fi

# Paso 2: Inicializar un nuevo repositorio de Git
echo "Inicializando un nuevo repositorio de Git..."
git init -b main

# Paso 3: Añadir todos los archivos al nuevo repositorio
echo "Añadiendo todos los archivos del proyecto..."
git add .

# Paso 4: Crear el commit inicial
echo "Creando el commit inicial..."
git commit -m "Actualización del proyecto con las últimas modificaciones"

echo ""
echo "--- ¡ÉXITO! ---"
echo "El repositorio ha sido reiniciado y los archivos han sido guardados (commit)."
echo "Ahora, solo necesitas conectar esto a GitHub y subirlo."
echo ""
echo "Ejecuta los siguientes dos comandos en tu terminal:"
echo "1. git remote add origin https://github.com/edgarbarragangarcia/PROJECTINGENES.git"
echo "2. git push -u origin main"
