#!/usr/bin/env bash
set -euo pipefail

EMAIL="${SSL_EMAIL:-admin@comthino.com}"
ACI_ROOT="${ACI_ROOT:-/root/apps/AciPlatform}"

docker run --rm --name certbot-comthino \
  -v "$ACI_ROOT/data/certbot/conf:/etc/letsencrypt" \
  -v "$ACI_ROOT/data/certbot/www:/var/www/certbot" \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d comthino.com \
  -d www.comthino.com \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email

docker exec aciplatform-nginx nginx -s reload
