import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Sparkles } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { downloadText, formatDate, formatTime } from '../utils';

function toText(d) {
  const s = d.summary;
  const parts = [`${d.title}`, formatDate(d.createdAt), `Participants: ${d.participantNames.join(', ')}`, ''];
  if (s) {
    parts.push('SUMMARY', s.text, '');
    if (s.keyPoints?.length) parts.push('KEY POINTS', ...s.keyPoints.map((k) => `- ${k}`), '');
    if (s.decisions?.length) parts.push('DECISIONS', ...s.decisions.map((k) => `- ${k}`), '');
    if (s.actionItems?.length) parts.push('ACTION ITEMS', ...s.actionItems.map((a) => `- [ ] ${a.task} (${a.owner})`), '');
  }
  parts.push('TRANSCRIPT', ...d.transcript.map((t) => `[${formatTime(t.at)}] ${t.speaker}: ${t.text}`), '', 'CHAT', ...d.chat.map((c) => `[${formatTime(c.at)}] ${c.sender}: ${c.text}`));
  return parts.join('\n');
}

export default function MeetingDetail() {
  const { roomId } = useParams();
  const { token } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState({});

  useEffect(() => {
    api(`/meetings/${roomId}/details`, { token }).then(setData).catch((e) => setError(e.message));
  }, [roomId, token]);

  const generate = async () => {
    setBusy(true);
    try {
      const res = await api(`/meetings/${roomId}/summary`, { method: 'POST', token });
      setData((d) => ({ ...d, summary: res.summary, aiEnabled: res.aiEnabled }));
      setDone({});
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <main className="page narrow">
        <h1 className="page-title">We couldn’t open these notes</h1>
        <p className="muted">{error}</p>
        <Link className="btn btn-ghost" to="/history">Back to past meetings</Link>
      </main>
    );
  }
  if (!data) return <div className="center-screen"><div className="spinner" aria-label="Loading" /></div>;

  const s = data.summary;
  const hasContent = data.transcript.length > 0 || data.chat.length > 0;

  return (
    <main className="page narrow">
      <Link className="back" to="/history"><ArrowLeft size={16} /> Past meetings</Link>
      <header className="detail-head">
        <div>
          <h1 className="page-title">{data.title}</h1>
          <p className="muted">{formatDate(data.createdAt)}. With {data.participantNames.join(', ') || 'no one yet'}.</p>
        </div>
        <div className="detail-actions">
          {!data.endedAt && <Link className="btn btn-ghost" to={`/room/${data.roomId}`}>Rejoin</Link>}
          <button className="btn btn-ghost" onClick={() => downloadText(toText(data), `${data.title.replace(/\W+/g, '-')}.txt`)}>
            <Download size={16} /> Download
          </button>
        </div>
      </header>

      <section className="notes-card">
        <div className="section-head">
          <h2>Meeting notes</h2>
          <button className="btn btn-primary" onClick={generate} disabled={busy || !hasContent}>
            <Sparkles size={16} /> {busy ? 'Writing notes' : s ? 'Regenerate notes' : 'Generate notes'}
          </button>
        </div>

        {!hasContent && <p className="empty">Nothing was captured. Turn on captions during your next meeting and the transcript will be saved here.</p>}
        {hasContent && !s && <p className="empty">Your transcript is ready. Generate notes to get a summary and action items.</p>}

        {s && (
          <>
            <p className="source-note">
              {s.source === 'ai' ? 'Written by AI from the transcript and chat. Check it before sharing.' : 'Basic notes. Set ANTHROPIC_API_KEY on the server to get AI-written summaries.'}
            </p>
            <p className="summary-text">{s.text}</p>

            {s.actionItems?.length > 0 && (
              <>
                <h3>Action items</h3>
                <ul className="tasks">
                  {s.actionItems.map((a, i) => (
                    <li key={i}>
                      <label>
                        <input type="checkbox" checked={!!done[i]} onChange={() => setDone((d) => ({ ...d, [i]: !d[i] }))} />
                        <span className={done[i] ? 'struck' : ''}>{a.task}</span>
                      </label>
                      <em className="chip">{a.owner}</em>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {s.decisions?.length > 0 && (
              <>
                <h3>Decisions</h3>
                <ul className="plain">{s.decisions.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </>
            )}
            {s.keyPoints?.length > 0 && (
              <>
                <h3>Key points</h3>
                <ul className="plain">{s.keyPoints.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </>
            )}
          </>
        )}
      </section>

      <details className="log">
        <summary>Transcript ({data.transcript.length} lines)</summary>
        {data.transcript.length === 0 ? <p className="muted">No captions were recorded.</p> : (
          <ol>{data.transcript.map((t, i) => <li key={i}><time>{formatTime(t.at)}</time> <strong>{t.speaker}</strong> {t.text}</li>)}</ol>
        )}
      </details>
      <details className="log">
        <summary>Chat ({data.chat.length} messages)</summary>
        {data.chat.length === 0 ? <p className="muted">No chat messages.</p> : (
          <ol>{data.chat.map((c, i) => <li key={i}><time>{formatTime(c.at)}</time> <strong>{c.sender}</strong> {c.text}</li>)}</ol>
        )}
      </details>
    </main>
  );
}
