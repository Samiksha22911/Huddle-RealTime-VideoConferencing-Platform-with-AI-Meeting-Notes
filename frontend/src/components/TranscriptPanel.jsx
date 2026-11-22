import { useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, ChevronsDown, Search } from 'lucide-react';
import { formatTime } from '../utils';

/**
 * Live transcript like a course video: every finished sentence appears here.
 * Click a line to save it to YOUR notes (click again to remove it).
 */
export default function TranscriptPanel({ lines, saved, onToggle, canSave }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'saved'
  const [query, setQuery] = useState('');
  const [stick, setStick] = useState(true); // follow the newest line unless the person scrolls up
  const listRef = useRef(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lines.filter((l) => (filter === 'all' || saved.has(l.id)) && (!q || `${l.speaker} ${l.text}`.toLowerCase().includes(q)));
  }, [lines, saved, filter, query]);

  useEffect(() => {
    const el = listRef.current;
    if (stick && el) el.scrollTop = el.scrollHeight;
  }, [shown.length, stick]);

  const onScroll = () => {
    const el = listRef.current;
    setStick(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
  };

  return (
    <div className="tpanel">
      <div className="tpanel-tools">
        <div className="seg" role="tablist" aria-label="Transcript filter">
          <button role="tab" aria-selected={filter === 'all'} className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>
            All ({lines.length})
          </button>
          <button role="tab" aria-selected={filter === 'saved'} className={filter === 'saved' ? 'on' : ''} onClick={() => setFilter('saved')}>
            Saved ({saved.size})
          </button>
        </div>
        <label className="tsearch">
          <Search size={15} aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the transcript" aria-label="Search the transcript" />
        </label>
        <p className="thint">{canSave ? 'Click any line to save it to your notes.' : 'Sign in to save lines to your notes.'}</p>
      </div>

      <ol className="tlist" ref={listRef} onScroll={onScroll}>
        {shown.length === 0 && (
          <li className="empty-note">
            {filter === 'saved'
              ? 'Nothing saved yet. Click a line in the full transcript to keep it.'
              : lines.length === 0
                ? 'The transcript appears here as people speak. Each person needs captions (CC) on so their words are captured.'
                : 'No lines match your search.'}
          </li>
        )}
        {shown.map((l) => {
          const isSaved = saved.has(l.id);
          return (
            <li key={l.id}>
              <button type="button" className={`tline ${isSaved ? 'is-saved' : ''}`} onClick={() => onToggle(l)} aria-pressed={isSaved} aria-label={`${isSaved ? 'Remove from' : 'Save to'} notes: ${l.speaker} said ${l.text}`}>
                <span className="tline-meta">
                  <strong>{l.speaker}</strong> <time>{formatTime(l.at)}</time>
                </span>
                <span className="tline-text">{l.text}</span>
                <Bookmark size={16} className="tline-mark" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ol>

      {!stick && (
        <button type="button" className="jump-latest" onClick={() => setStick(true)}>
          <ChevronsDown size={16} /> Latest
        </button>
      )}
    </div>
  );
}
