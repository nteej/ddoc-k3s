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

class AuthController extends BaseController
{
    public function login(StoreAuthRequest $request, StoreAuthHandler $handler): JsonResponse
    {
        $output = $handler->execute(new AuthInputDTO(
            email: $request->validated('email'),
            password: $request->validated('password'),
        ));

        return $this->successResponse([
            'id'    => $output->id,
            'name'  => $output->name,
            'email' => $output->email,
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
            'id'    => $output->id,
            'name'  => $output->name,
            'email' => $output->email,
        ], 201)->cookie($this->makeTokenCookie($output->token));
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->attributes->get('loggedUser');

        return $this->successResponse([
            'id'    => $user['userId'],
            'name'  => $user['name'],
            'email' => $user['email'],
        ]);
    }

    public function logout(): JsonResponse
    {
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
            secure:   false,
            httpOnly: true,
            sameSite: 'Strict'
        );
    }
}
