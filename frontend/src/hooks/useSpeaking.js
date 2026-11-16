import { useEffect, useState } from 'react';

let sharedCtx;
const getCtx = () => {
  if (!sharedCtx) sharedCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (sharedCtx.state === 'suspended') sharedCtx.resume().catch(() => {});
  return sharedCtx;
};

/** True while the audio in `stream` is loud enough to count as speech (drives the active-speaker ring). */
export function useSpeaking(stream, enabled = true) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!stream || !enabled) {
      setSpeaking(false);
      return undefined;
    }
    let source;
    let analyser;
    let data;
    const timer = setInterval(() => {
      if (!analyser) {
        const tracks = stream.getAudioTracks();
        if (!tracks.length) return; // remote audio may arrive a moment later
        try {
          const ctx = getCtx();
          analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          source = ctx.createMediaStreamSource(new MediaStream(tracks));
          source.connect(analyser);
          data = new Uint8Array(analyser.fftSize);
        } catch {
          return;
        }
      }
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) {
        const d = (v - 128) / 128;
        sum += d * d;
      }
      setSpeaking(Math.sqrt(sum / data.length) > 0.04);
    }, 200);

    return () => {
      clearInterval(timer);
      try {
        source?.disconnect();
      } catch {
        /* already disconnected */
      }
    };
  }, [stream, enabled]);

  return speaking;
}
