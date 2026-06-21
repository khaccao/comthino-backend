#!/usr/bin/env bash
set -euo pipefail

ACI_ROOT="${ACI_ROOT:-/root/apps/AciPlatform}"

docker run --rm --name certbot-comthino-renew \
  -v "$ACI_ROOT/data/certbot/conf:/etc/letsencrypt" \
  -v "$ACI_ROOT/data/certbot/www:/var/www/certbot" \
  certbot/certbot renew --webroot \
  -w /var/www/certbot \
  --quiet

docker exec aciplatform-nginx nginx -s reload
