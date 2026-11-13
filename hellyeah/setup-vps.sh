#!/usr/bin/env bash
# One-command VPS Setup Script for hellyeah (Node.js + Express + Nginx Reverse Proxy on Port 3000)
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOMAIN="${1:-_}"

echo "==> [1/4] Installing Node dependencies in ${APP_DIR}..."
cd "${APP_DIR}"
npm install --production

echo "==> [2/4] Ensuring persistent data/ directory exists..."
mkdir -p "${APP_DIR}/data"

echo "==> [3/4] Configuring Nginx reverse proxy -> http://127.0.0.1:3000..."
if command -v nginx >/dev/null 2>&1; then
  sudo cp "${APP_DIR}/nginx.conf" /etc/nginx/sites-available/hellyeah
  if [ "${DOMAIN}" != "_" ]; then
    sudo sed -i "s/server_name _;/server_name ${DOMAIN};/" /etc/nginx/sites-available/hellyeah
  fi
  sudo ln -sf /etc/nginx/sites-available/hellyeah /etc/nginx/sites-enabled/hellyeah
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo nginx -t && sudo systemctl reload nginx
  echo "    Nginx configured and reloaded."
else
  echo "    (Nginx not installed yet — install via: sudo apt-get update && sudo apt-get install -y nginx)"
fi

echo "==> [4/4] Creating systemd service (hellyeah.service)..."
if [ -d /etc/systemd/system ]; then
  sudo tee /etc/systemd/system/hellyeah.service >/dev/null <<EOF
[Unit]
Description=hellyeah Gemini x Antigravity Node.js Server
After=network.target

[Service]
Type=simple
User=${USER}
WorkingDirectory=${APP_DIR}
ExecStart=$(command -v node) ${APP_DIR}/server.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF
  sudo systemctl daemon-reload
  sudo systemctl enable --now hellyeah.service
  echo "✅ hellyeah is running on port 3000 behind Nginx!"
fi
