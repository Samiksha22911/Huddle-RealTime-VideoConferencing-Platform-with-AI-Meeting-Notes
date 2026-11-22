import mongoose from 'mongoose';
import { z } from 'zod';
import { Meeting } from '../models/meeting.model.js';
import { Note } from '../models/note.model.js';

const toDto = (n) => ({
  id: String(n._id),
  roomId: n.roomId,
  lineId: n.lineId,
  speaker: n.speaker,
  text: n.text,
  at: n.at,
  comment: n.comment || '',
});

const createSchema = z.object({
  lineId: z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid transcript line.'),
  comment: z.string().trim().max(500).optional(),
});
const updateSchema = z.object({ comment: z.string().trim().max(500) });

export async function listNotes(req, res) {
  const notes = await Note.find({ user: req.user.id, roomId: req.params.roomId }).sort({ at: 1 }).lean();
  res.json({ notes: notes.map(toDto) });
}

export async function createNote(req, res) {
  const { lineId, comment } = createSchema.parse(req.body);
  const { roomId } = req.params;

  // Load ONLY the matching transcript line (positional projection), never the whole transcript.
  // The text is taken from the server's copy, so a client cannot forge a note.
  const meeting = await Meeting.findOne({ roomId, 'transcript._id': lineId }, { host: 1, attendeeIds: 1, 'transcript.$': 1 }).lean();
  if (!meeting) return res.status(404).json({ message: 'That transcript line was not found.' });

  const isMember = String(meeting.host) === req.user.id || meeting.attendeeIds.some((id) => String(id) === req.user.id);
  if (!isMember) return res.status(403).json({ message: 'Only people who joined this meeting can save notes from it.' });

  const line = meeting.transcript[0];
  const filter = { user: req.user.id, roomId, lineId };
  const insert = { speaker: line.speaker, text: String(line.text).slice(0, 600), at: line.at, comment: comment || '' };
  let note;
  try {
    note = await Note.findOneAndUpdate(filter, { $setOnInsert: insert }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
  } catch (err) {
    if (err.code !== 11000) throw err; // two clicks at once: the other one won, just read it
    note = await Note.findOne(filter).lean();
  }
  res.status(201).json({ note: toDto(note) });
}

export async function updateNote(req, res) {
  const { comment } = updateSchema.parse(req.body);
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Note not found.' });
  const note = await Note.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { comment }, { new: true }).lean();
  if (!note) return res.status(404).json({ message: 'Note not found.' });
  res.json({ note: toDto(note) });
}

export async function deleteNote(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Note not found.' });
  const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!note) return res.status(404).json({ message: 'Note not found.' });
  res.json({ message: 'Note removed.' });
}
