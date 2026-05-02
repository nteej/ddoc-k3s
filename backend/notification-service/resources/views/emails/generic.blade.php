@extends('emails.base')

@section('content')
    <h2>{{ $data['title'] ?? 'Notification' }}</h2>
    <p>{{ $data['body'] ?? $data['message'] ?? '' }}</p>
    @isset($data['action_url'])
        <a href="{{ $data['action_url'] }}" class="btn">{{ $data['action_label'] ?? 'View' }}</a>
    @endisset
@endsection
