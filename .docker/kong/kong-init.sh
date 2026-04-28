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
  --data 'paths[]=/api/api-keys' \
  --data 'paths[]=/api/organizations' \
  --data 'paths[]=/api/invitations' \
  --data 'paths[]=/api/notifications' \
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

# WEBHOOK SERVICE
curl -s -X POST http://kong:8001/services \
  --data name=webhook-service \
  --data url=http://webhook-app:8085

curl -s -X POST http://kong:8001/services/webhook-service/routes \
  --data 'paths[]=/api/webhooks' \
  --data 'paths[]=/api/notifications' \
  --data 'strip_path=false'

# JWT plugin on webhook-service
curl -s -X POST http://kong:8001/services/webhook-service/plugins \
  --data "name=jwt" \
  --data "config.key_claim_name=iss" \
  --data "config.claims_to_verify=exp" \
  --data "config.run_on_preflight=false" \
  --data "config.cookie_names=token"

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

# API key pre-function: exchange ddk_ bearer tokens for short-lived JWTs
# before the JWT plugin validates them. Runs globally on every request.
curl -s -X POST http://kong:8001/plugins \
  --data 'name=pre-function' \
  --data-urlencode 'config.access[1]=local api_key = kong.request.get_header("x-api-key"); if not api_key then local auth = kong.request.get_header("authorization") or ""; local bearer = auth:match("^Bearer (.+)$"); if bearer and bearer:sub(1, 4) == "ddk_" then api_key = bearer end end; if not api_key or api_key:sub(1, 4) ~= "ddk_" then return end; local httpc = require("resty.http").new(); httpc:set_timeout(3000); local res, err = httpc:request_uri("http://api-key-app:8086/internal/validate", {method = "GET", headers = {["X-Api-Key"] = api_key}}); if err or not res then return kong.response.exit(503, {message = "Auth service unavailable"}) end; if res.status == 429 then return kong.response.exit(429, {message = "Rate limit exceeded"}) end; if res.status ~= 200 then return kong.response.exit(401, {message = "Invalid API key"}) end; local token = (res.headers or {})["x-validated-token"]; if not token then return kong.response.exit(500, {message = "Auth error"}) end; kong.service.request.set_header("Cookie", "token=" .. token); kong.service.request.clear_header("Authorization"); kong.service.request.clear_header("X-Api-Key")'

# SWAGGER UI — no auth, strip /docs prefix so swagger-ui serves from /
curl -s -X POST http://kong:8001/services \
  --data name=swagger-ui \
  --data url=http://swagger-ui:8080

curl -s -X POST http://kong:8001/services/swagger-ui/routes \
  --data 'paths[]=/docs' \
  --data 'strip_path=true'

echo "Config finished!"