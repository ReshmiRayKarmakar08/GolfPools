import { useEffect, useRef } from 'react';

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

export default function GoogleSignInButton({ onCredential, disabled = false }) {
  const containerRef = useRef(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || !containerRef.current || disabled) return;

    const renderButton = () => {
      if (!window.google?.accounts?.id || !containerRef.current) return;
      const gsiState = window.__golfpoolsGsiState || {};
      const alreadyInitialized = gsiState.initialized === true && gsiState.clientId === clientId;
      if (!alreadyInitialized) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response?.credential) {
              onCredential(response.credential);
            }
          }
        });
        window.__golfpoolsGsiState = { initialized: true, clientId };
      }

      containerRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        width: 320,
        text: 'continue_with'
      });
    };

    if (window.google?.accounts?.id) {
      renderButton();
      return () => {
        if (window.google?.accounts?.id?.cancel) {
          window.google.accounts.id.cancel();
        }
      };
    }

    const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', renderButton);
      return () => existing.removeEventListener('load', renderButton);
    }

    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = renderButton;
    document.body.appendChild(script);

    return () => {
      script.onload = null;
      if (window.google?.accounts?.id?.cancel) {
        window.google.accounts.id.cancel();
      }
    };
  }, [clientId, onCredential, disabled]);

  if (!clientId) return null;

  return (
    <div className="w-full flex justify-center">
      <div ref={containerRef} />
    </div>
  );
}
