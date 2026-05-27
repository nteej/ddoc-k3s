<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sign in — DDoc</title>
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f0f4f8;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }
        .card {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 2.5rem;
            width: 100%;
            max-width: 400px;
            box-shadow: 0 4px 24px rgba(0,0,0,.07);
        }
        .logo {
            display: flex;
            justify-content: center;
            margin-bottom: 1.25rem;
        }
        .logo svg { width: 48px; height: 48px; }
        h1 {
            text-align: center;
            font-size: 1.5rem;
            font-weight: 700;
            color: #1e3a5f;
            margin-bottom: .25rem;
        }
        .subtitle {
            text-align: center;
            font-size: .875rem;
            color: #64748b;
            margin-bottom: 1.75rem;
        }
        label { display: block; font-size: .875rem; font-weight: 500; color: #374151; margin-bottom: .375rem; }
        input[type="email"], input[type="password"] {
            display: block; width: 100%;
            padding: .625rem .875rem;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: .9375rem;
            color: #111827;
            outline: none;
            transition: border-color .15s;
            margin-bottom: 1.125rem;
        }
        input:focus { border-color: #1e3a5f; box-shadow: 0 0 0 3px rgba(30,58,95,.1); }
        .error-msg { font-size: .8125rem; color: #dc2626; margin-top: -.75rem; margin-bottom: .875rem; }
        button[type="submit"] {
            width: 100%;
            padding: .7rem;
            background: #1e3a5f;
            color: #fff;
            font-size: .9375rem;
            font-weight: 600;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: background .15s;
        }
        button[type="submit"]:hover { background: #16304f; }
        .hint {
            margin-top: 1.25rem;
            padding: .875rem 1rem;
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 8px;
            font-size: .8125rem;
            color: #1d4ed8;
            line-height: 1.5;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="logo">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="48" height="48" rx="10" fill="#1e3a5f"/>
                <text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle"
                      font-family="sans-serif" font-size="22" font-weight="700" fill="#fff">D</text>
            </svg>
        </div>
        <h1>DDoc</h1>
        <p class="subtitle">Sign in to continue to your account</p>

        @if ($errors->any())
            <div class="error-msg" style="margin-bottom:1rem">
                {{ $errors->first() }}
            </div>
        @endif

        <form method="POST" action="/login">
            @csrf
            <label for="email">Email</label>
            <input id="email" type="email" name="email" value="{{ old('email') }}"
                   placeholder="your@email.com" required autofocus />

            <label for="password">Password</label>
            <input id="password" type="password" name="password"
                   placeholder="Enter your password" required />

            <button type="submit">Sign in</button>
        </form>

        <div class="hint">
            You were redirected here to authorize a connected application.
            Sign in with your DDoc credentials to continue.
        </div>
    </div>
</body>
</html>
