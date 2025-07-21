import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './LoginPage';
import BoardPage from './BoardPage';

function App() {
  const [user, setUser] = useState(null);
  const [ticket, setTicket] = useState(null);

  return (
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
  );
}

export default App;