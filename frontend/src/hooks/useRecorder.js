import { useCallback, useEffect, useRef, useState } from 'react';
import { downloadBlob } from '../utils';

/**
 * Records the meeting in YOUR browser and saves a .webm file when you stop.
 * You pick "This tab" in the browser dialog and tick "Share tab audio" so remote voices
 * are included; your own microphone is mixed in automatically.
 */
export function useRecorder({ micTrack, onChange }) {
  const [recording, setRecording] = useState(false);
  const recRef = useRef(null);
  const latest = useRef({});
  latest.current = { micTrack, onChange };

  const start = useCallback(async (fileBase = 'meeting') => {
    if (recRef.current) return;
    const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true, preferCurrentTab: true });

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const dest = ctx.createMediaStreamDestination();
    const mix = (track) => track && ctx.createMediaStreamSource(new MediaStream([track])).connect(dest);
    display.getAudioTracks().forEach(mix);
    mix(latest.current.micTrack);

    const mixed = new MediaStream([...display.getVideoTracks(), ...dest.stream.getAudioTracks()]);
    const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(mixed, mime ? { mimeType: mime } : undefined);
    const chunks = [];

    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
      downloadBlob(new Blob(chunks, { type: 'video/webm' }), `${fileBase}-${stamp}.webm`);
      display.getTracks().forEach((t) => t.stop());
      ctx.close().catch(() => {});
      recRef.current = null;
      setRecording(false);
      latest.current.onChange?.(false);
    };
    // If the person clicks the browser's own "Stop sharing" bar, stop recording too.
    display.getVideoTracks()[0].addEventListener('ended', () => rec.state !== 'inactive' && rec.stop());

    rec.start(1000);
    recRef.current = rec;
    setRecording(true);
    latest.current.onChange?.(true);
  }, []);

  const stop = useCallback(() => {
    if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop();
  }, []);

  useEffect(() => stop, [stop]); // save the file if the person leaves mid-recording

  return { recording, start, stop };
}
