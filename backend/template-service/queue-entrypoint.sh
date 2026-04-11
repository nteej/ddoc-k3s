#!/bin/bash
cd /var/www/html

until php artisan migrate:status > /dev/null 2>&1; do
    echo "[template-queue] Waiting for database..."
    sleep 3
done

echo "[template-queue] Starting queue:work..."
exec php artisan queue:work --sleep=3 --tries=3 --timeout=120
