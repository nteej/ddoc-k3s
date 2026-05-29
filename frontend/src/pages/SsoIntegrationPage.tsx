import React, { useState } from 'react';
import { Shield, BookOpen, ArrowRight, CheckCircle, AlertTriangle, Copy, Check, Server, Key, Lock, Globe, Layers, FlaskConical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProtectedLayout from '@/components/ProtectedLayout';
import RoleGuard from '@/components/RoleGuard';

// ── Code block with copy button ───────────────────────────────────────────────

function CodeBlock({ code, lang = 'bash' }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-950 text-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">{lang}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-gray-100 leading-relaxed font-mono text-xs">
        <code>{code.trim()}</code>
      </pre>
    </div>
  );
}

// ── Inline code ───────────────────────────────────────────────────────────────

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-gray-100 text-blue-800 px-1.5 py-0.5 rounded text-xs font-mono border border-gray-200">
      {children}
    </code>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">{title}</h3>
      {children}
    </div>
  );
}

// ── Callout box ───────────────────────────────────────────────────────────────

function Callout({ type, children }: { type: 'info' | 'warning' | 'tip'; children: React.ReactNode }) {
  const styles = {
    info:    'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    tip:     'bg-green-50 border-green-200 text-green-800',
  };
  const Icon = type === 'warning' ? AlertTriangle : CheckCircle;
  return (
    <div className={`flex gap-3 rounded-xl border p-4 text-sm leading-relaxed ${styles[type]}`}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const MIDDLEWARE_CODE = `<?php

declare(strict_types=1);

namespace App\\Infrastructure\\Http\\Middlewares;

use Closure;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\Http;
use Symfony\\Component\\HttpFoundation\\Response;

class ExtractJwtClaimsMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->cookie('token') ?? $request->bearerToken();

        if (!$token) {
            return response()->json(['error' => 'Missing token'], 401);
        }

        $payload = $this->decodePayload($token);

        if (!$payload) {
            return response()->json(['error' => 'Malformed token'], 401);
        }

        // DynaDoc JWT (issued by user-service) — fast path, Kong already
        // verified the RSA signature at the gateway. No network call needed.
        if (($payload['iss'] ?? null) === 'user-service') {
            $request->attributes->set('loggedUser', $payload);
            return $next($request);
        }

        // Passport Bearer token — validate via introspection.
        // Used for M2M or third-party OAuth2 clients.
        if ($request->bearerToken() === $token) {
            $claims = $this->introspect($token);
            if (!$claims || !($claims['active'] ?? false)) {
                return response()->json(['error' => 'Invalid or revoked token'], 401);
            }
            $request->attributes->set('loggedUser', $claims);
            return $next($request);
        }

        return response()->json(['error' => 'Unknown token format'], 401);
    }

    private function decodePayload(string $token): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }
        $payload = json_decode(
            base64_decode(strtr($parts[1], '-_', '+/')), true
        );
        return is_array($payload) ? $payload : null;
    }

    private function introspect(string $token): ?array
    {
        $url    = rtrim((string) env('USER_SERVICE_URL', ''), '/') . '/api/oauth/introspect';
        $secret = (string) env('INTROSPECT_SECRET', '');

        $response = Http::withHeaders([
            'Authorization'       => 'Bearer ' . $token,
            'X-Introspect-Secret' => $secret,
        ])->post($url);

        return $response->ok() ? $response->json() : null;
    }
}`;

const BOOTSTRAP_CODE = `// bootstrap/app.php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->alias([
        'jwt.auth' => \\App\\Infrastructure\\Http\\Middlewares\\ExtractJwtClaimsMiddleware::class,
    ]);
})`;

const ROUTE_MIDDLEWARE_CODE = `// routes/api.php
Route::middleware('jwt.auth')->group(function () {
    Route::get('/your-resource', [YourController::class, 'index']);
    Route::post('/your-resource', [YourController::class, 'store']);
});`;

const CONTROLLER_CODE = `// Reading claims inside a controller
public function index(Request $request): JsonResponse
{
    $claims = $request->attributes->get('loggedUser');

    $userId   = $claims['userId'];
    $orgId    = $claims['organizationId'];
    $role     = $claims['role'];          // viewer | editor | admin | owner
    $isAdmin  = $claims['isSystemAdmin'] ?? false;

    // Role-based guard example:
    if (!in_array($role, ['admin', 'owner']) && !$isAdmin) {
        return response()->json(['error' => 'Forbidden'], 403);
    }

    // ... your logic
}`;

const ENV_CODE = `# .env / K8s Deployment env vars

# Internal URL of the user-service (K8s cluster DNS)
USER_SERVICE_URL=http://user-svc.dynadoc.svc.cluster.local:80

# Shared secret for the /api/oauth/introspect endpoint.
# Must match INTROSPECT_SECRET in user-service.
INTROSPECT_SECRET=<copy-from-introspect-secret-k8s-secret>

# RSA public key issued by user-service (for offline JWT verification).
# Mount the same kong-jwt-secret volume used by other services.
JWT_PUBLIC_KEY_PATH=storage/oauth/jwt-public.pem
JWT_ALGORITHM=RS256`;

const K8S_ENV_CODE = `# k8s/apps/your-service/your-app.yaml — env section
env:
  - name: USER_SERVICE_URL
    value: http://user-svc.dynadoc.svc.cluster.local:80

  - name: INTROSPECT_SECRET
    valueFrom:
      secretKeyRef:
        name: introspect-secret
        key: INTROSPECT_SECRET

  - name: JWT_PUBLIC_KEY_PATH
    value: storage/oauth/jwt-public.pem

volumeMounts:
  - name: jwt-public
    mountPath: /var/www/html/storage/oauth/jwt-public.pem
    subPath: jwt-public.pem
    readOnly: true

volumes:
  - name: jwt-public
    secret:
      secretName: kong-jwt-secret
      items:
        - key: jwt-public.pem
          path: jwt-public.pem`;

const KONG_CODE = `# Register your service and route in Kong Admin API
# (or add to k8s/infra/kong-config.yaml if using deck/declarative config)

# 1. Create the upstream service
curl -sX POST http://kong-admin-svc.dynadoc.svc.cluster.local:8001/services \\
  -d name=your-service \\
  -d url=http://your-svc.dynadoc.svc.cluster.local:80

# 2. Create the route
curl -sX POST http://kong-admin-svc.dynadoc.svc.cluster.local:8001/services/your-service/routes \\
  -d 'paths[]=/api/your-resource' \\
  -d 'strip_path=false'

# 3. Apply the JWT plugin (validates DynaDoc JWT via RSA public key)
curl -sX POST http://kong-admin-svc.dynadoc.svc.cluster.local:8001/routes/<route-id>/plugins \\
  -d name=jwt \\
  -d 'config.key_claim_name=kid' \\
  -d 'config.claims_to_verify[]=exp'

# Passport Bearer tokens bypass Kong JWT — they go straight to your service
# and are validated by the middleware via introspection.`;

const CURL_JWT_CODE = `# 1. Log in via the web app and copy the 'token' cookie, then:
curl -s https://ddoc.fi/api/your-resource \\
  -H "Cookie: token=<jwt-from-browser>" | jq .`;

const CURL_PASSPORT_CODE = `# 1. Obtain a Passport access token via Authorization Code flow
#    (follow the /oauth/authorize → /oauth/token exchange documented in the Overview tab)

# 2. Call your service with the Bearer token:
curl -s https://ddoc.fi/api/your-resource \\
  -H "Authorization: Bearer <passport-access-token>" | jq .`;

const CURL_INTROSPECT_CODE = `# Manually test the introspection endpoint (from inside the cluster):
curl -sX POST http://user-svc.dynadoc.svc.cluster.local:80/api/oauth/introspect \\
  -H "Authorization: Bearer <passport-access-token>" \\
  -H "X-Introspect-Secret: <INTROSPECT_SECRET>" | jq .

# Expected response:
# {
#   "active": true,
#   "userId": "uuid",
#   "name": "Alice",
#   "email": "alice@example.com",
#   "organizationId": "uuid",
#   "organizationSlug": "acme",
#   "role": "admin",
#   "isSystemAdmin": false,
#   "exp": 1748000000
# }`;

const SsoIntegrationPage: React.FC = () => {
  return (
    <ProtectedLayout>
      <RoleGuard
        minRole="admin"
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center space-y-3 max-w-sm">
              <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto">
                <Lock className="w-7 h-7 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Admin access required</h2>
              <p className="text-gray-500 text-sm">This page is only accessible to users with the Admin or Owner role.</p>
            </div>
          </div>
        }
      >
        <div className="min-h-screen bg-gray-50">
          {/* ── Page header ── */}
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-5xl mx-auto px-6 py-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-md">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold text-gray-900">SSO Integration Guide</h1>
                    <Badge variant="outline" className="text-xs border-red-300 text-red-600 bg-red-50">
                      Admin only
                    </Badge>
                    <Badge variant="outline" className="text-xs border-indigo-300 text-indigo-600 bg-indigo-50">
                      v2.0.0
                    </Badge>
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed max-w-2xl">
                    How to integrate a new backend service into the DynaDoc SSO system using OAuth2 + Laravel Passport. Covers both the DynaDoc JWT fast path and the Passport Bearer token introspection path.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="max-w-5xl mx-auto px-6 py-8">
            <Tabs defaultValue="overview">
              <TabsList className="mb-8 bg-white border border-gray-200 p-1 rounded-xl shadow-sm h-auto flex-wrap gap-1">
                <TabsTrigger value="overview" className="rounded-lg text-sm gap-1.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  <BookOpen className="w-3.5 h-3.5" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="middleware" className="rounded-lg text-sm gap-1.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  <Layers className="w-3.5 h-3.5" />
                  Middleware
                </TabsTrigger>
                <TabsTrigger value="kong" className="rounded-lg text-sm gap-1.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  <Globe className="w-3.5 h-3.5" />
                  Kong Routing
                </TabsTrigger>
                <TabsTrigger value="env" className="rounded-lg text-sm gap-1.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  <Server className="w-3.5 h-3.5" />
                  Environment
                </TabsTrigger>
                <TabsTrigger value="testing" className="rounded-lg text-sm gap-1.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  <FlaskConical className="w-3.5 h-3.5" />
                  Testing
                </TabsTrigger>
                <TabsTrigger value="security" className="rounded-lg text-sm gap-1.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  <Key className="w-3.5 h-3.5" />
                  Security
                </TabsTrigger>
              </TabsList>

              {/* ── Overview ── */}
              <TabsContent value="overview" className="space-y-8">
                <Section title="How authentication works">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    DynaDoc uses two complementary token types. Every new service must handle <strong>both</strong> — the middleware does this automatically once wired up.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        label: 'DynaDoc JWT',
                        badge: 'Fast path',
                        badgeColor: 'bg-green-100 text-green-700',
                        desc: 'Issued by user-service after login. Carried in an HttpOnly cookie. Kong validates the RSA signature at the gateway — your service only needs to decode the base64 payload. No network call required.',
                        claims: ['iss: "user-service"', 'userId, name, email', 'organizationId, organizationSlug', 'role (viewer|editor|admin|owner)', 'isSystemAdmin', 'exp'],
                      },
                      {
                        label: 'Passport Bearer',
                        badge: 'Introspection path',
                        badgeColor: 'bg-blue-100 text-blue-700',
                        desc: 'Issued by Laravel Passport via OAuth2 Authorization Code flow. Sent as an Authorization: Bearer header. Your service must call the /api/oauth/introspect endpoint to validate and retrieve user context.',
                        claims: ['active: true/false', 'userId, name, email', 'organizationId, organizationSlug', 'role', 'isSystemAdmin', 'exp'],
                      },
                    ].map(card => (
                      <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900">{card.label}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${card.badgeColor}`}>{card.badge}</span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">{card.desc}</p>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs font-semibold text-gray-600 mb-1.5">Claims available</p>
                          <ul className="space-y-0.5">
                            {card.claims.map(c => (
                              <li key={c} className="text-xs text-gray-500 font-mono">{c}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>

                <Section title="Request flow diagram">
                  <div className="bg-white border border-gray-200 rounded-xl p-6 overflow-x-auto">
                    <div className="min-w-[500px] space-y-3 text-sm font-mono">
                      {[
                        { from: 'Browser / API client', arrow: '→', to: 'Kong Gateway', note: 'HTTPS request' },
                        { from: 'Kong', arrow: '→', to: 'Kong JWT plugin', note: 'verifies RSA sig on cookie JWT; passes Passport Bearer through' },
                        { from: 'Kong', arrow: '→', to: 'your-service (nginx)', note: 'forwards request' },
                        { from: 'nginx', arrow: '→', to: 'php-fpm', note: 'FastCGI' },
                        { from: 'ExtractJwtClaims middleware', arrow: '→', note: 'checks iss claim' },
                        { from: 'iss = "user-service"', arrow: '→', to: 'controller', note: '✓ fast path — claims from payload' },
                        { from: 'Bearer token', arrow: '→', to: 'user-svc /api/oauth/introspect', note: '+ X-Introspect-Secret header' },
                        { from: 'introspect response', arrow: '→', to: 'controller', note: '✓ claims from introspect response' },
                      ].map((row, i) => (
                        <div key={i} className="flex items-start gap-2 text-gray-600">
                          <span className="text-gray-400 w-5 shrink-0">{i + 1}.</span>
                          <span className="text-blue-700 min-w-0">{row.from}</span>
                          <span className="text-gray-400 shrink-0">{row.arrow}</span>
                          {row.to && <span className="text-indigo-700 min-w-0">{row.to}</span>}
                          {row.note && <span className="text-gray-400 text-xs self-center">({row.note})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </Section>

                <Section title="Integration checklist">
                  <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                    {[
                      { label: 'Copy ExtractJwtClaimsMiddleware into your service', tab: 'Middleware' },
                      { label: 'Register the middleware alias in bootstrap/app.php', tab: 'Middleware' },
                      { label: 'Apply jwt.auth to your routes', tab: 'Middleware' },
                      { label: 'Add USER_SERVICE_URL and INTROSPECT_SECRET env vars', tab: 'Environment' },
                      { label: 'Mount the kong-jwt-secret volume (jwt-public.pem)', tab: 'Environment' },
                      { label: 'Register service + route + JWT plugin in Kong', tab: 'Kong Routing' },
                      { label: 'Smoke-test with a DynaDoc JWT cookie', tab: 'Testing' },
                      { label: 'Smoke-test with a Passport Bearer token', tab: 'Testing' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 px-5 py-3">
                        <CheckCircle className="w-4 h-4 text-gray-300 shrink-0" />
                        <span className="text-sm text-gray-700 flex-1">{item.label}</span>
                        <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full shrink-0">{item.tab}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              </TabsContent>

              {/* ── Middleware ── */}
              <TabsContent value="middleware" className="space-y-8">
                <Callout type="info">
                  This exact middleware is already used in template-service, file-service, and audit-service. Copy it verbatim — do not modify the introspection logic unless the introspect endpoint contract changes.
                </Callout>

                <Section title="1. Copy the middleware class">
                  <p className="text-sm text-gray-600">Place the file at <InlineCode>app/Infrastructure/Http/Middlewares/ExtractJwtClaimsMiddleware.php</InlineCode></p>
                  <CodeBlock lang="php" code={MIDDLEWARE_CODE} />
                </Section>

                <Section title="2. Register the alias in bootstrap/app.php">
                  <CodeBlock lang="php" code={BOOTSTRAP_CODE} />
                </Section>

                <Section title="3. Apply to your routes">
                  <CodeBlock lang="php" code={ROUTE_MIDDLEWARE_CODE} />
                </Section>

                <Section title="4. Read claims in your controller">
                  <p className="text-sm text-gray-600">Claims are set on <InlineCode>{'$request->attributes'}</InlineCode> by the middleware — never trust user-supplied headers.</p>
                  <CodeBlock lang="php" code={CONTROLLER_CODE} />
                </Section>

                <Section title="Claims reference">
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Claim</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Description</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Source</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {[
                          ['userId', 'string (UUID)', 'Authenticated user ID', 'Both'],
                          ['name', 'string', 'Display name', 'Both'],
                          ['email', 'string', 'Email address', 'Both'],
                          ['organizationId', 'string|null', 'Current org UUID', 'Both'],
                          ['organizationSlug', 'string|null', 'Org slug for URLs', 'Both'],
                          ['role', 'string', 'viewer | editor | admin | owner', 'Both'],
                          ['isSystemAdmin', 'bool', 'True for the system super-admin account', 'Both'],
                          ['iss', 'string', '"user-service" — present on JWT fast path only', 'JWT only'],
                          ['exp', 'int', 'Unix expiry timestamp', 'Both'],
                        ].map(([claim, type, desc, source]) => (
                          <tr key={claim} className="hover:bg-gray-50">
                            <td className="px-4 py-3"><InlineCode>{claim}</InlineCode></td>
                            <td className="px-4 py-3 text-gray-500 font-mono text-xs">{type}</td>
                            <td className="px-4 py-3 text-gray-600">{desc}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${source === 'Both' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{source}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              </TabsContent>

              {/* ── Kong Routing ── */}
              <TabsContent value="kong" className="space-y-8">
                <Callout type="info">
                  Kong is the single entry point for all external traffic. Every new service route must be registered here. The JWT plugin validates DynaDoc JWTs at the gateway — Passport Bearer tokens pass through unvalidated and are checked downstream by the middleware.
                </Callout>

                <Section title="Register service, route, and JWT plugin">
                  <CodeBlock lang="bash" code={KONG_CODE} />
                </Section>

                <Section title="Public routes (no JWT plugin)">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    If your service has endpoints that must be reachable without authentication (e.g. webhooks, public APIs), register those routes <strong>without</strong> the JWT plugin. Currently the following paths are public:
                  </p>
                  <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                    {[
                      { path: '/oauth/*', note: 'Passport OAuth2 authorization endpoints' },
                      { path: '/login', note: 'Browser login redirect for OAuth flow' },
                      { path: '/api/oauth/introspect', note: 'Internal introspection — protected by INTROSPECT_SECRET instead' },
                      { path: '/api/auth/login', note: 'Password login' },
                      { path: '/api/auth/sso-link', note: 'Get OAuth2 authorize URL' },
                      { path: '/api/auth/sso-exchange', note: 'Exchange authorization code for JWT' },
                    ].map(({ path, note }) => (
                      <div key={path} className="flex items-center gap-4 px-5 py-3">
                        <InlineCode>{path}</InlineCode>
                        <span className="text-xs text-gray-500">{note}</span>
                      </div>
                    ))}
                  </div>
                </Section>

                <Section title="Routing architecture">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-center">
                    {[
                      { label: 'ddoc.fi (Ingress)', sub: 'TLS termination\nnginx-ingress', color: 'bg-gray-100 border-gray-300' },
                      { label: 'Kong Gateway', sub: 'JWT validation\nRate limiting\nAPI key auth', color: 'bg-indigo-50 border-indigo-200' },
                      { label: 'Your Service', sub: 'ExtractJwtClaims middleware\nBusiness logic', color: 'bg-green-50 border-green-200' },
                    ].map((box, i, arr) => (
                      <React.Fragment key={box.label}>
                        <div className={`border-2 rounded-xl p-4 ${box.color}`}>
                          <div className="font-semibold text-gray-800">{box.label}</div>
                          <div className="text-xs text-gray-500 mt-1 whitespace-pre-line">{box.sub}</div>
                        </div>
                        {i < arr.length - 1 && (
                          <div className="hidden sm:flex items-center justify-center text-gray-400">
                            <ArrowRight className="w-5 h-5" />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </Section>
              </TabsContent>

              {/* ── Environment ── */}
              <TabsContent value="env" className="space-y-8">
                <Section title="Required environment variables">
                  <CodeBlock lang="dotenv" code={ENV_CODE} />
                </Section>

                <Section title="Kubernetes deployment patch">
                  <p className="text-sm text-gray-600">Add these blocks to your service's deployment YAML. The <InlineCode>introspect-secret</InlineCode> and <InlineCode>kong-jwt-secret</InlineCode> secrets already exist in the <InlineCode>dynadoc</InlineCode> namespace.</p>
                  <CodeBlock lang="yaml" code={K8S_ENV_CODE} />
                </Section>

                <Section title="Secrets reference">
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">K8s Secret name</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Key</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Maps to env var</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {[
                          ['introspect-secret', 'INTROSPECT_SECRET', 'INTROSPECT_SECRET'],
                          ['kong-jwt-secret', 'jwt-public.pem', '(mounted as file, not env var)'],
                          ['user-db-secret', 'POSTGRES_PASSWORD', 'DB_PASSWORD (user-service only)'],
                          ['user-app-secret', 'APP_KEY', 'APP_KEY (user-service only)'],
                          ['passport-secret', 'PASSPORT_CLIENT_ID', 'PASSPORT_CLIENT_ID (user-service only)'],
                        ].map(([secret, key, env]) => (
                          <tr key={`${secret}-${key}`} className="hover:bg-gray-50">
                            <td className="px-4 py-3"><InlineCode>{secret}</InlineCode></td>
                            <td className="px-4 py-3 font-mono text-xs text-gray-600">{key}</td>
                            <td className="px-4 py-3 font-mono text-xs text-gray-500">{env}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              </TabsContent>

              {/* ── Testing ── */}
              <TabsContent value="testing" className="space-y-8">
                <Callout type="tip">
                  Always test both authentication paths. A service that only works with JWT cookies will silently fail for M2M or OAuth2 clients sending Bearer tokens.
                </Callout>

                <Section title="Test with a DynaDoc JWT cookie">
                  <p className="text-sm text-gray-600">Log in via the web app, open DevTools → Application → Cookies, copy the <InlineCode>token</InlineCode> cookie value, then:</p>
                  <CodeBlock lang="bash" code={CURL_JWT_CODE} />
                </Section>

                <Section title="Test with a Passport Bearer token">
                  <CodeBlock lang="bash" code={CURL_PASSPORT_CODE} />
                </Section>

                <Section title="Test the introspection endpoint directly">
                  <p className="text-sm text-gray-600">Run this from inside the cluster (exec into any pod) to verify the introspection endpoint is reachable and returning correct claims:</p>
                  <CodeBlock lang="bash" code={CURL_INTROSPECT_CODE} />
                </Section>

                <Section title="Expected HTTP status codes">
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Meaning</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Common cause</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {[
                          ['200', 'Success', 'Valid token, user found, route authorized'],
                          ['401 — Missing token', 'No auth provided', 'Missing cookie and no Bearer header'],
                          ['401 — Malformed token', 'Bad JWT structure', 'Not a 3-part dot-delimited JWT'],
                          ['401 — Invalid or revoked token', 'Introspection failed', 'Token expired, revoked on logout, or wrong secret'],
                          ['401 — Unknown token format', 'Token in cookie but not Bearer', 'Should not occur — indicates middleware bug'],
                          ['403', 'Forbidden', 'Token valid, but role insufficient for this resource'],
                        ].map(([status, meaning, cause]) => (
                          <tr key={status} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono text-xs text-gray-800">{status}</td>
                            <td className="px-4 py-3 text-gray-700">{meaning}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{cause}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              </TabsContent>

              {/* ── Security ── */}
              <TabsContent value="security" className="space-y-8">
                <Section title="Security requirements">
                  <div className="space-y-3">
                    {[
                      {
                        title: 'Never trust claims from request headers',
                        desc: 'Read claims only from $request->attributes->get(\'loggedUser\'). Never accept X-User-Id or similar headers from callers — those can be forged.',
                        severity: 'critical',
                      },
                      {
                        title: 'Rotate INTROSPECT_SECRET if compromised',
                        desc: 'The shared INTROSPECT_SECRET protects the introspection endpoint from external callers. Rotate it in introspect-secret and redeploy all services simultaneously.',
                        severity: 'critical',
                      },
                      {
                        title: 'Keep USER_SERVICE_URL as a cluster-internal URL',
                        desc: 'Always use http://user-svc.dynadoc.svc.cluster.local:80, never a public URL. Introspection traffic must not leave the cluster.',
                        severity: 'high',
                      },
                      {
                        title: 'jwt-public.pem is read-only',
                        desc: 'Mount the public key volume as readOnly: true. The private key never leaves the user-service pod.',
                        severity: 'high',
                      },
                      {
                        title: 'Token TTL and revocation',
                        desc: 'DynaDoc JWTs expire in 14.5 days (JWT_TTL env). Passport access tokens expire in 24 hours. On logout, the Passport token is revoked immediately via the passport_jti claim — downstream services will see active: false on next introspection.',
                        severity: 'info',
                      },
                      {
                        title: 'Role enforcement is your responsibility',
                        desc: 'The middleware only sets claims — it does not enforce business-level roles. Your controller or a separate RoleMiddleware must check role and isSystemAdmin for every sensitive operation.',
                        severity: 'info',
                      },
                    ].map(item => {
                      const colors = {
                        critical: 'border-red-200 bg-red-50',
                        high:     'border-amber-200 bg-amber-50',
                        info:     'border-blue-200 bg-blue-50',
                      } as const;
                      const badges = {
                        critical: 'bg-red-100 text-red-700',
                        high:     'bg-amber-100 text-amber-700',
                        info:     'bg-blue-100 text-blue-700',
                      } as const;
                      return (
                        <div key={item.title} className={`border rounded-xl p-5 ${colors[item.severity as keyof typeof colors]}`}>
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-sm font-semibold text-gray-900">{item.title}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badges[item.severity as keyof typeof badges]}`}>
                                  {item.severity}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed">{item.desc}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Section>

                <Section title="Kong JWT plugin configuration">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    The Kong JWT plugin validates DynaDoc JWTs using the RSA public key stored in the <InlineCode>kong-jwt-secret</InlineCode> K8s secret. Passport Bearer tokens are identified by their <InlineCode>iss</InlineCode> claim (<InlineCode>{"https://ddoc.fi"}</InlineCode>) and <em>bypass</em> the Kong JWT plugin — they are validated downstream by the middleware via introspection. This is intentional: Passport tokens are opaque to Kong.
                  </p>
                  <Callout type="warning">
                    Do not add the JWT plugin to the /oauth/*, /login, or /api/oauth/introspect routes. These must remain public for the Authorization Code flow to work correctly.
                  </Callout>
                </Section>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </RoleGuard>
    </ProtectedLayout>
  );
};

export default SsoIntegrationPage;
