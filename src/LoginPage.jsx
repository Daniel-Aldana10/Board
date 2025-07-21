import { useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';

const CLIENT_ID = import.meta.env.VITE_CLIENT_ID;

function LoginPage({ setUser, setIdToken, setTicket }) {
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);

  useEffect(() => {
    const loadGoogleScript = () => {
      if (window.google) {
        initializeGoogleSignIn();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google) initializeGoogleSignIn();
      };
      document.head.appendChild(script);
    };

    const initializeGoogleSignIn = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleLoginSuccess,
        auto_select: false,
        cancel_on_tap_outside: false
      });
      if (googleButtonRef.current) {
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text: 'signin_with',
          shape: 'rectangular'
        });
      }
      try { window.google.accounts.id.prompt(); } catch {}
    };

    loadGoogleScript();
    return () => {
      const existingScript = document.querySelector('script[src=\"https://accounts.google.com/gsi/client\"]');
      if (existingScript) existingScript.remove();
    };
    // eslint-disable-next-line
  }, []);

  const handleLoginSuccess = async (credentialResponse) => {
    try {
      const id_token = credentialResponse.credential;
      const decoded = jwtDecode(id_token);
      const res = await fetch(import.meta.env.VITE_BACK +'/api/ws-ticket', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + id_token,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error('No autorizado');
      const data = await res.json();
      setUser(decoded);
      setIdToken(id_token);
      setTicket(data.ticket);
      navigate('/board', { replace: true });
    } catch (error) {
      alert('Error solicitando ticket: ' + error.message);
    }
  };

  return (
    <div className="centered-container" style={{ textAlign: 'center', marginTop: '20px' }}>
      <h2>Iniciar Sesión</h2>
      <div ref={googleButtonRef} style={{ margin: '20px 0' }}>
        <div>Cargando botón de Google...</div>
      </div>
    </div>
  );
}

export default LoginPage;