import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { parseRoomCode } from '../utils';
import MeetingRow from '../components/MeetingRow';

export default function Home() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [waitingRoom, setWaitingRoom] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState(null);

  useEffect(() => {
    api('/meetings', { token }).then((d) => setRecent(d.meetings.slice(0, 5))).catch(() => setRecent([]));
  }, [token]);

  const start = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { roomId } = await api('/meetings', { method: 'POST', token, body: { title: title.trim() || undefined, waitingRoom } });
      navigate(`/room/${roomId}`);
    } catch (err) {
      toast(err.message, 'error');
      setBusy(false);
    }
  };

  const join = (e) => {
    e.preventDefault();
    const c = parseRoomCode(code);
    if (c) navigate(`/room/${c}`);
  };

  return (
    <main className="page">
      <h1 className="page-title">Hi, {user.name.split(' ')[0]}</h1>

      <div className="two-col">
        <form className="panel-card" onSubmit={start}>
          <h2>Start a meeting</h2>
          <label className="field">
            <span>Title (optional)</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Weekly project sync" />
          </label>
          <label className="check-row">
            <input type="checkbox" checked={waitingRoom} onChange={(e) => setWaitingRoom(e.target.checked)} />
            <span>Make guests wait until I let them in</span>
          </label>
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Creating' : 'Start meeting'}</button>
        </form>

        <form className="panel-card" onSubmit={join}>
          <h2>Join a meeting</h2>
          <label className="field">
            <span>Meeting code or link</span>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="abc-defg-hij" />
          </label>
          <button className="btn btn-primary" type="submit" disabled={!parseRoomCode(code)}>Join meeting</button>
        </form>
      </div>

      <section className="recent">
        <div className="section-head">
          <h2>Recent meetings</h2>
          <Link to="/history">See all</Link>
        </div>
        {recent === null && <div className="spinner" aria-label="Loading" />}
        {recent && recent.length === 0 && <p className="empty">No meetings yet. Start one above, turn on captions, and your notes will show up here afterwards.</p>}
        {recent && recent.length > 0 && <ul className="rows">{recent.map((m) => <MeetingRow key={m.roomId} m={m} />)}</ul>}
      </section>
    </main>
  );
}
