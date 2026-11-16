import { useEffect, useState } from 'react';

export const CAPTION_LANGS = [
  ['en-US', 'English (US)'],
  ['en-GB', 'English (UK)'],
  ['en-IN', 'English (India)'],
  ['hi-IN', 'Hindi'],
  ['es-ES', 'Spanish'],
  ['fr-FR', 'French'],
  ['de-DE', 'German'],
];

/** Shows the latest few caption lines (yours + everyone else's) for a few seconds each. */
export default function CaptionsBar({ lines, lang, onLang }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const visible = lines.filter((l) => now - l.ts < 6000).sort((a, b) => a.ts - b.ts).slice(-3);

  return (
    <div className="captions" aria-live="polite">
      <div className="captions-lines">
        {visible.length === 0 && <p className="captions-idle">Captions are on. Start speaking, and the words will appear here and in the notes.</p>}
        {visible.map((l) => (
          <p key={l.key}><strong>{l.name}</strong> {l.text}</p>
        ))}
      </div>
      <select value={lang} onChange={(e) => onLang(e.target.value)} aria-label="Caption language">
        {CAPTION_LANGS.map(([code, label]) => (
          <option key={code} value={code}>{label}</option>
        ))}
      </select>
    </div>
  );
}
