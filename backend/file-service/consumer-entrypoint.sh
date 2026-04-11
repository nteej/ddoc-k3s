#!/bin/bash

cd /var/www/html

# Wait for DB migrations to be available (app container runs them on startup)
until php artisan migrate:status > /dev/null 2>&1; do
    echo "[file-consumer] Waiting for database..."
    sleep 3
done

echo "[file-consumer] Starting kafka:consume-template-delivered..."
exec php artisan kafka:consume-template-delivered
