<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 480px; margin: 40px auto; background: #fff; border-radius: 8px; padding: 36px; }
        h2 { color: #1a1a2e; margin-top: 0; }
        p { color: #444; line-height: 1.6; }
        .btn { display: inline-block; padding: 12px 28px; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 16px 0; }
        .footer { margin-top: 32px; font-size: 12px; color: #999; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Reset your password</h2>
        <p>You requested a password reset for your DynaDoc account. Click the button below to choose a new password:</p>
        <a href="{{ $resetUrl }}" class="btn">Reset Password</a>
        <p>This link expires in 60 minutes. If you didn't request a reset, you can ignore this email.</p>
        <div class="footer">DynaDoc &mdash; <a href="https://ddoc.fi">ddoc.fi</a></div>
    </div>
</body>
</html>
