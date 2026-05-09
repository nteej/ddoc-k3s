@extends('emails.base')

@section('content')
    <h2>Your document is attached</h2>
    @if (!empty($data['message']))
        <p>{{ $data['message'] }}</p>
    @endif
    <p>Please find <strong>{{ $data['file_name'] ?? 'your document' }}</strong> attached to this email.</p>
@endsection
