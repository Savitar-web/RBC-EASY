#!/usr/bin/env bash
# RBC EASY — instalación en Git Bash (Windows) o terminal de Linux/Mac.
# Uso:  bash setup-gitbash.sh
set -euo pipefail

cd "$(dirname "$0")"

echo ""
echo "RBC EASY — dependencias"
echo "-----------------------"

if ! command -v node >/dev/null 2>&1; then
  echo "No está Node. Instálalo desde https://nodejs.org (LTS) y vuelve a abrir Git Bash."
  exit 1
fi

echo "Node: $(node -v)"
echo "npm:  $(npm -v)"
echo ""
echo "Instalando dependencias de la app..."
npm install

echo ""
echo "Listo."
echo "Arrancar en local:    npm run dev"
echo "Abrir:                http://localhost:5173"
echo ""
echo "Opcional, escritorio: npm install --save-dev electron electron-builder"
echo "Opcional, Android:    npm install @capacitor/core @capacitor/cli @capacitor/android"
echo "                      npx cap sync android"
