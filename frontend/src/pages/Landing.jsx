import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Captions, Hand, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { APP_NAME, TAGLINE } from '../config';
import { parseRoomCode } from '../utils';
import NotesMock from '../components/NotesMock';

const FEATURES = [
  { icon: Captions, title: 'Live captions', text: 'Everyone sees what is being said as it happens, in English, Hindi and more. The same words become your transcript.' },
  { icon: Sparkles, title: 'Notes when you hang up', text: 'A short summary, the decisions that were made, and action items with an owner for each. Edit or regenerate any time.' },
  { icon: ShieldCheck, title: 'Hosts stay in control', text: 'Use a waiting room, mute people, remove someone for good, or end the meeting for everyone.' },
  { icon: Hand, title: 'Made for real conversations', text: 'Raise a hand, send a reaction, share your screen, chat on the side, and record to a file on your own device.' },
];

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  const join = (e) => {
    e.preventDefault();
    const c = parseRoomCode(code);
    if (c) navigate(`/room/${c}`);
  };

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <h1>{TAGLINE}</h1>
          <p className="lead">
            Start a video call, switch on captions, and get a summary with action items the moment everyone leaves. No one has to take notes.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary btn-lg" to={user ? '/home' : '/auth'}>
              {user ? 'Start a meeting' : `Try ${APP_NAME} free`}
            </Link>
            <form className="join-inline" onSubmit={join}>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Have a code? Paste it here" aria-label="Meeting code or link" />
              <button className="btn btn-ghost" type="submit" disabled={!parseRoomCode(code)}>Join</button>
            </form>
          </div>
        </div>
        <NotesMock />
      </section>

      <section className="features" aria-label="Features">
        <h2>Everything a meeting needs, and the notes it usually doesn’t get</h2>
        <ul>
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title}>
              <Icon size={22} aria-hidden="true" />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <footer className="footer">
        <span>{APP_NAME}</span>
        <span>Built with React, WebRTC, Socket.IO, Node.js and MongoDB.</span>
      </footer>
    </main>
  );
}
