<?php

namespace App\Infrastructure\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTemplateRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name'             => ['required', 'string', 'max:255'],
            'description'      => ['required', 'string', 'max:255'],
            'paperFormat'      => ['sometimes', 'string', 'in:A4,A3,A5,Letter,Legal'],
            'paperOrientation' => ['sometimes', 'string', 'in:portrait,landscape'],
        ];
    }
}
