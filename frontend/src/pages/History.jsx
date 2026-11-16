import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import MeetingRow from '../components/MeetingRow';

export default function History() {
  const { token } = useAuth();
  const toast = useToast();
  const [meetings, setMeetings] = useState(null);

  useEffect(() => {
    api('/meetings', { token })
      .then((d) => setMeetings(d.meetings))
      .catch((e) => {
        toast(e.message, 'error');
        setMeetings([]);
      });
  }, [token, toast]);

  const remove = async (m) => {
    if (!window.confirm(`Delete "${m.title}" and its notes? This cannot be undone.`)) return;
    try {
      await api(`/meetings/${m.roomId}`, { method: 'DELETE', token });
      setMeetings((list) => list.filter((x) => x.roomId !== m.roomId));
      toast('Meeting deleted');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <main className="page">
      <h1 className="page-title">Past meetings</h1>
      {meetings === null && <div className="spinner" aria-label="Loading" />}
      {meetings && meetings.length === 0 && (
        <p className="empty">Nothing here yet. <Link to="/home">Start your first meeting</Link> and it will be saved with its notes.</p>
      )}
      {meetings && meetings.length > 0 && <ul className="rows">{meetings.map((m) => <MeetingRow key={m.roomId} m={m} onDelete={remove} />)}</ul>}
    </main>
  );
}
