<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; color: #333; }
        .wrapper { max-width: 520px; margin: 40px auto; }
        .card { background: #fff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
        .logo { font-size: 20px; font-weight: bold; color: #4f46e5; margin-bottom: 28px; }
        h2 { margin-top: 0; color: #1a1a2e; font-size: 22px; }
        p { line-height: 1.6; color: #555; }
        .btn { display: inline-block; padding: 13px 30px; background: #4f46e5; color: #fff !important; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 18px 0; }
        .footer { margin-top: 32px; font-size: 12px; color: #aaa; text-align: center; }
        .footer a { color: #aaa; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="card">
            <div class="logo">DynaDoc</div>
            @yield('content')
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} DynaDoc &mdash; <a href="https://ddoc.fi">ddoc.fi</a>
        </div>
    </div>
</body>
</html>
