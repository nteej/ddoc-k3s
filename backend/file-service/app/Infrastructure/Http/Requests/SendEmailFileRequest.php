<?php

namespace App\Infrastructure\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SendEmailFileRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'email'   => ['required', 'email', 'max:255'],
            'message' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
