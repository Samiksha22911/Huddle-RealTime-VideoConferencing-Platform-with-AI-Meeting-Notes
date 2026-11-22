import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Copy, Lock } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLocalMedia } from '../hooks/useLocalMedia';
import { useMeeting } from '../hooks/useMeeting';
import { captionsSupported, useSpeechCaptions } from '../hooks/useSpeechCaptions';
import { useRecorder } from '../hooks/useRecorder';
import { useNotes } from '../hooks/useNotes';
import { formatDuration } from '../utils';
import Lobby from '../components/Lobby';
import VideoTile from '../components/VideoTile';
import ControlBar from '../components/ControlBar';
import SidePanel from '../components/SidePanel';
import CaptionsBar, { CAPTION_LANGS } from '../components/CaptionsBar';

const defaultLang = () => (CAPTION_LANGS.some(([c]) => c === navigator.language) ? navigator.language : 'en-US');

function Message({ title, text, children }) {
  return (
    <main className="center-screen status-screen">
      <h1>{title}</h1>
      {text && <p className="muted">{text}</p>}
      <div className="status-actions">{children}</div>
    </main>
  );
}

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const toast = useToast();

  const [info, setInfo] = useState(null);
  const [infoError, setInfoError] = useState('');
  const [iceServers, setIceServers] = useState([{ urls: 'stun:stun.l.google.com:19302' }]);
  const [name, setName] = useState(user?.name || '');
  const [joined, setJoined] = useState(false);
  const [panel, setPanel] = useState(null); // 'chat' | 'people' | null
  const [unread, setUnread] = useState(0);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [lang, setLang] = useState(defaultLang);
  const [selfCaption, setSelfCaption] = useState(null);
  const [secs, setSecs] = useState(0);
  const seenRef = useRef(0);

  // 1. Look up the meeting (public) and the ICE servers.
  useEffect(() => {
    api(`/meetings/${roomId}`).then(setInfo).catch((e) => setInfoError(e.message));
    api('/config/ice').then((d) => setIceServers(d.iceServers)).catch(() => {});
  }, [roomId]);

  useEffect(() => {
    if (user && !name) setName(user.name);
  }, [user, name]);

  useEffect(() => {
    if (info?.title) document.title = `${info.title} - Huddle`;
    return () => {
      document.title = 'Huddle';
    };
  }, [info]);

  // 2. Camera and microphone only start once we know the meeting exists.
  const local = useLocalMedia(!!info && !infoError);
  const media = { audio: local.audioOn && local.hasAudio, video: local.videoOn && local.hasVideo, screen: local.sharing };

  // 3. The meeting engine (starts after "Join now").
  const meeting = useMeeting({
    roomId,
    name: name.trim(),
    token,
    enabled: joined,
    iceServers,
    audioTrack: local.audioTrack,
    videoTrack: local.videoTrack,
    media,
    onForceMute: () => local.setAudioOn(false),
    notify: toast,
  });

  // Live captions: your browser transcribes your mic; text is shared with the room.
  useSpeechCaptions({
    active: captionsOn && media.audio && meeting.status === 'in',
    lang,
    onText: (text, final) => {
      setSelfCaption({ text, ts: Date.now() });
      meeting.sendCaption(text, final);
    },
  });

  const notes = useNotes(roomId, token);
  const savedIds = useMemo(() => new Set(notes.byLine.keys()), [notes.byLine]);

  const recorder = useRecorder({ micTrack: local.micTrack, onChange: meeting.sendRecording });

  // meeting timer
  useEffect(() => {
    if (meeting.status !== 'in') return undefined;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [meeting.status]);

  // unread chat badge
  useEffect(() => {
    if (meeting.status === 'in') seenRef.current = meeting.messages.length;
  }, [meeting.status]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (panel === 'chat') {
      seenRef.current = meeting.messages.length;
      setUnread(0);
    } else {
      setUnread(Math.max(0, meeting.messages.length - seenRef.current));
    }
  }, [meeting.messages.length, panel]);

  const captionLines = useMemo(() => {
    const others = Object.entries(meeting.captions).map(([id, c]) => ({ key: id, name: c.name, text: c.text, ts: c.ts }));
    return selfCaption ? [...others, { key: 'self', name: 'You', text: selfCaption.text, ts: selfCaption.ts }] : others;
  }, [meeting.captions, selfCaption]);

  const goAfter = () => navigate(user ? `/meetings/${roomId}` : '/');
  const leave = () => {
    recorder.stop();
    meeting.leave();
    goAfter();
  };
  const end = () => {
    if (!window.confirm('End the meeting for everyone?')) return;
    recorder.stop();
    meeting.endForAll();
    goAfter();
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
      toast('Invite link copied');
    } catch {
      toast(`Share this code: ${roomId}`);
    }
  };
  const toggleRecord = async () => {
    if (recorder.recording) return recorder.stop();
    try {
      await recorder.start(roomId);
    } catch {
      toast('Recording was cancelled or is not supported in this browser.', 'error');
    }
  };

  // ---- screens before / outside the call --------------------------------------------
  if (infoError) {
    return (
      <Message title="We couldn’t find that meeting" text={infoError}>
        <Link className="btn btn-primary" to={user ? '/home' : '/'}>Go back</Link>
      </Message>
    );
  }
  if (!info) return <div className="center-screen"><div className="spinner" aria-label="Loading" /></div>;
  if (info.ended && !joined) {
    return (
      <Message title="This meeting has ended" text="Ask the host to start a new one.">
        {user && <Link className="btn btn-primary" to={`/meetings/${roomId}`}>View notes</Link>}
        <Link className="btn btn-ghost" to={user ? '/home' : '/'}>Go back</Link>
      </Message>
    );
  }
  if (!joined) {
    return (
      <Lobby
        info={info}
        local={local}
        name={name}
        onName={setName}
        isHost={!!user && info.hostId === user.id}
        onJoin={() => setJoined(true)}
        onBack={() => navigate(user ? '/home' : '/')}
      />
    );
  }

  const { status } = meeting;
  if (status === 'connecting' || status === 'idle') {
    return <div className="center-screen"><div className="spinner" aria-label="Joining" /><p className="muted">Joining the meeting</p></div>;
  }
  if (status === 'waiting') {
    return (
      <Message title="Waiting for the host" text="You’ll join as soon as the host lets you in. Keep this tab open.">
        <button className="btn btn-ghost" onClick={leave}>Leave</button>
      </Message>
    );
  }
  if (status === 'error') {
    return (
      <Message title="You’re not connected" text={meeting.error}>
        <button className="btn btn-primary" onClick={() => setJoined(false)}>Try again</button>
        <Link className="btn btn-ghost" to={user ? '/home' : '/'}>Leave</Link>
      </Message>
    );
  }
  if (status === 'removed') {
    return (
      <Message title="You were removed from this meeting" text="The host removed you, so you can’t rejoin from this browser.">
        <Link className="btn btn-primary" to={user ? '/home' : '/'}>Go back</Link>
      </Message>
    );
  }
  if (status === 'denied') {
    return (
      <Message title="The host didn’t let you in" text="You can ask the host for the link again.">
        <Link className="btn btn-primary" to={user ? '/home' : '/'}>Go back</Link>
      </Message>
    );
  }
  if (status === 'ended') {
    return (
      <Message title="The host ended this meeting" text={user ? 'Your transcript and chat are saved.' : 'Thanks for joining.'}>
        {user && <Link className="btn btn-primary" to={`/meetings/${roomId}`}>View notes</Link>}
        <Link className="btn btn-ghost" to={user ? '/home' : '/'}>Go back</Link>
      </Message>
    );
  }

  // ---- in the call -----------------------------------------------------------------
  const selfName = name.trim();
  const tiles = [
    { id: 'self', stream: local.previewStream, name: `${selfName} (You)`, you: true, audio: media.audio, video: media.video, screen: local.sharing, hand: meeting.handRaised, isHost: meeting.isHost },
    ...meeting.peers.map((p) => ({ id: p.id, stream: p.stream, v: p.v, name: p.name, audio: p.audio, video: p.video, screen: p.screen, hand: p.hand, isHost: p.isHost })),
  ];
  const people = [
    { id: 'self', name: selfName, you: true, isHost: meeting.isHost, hand: meeting.handRaised, audio: media.audio },
    ...meeting.peers.map((p) => ({ id: p.id, name: p.name, isHost: p.isHost, hand: p.hand, audio: p.audio })),
  ];
  const pinned = tiles.find((t) => t.screen);
  const renderTile = (t, isPinned = false) => (
    <VideoTile key={t.id} stream={t.stream} version={t.v} name={t.name} you={t.you} audioOn={t.audio} videoOn={t.video} screen={t.screen} hand={t.hand} isHost={t.isHost} pinned={isPinned} />
  );

  return (
    <div className="room">
      <header className="room-head">
        <div>
          <h1 className="room-title">{meeting.title}</h1>
          <button className="link-btn" onClick={copyLink} aria-label="Copy invite link">
            <Copy size={14} /> {roomId}
          </button>
        </div>
        <div className="room-meta">
          {meeting.recorders.length > 0 && <span className="rec-badge"><i /> Recording</span>}
          {meeting.waitingRoom && <span className="chip"><Lock size={12} /> Waiting room</span>}
          <span className="timer">{formatDuration(secs)}</span>
        </div>
      </header>

      <div className={`room-body ${panel ? 'with-panel' : ''}`}>
        <div className="stage-wrap">
          {pinned ? (
            <div className="stage has-pin">
              <div className="pin-main">{renderTile(pinned, true)}</div>
              <div className="pin-strip">{tiles.filter((t) => t.id !== pinned.id).map((t) => renderTile(t))}</div>
            </div>
          ) : (
            <div className="stage grid" data-count={Math.min(tiles.length, 7)}>{tiles.map((t) => renderTile(t))}</div>
          )}

          <div className="reaction-layer" aria-hidden="true">
            {meeting.reactions.map((r) => (
              <span key={r.key} className="float-emoji" style={{ left: `${r.left}%` }}>
                {r.emoji}
                <small>{r.name}</small>
              </span>
            ))}
          </div>
        </div>

        {panel && (
          <SidePanel
            tab={panel}
            onClose={() => setPanel(null)}
            chat={{ messages: meeting.messages, selfId: meeting.selfId, onSend: meeting.sendChat }}
            transcript={{ lines: meeting.transcript, saved: savedIds, onToggle: notes.toggle, canSave: !!user }}
            people={{
              people,
              isHost: meeting.isHost,
              waiting: meeting.waiting,
              waitingRoom: meeting.waitingRoom,
              onWaitingRoom: meeting.setWaitingRoomEnabled,
              onAdmit: meeting.admit,
              onDeny: meeting.deny,
              onMute: meeting.hostMute,
              onRemove: meeting.hostRemove,
            }}
          />
        )}
      </div>

      {captionsOn && <CaptionsBar lines={captionLines} lang={lang} onLang={setLang} />}

      <ControlBar
        m={{
          audioOn: media.audio,
          videoOn: media.video,
          hasAudio: local.hasAudio,
          hasVideo: local.hasVideo,
          sharing: local.sharing,
          captionsOn,
          captionsSupported,
          handRaised: meeting.handRaised,
          recording: recorder.recording,
          panel,
          unread,
          waitingCount: meeting.isHost ? meeting.waiting.length : 0,
          isHost: meeting.isHost,
          onAudio: local.toggleAudio,
          onVideo: local.toggleVideo,
          onShare: () => (local.sharing ? local.stopScreen() : local.startScreen()),
          onCaptions: () => setCaptionsOn((v) => !v),
          onHand: meeting.toggleHand,
          onReaction: meeting.sendReaction,
          onRecord: toggleRecord,
          onPanel: (t) => setPanel((p) => (p === t ? null : t)),
          onLeave: leave,
          onEnd: end,
        }}
      />
    </div>
  );
}
