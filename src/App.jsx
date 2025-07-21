import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './LoginPage';
import BoardPage from './BoardPage';

function App() {
  const [user, setUser] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [idToken, setIdToken] = useState(null);

  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage setUser={setUser} setIdToken={setIdToken} setTicket={setTicket} />}
      />
      <Route
        path="/board"
        element={
          user && ticket && idToken
            ? <BoardPage user={user} idToken={idToken} ticket={ticket} setTicket={setTicket} />
            : <Navigate to="/login" replace />
        }
      />
      <Route
        path="*"
        element={<Navigate to={user && ticket && idToken ? "/board" : "/login"} replace />}
      />
    </Routes>
  );
}

export default App;