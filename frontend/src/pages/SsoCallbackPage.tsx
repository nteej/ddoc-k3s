import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api from '@/services/api';

const SsoCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    // Strict-mode guard — only process once
    if (handled.current) return;
    handled.current = true;

    const code         = searchParams.get('code');
    const state        = searchParams.get('state');
    const storedState  = sessionStorage.getItem('sso_state');
    const signedState  = sessionStorage.getItem('sso_signed_state');

    sessionStorage.removeItem('sso_state');
    sessionStorage.removeItem('sso_signed_state');

    if (!code || !state || state !== storedState || !signedState) {
      navigate('/login?error=sso_state_mismatch', { replace: true });
      return;
    }

    api
      .exchangeSsoCode({ code, state, signedState })
      .then(() => {
        // Full page reload so AuthProvider re-fetches the user with the new JWT cookie.
        window.location.replace('/documents');
      })
      .catch(() => {
        navigate('/login?error=sso_exchange_failed', { replace: true });
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-gray-600">
      <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
      <p className="text-sm">Completing sign-in…</p>
    </div>
  );
};

export default SsoCallbackPage;
