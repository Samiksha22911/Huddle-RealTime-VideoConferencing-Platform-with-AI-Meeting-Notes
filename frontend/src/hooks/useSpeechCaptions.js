import { useEffect, useRef } from 'react';

const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : undefined;
export const captionsSupported = !!SR;

/**
 * Live captions using the browser's Web Speech API (Chrome/Edge/Safari).
 * Each person's browser transcribes THEIR OWN microphone; the text is shared with the room.
 * Note: in Chrome the audio is processed by Google's speech service.
 */
export function useSpeechCaptions({ active, lang, onText }) {
  const callback = useRef(onText);
  callback.current = onText;

  useEffect(() => {
    if (!active || !SR) return undefined;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;
    let stopped = false;
    let timer;

    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript.trim();
        if (text) callback.current(text, result.isFinal);
      }
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') stopped = true;
    };
    // The API stops by itself after silence; restart it while captions are on.
    rec.onend = () => {
      if (!stopped) timer = setTimeout(() => { try { rec.start(); } catch { /* already started */ } }, 300);
    };
    try {
      rec.start();
    } catch {
      /* ignore */
    }

    return () => {
      stopped = true;
      clearTimeout(timer);
      rec.onend = null;
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    };
  }, [active, lang]);
}
