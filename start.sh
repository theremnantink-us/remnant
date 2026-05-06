#!/bin/bash
# REMNANT — запуск сервера бронирования
DIR="$(cd "$(dirname "$0")" && pwd)"
echo ""
echo "  REMNANT Tattoo Studio"
echo "  ─────────────────────"

cd "$DIR/server"

if [ ! -d "node_modules" ]; then
  echo "  Установка зависимостей..."
  npm install --silent
fi

echo "  Сервер:  http://localhost:3000"
echo "  Админка: http://localhost:3000/admin.html"
echo "  Для остановки нажмите Ctrl+C"
echo ""
node index.js
