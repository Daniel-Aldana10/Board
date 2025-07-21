import { useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';

const CLIENT_ID = "472653236504-vqt0k1g8sseajkrvdqqfqisefoc4n9cs.apps.googleusercontent.com";

function LoginPage({ setUser, setTicket }) {
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);

  useEffect(() => {
    // Cargar el script de Google de forma manual
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
        if (window.google) {
          initializeGoogleSignIn();
        }
      };
      script.onerror = () => {
        console.error('Error cargando el script de Google');
        // Fallback: mostrar mensaje de error
        if (googleButtonRef.current) {
          googleButtonRef.current.innerHTML = `
            <div style="padding: 10px; border: 1px solid #ccc; border-radius: 5px; background: #f9f9f9;">
              <p>Error cargando Google Sign-In</p>
              <button onclick="window.location.reload()" style="padding: 5px 10px;">Recargar página</button>
            </div>
          `;
        }
      };
      document.head.appendChild(script);
    };

    const initializeGoogleSignIn = () => {
      if (!window.google?.accounts?.id) {
        console.error('Google Identity Services no está disponible');
        return;
      }

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

      // Opcional: mostrar One Tap si está disponible
      try {
        window.google.accounts.id.prompt();
      } catch (e) {
        console.log('One Tap no disponible:', e);
      }
    };

    loadGoogleScript();

    // Cleanup
    return () => {
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  const handleLoginSuccess = async (credentialResponse) => {
    try {
      const id_token = credentialResponse.credential;
      const decoded = jwtDecode(id_token);
      
      const res = await fetch('https://boardbackend-fca7gde4f6eagrfm.canadacentral-01.azurewebsites.net/api/ws-ticket', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + id_token,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error(`Error ${res.status}: No se pudo obtener el ticket`);
      }

      const data = await res.json();
      
      // Actualizar estados
      setUser(decoded);
      setTicket(data.ticket);
      
      // Navegar
      navigate('/board', { replace: true });
      
    } catch (error) {
      console.error('Error en login:', error);
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