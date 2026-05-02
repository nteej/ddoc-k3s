@extends('emails.base')

@section('content')
    <h2>Reset your password</h2>
    <p>You requested a password reset for your DynaDoc account.<br>Click the button below to set a new password:</p>
    <a href="{{ $data['reset_url'] }}" class="btn">Reset Password</a>
    <p style="font-size:13px;color:#999">This link expires in 60 minutes. If you did not request a password reset, you can safely ignore this email.</p>
@endsection
