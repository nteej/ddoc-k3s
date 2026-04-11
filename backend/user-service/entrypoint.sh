#!/bin/sh

cd /var/www/html || true

composer install --no-interaction --prefer-dist

# Espera o banco estar pronto e roda as migrations
until php artisan migrate --force; do
    echo "Aguardando banco de dados..."
    sleep 2
done

# Inicia o servidor PHP-FPM
exec php-fpm
