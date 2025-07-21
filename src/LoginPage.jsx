import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

const CLIENT_ID = "472653236504-vqt0k1g8sseajkrvdqqfqisefoc4n9cs.apps.googleusercontent.com"; // tu client ID real

function LoginPage({ setUser, setTicket }) {
  const handleLoginSuccess = async (credentialResponse) => {
    const id_token = credentialResponse.credential;
    const decoded = jwtDecode(id_token);
    setUser(decoded);

    try {
      const res = await fetch('https://boardbackend-fca7gde4f6eagrfm.canadacentral-01.azurewebsites.net/api/ws-ticket', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + id_token
        }
      });

      if (!res.ok) {
        throw new Error('No se pudo obtener el ticket');
      }

      const data = await res.json();
      setTicket(data.ticket);
      window.location.href = "/board";
    } catch (error) {
      alert('Error solicitando ticket: ' + error.message);
    }
  };

  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <div className="centered-container" style={{ textAlign: 'center', marginTop: '20px' }}>
        <GoogleLogin
          onSuccess={handleLoginSuccess}
          onError={() => alert('Error al iniciar sesión con Google')}
          useOneTap
        />
      </div>
    </GoogleOAuthProvider>
  );
}

export default LoginPage;
