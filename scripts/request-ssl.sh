#!/usr/bin/env bash
set -euo pipefail

EMAIL="${SSL_EMAIL:-admin@comthino.com}"
ACI_ROOT="${ACI_ROOT:-/root/apps/AciPlatform}"
SSL_DOMAINS="${SSL_DOMAINS:-comthino.com}"

DOMAIN_ARGS=()
for domain in $SSL_DOMAINS; do
  DOMAIN_ARGS+=("-d" "$domain")
done

docker run --rm --name certbot-comthino \
  -v "$ACI_ROOT/data/certbot/conf:/etc/letsencrypt" \
  -v "$ACI_ROOT/data/certbot/www:/var/www/certbot" \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  "${DOMAIN_ARGS[@]}" \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email

docker exec aciplatform-nginx nginx -s reload
