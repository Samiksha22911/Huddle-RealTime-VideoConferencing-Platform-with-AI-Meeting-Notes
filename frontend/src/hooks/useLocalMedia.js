import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Your own camera, microphone and screen share.
 * Muting uses `track.enabled` (no renegotiation needed); screen share swaps the outgoing
 * video track with `RTCRtpSender.replaceTrack` (done in useMeeting).
 */
export function useLocalMedia(active = true) {
  const [stream, setStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState(false);
  const screenRef = useRef(null);

  useEffect(() => {
    if (!active) return undefined;
    let alive = true;
    let acquired = null;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setNotice('Camera access needs a secure (https) page. On localhost it works automatically.');
        setReady(true);
        return;
      }
      const attempts = [
        [{ audio: true, video: { width: { ideal: 1280 }, height: { ideal: 720 } } }, ''],
        [{ audio: true }, 'Camera unavailable. You can still join with audio.'],
        [{ video: true }, 'Microphone unavailable. Others will not hear you.'],
      ];
      for (const [constraints, message] of attempts) {
        try {
          acquired = await navigator.mediaDevices.getUserMedia(constraints);
          if (message && alive) setNotice(message);
          break;
        } catch {
          /* try the next, simpler option */
        }
      }
      if (!alive) {
        acquired?.getTracks().forEach((t) => t.stop());
        return;
      }
      if (!acquired) setNotice('Camera and microphone are blocked. Allow access in your browser to be seen and heard.');
      setStream(acquired);
      setReady(true);
    })();
    return () => {
      alive = false;
      acquired?.getTracks().forEach((t) => t.stop());
    };
  }, [active]);

  useEffect(() => {
    stream?.getAudioTracks().forEach((t) => (t.enabled = audioOn));
  }, [stream, audioOn]);
  useEffect(() => {
    stream?.getVideoTracks().forEach((t) => (t.enabled = videoOn));
  }, [stream, videoOn]);

  const stopScreen = useCallback(() => {
    screenRef.current?.getTracks().forEach((t) => t.stop());
    screenRef.current = null;
    setScreenStream(null);
  }, []);

  const startScreen = useCallback(async () => {
    if (screenRef.current) return;
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      screenRef.current = s;
      s.getVideoTracks()[0].addEventListener('ended', () => {
        if (screenRef.current === s) stopScreen();
      });
      setScreenStream(s);
    } catch {
      /* the person closed the picker */
    }
  }, [stopScreen]);

  useEffect(() => () => screenRef.current?.getTracks().forEach((t) => t.stop()), []);

  const audioTrack = useMemo(() => stream?.getAudioTracks()[0] ?? null, [stream]);
  const videoTrack = useMemo(
    () => (screenStream ? screenStream.getVideoTracks()[0] : stream?.getVideoTracks()[0]) ?? null,
    [stream, screenStream]
  );

  return {
    stream,
    screenStream,
    previewStream: screenStream || stream,
    audioOn,
    videoOn,
    hasAudio: !!audioTrack,
    hasVideo: !!stream?.getVideoTracks().length,
    sharing: !!screenStream,
    audioTrack, // what we send
    videoTrack, // camera, or screen while sharing
    micTrack: audioTrack,
    notice,
    ready,
    setAudioOn,
    toggleAudio: () => setAudioOn((v) => !v),
    toggleVideo: () => setVideoOn((v) => !v),
    startScreen,
    stopScreen,
  };
}
