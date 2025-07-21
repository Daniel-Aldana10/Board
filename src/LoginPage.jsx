import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';

function LoginPage({ setUser, setTicket }) {
  const navigate = useNavigate();

  const handleLoginSuccess = async (credentialResponse) => {
    const id_token = credentialResponse.credential;
    const decoded = jwtDecode(id_token);
    
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
      
      // Actualizar estados primero
      setUser(decoded);
      setTicket(data.ticket);
      
      // Navegar usando React Router después de actualizar los estados
      navigate('/board', { replace: true });
      
    } catch (error) {
      alert('Error solicitando ticket: ' + error.message);
    }
  };

  return (
    <div className="centered-container" style={{ textAlign: 'center', marginTop: '20px' }}>
      <GoogleLogin
        onSuccess={handleLoginSuccess}
        onError={() => alert('Error al iniciar sesión con Google')}
        useOneTap
      />
    </div>
  );
}

export default LoginPage;