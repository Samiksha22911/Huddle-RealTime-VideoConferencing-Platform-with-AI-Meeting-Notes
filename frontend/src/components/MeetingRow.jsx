import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { formatDate } from '../utils';

export default function MeetingRow({ m, onDelete }) {
  return (
    <li className="row">
      <div className="row-main">
        <h3>{m.title}</h3>
        <p className="muted">
          {formatDate(m.createdAt)}. Hosted by {m.isHost ? 'you' : m.hostName}. {m.participantCount} {m.participantCount === 1 ? 'person' : 'people'} joined.
        </p>
      </div>
      <div className="row-badges">
        {m.hasNotes && <span className="chip chip-mark">Notes ready</span>}
        {!m.ended && <span className="chip chip-live">Open</span>}
      </div>
      <div className="row-actions">
        <Link className="btn btn-ghost" to={`/meetings/${m.roomId}`}>View notes</Link>
        {!m.ended && <Link className="btn btn-ghost" to={`/room/${m.roomId}`}>Rejoin</Link>}
        {onDelete && m.isHost && (
          <button className="icon-btn bad" aria-label={`Delete ${m.title}`} onClick={() => onDelete(m)}>
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </li>
  );
}
