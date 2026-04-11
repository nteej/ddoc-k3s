<?php

use App\Domain\Entities\AuditLog;

it('returns an empty list when no audit logs exist', function () {
    $response = $this->getJson('/api/audit-logs');
    $response->assertStatus(200);
    expect($response->json('data.data'))->toBeArray()->toBeEmpty();
});

it('returns audit logs when they exist', function () {
    AuditLog::create([
        'user_id'     => 'user-uuid-1',
        'user_name'   => 'Test User',
        'action'      => 'POST api/templates',
        'service'     => 'template-service',
        'status_code' => 200,
        'event_type'  => 'http_request',
        'occurred_at' => now(),
    ]);

    $response = $this->getJson('/api/audit-logs');
    $response->assertStatus(200);
    expect($response->json('data.data'))->toHaveCount(1);
    expect($response->json('data.data.0.action'))->toBe('POST api/templates');
});

it('filters by service', function () {
    AuditLog::create([
        'user_id' => 'u1', 'user_name' => 'A',
        'action' => 'GET api/templates', 'service' => 'template-service',
        'status_code' => 200, 'event_type' => 'http_request', 'occurred_at' => now(),
    ]);
    AuditLog::create([
        'user_id' => 'u1', 'user_name' => 'A',
        'action' => 'POST api/files/async-generate', 'service' => 'file-service',
        'status_code' => 200, 'event_type' => 'http_request', 'occurred_at' => now(),
    ]);

    $response = $this->getJson('/api/audit-logs?service=file-service');
    $response->assertStatus(200);
    expect($response->json('data.data'))->toHaveCount(1);
    expect($response->json('data.data.0.service'))->toBe('file-service');
});

it('filters by event type', function () {
    AuditLog::create([
        'user_id' => 'u1', 'user_name' => 'A', 'action' => 'POST /api/auth/login',
        'service' => 'user-service', 'status_code' => 200,
        'event_type' => 'user_login', 'occurred_at' => now(),
    ]);
    AuditLog::create([
        'user_id' => 'u1', 'user_name' => 'A', 'action' => 'GET api/templates',
        'service' => 'template-service', 'status_code' => 200,
        'event_type' => 'http_request', 'occurred_at' => now(),
    ]);

    $response = $this->getJson('/api/audit-logs?eventType=user_login');
    $response->assertStatus(200);
    expect($response->json('data.data'))->toHaveCount(1);
    expect($response->json('data.data.0.event_type'))->toBe('user_login');
});
