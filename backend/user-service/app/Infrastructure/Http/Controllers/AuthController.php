<?php

namespace App\Infrastructure\Http\Controllers;

use App\Application\DTOs\AuthInputDTO;
use App\Application\DTOs\ForgotPasswordInputDTO;
use App\Application\DTOs\RegisterInputDTO;
use App\Application\DTOs\ResetPasswordInputDTO;
use App\Application\Handlers\ForgotPasswordHandler;
use App\Application\Handlers\ResetPasswordHandler;
use App\Application\Handlers\StoreAuthHandler;
use App\Application\Handlers\StoreRegisterHandler;
use App\Infrastructure\Http\Requests\ForgotPasswordRequest;
use App\Infrastructure\Http\Requests\ResetPasswordRequest;
use App\Infrastructure\Http\Requests\StoreAuthRequest;
use App\Infrastructure\Http\Requests\StoreRegisterRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AuthController extends BaseController
{
    public function login(StoreAuthRequest $request, StoreAuthHandler $handler): JsonResponse
    {
        $output = $handler->execute(new AuthInputDTO(
            email: $request->validated('email'),
            password: $request->validated('password'),
        ));

        return $this->successResponse([
            'id'            => $output->id,
            'name'          => $output->name,
            'email'         => $output->email,
            'role'          => $output->role,
            'isSystemAdmin' => $output->isSystemAdmin,
        ])->cookie($this->makeTokenCookie($output->token));
    }

    public function register(StoreRegisterRequest $request, StoreRegisterHandler $handler): JsonResponse
    {
        $output = $handler->execute(new RegisterInputDTO(
            name:     $request->validated('name'),
            email:    $request->validated('email'),
            password: $request->validated('password'),
        ));

        return $this->successResponse([
            'id'            => $output->id,
            'name'          => $output->name,
            'email'         => $output->email,
            'role'          => $output->role,
            'isSystemAdmin' => $output->isSystemAdmin,
        ], 201)->cookie($this->makeTokenCookie($output->token));
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->attributes->get('loggedUser');

        return $this->successResponse([
            'id'            => $user['userId'],
            'name'          => $user['name'],
            'email'         => $user['email'],
            'role'          => $user['role'] ?? 'viewer',
            'isSystemAdmin' => (bool) ($user['isSystemAdmin'] ?? false),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        // If this session originated from the SSO flow, revoke the linked Passport token
        // so it cannot be used for introspection calls after logout.
        $rawToken = $request->cookie('token');
        if ($rawToken) {
            $parts = explode('.', $rawToken);
            if (count($parts) === 3) {
                $claims = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
                $jti    = $claims['passport_jti'] ?? null;
                if ($jti) {
                    DB::table('oauth_access_tokens')->where('id', $jti)->update(['revoked' => true]);
                    DB::table('oauth_refresh_tokens')->where('access_token_id', $jti)->update(['revoked' => true]);
                }
            }
        }

        return response()
            ->json(['message' => 'Logged out'])
            ->cookie('token', '', -1);
    }

    public function forgotPassword(ForgotPasswordRequest $request, ForgotPasswordHandler $handler): JsonResponse
    {
        $token = $handler->execute(new ForgotPasswordInputDTO(
            email: $request->validated('email'),
        ));

        // Always return 200 so callers cannot enumerate existing emails.
        // In dev mode we include the reset token directly so the flow can be
        // tested without a mail server.
        $response = ['message' => 'If that email exists, a reset link has been sent.'];

        if ($token !== null && app()->environment('local', 'testing')) {
            $response['dev_token'] = $token;
            $response['dev_reset_url'] = env('FRONTEND_URL', 'http://localhost:5173')
                . '/reset-password?token=' . $token
                . '&email=' . urlencode($request->validated('email'));
        }

        return $this->successResponse($response);
    }

    public function resetPassword(ResetPasswordRequest $request, ResetPasswordHandler $handler): JsonResponse
    {
        $handler->execute(new ResetPasswordInputDTO(
            email:    $request->validated('email'),
            token:    $request->validated('token'),
            password: $request->validated('password'),
        ));

        return $this->successResponse(['message' => 'Password has been reset successfully.']);
    }

    private function makeTokenCookie(string $token): \Symfony\Component\HttpFoundation\Cookie
    {
        return cookie(
            name:     'token',
            value:    $token,
            minutes:  (int) env('JWT_TTL', 21000) / 60,
            path:     '/',
            domain:   null,
            secure:   app()->environment('production'),
            httpOnly: true,
            sameSite: 'Strict'
        );
    }
}
