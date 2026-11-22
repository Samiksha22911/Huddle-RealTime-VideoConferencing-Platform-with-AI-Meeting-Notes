import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { SERVER_URL } from './config';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import AuthPage from './pages/AuthPage';
import Home from './pages/Home';
import History from './pages/History';
import MeetingDetail from './pages/MeetingDetail';
import Room from './pages/Room';
import NotFound from './pages/NotFound';

function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="center-screen"><div className="spinner" aria-label="Loading" /></div>;
  if (!user) return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  return children;
}

export default function App() {
  const { pathname } = useLocation();

  // Free hosting puts the API to sleep; this wakes it while the visitor is still reading the page.
  useEffect(() => {
    fetch(`${SERVER_URL}/health`).catch(() => {});
  }, []);
  const inRoom = pathname.startsWith('/room/'); // the meeting screen is full-bleed, no navbar

  return (
    <>
      {!inRoom && <Navbar />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/home" element={<Protected><Home /></Protected>} />
        <Route path="/history" element={<Protected><History /></Protected>} />
        <Route path="/meetings/:roomId" element={<Protected><MeetingDetail /></Protected>} />
        <Route path="/room/:roomId" element={<Room />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
