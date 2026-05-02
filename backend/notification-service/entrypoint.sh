#!/bin/sh
set -e
cd /var/www/html

php artisan config:cache
php artisan view:cache

exec php-fpm
