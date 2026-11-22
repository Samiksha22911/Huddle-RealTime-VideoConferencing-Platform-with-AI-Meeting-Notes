import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';

/**
 * Your personal saved notes for one meeting: transcript lines you chose to keep.
 * toggle(line) saves the line, or removes it if it is already saved.
 */
export function useNotes(roomId, token) {
  const toast = useToast();
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    if (!token) {
      setNotes([]);
      return undefined;
    }
    let cancelled = false;
    api(`/meetings/${roomId}/notes`, { token })
      .then((d) => !cancelled && setNotes(d.notes))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [roomId, token]);

  const byLine = useMemo(() => new Map(notes.map((n) => [n.lineId, n])), [notes]);

  const toggle = useCallback(
    async (line) => {
      if (!token) return toast('Sign in to save notes.', 'error');
      if (!line.id) return toast('This old line cannot be saved.', 'error');
      const existing = byLine.get(line.id);
      if (existing) {
        setNotes((list) => list.filter((n) => n.id !== existing.id)); // instant, undone if it fails
        try {
          await api(`/notes/${existing.id}`, { method: 'DELETE', token });
        } catch (err) {
          setNotes((list) => [...list, existing]);
          toast(err.message, 'error');
        }
        return undefined;
      }
      try {
        const { note } = await api(`/meetings/${roomId}/notes`, { method: 'POST', token, body: { lineId: line.id } });
        setNotes((list) => (list.some((n) => n.id === note.id) ? list : [...list, note]));
      } catch (err) {
        toast(err.message, 'error');
      }
      return undefined;
    },
    [byLine, roomId, token, toast]
  );

  const setComment = useCallback(
    async (note, comment) => {
      try {
        const res = await api(`/notes/${note.id}`, { method: 'PATCH', token, body: { comment } });
        setNotes((list) => list.map((n) => (n.id === note.id ? res.note : n)));
      } catch (err) {
        toast(err.message, 'error');
      }
    },
    [token, toast]
  );

  const sorted = useMemo(() => [...notes].sort((a, b) => new Date(a.at) - new Date(b.at)), [notes]);
  return { notes: sorted, byLine, toggle, setComment };
}
