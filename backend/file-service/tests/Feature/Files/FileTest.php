<?php

use App\Application\Events\TemplateRequestedEvent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;

use function Pest\Laravel\{postJson, getJson, deleteJson};

// Builds a fake JWT bearer token. The file-service middleware only base64-decodes
// the payload — it does NOT verify the signature — so this is sufficient for tests.
function fakeBearerToken(string $userId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', string $companyId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'): string
{
    $header  = rtrim(strtr(base64_encode('{"typ":"JWT","alg":"RS256"}'), '+/', '-_'), '=');
    $payload = rtrim(strtr(base64_encode(json_encode([
        'userId'    => $userId,
        'companyId' => $companyId,
        'iss'       => 'user-service',
        'iat'       => time(),
        'exp'       => time() + 3600,
    ])), '+/', '-_'), '=');

    return "Bearer {$header}.{$payload}.fakesignature";
}

beforeEach(function () {
    $this->userId    = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    $this->companyId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    $this->token     = fakeBearerToken($this->userId, $this->companyId);

    Event::fake([TemplateRequestedEvent::class]);
});

// ── async-generate ────────────────────────────────────────────────────────────

it('queues a file generation and returns a UUID', function () {
    $templateId = Str::uuid()->toString();

    $response = postJson('/api/files/async-generate', [
        'templateId' => $templateId,
        'name'       => 'Invoice 2024',
        'payload'    => ['client' => 'ACME'],
    ], ['Authorization' => $this->token]);

    $response->assertOk()
             ->assertJsonStructure(['message', 'data']);

    expect($response->json('data'))->toBeString();

    Event::assertDispatched(TemplateRequestedEvent::class, function ($e) use ($templateId) {
        return $e->templateId === $templateId;
    });
});

it('validates required fields on async-generate', function () {
    $response = postJson('/api/files/async-generate', [], [
        'Authorization' => $this->token,
    ]);

    $response->assertStatus(422)
             ->assertJsonValidationErrors(['templateId', 'name', 'payload']);

    Event::assertNotDispatched(TemplateRequestedEvent::class);
});

it('rejects async-generate without authentication', function () {
    $response = postJson('/api/files/async-generate', [
        'templateId' => Str::uuid()->toString(),
        'name'       => 'Invoice',
        'payload'    => [],
    ]);

    $response->assertUnauthorized();
});

// ── filters ───────────────────────────────────────────────────────────────────

it('returns an empty list when no files exist', function () {
    $response = getJson('/api/files/filters', [
        'Authorization' => $this->token,
    ]);

    $response->assertOk()
             ->assertJsonStructure(['message', 'data'])
             ->assertJson(['data' => []]);
});

it('rejects filters without authentication', function () {
    $response = getJson('/api/files/filters');

    $response->assertUnauthorized();
});

// ── destroy ───────────────────────────────────────────────────────────────────

it('returns 404 when deleting a non-existent file', function () {
    $response = deleteJson('/api/files/' . Str::uuid()->toString(), [], [
        'Authorization' => $this->token,
    ]);

    $response->assertNotFound();
});

it('deletes an existing file successfully', function () {
    $fileId     = Str::orderedUuid()->toString();
    $templateId = Str::uuid()->toString();
    $now        = now()->toDateTimeString();

    DB::table('files')->insert([
        'id'                => $fileId,
        'name'              => 'test-file.pdf',
        'template_id'       => $templateId,
        'user_id'           => $this->userId,
        'payload'           => '{}',
        'path'              => null,
        'ready_to_download' => false,
        'status'            => 1,
        'errors'            => null,
        'created_at'        => $now,
        'updated_at'        => $now,
    ]);

    $response = deleteJson("/api/files/{$fileId}", [], [
        'Authorization' => $this->token,
    ]);

    $response->assertOk()
             ->assertJsonStructure(['message', 'data']);

    expect(DB::table('files')->where('id', $fileId)->exists())->toBeFalse();
});

it('rejects destroy without authentication', function () {
    $response = deleteJson('/api/files/' . Str::uuid()->toString());

    $response->assertUnauthorized();
});
