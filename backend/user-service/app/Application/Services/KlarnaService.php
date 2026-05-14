<?php

declare(strict_types=1);

namespace App\Application\Services;

use App\Infrastructure\Repositories\KlarnaSettingRepository;
use Illuminate\Support\Facades\Http;

class KlarnaService
{
    public function __construct(
        private readonly KlarnaSettingRepository $repo,
    ) {}

    public function isConfigured(): bool
    {
        $s = $this->repo->get();
        if (!$s) return false;

        return $s->mode === 'production'
            ? !empty($s->productionUsername) && !empty($s->productionPassword)
            : !empty($s->sandboxUsername) && !empty($s->sandboxPassword);
    }

    public function getMode(): string
    {
        return $this->repo->get()?->mode ?? 'sandbox';
    }

    public function createSession(array $order): array
    {
        return $this->post('/payments/v1/sessions', $order);
    }

    public function createOrder(string $authorizationToken, array $order): array
    {
        return $this->post("/payments/v1/authorizations/{$authorizationToken}/order", $order);
    }

    private function post(string $path, array $body): array
    {
        [$baseUrl, $username, $password] = $this->credentials();

        $response = Http::withBasicAuth($username, $password)
            ->timeout(15)
            ->post($baseUrl . $path, $body);

        if ($response->failed()) {
            $msg = $response->json('error_messages.0')
                ?? $response->json('message')
                ?? "HTTP {$response->status()}";
            throw new \RuntimeException("Klarna API error: {$msg}");
        }

        return $response->json();
    }

    private function credentials(): array
    {
        $s = $this->repo->get();
        if (!$s) throw new \RuntimeException('Klarna is not configured.');

        if ($s->mode === 'production') {
            return ['https://api.klarna.com', $s->productionUsername ?? '', $s->productionPassword ?? ''];
        }

        return ['https://api.playground.klarna.com', $s->sandboxUsername ?? '', $s->sandboxPassword ?? ''];
    }
}
