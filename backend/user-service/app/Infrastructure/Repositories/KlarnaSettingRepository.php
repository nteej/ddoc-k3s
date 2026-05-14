<?php

declare(strict_types=1);

namespace App\Infrastructure\Repositories;

use App\Domain\Entities\KlarnaSetting;
use Illuminate\Support\Facades\DB;

class KlarnaSettingRepository
{
    public function get(): ?KlarnaSetting
    {
        $row = DB::table('klarna_settings')->first();
        if (!$row) return null;

        return new KlarnaSetting(
            id:                 $row->id,
            mode:               $row->mode,
            sandboxUsername:    $row->sandbox_username,
            sandboxPassword:    $row->sandbox_password,
            productionUsername: $row->production_username,
            productionPassword: $row->production_password,
        );
    }

    public function upsert(array $data): void
    {
        $existing = DB::table('klarna_settings')->first();

        if ($existing) {
            $update = array_filter([
                'mode'                => $data['mode'] ?? null,
                'sandbox_username'    => array_key_exists('sandbox_username', $data) ? $data['sandbox_username'] : null,
                'sandbox_password'    => array_key_exists('sandbox_password', $data) ? $data['sandbox_password'] : null,
                'production_username' => array_key_exists('production_username', $data) ? $data['production_username'] : null,
                'production_password' => array_key_exists('production_password', $data) ? $data['production_password'] : null,
                'updated_at'          => now(),
            ], fn($v) => $v !== null);

            // Allow explicit null for username/password fields
            foreach (['sandbox_username', 'sandbox_password', 'production_username', 'production_password'] as $field) {
                if (array_key_exists($field, $data)) {
                    $update[$field] = $data[$field];
                }
            }
            $update['updated_at'] = now();

            DB::table('klarna_settings')->where('id', $existing->id)->update($update);
        } else {
            $id = KlarnaSetting::create()->id;
            DB::table('klarna_settings')->insert([
                'id'                  => $id,
                'mode'                => $data['mode'] ?? 'sandbox',
                'sandbox_username'    => $data['sandbox_username'] ?? null,
                'sandbox_password'    => $data['sandbox_password'] ?? null,
                'production_username' => $data['production_username'] ?? null,
                'production_password' => $data['production_password'] ?? null,
                'created_at'          => now(),
                'updated_at'          => now(),
            ]);
        }
    }
}
