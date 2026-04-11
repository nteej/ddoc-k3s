FROM php:8.4-fpm

RUN apt-get update && apt-get install -y \
    git unzip curl libpng-dev libonig-dev libxml2-dev zip libzip-dev \
    librdkafka-dev libzstd-dev libssl-dev \
    libicu-dev libprotobuf-dev protobuf-compiler libpq-dev \
    && pecl install rdkafka \
    && docker-php-ext-enable rdkafka \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && docker-php-ext-install pdo pdo_pgsql mbstring zip exif pcntl bcmath intl

RUN pecl install opentelemetry \
    && docker-php-ext-enable opentelemetry

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .

RUN chown -R www-data:www-data /var/www/html

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY consumer-entrypoint.sh /usr/local/bin/consumer-entrypoint.sh
COPY queue-entrypoint.sh /usr/local/bin/queue-entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/consumer-entrypoint.sh /usr/local/bin/queue-entrypoint.sh

ENTRYPOINT ["entrypoint.sh"]