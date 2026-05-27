<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers;

use App\Application\Services\JwtService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class OAuthController extends BaseController
{
    /**
     * Return the Passport authorization URL and a HMAC-signed state token.
     *
     * The frontend stores state + signedState in sessionStorage, then redirects the
     * browser to the returned URL. The signedState is verified on exchange() without
     * any server-side session, keeping the BFF endpoint fully stateless.
     */
    public function link(): JsonResponse
    {
        $state       = Str::random(40);
        $signedState = hash_hmac('sha256', $state, config('app.key'));

        $authorizeBase = rtrim(env('APP_URL', 'http://localhost:8000'), '/');

        $query = http_build_query([
            'client_id'     => config('sso.client_id'),
            'redirect_uri'  => config('sso.redirect_uri'),
            'response_type' => 'code',
            'scope'         => '',
            'state'         => $state,
        ]);

        return response()->json([
            'url'          => $authorizeBase . '/oauth/authorize?' . $query,
            'state'        => $state,
            'signed_state' => $signedState,
        ]);
    }

    /**
     * Exchange an authorization code for a JWT session cookie.
     *
     * 1. Verify the HMAC-signed state to prevent CSRF.
     * 2. POST the code to Passport's /oauth/token endpoint.
     * 3. Decode the returned Passport JWT to get the user ID.
     * 4. Load user + org context and issue our existing JWT cookie.
     *    Downstream services (template-service, file-service, …) are unaffected.
     */
    public function exchange(Request $request): JsonResponse
    {
        $state       = (string) $request->input('state', '');
        $signedState = (string) $request->input('signed_state', '');
        $code        = (string) $request->input('code', '');

        // CSRF guard — verify the HMAC signature produced in link()
        $expected = hash_hmac('sha256', $state, config('app.key'));
        if (!hash_equals($expected, $signedState)) {
            return response()->json(['message' => 'Invalid state parameter.'], 422);
        }

        if (empty($code)) {
            return response()->json(['message' => 'Authorization code is required.'], 422);
        }

        // Exchange authorization code for a Passport access token
        $tokenResponse = Http::asForm()->post(config('sso.token_url'), [
            'grant_type'    => 'authorization_code',
            'client_id'     => config('sso.client_id'),
            'client_secret' => config('sso.client_secret'),
            'redirect_uri'  => config('sso.redirect_uri'),
            'code'          => $code,
        ]);

        if (!$tokenResponse->ok()) {
            return response()->json(['message' => 'Token exchange failed.'], 401);
        }

        // Passport issues a signed JWT — decode the payload (no need to verify signature
        // here because we trust our own /oauth/token response over HTTPS).
        $parts   = explode('.', $tokenResponse->json('access_token', ''));
        $payload = json_decode(base64_decode(str_pad($parts[1] ?? '', strlen($parts[1] ?? '') % 4 === 0 ? strlen($parts[1] ?? '') : strlen($parts[1] ?? '') + 4 - strlen($parts[1] ?? '') % 4, '=')), true);
        $userId  = $payload['sub'] ?? null;

        if (!$userId) {
            return response()->json(['message' => 'Invalid token payload.'], 401);
        }

        // Load user + org context (same pattern as AuthController::login)
        $user = DB::table('users')->where('id', $userId)->first();
        if (!$user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        $orgId  = $user->current_organization_id;
        $org    = $orgId ? DB::table('organizations')->where('id', $orgId)->first() : null;
        $member = $orgId
            ? DB::table('organization_members')
                ->where('organization_id', $orgId)
                ->where('user_id', $userId)
                ->first()
            : null;

        $orgSlug       = $org?->slug;
        $role          = $member?->role ?? 'viewer';
        $adminEmail    = env('SYSTEM_ADMIN_EMAIL', '');
        $isSystemAdmin = $adminEmail !== '' && strtolower($user->email) === strtolower($adminEmail);

        // Issue the same JWT cookie that all downstream services already trust.
        // Embed the Passport token ID (jti) so logout can revoke it precisely.
        $jwt = app(JwtService::class)->generateToken([
            'userId'           => $user->id,
            'name'             => $user->name,
            'email'            => $user->email,
            'organizationId'   => $orgId,
            'organizationSlug' => $orgSlug,
            'role'             => $role,
            'isSystemAdmin'    => $isSystemAdmin,
            'passport_jti'     => $payload['jti'] ?? null,
        ]);

        $cookie = cookie(
            name:     'token',
            value:    $jwt,
            minutes:  (int) env('JWT_TTL', 21000) / 60,
            path:     '/',
            domain:   null,
            secure:   true,
            httpOnly: true,
            sameSite: 'Strict',
        );

        return response()->json([
            'data' => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => $role,
            ],
        ])->cookie($cookie);
    }

    /**
     * Token introspection (RFC 7662 subset).
     *
     * Called exclusively by downstream services (template, file, audit) to validate
     * a Passport Bearer token and obtain the enriched user context they need for RBAC.
     * Secured with a shared INTROSPECT_SECRET so it cannot be called externally.
     *
     * Returns { active: true, userId, name, email, organizationId, … } on success,
     * or { active: false } for any invalid/expired/revoked token.
     */
    public function introspect(Request $request): JsonResponse
    {
        // Gate: only trusted internal services may call this endpoint
        $secret = $request->header('X-Introspect-Secret', '');
        if (!hash_equals((string) env('INTROSPECT_SECRET', ''), $secret)) {
            return response()->json(['active' => false], 401);
        }

        $token = $request->bearerToken();
        if (!$token) {
            return response()->json(['active' => false]);
        }

        // Decode Passport JWT payload (base64url)
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return response()->json(['active' => false]);
        }

        $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
        $jti     = $payload['jti'] ?? null;
        $sub     = $payload['sub'] ?? null;
        $exp     = (int) ($payload['exp'] ?? 0);

        if (!$jti || !$sub || $exp < time()) {
            return response()->json(['active' => false]);
        }

        // Check revocation in Passport's token table
        $tokenRecord = DB::table('oauth_access_tokens')
            ->where('id', $jti)
            ->where('revoked', false)
            ->first();

        if (!$tokenRecord) {
            return response()->json(['active' => false]);
        }

        // Load user + org context
        $user = DB::table('users')->where('id', $sub)->first();
        if (!$user) {
            return response()->json(['active' => false]);
        }

        $orgId  = $user->current_organization_id;
        $org    = $orgId ? DB::table('organizations')->where('id', $orgId)->first() : null;
        $member = $orgId
            ? DB::table('organization_members')
                ->where('organization_id', $orgId)
                ->where('user_id', $sub)
                ->first()
            : null;

        $adminEmail    = env('SYSTEM_ADMIN_EMAIL', '');
        $isSystemAdmin = $adminEmail !== '' && strtolower($user->email) === strtolower($adminEmail);

        return response()->json([
            'active'           => true,
            'userId'           => $user->id,
            'name'             => $user->name,
            'email'            => $user->email,
            'organizationId'   => $orgId,
            'organizationSlug' => $org?->slug,
            'role'             => $member?->role ?? 'viewer',
            'isSystemAdmin'    => $isSystemAdmin,
            'exp'              => $exp,
        ]);
    }
}
