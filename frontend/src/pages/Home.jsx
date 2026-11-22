import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarPlus, Trash2 } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { calendarUrl, formatDate, parseRoomCode } from '../utils';
import MeetingRow from '../components/MeetingRow';
import InviteShare from '../components/InviteShare';

const pad = (n) => String(n).padStart(2, '0');
// value format for <input type="datetime-local"> in the user's own time zone
const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const nextHour = () => {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return toLocalInput(d);
};

function UpcomingRow({ m, onDelete }) {
  const link = `${window.location.origin}/room/${m.roomId}`;
  return (
    <li className="upcoming">
      <div className="upcoming-top">
        <div>
          <h3>{m.title}</h3>
          <p className="muted">{formatDate(m.scheduledFor)}</p>
        </div>
        <div className="row-actions">
          <Link className="btn btn-primary" to={`/room/${m.roomId}`}>Start</Link>
          <a className="btn btn-ghost" target="_blank" rel="noreferrer" href={calendarUrl({ title: m.title, startISO: m.scheduledFor, link })}>
            <CalendarPlus size={16} /> Add to calendar
          </a>
          <button className="icon-btn bad" aria-label={`Delete ${m.title}`} onClick={() => onDelete(m)}>
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      <InviteShare roomId={m.roomId} title={m.title} />
    </li>
  );
}

export default function Home() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [waitingRoom, setWaitingRoom] = useState(false);
  const [schedule, setSchedule] = useState(false);
  const [when, setWhen] = useState(nextHour);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [meetings, setMeetings] = useState(null);

  const load = useCallback(
    () => api('/meetings', { token }).then((d) => setMeetings(d.meetings)).catch(() => setMeetings([])),
    [token]
  );
  useEffect(() => {
    load();
  }, [load]);

  const start = async (e) => {
    e.preventDefault();
    const body = { title: title.trim() || undefined, waitingRoom };
    if (schedule) {
      const d = new Date(when);
      if (Number.isNaN(d.getTime())) return toast('Pick a date and time.', 'error');
      body.scheduledFor = d.toISOString();
    }
    setBusy(true);
    try {
      const { roomId } = await api('/meetings', { method: 'POST', token, body });
      if (schedule) {
        toast('Meeting scheduled. Share the invite below.');
        setTitle('');
        setSchedule(false);
        setBusy(false);
        load();
      } else {
        navigate(`/room/${roomId}`);
      }
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

  const removeUpcoming = async (m) => {
    if (!window.confirm(`Cancel "${m.title}"?`)) return;
    try {
      await api(`/meetings/${m.roomId}`, { method: 'DELETE', token });
      setMeetings((list) => list.filter((x) => x.roomId !== m.roomId));
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const cutoff = Date.now() - 2 * 3600 * 1000;
  const upcoming = (meetings || [])
    .filter((m) => m.isHost && m.scheduledFor && !m.ended && new Date(m.scheduledFor).getTime() > cutoff)
    .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));
  const recent = (meetings || []).filter((m) => !upcoming.includes(m)).slice(0, 5);

  return (
    <main className="page">
      <h1 className="page-title">Hi, {user.name.split(' ')[0]}</h1>

      <div className="two-col">
        <form className="panel-card" onSubmit={start}>
          <h2>{schedule ? 'Schedule a meeting' : 'Start a meeting'}</h2>
          <label className="field">
            <span>Title (optional)</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Weekly project sync" />
          </label>
          <label className="check-row">
            <input type="checkbox" checked={schedule} onChange={(e) => setSchedule(e.target.checked)} />
            <span>Schedule for later</span>
          </label>
          {schedule && (
            <label className="field">
              <span>Date and time</span>
              <input type="datetime-local" value={when} min={toLocalInput(new Date())} onChange={(e) => setWhen(e.target.value)} required />
            </label>
          )}
          <label className="check-row">
            <input type="checkbox" checked={waitingRoom} onChange={(e) => setWaitingRoom(e.target.checked)} />
            <span>Make guests wait until I let them in</span>
          </label>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Please wait' : schedule ? 'Schedule meeting' : 'Start meeting'}
          </button>
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

      {upcoming.length > 0 && (
        <section className="recent">
          <div className="section-head"><h2>Upcoming meetings</h2></div>
          <ul className="rows">
            {upcoming.map((m) => <UpcomingRow key={m.roomId} m={m} onDelete={removeUpcoming} />)}
          </ul>
        </section>
      )}

      <section className="recent">
        <div className="section-head">
          <h2>Recent meetings</h2>
          <Link to="/history">See all</Link>
        </div>
        {meetings === null && <div className="spinner" aria-label="Loading" />}
        {meetings && recent.length === 0 && <p className="empty">No meetings yet. Start one above, turn on captions, and your notes will show up here afterwards.</p>}
        {recent.length > 0 && <ul className="rows">{recent.map((m) => <MeetingRow key={m.roomId} m={m} />)}</ul>}
      </section>
    </main>
  );
}
