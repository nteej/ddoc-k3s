#!/bin/bash
cd /var/www/html

until php artisan migrate:status > /dev/null 2>&1; do
    echo "[file-queue] Waiting for database..."
    sleep 3
done

echo "[file-queue] Starting queue:work..."
exec php artisan queue:work --sleep=3 --tries=3 --timeout=120
