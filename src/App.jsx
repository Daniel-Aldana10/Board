import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import LoginPage from './LoginPage';
import BoardPage from './BoardPage';

const CLIENT_ID = "472653236504-vqt0k1g8sseajkrvdqqfqisefoc4n9cs.apps.googleusercontent.com";

function App() {
  const [user, setUser] = useState(null);
  const [ticket, setTicket] = useState(null);

  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <Routes>
        <Route
          path="/login"
          element={<LoginPage setUser={setUser} setTicket={setTicket} />}
        />
        <Route
          path="/board"
          element={user ? <BoardPage user={user} ticket={ticket} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="*"
          element={<Navigate to={user ? "/board" : "/login"} replace />}
        />
      </Routes>
    </GoogleOAuthProvider>
  );
}

export default App;
