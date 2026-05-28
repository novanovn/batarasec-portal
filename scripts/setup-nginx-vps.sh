#!/usr/bin/env bash
# setup-nginx-vps.sh — Install and configure Nginx on VPS host for portal.batarasec.com
# Run on VPS: bash scripts/setup-nginx-vps.sh
#
# TLS options:
#   --cloudflare  Use Cloudflare Origin Certificate (recommended if behind CF proxy)
#   --certbot     Use Let's Encrypt via certbot (requires domain DNS resolving to this IP)
#
# Usage:
#   bash scripts/setup-nginx-vps.sh --cloudflare   (you paste CF origin cert manually)
#   bash scripts/setup-nginx-vps.sh --certbot       (auto-issue Let's Encrypt cert)
set -euo pipefail

TLS_MODE="${1:---cloudflare}"
DOMAIN="portal.batarasec.com"
CERT_DIR="/etc/ssl/portal"
NGINX_CONF="/etc/nginx/sites-available/batarasec-portal"
DEPLOY_DIR="/opt/batarasec-portal"

echo "=== BataraSec Portal — Nginx Setup ==="
echo "Domain: $DOMAIN | TLS mode: $TLS_MODE"

# --- 1. Install Nginx ---
if ! command -v nginx &>/dev/null; then
  echo ">>> Installing Nginx..."
  sudo apt-get update -qq
  sudo apt-get install -y nginx
else
  echo ">>> Nginx already installed: $(nginx -v 2>&1)"
fi

# --- 2. TLS setup ---
if [ "$TLS_MODE" = "--cloudflare" ]; then
  echo ">>> Cloudflare Origin Certificate mode."
  sudo mkdir -p "$CERT_DIR"
  echo ""
  echo "ACTION REQUIRED: Paste your Cloudflare Origin Certificate."
  echo "  1. Go to Cloudflare Dashboard -> SSL/TLS -> Origin Server -> Create Certificate"
  echo "  2. Copy the certificate PEM to: $CERT_DIR/cert.pem"
  echo "  3. Copy the private key PEM to:  $CERT_DIR/key.pem"
  echo ""
  echo "  Example:"
  echo "    sudo nano $CERT_DIR/cert.pem   # paste cert, Ctrl+X to save"
  echo "    sudo nano $CERT_DIR/key.pem    # paste key,  Ctrl+X to save"
  echo "    sudo chmod 600 $CERT_DIR/key.pem"
  echo ""
  echo "  Then re-run: bash scripts/setup-nginx-vps.sh --cloudflare-done"
  echo ""
  echo "  Skipping Nginx config write until certs are in place."
  exit 0
fi

if [ "$TLS_MODE" = "--cloudflare-done" ]; then
  if [ ! -f "$CERT_DIR/cert.pem" ] || [ ! -f "$CERT_DIR/key.pem" ]; then
    echo "ERROR: $CERT_DIR/cert.pem or key.pem not found. Paste the certs first."
    exit 1
  fi
  echo ">>> Cloudflare certs found at $CERT_DIR."
fi

if [ "$TLS_MODE" = "--certbot" ]; then
  echo ">>> Installing certbot..."
  sudo apt-get install -y certbot python3-certbot-nginx
  echo ">>> Issuing Let's Encrypt certificate for $DOMAIN..."
  sudo certbot certonly --nginx -d "$DOMAIN" --non-interactive --agree-tos -m novan.hariman@batarasec.com
  # Update cert paths in production.conf for certbot
  sudo sed -i "s|/etc/ssl/portal/cert.pem|/etc/letsencrypt/live/$DOMAIN/fullchain.pem|" "$DEPLOY_DIR/nginx/production.conf"
  sudo sed -i "s|/etc/ssl/portal/key.pem|/etc/letsencrypt/live/$DOMAIN/privkey.pem|" "$DEPLOY_DIR/nginx/production.conf"
  echo ">>> certbot cert paths patched in production.conf."
fi

# --- 3. Copy Nginx config ---
echo ">>> Installing Nginx config..."
sudo cp "$DEPLOY_DIR/nginx/production.conf" "$NGINX_CONF"
sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/batarasec-portal

# Remove default site if active
sudo rm -f /etc/nginx/sites-enabled/default

# --- 4. Test and reload ---
echo ">>> Testing Nginx config..."
sudo nginx -t

echo ">>> Reloading Nginx..."
sudo systemctl enable nginx
sudo systemctl reload nginx

echo ""
echo "=== Nginx setup complete ==="
echo "Test: curl -I https://$DOMAIN/api/health"
