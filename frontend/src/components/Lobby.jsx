import { Copy, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { useToast } from '../context/ToastContext';

import { useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { initials } from '../utils';

export default function Lobby({ info, local, name, onName, onJoin, onBack, isHost }) {
  const ref = useRef(null);
  const toast = useToast();
  const link = `${window.location.origin}/room/${info.roomId}`;
  const copy = async () => {
  try {
    await navigator.clipboard.writeText(link);
    toast('Invite link copied');
  } catch {
    toast(`Share this code: ${info.roomId}`);
  }
};
  useEffect(() => {
    if (ref.current) ref.current.srcObject = local.stream || null;
  }, [local.stream]);

  const camOn = local.videoOn && local.hasVideo;
  const canJoin = name.trim().length > 0 && local.ready;

  return (
    <main className="lobby">
      <section className="lobby-preview">
        <div className="preview-frame">
          <video ref={ref} autoPlay playsInline muted className={`mirror ${camOn ? '' : 'is-hidden'}`} />
          {!camOn && <div className="avatar"><span>{initials(name || '?')}</span></div>}
          <div className="preview-controls">
            <button type="button" className={`ctl ${local.audioOn ? '' : 'is-alert'}`} onClick={local.toggleAudio} disabled={!local.hasAudio} aria-label={local.audioOn ? 'Mute microphone' : 'Unmute microphone'}>
              {local.audioOn ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            <button type="button" className={`ctl ${local.videoOn ? '' : 'is-alert'}`} onClick={local.toggleVideo} disabled={!local.hasVideo} aria-label={local.videoOn ? 'Turn camera off' : 'Turn camera on'}>
              {local.videoOn ? <Video size={20} /> : <VideoOff size={20} />}
            </button>
          </div>
        </div>
        {local.notice && <p className="notice" role="alert">{local.notice}</p>}
      </section>

      <section className="lobby-form">
        <h1>{info.title}</h1>
        <div className="invite-box">
  <code>{info.roomId}</code>
  <button type="button" className="btn btn-ghost" onClick={copy}>
    <Copy size={16} /> Copy invite link
  </button>
  <a className="btn btn-ghost" target="_blank" rel="noreferrer"
     href={`https://wa.me/?text=${encodeURIComponent('Join my meeting: ' + link)}`}>
    WhatsApp
  </a>
</div>
        <p className="muted">
          Hosted by {info.hostName}. {isHost ? 'You are the host of this meeting.' : info.waitingRoom ? 'The host will need to let you in.' : 'Ready when you are.'}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canJoin) onJoin();
          }}
        >
          <label className="field">
            <span>Your name</span>
            <input value={name} onChange={(e) => onName(e.target.value)} maxLength={40} placeholder="How should others see you?" autoFocus />
          </label>
          <button className="btn btn-primary btn-lg" type="submit" disabled={!canJoin}>Join now</button>
          <button className="btn btn-ghost" type="button" onClick={onBack}>Back</button>
        </form>
      </section>
    </main>
  );
}
