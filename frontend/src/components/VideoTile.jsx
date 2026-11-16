import { useEffect, useRef } from 'react';
import { Hand, MicOff } from 'lucide-react';
import { initials } from '../utils';
import { useSpeaking } from '../hooks/useSpeaking';

/** One participant. The <video> element always stays mounted so remote audio keeps playing. */
export default function VideoTile({ stream, version, name, you = false, audioOn = true, videoOn = true, screen = false, hand = false, isHost = false, pinned = false }) {
  const ref = useRef(null);
  const speaking = useSpeaking(stream, audioOn);
  const showVideo = videoOn || screen;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream || null;
    if (stream && el.paused) el.play().catch(() => {});
  }, [stream, version]);

  return (
    <figure className={`tile ${speaking ? 'is-speaking' : ''} ${pinned ? 'is-pinned' : ''}`}>
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={you} // never play your own audio back to yourself
        className={`${you && !screen ? 'mirror' : ''} ${showVideo ? '' : 'is-hidden'} ${screen ? 'contain' : ''}`}
      />
      {!showVideo && (
        <div className="avatar" aria-hidden="true">
          <span>{initials(name)}</span>
        </div>
      )}
      <figcaption className="tile-label">
        {!audioOn && <MicOff size={14} aria-label="Muted" />}
        <span>{name}</span>
        {isHost && <em className="chip">Host</em>}
      </figcaption>
      {hand && (
        <span className="tile-hand" title={`${name} raised a hand`}>
          <Hand size={16} />
        </span>
      )}
    </figure>
  );
}
