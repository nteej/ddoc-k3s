<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SendNotificationRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'channel'  => ['required', 'string', 'in:email,sms,pusher'],
            'to'       => ['required', 'string'],
            'template' => ['sometimes', 'string'],
            'subject'  => ['sometimes', 'string'],
            'event'    => ['sometimes', 'string'],
            'data'     => ['sometimes', 'array'],
        ];
    }
}
