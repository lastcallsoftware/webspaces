#!/bin/bash
set -euo pipefail

echo "=== Webspaces Deployment Script ==="
echo "Deployment started at $(date)"

if [ -z "${APP_SERVER_PASSWORD:-}" ]; then
  echo "✗ APP_SERVER_PASSWORD is not set"
  exit 1
fi

# The external network is created by the TrackEats compose stack.
if ! docker network inspect trackeats-net >/dev/null 2>&1; then
  echo "✗ trackeats-net does not exist; deploy TrackEats before webspaces"
  exit 1
fi

# Pull the already-built webspaces image.
echo "Pulling latest webspaces image from Docker Hub..."
docker compose pull nginx

# Bootstrap certificates on a fresh server. nginx needs a certificate to start,
# while certbot needs nginx serving the ACME challenge, so start once with a
# temporary certificate and replace it after certbot succeeds.
if ! echo "$APP_SERVER_PASSWORD" | sudo -S test -d "/etc/letsencrypt/live/lastcallsoftware.com"; then
    echo "No certificates found, bootstrapping..."

    echo "$APP_SERVER_PASSWORD" | sudo -S mkdir -p /etc/letsencrypt/live/lastcallsoftware.com
    echo "$APP_SERVER_PASSWORD" | sudo -S openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
        -keyout /etc/letsencrypt/live/lastcallsoftware.com/privkey.pem \
        -out /etc/letsencrypt/live/lastcallsoftware.com/fullchain.pem \
        -subj "/CN=lastcallsoftware.com"
    echo "✓ Temporary self-signed cert created"

    docker compose up -d --no-build nginx
    echo "Waiting for nginx to start..."
    until [ "$(docker inspect --format='{{.State.Health.Status}}' webspaces-nginx 2>/dev/null || true)" = "healthy" ]; do
        if [ "$(docker inspect --format='{{.State.Status}}' webspaces-nginx 2>/dev/null || true)" = "exited" ]; then
            echo "✗ Webspaces nginx failed to start"
            docker logs webspaces-nginx || true
            exit 1
        fi
        sleep 2
    done
    echo "✓ Nginx is healthy"

    echo "$APP_SERVER_PASSWORD" | sudo -S rm -rf /etc/letsencrypt/live/lastcallsoftware.com
    echo "$APP_SERVER_PASSWORD" | sudo -S rm -rf /etc/letsencrypt/archive/lastcallsoftware.com
    echo "$APP_SERVER_PASSWORD" | sudo -S rm -rf /etc/letsencrypt/renewal/lastcallsoftware.com.conf

    docker run --rm \
        -v /etc/letsencrypt:/etc/letsencrypt \
        -v /var/www/certbot:/var/www/certbot \
        certbot/certbot certonly --webroot \
        -w /var/www/certbot \
        -d lastcallsoftware.com -d www.lastcallsoftware.com \
        -d pwholmes.lastcallsoftware.com \
        -d trackeats.lastcallsoftware.com \
        --email pwholmes151@gmail.com \
        --agree-tos \
        --non-interactive
    echo "✓ Real certificate obtained"

    docker exec webspaces-nginx nginx -s reload
    echo "✓ Nginx reloaded with real certificate"
else
    echo "✓ Certificates already present"
fi

# Ensure the latest image is running after certificate setup.
docker compose up -d --no-build nginx

# Install renewal if it is not already present.
CRON_JOB="0 3 * * * docker run --rm -v /etc/letsencrypt:/etc/letsencrypt -v /var/www/certbot:/var/www/certbot certbot/certbot renew --quiet && docker exec webspaces-nginx nginx -s reload"
if ! crontab -l 2>/dev/null | grep -qF "certbot renew"; then
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✓ Certbot renewal cron job installed"
else
    echo "✓ Certbot renewal cron job already present"
fi

echo "=== Webspaces deployment completed successfully at $(date) ==="
