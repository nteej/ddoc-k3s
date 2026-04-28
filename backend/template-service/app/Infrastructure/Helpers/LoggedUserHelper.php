<?php

namespace App\Infrastructure\Helpers;

use Illuminate\Http\Request;

class LoggedUserHelper
{
    public function __construct(protected Request $request) {}

    public function get(): ?array
    {
        return $this->request->attributes->get('loggedUser');
    }

    public function companyId(): ?string
    {
        return $this->organizationId();
    }

    public function organizationId(): ?string
    {
        return $this->get()['organizationId'] ?? $this->get()['companyId'] ?? null;
    }

    public function userId(): ?string
    {
        return $this->get()['userId'] ?? null;
    }

    public function role(): string
    {
        return $this->get()['role'] ?? 'viewer';
    }
}
