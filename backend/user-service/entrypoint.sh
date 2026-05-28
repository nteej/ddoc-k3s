#!/bin/sh

cd /var/www/html || true

composer install --no-interaction --prefer-dist

# Wait for DB and run migrations
until php artisan migrate --force; do
    echo "Aguardando banco de dados..."
    sleep 2
done

# Generate Passport RSA keys if they don't exist yet
php artisan passport:keys 2>/dev/null || true
# Fix key ownership so php-fpm (www-data) can read them
chown www-data:www-data /var/www/html/storage/oauth-private.key /var/www/html/storage/oauth-public.key 2>/dev/null || true
chmod 640 /var/www/html/storage/oauth-private.key /var/www/html/storage/oauth-public.key 2>/dev/null || true

# Register OAuth2 clients (idempotent — skips if already present)
php artisan db:seed --class=PassportClientSeeder --force

# Start PHP-FPM
exec php-fpm
