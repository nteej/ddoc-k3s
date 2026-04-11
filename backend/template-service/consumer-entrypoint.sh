#!/bin/bash

cd /var/www/html

# Wait for DB migrations to be available (app container runs them on startup)
until php artisan migrate:status > /dev/null 2>&1; do
    echo "[template-consumer] Waiting for database..."
    sleep 3
done

echo "[template-consumer] Starting kafka:consume-template-requested..."
exec php artisan kafka:consume-template-requested
