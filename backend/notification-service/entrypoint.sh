#!/bin/sh
set -e
cd /var/www/html

exec php-fpm
