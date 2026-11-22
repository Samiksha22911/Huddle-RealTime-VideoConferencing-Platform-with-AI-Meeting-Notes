import { useEffect, useRef, useState } from 'react';
import { Check, Hand, Lock, MicOff, Send, UserX, X } from 'lucide-react';
import { formatTime, initials } from '../utils';
import TranscriptPanel from './TranscriptPanel';

function Chat({ messages, selfId, onSend }) {
  const [text, setText] = useState('');
  const endRef = useRef(null);
  useEffect(() => endRef.current?.scrollIntoView({ block: 'end' }), [messages.length]);

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  return (
    <>
      <ol className="chat-list">
        {messages.length === 0 && <li className="empty-note">No messages yet. Say hello.</li>}
        {messages.map((m, i) => {
          const mine = m.senderId === selfId;
          return (
            <li key={`${m.at}-${i}`} className={`msg ${mine ? 'mine' : ''}`}>
              <span className="msg-meta">{mine ? 'You' : m.sender} <time>{formatTime(m.at)}</time></span>
              <p>{m.text}</p>
            </li>
          );
        })}
        <li ref={endRef} aria-hidden="true" />
      </ol>
      <form className="chat-form" onSubmit={submit}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message everyone" maxLength={1000} aria-label="Message" />
        <button className="icon-btn send" aria-label="Send message" type="submit"><Send size={18} /></button>
      </form>
    </>
  );
}

function People({ people, isHost, waiting, waitingRoom, onWaitingRoom, onAdmit, onDeny, onMute, onRemove }) {
  return (
    <div className="people">
      {isHost && (
        <label className="switch-row">
          <span><Lock size={15} /> Waiting room</span>
          <input type="checkbox" checked={waitingRoom} onChange={(e) => onWaitingRoom(e.target.checked)} />
        </label>
      )}

      {isHost && waiting.length > 0 && (
        <section aria-label="Waiting to join" className="waiting-box">
          <h3>Waiting to join ({waiting.length})</h3>
          {waiting.map((w) => (
            <div className="person" key={w.id}>
              <span className="mini-avatar">{initials(w.name)}</span>
              <span className="person-name">{w.name}</span>
              <button className="icon-btn ok" aria-label={`Let ${w.name} in`} onClick={() => onAdmit(w.id)}><Check size={16} /></button>
              <button className="icon-btn bad" aria-label={`Deny ${w.name}`} onClick={() => onDeny(w.id)}><X size={16} /></button>
            </div>
          ))}
        </section>
      )}

      <h3>In this meeting ({people.length})</h3>
      {people.map((p) => (
        <div className="person" key={p.id}>
          <span className="mini-avatar">{initials(p.name)}</span>
          <span className="person-name">
            {p.name}{p.you ? ' (You)' : ''} {p.isHost && <em className="chip">Host</em>}
          </span>
          {p.hand && <Hand size={16} className="hand-on" aria-label="Hand raised" />}
          {!p.audio && <MicOff size={16} className="muted-ico" aria-label="Muted" />}
          {isHost && !p.you && (
            <>
              <button className="icon-btn" aria-label={`Mute ${p.name}`} title="Mute" onClick={() => onMute(p.id)} disabled={!p.audio}><MicOff size={16} /></button>
              <button className="icon-btn bad" aria-label={`Remove ${p.name}`} title="Remove from meeting" onClick={() => onRemove(p.id)}><UserX size={16} /></button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

const TITLES = { chat: 'Chat', people: 'People', transcript: 'Transcript' };

export default function SidePanel({ tab, onClose, chat, people, transcript }) {
  return (
    <aside className="panel" aria-label={TITLES[tab]}>
      <header className="panel-head">
        <h2>{TITLES[tab]}</h2>
        <button className="icon-btn" aria-label="Close panel" onClick={onClose}><X size={18} /></button>
      </header>
      {tab === 'chat' && <Chat {...chat} />}
      {tab === 'people' && <People {...people} />}
      {tab === 'transcript' && <TranscriptPanel {...transcript} />}
    </aside>
  );
}
