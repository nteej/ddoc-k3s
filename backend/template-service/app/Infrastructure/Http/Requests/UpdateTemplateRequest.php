<?php

namespace App\Infrastructure\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTemplateRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name'             => ['sometimes', 'string', 'max:255'],
            'description'      => ['sometimes', 'string', 'max:255'],
            'paperFormat'      => ['sometimes', 'string', 'in:A4,A3,A5,Letter,Legal'],
            'paperOrientation' => ['sometimes', 'string', 'in:portrait,landscape'],
        ];
    }
}
