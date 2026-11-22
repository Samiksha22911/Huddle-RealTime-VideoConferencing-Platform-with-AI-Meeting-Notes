import { useState } from 'react';
import { Captions, Circle, Hand, MessageSquare, Mic, MicOff, MonitorUp, PhoneOff, ScrollText, Smile, Square, Users, Video, VideoOff } from 'lucide-react';

const EMOJIS = ['👍', '👏', '😂', '❤️', '🎉', '😮'];

function Btn({ label, on, alert, badge = 0, disabled, onClick, children }) {
  return (
    <button
      type="button"
      className={`ctl ${on ? 'is-on' : ''} ${alert ? 'is-alert' : ''}`}
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
    >
      {children}
      {badge > 0 && <span className="badge">{badge > 9 ? '9+' : badge}</span>}
    </button>
  );
}

export default function ControlBar({ m }) {
  const [reactOpen, setReactOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const canShare = !!navigator.mediaDevices?.getDisplayMedia;

  return (
    <div className="controls">
      <Btn label={m.audioOn ? 'Mute microphone' : 'Unmute microphone'} alert={!m.audioOn} disabled={!m.hasAudio} onClick={m.onAudio}>
        {m.audioOn ? <Mic size={20} /> : <MicOff size={20} />}
      </Btn>
      <Btn label={m.videoOn ? 'Turn camera off' : 'Turn camera on'} alert={!m.videoOn} disabled={!m.hasVideo} onClick={m.onVideo}>
        {m.videoOn ? <Video size={20} /> : <VideoOff size={20} />}
      </Btn>
      {canShare && (
        <Btn label={m.sharing ? 'Stop sharing screen' : 'Share screen'} on={m.sharing} onClick={m.onShare}>
          <MonitorUp size={20} />
        </Btn>
      )}
      <Btn
        label={m.captionsSupported ? (m.captionsOn ? 'Turn captions off' : 'Turn captions on') : 'Captions need Chrome, Edge or Safari'}
        on={m.captionsOn}
        disabled={!m.captionsSupported}
        onClick={m.onCaptions}
      >
        <Captions size={20} />
      </Btn>
      <Btn label={m.handRaised ? 'Lower hand' : 'Raise hand'} on={m.handRaised} onClick={m.onHand}>
        <Hand size={20} />
      </Btn>

      <div className="popwrap">
        <Btn label="Send a reaction" on={reactOpen} onClick={() => setReactOpen((v) => !v)}>
          <Smile size={20} />
        </Btn>
        {reactOpen && (
          <div className="pop reactions-pop" role="menu">
            {EMOJIS.map((e) => (
              <button
                key={e}
                role="menuitem"
                className="emoji-btn"
                onClick={() => {
                  m.onReaction(e);
                  setReactOpen(false);
                }}
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      <Btn label={m.recording ? 'Stop recording' : 'Record meeting'} alert={m.recording} onClick={m.onRecord}>
        {m.recording ? <Square size={18} /> : <Circle size={20} />}
      </Btn>

      <span className="ctl-sep" aria-hidden="true" />

      <Btn label="Chat" on={m.panel === 'chat'} badge={m.unread} onClick={() => m.onPanel('chat')}>
        <MessageSquare size={20} />
      </Btn>
      <Btn label="Transcript and saved notes" on={m.panel === 'transcript'} onClick={() => m.onPanel('transcript')}>
        <ScrollText size={20} />
      </Btn>
      <Btn label="People" on={m.panel === 'people'} badge={m.waitingCount} onClick={() => m.onPanel('people')}>
        <Users size={20} />
      </Btn>

      <div className="popwrap">
        <button
          type="button"
          className="ctl ctl-leave"
          aria-label="Leave meeting"
          title="Leave meeting"
          onClick={() => (m.isHost ? setLeaveOpen((v) => !v) : m.onLeave())}
        >
          <PhoneOff size={20} />
        </button>
        {leaveOpen && (
          <div className="pop leave-pop" role="menu">
            <button role="menuitem" className="btn btn-ghost" onClick={m.onLeave}>Leave meeting</button>
            <button role="menuitem" className="btn btn-danger" onClick={m.onEnd}>End for everyone</button>
          </div>
        )}
      </div>
    </div>
  );
}
