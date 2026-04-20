#!/bin/sh

# Instala dependências se node_modules não existir
if [ ! -d "node_modules" ]; then
  echo "Instalando dependências..."
  npm install
fi

# Executa o comando que foi passado (ex: `npm run dev`)
exec "$@"