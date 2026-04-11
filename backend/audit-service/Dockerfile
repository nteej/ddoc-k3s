FROM php:8.4-fpm

RUN apt-get update && apt-get install -y \
    git unzip curl libpng-dev libonig-dev libxml2-dev zip libzip-dev \
    librdkafka-dev libzstd-dev libssl-dev \
    libicu-dev libprotobuf-dev protobuf-compiler libpq-dev \
    && pecl install rdkafka \
    && docker-php-ext-enable rdkafka \
    && docker-php-ext-install pdo pdo_pgsql mbstring zip exif pcntl bcmath intl

RUN curl -LO https://github.com/DataDog/dd-trace-php/releases/latest/download/datadog-setup.php \
    && php datadog-setup.php --php-bin=all \
    && rm datadog-setup.php

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .

RUN chown -R www-data:www-data /var/www/html

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY consumer-entrypoint.sh /usr/local/bin/consumer-entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/consumer-entrypoint.sh

ENTRYPOINT ["entrypoint.sh"]
