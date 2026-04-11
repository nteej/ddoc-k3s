#!/bin/sh

echo "Initializing Kong..."
sleep 10

echo "Registering services and routes..."

# USER SERVICE
curl -s -X POST http://kong:8001/services \
  --data name=user-service \
  --data url=http://user-nginx:80

curl -s -X POST http://kong:8001/services/user-service/routes \
  --data 'paths[]=/api/auth/login' \
  --data 'paths[]=/api/auth/register' \
  --data 'paths[]=/api/auth/me' \
  --data 'paths[]=/api/auth/logout' \
  --data 'paths[]=/api/auth/forgot-password' \
  --data 'paths[]=/api/auth/reset-password' \
  --data 'strip_path=false'

# TEMPLATE SERVICE
curl -s -X POST http://kong:8001/services \
  --data name=template-service \
  --data url=http://template-nginx:80

curl -s -X POST http://kong:8001/services/template-service/routes \
  --data 'paths[]=/api/contexts' \
  --data 'paths[]=/api/tags' \
  --data 'paths[]=/api/templates' \
  --data 'paths[]=/api/sections' \
  --data 'strip_path=false'

# FILE SERVICE
curl -s -X POST http://kong:8001/services \
  --data name=file-service \
  --data url=http://file-nginx:80

curl -s -X POST http://kong:8001/services/file-service/routes \
  --data 'paths[]=/api/files' \
  --data 'strip_path=false'

echo "Creating consumer and JWT credential..."

curl -s -X POST http://kong:8001/consumers \
  --data "username=user-service"

PUB_KEY=$(cat /jwt-public.pem)

curl -s -X POST http://kong:8001/consumers/user-service/jwt \
  --data "algorithm=RS256" \
  --data-urlencode "rsa_public_key=$PUB_KEY" \
  --data "key=user-service"

# JWT plugin no template-service
curl -s -X POST http://kong:8001/services/template-service/plugins \
  --data "name=jwt" \
  --data "config.key_claim_name=iss" \
  --data "config.claims_to_verify=exp" \
  --data "config.run_on_preflight=false" \
  --data "config.cookie_names=token"

# JWT plugin no file-service
curl -s -X POST http://kong:8001/services/file-service/plugins \
  --data "name=jwt" \
  --data "config.key_claim_name=iss" \
  --data "config.claims_to_verify=exp" \
  --data "config.run_on_preflight=false" \
  --data "config.cookie_names=token"

# AUDIT SERVICE
curl -s -X POST http://kong:8001/services \
  --data name=audit-service \
  --data url=http://audit-nginx:80

curl -s -X POST http://kong:8001/services/audit-service/routes \
  --data 'paths[]=/api/audit-logs' \
  --data 'strip_path=false'

# Global CORS plugin (covers all services/routes)
curl -s -X POST http://kong:8001/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "name": "cors",
    "config": {
      "origins": ["http://localhost:5173"],
      "methods": ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
      "headers": ["Accept","Authorization","Content-Type","X-Requested-With","Cookie"],
      "exposed_headers": ["X-Auth-Token","Set-Cookie"],
      "credentials": true,
      "max_age": 3600,
      "preflight_continue": false
    }
  }'

echo "Config finished!"