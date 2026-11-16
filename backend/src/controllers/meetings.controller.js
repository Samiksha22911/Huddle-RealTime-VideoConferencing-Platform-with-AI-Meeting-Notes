import { z } from 'zod';
import { Meeting } from '../models/meeting.model.js';
import { generateRoomId } from '../utils/roomId.js';
import { generateSummary } from '../services/summary.service.js';
import { env } from '../config/env.js';

const createSchema = z.object({
  title: z.string().trim().max(80).optional(),
  waitingRoom: z.boolean().optional(),
});

const isParticipant = (meeting, userId) =>
  String(meeting.host) === userId || meeting.attendeeIds.some((id) => String(id) === userId);

async function findForParticipant(req, res) {
  const meeting = await Meeting.findOne({ roomId: req.params.roomId });
  if (!meeting) {
    res.status(404).json({ message: 'Meeting not found.' });
    return null;
  }
  if (!isParticipant(meeting, req.user.id)) {
    res.status(403).json({ message: 'Only people who joined this meeting can view it.' });
    return null;
  }
  return meeting;
}

export async function createMeeting(req, res) {
  const { title, waitingRoom } = createSchema.parse(req.body);
  let meeting;
  for (let i = 0; i < 5 && !meeting; i++) {
    try {
      meeting = await Meeting.create({
        roomId: generateRoomId(),
        title: title || 'Untitled meeting',
        host: req.user.id,
        hostName: req.user.name,
        waitingRoom: !!waitingRoom,
      });
    } catch (err) {
      if (err.code !== 11000) throw err; // duplicate roomId: try again
    }
  }
  if (!meeting) throw new Error('Could not allocate a meeting code');
  res.status(201).json({ roomId: meeting.roomId });
}

export async function listMeetings(req, res) {
  const meetings = await Meeting.find({ $or: [{ host: req.user.id }, { attendeeIds: req.user.id }] })
    .select('roomId title hostName host participantNames summary.generatedAt endedAt createdAt')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  res.json({
    meetings: meetings.map((m) => ({
      roomId: m.roomId,
      title: m.title,
      hostName: m.hostName,
      isHost: String(m.host) === req.user.id,
      participantCount: m.participantNames?.length || 0,
      hasNotes: !!m.summary?.generatedAt,
      ended: !!m.endedAt,
      createdAt: m.createdAt,
    })),
  });
}

// Public: lets the lobby show a title before the visitor signs in.
export async function getPublicInfo(req, res) {
  const m = await Meeting.findOne({ roomId: req.params.roomId }).select('roomId title host hostName waitingRoom endedAt').lean();
  if (!m) return res.status(404).json({ message: 'Meeting not found. Check the code and try again.' });
  res.json({ roomId: m.roomId, title: m.title, hostId: String(m.host), hostName: m.hostName, waitingRoom: m.waitingRoom, ended: !!m.endedAt });
}

export async function getDetails(req, res) {
  const meeting = await findForParticipant(req, res);
  if (!meeting) return;
  res.json({
    roomId: meeting.roomId,
    title: meeting.title,
    hostName: meeting.hostName,
    isHost: String(meeting.host) === req.user.id,
    participantNames: meeting.participantNames,
    createdAt: meeting.createdAt,
    endedAt: meeting.endedAt,
    chat: meeting.chat,
    transcript: meeting.transcript,
    summary: meeting.summary?.generatedAt ? meeting.summary : null,
    aiEnabled: !!env.anthropicKey,
  });
}

export async function createSummary(req, res) {
  const meeting = await findForParticipant(req, res);
  if (!meeting) return;
  if (!meeting.transcript.length && !meeting.chat.length) {
    return res.status(400).json({
      message: 'Nothing to summarise yet. Turn on captions during a meeting to record a transcript.',
    });
  }
  meeting.summary = await generateSummary(meeting);
  await meeting.save();
  res.json({ summary: meeting.summary, aiEnabled: !!env.anthropicKey });
}

export async function deleteMeeting(req, res) {
  const meeting = await Meeting.findOne({ roomId: req.params.roomId });
  if (!meeting) return res.status(404).json({ message: 'Meeting not found.' });
  if (String(meeting.host) !== req.user.id) {
    return res.status(403).json({ message: 'Only the host can delete a meeting.' });
  }
  await meeting.deleteOne();
  res.json({ message: 'Meeting deleted.' });
}
