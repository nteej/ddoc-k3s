# Changelog

All notable changes to this project will be documented in this file.


## [v2.0.0] - 2026-05-28

### Breaking Changes

- Enterprise SSO now uses OAuth2 Authorization Code Grant (Laravel Passport). Existing sessions remain valid; new logins through the SSO button go through the new flow.

### Features

- **Enterprise Single Sign-On (SSO)**: Full OAuth2 Authorization Code Grant flow via Laravel Passport. Users can authenticate through the centralized DynaDoc Auth Server and receive a short-lived JWT with organization and role context.
- **Token introspection endpoint** (`POST /api/oauth/introspect`): Downstream services validate Passport Bearer tokens and receive enriched claims (userId, organizationId, role) without decoding the JWT themselves.
- **BFF OAuth2 exchange**: Stateless HMAC-signed state for CSRF protection — no server-side session required for the callback flow.
- **Token revocation on logout**: Logout now revokes the underlying Passport token via the `passport_jti` claim embedded in the session JWT.
- **Auto-consent Blade view**: First-party OAuth2 clients are approved automatically — no manual consent click required.
- **SSO login button**: Frontend login page now includes an "Enterprise SSO" button with full i18n support (EN/FI/SV).
- **Downstream middleware upgrade**: `template-service`, `file-service`, and `audit-service` middleware detect token type by `iss` claim and call introspect for Passport Bearer tokens transparently.
- **Kong routing**: `/oauth`, `/login`, and `/api/oauth/introspect` paths registered as public (no JWT plugin) to support the Passport authorization flow.


## [v1.8.0] - 2026-05-14


### Features

- feat: SSO auth, Klarna payments, profile/settings UI & IaC Kustomize (v1.8.0) ([`f08cf2a`](../../commit/f08cf2a))

## [v1.6.0] - 2026-05-09


### Features

- feat: Kafka-based file email with PDF attachment & owner-only Settings isolation ([`ccb2f63`](../../commit/ccb2f63))

## [v1.0.0] - 2026-04-29


### Other Changes

- Massive update ([`4b890f7`](../../commit/4b890f7))
- Kong start failure fix ([`c456696`](../../commit/c456696))
- kong start daemonizes ([`4e68c47`](../../commit/4e68c47))
- Kong timeout update ([`be41a34`](../../commit/be41a34))
- Kafka Broker count reduce ([`319cb03`](../../commit/319cb03))
- Kafka Update ([`f182d72`](../../commit/f182d72))
- Kafka Replica fix ([`2d25445`](../../commit/2d25445))
- Kafka Service Update ([`84501b2`](../../commit/84501b2))
- Zookeeper fix ([`e7acc23`](../../commit/e7acc23))
- env dependencies pushed ([`b41b867`](../../commit/b41b867))
- Composer dependency issue fix ([`104ad48`](../../commit/104ad48))
- Nginx-bootstrap ([`8d5686a`](../../commit/8d5686a))
- Massive Tech Stack Implement ([`1bf3c6c`](../../commit/1bf3c6c))
- Init Source ([`ad50e08`](../../commit/ad50e08))
