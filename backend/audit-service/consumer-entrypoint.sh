#!/bin/bash

cd /var/www/html

until php artisan migrate:status > /dev/null 2>&1; do
    echo "[audit-consumer] Waiting for database..."
    sleep 3
done

echo "[audit-consumer] Starting Kafka consumers..."
php artisan kafka:consume-audit-events &
php artisan kafka:consume-user-logged &

wait
