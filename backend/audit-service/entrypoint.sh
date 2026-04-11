#!/bin/bash

cd /var/www/html

composer install --no-interaction --prefer-dist --optimize-autoloader

until php artisan migrate --force; do
    echo "Aguardando banco de dados..."
    sleep 2
done

exec php-fpm
