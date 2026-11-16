import { Server } from 'socket.io';
import { Meeting } from '../models/meeting.model.js';
import { verifyToken } from '../middleware/auth.js';
import { env } from '../config/env.js';

/**
 * Real-time layer. Two jobs:
 *  1. WebRTC signalling: relay offers/answers/ICE between two specific peers ("signal").
 *  2. Room features: chat, captions, hand raise, reactions, host controls, waiting room.
 *
 * Room state lives in memory (fine for one server instance). Chat + transcript are also
 * saved to MongoDB so they survive restarts and feed the AI notes.
 * To scale to several servers, add the Redis adapter for Socket.IO and move `rooms` to Redis.
 */

/** roomId -> { peers: Map<socketId, Peer>, waiting: Map<socketId, {id,name,clientId}>, waitingRoom: boolean, banned: Set<clientId> } */
const rooms = new Map();

const REACTIONS = new Set(['👍', '👏', '😂', '❤️', '🎉', '😮']);
const channel = (roomId) => `room:${roomId}`;
const clip = (value, max) => String(value ?? '').slice(0, max);
const publicPeer = ({ id, name, isHost, hand, audio, video, screen }) => ({ id, name, isHost, hand, audio, video, screen });

const persist = (roomId, update) =>
  Meeting.updateOne({ roomId }, update).catch((err) => console.error('persist failed:', err.message));

// crude per-socket flood protection
function makeBucket(max, windowMs) {
  let count = 0;
  let start = Date.now();
  return () => {
    const now = Date.now();
    if (now - start > windowMs) {
      start = now;
      count = 0;
    }
    return ++count <= max;
  };
}

function notifyHosts(io, room) {
  const list = [...room.waiting.values()];
  for (const p of room.peers.values()) if (p.isHost) io.to(p.id).emit('waiting-list', list);
}

async function enterRoom(io, socket, room, { roomId, name, isHost, clientId }) {
  const meeting = await Meeting.findOne({ roomId }).select('title chat').lean();
  if (!meeting) return socket.emit('error-message', 'Meeting not found');

  const user = socket.data.user;
  const existing = [...room.peers.values()].map(publicPeer);
  const me = { id: socket.id, name, isHost, clientId, userId: user?.id || null, hand: false, audio: true, video: true, screen: false };

  room.peers.set(socket.id, me);
  socket.data.roomId = roomId;
  socket.join(channel(roomId));

  const update = { $addToSet: { participantNames: name } };
  if (user) update.$addToSet.attendeeIds = user.id;
  persist(roomId, update);

  socket.emit('joined', {
    selfId: socket.id,
    isHost,
    title: meeting.title,
    waitingRoom: room.waitingRoom,
    peers: existing,
    waiting: isHost ? [...room.waiting.values()] : [],
    messages: (meeting.chat || []).slice(-100),
  });
  socket.to(channel(roomId)).emit('peer-joined', publicPeer(me));
  if (isHost) notifyHosts(io, room);
}

function leaveRoom(io, socket) {
  const roomId = socket.data.roomId;
  if (!roomId) return;
  socket.data.roomId = null;
  const room = rooms.get(roomId);
  if (!room) return;

  if (room.waiting.delete(socket.id)) notifyHosts(io, room);
  if (room.peers.delete(socket.id)) {
    socket.leave(channel(roomId));
    io.to(channel(roomId)).emit('peer-left', { id: socket.id });
  }
  if (!room.peers.size && !room.waiting.size) rooms.delete(roomId);
}

export function attachSocket(httpServer) {
  const io = new Server(httpServer, { cors: { origin: env.clientOrigins } });

  // Identify signed-in users; guests are allowed (they just have no user id).
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    socket.data.user = token ? verifyToken(token) : null;
    next();
  });

  io.on('connection', (socket) => {
    const allow = makeBucket(250, 10_000);
    const ctx = () => {
      const room = rooms.get(socket.data.roomId);
      const peer = room?.peers.get(socket.id);
      return { roomId: socket.data.roomId, room, peer };
    };
    const hostCtx = () => {
      const c = ctx();
      return c.peer?.isHost ? c : null;
    };

    // ---- joining -------------------------------------------------------------
    socket.on('join-room', async (payload, ack = () => {}) => {
      try {
        const roomId = clip(payload?.roomId, 20);
        const name = clip(payload?.name, 40).trim() || 'Guest';
        const clientId = clip(payload?.clientId, 64);
        if (socket.data.roomId) return ack({ ok: false, error: 'You are already in a meeting.' });

        const meeting = await Meeting.findOne({ roomId }).select('host waitingRoom endedAt').lean();
        if (!meeting) return ack({ ok: false, error: 'Meeting not found.' });
        if (meeting.endedAt) return ack({ ok: false, error: 'This meeting has ended.' });

        let room = rooms.get(roomId);
        if (!room) {
          room = { peers: new Map(), waiting: new Map(), waitingRoom: !!meeting.waitingRoom, banned: new Set() };
          rooms.set(roomId, room);
        }
        if (clientId && room.banned.has(clientId)) return ack({ ok: false, error: 'The host removed you from this meeting.' });

        const user = socket.data.user;
        const isHost = !!user && String(meeting.host) === user.id;
        socket.data.roomId = roomId;

        if (!isHost && room.waitingRoom) {
          room.waiting.set(socket.id, { id: socket.id, name, clientId });
          notifyHosts(io, room);
          return ack({ ok: true, status: 'waiting' });
        }
        ack({ ok: true, status: 'joined' });
        await enterRoom(io, socket, room, { roomId, name, isHost, clientId });
      } catch (err) {
        console.error('join-room failed:', err);
        ack({ ok: false, error: 'Could not join the meeting.' });
      }
    });

    // ---- WebRTC signalling -----------------------------------------------------
    socket.on('signal', ({ to, data } = {}) => {
      const { room, peer } = ctx();
      if (!peer || !room.peers.has(to)) return;
      io.to(to).emit('signal', { from: socket.id, data });
    });

    // ---- chat / captions / presence -----------------------------------------------
    socket.on('chat', (text) => {
      const { roomId, peer } = ctx();
      if (!peer || !allow()) return;
      const clean = clip(text, 1000).trim();
      if (!clean) return;
      const message = { senderId: socket.id, sender: peer.name, text: clean, at: new Date().toISOString() };
      io.to(channel(roomId)).emit('chat', message);
      persist(roomId, { $push: { chat: { sender: peer.name, text: clean, at: message.at } } });
    });

    socket.on('caption', ({ text, final } = {}) => {
      const { roomId, peer } = ctx();
      if (!peer || !allow()) return;
      const clean = clip(text, 500).trim();
      if (!clean) return;
      socket.to(channel(roomId)).emit('caption', { id: socket.id, name: peer.name, text: clean, final: !!final });
      if (final) persist(roomId, { $push: { transcript: { speaker: peer.name, text: clean, at: new Date() } } });
    });

    socket.on('media-state', (state = {}) => {
      const { roomId, peer } = ctx();
      if (!peer) return;
      peer.audio = !!state.audio;
      peer.video = !!state.video;
      peer.screen = !!state.screen;
      socket.to(channel(roomId)).emit('peer-media', { id: socket.id, audio: peer.audio, video: peer.video, screen: peer.screen });
    });

    socket.on('hand', (raised) => {
      const { roomId, peer } = ctx();
      if (!peer) return;
      peer.hand = !!raised;
      io.to(channel(roomId)).emit('peer-hand', { id: socket.id, raised: peer.hand });
    });

    socket.on('reaction', (emoji) => {
      const { roomId, peer } = ctx();
      if (!peer || !allow() || !REACTIONS.has(emoji)) return;
      io.to(channel(roomId)).emit('reaction', { id: socket.id, name: peer.name, emoji });
    });

    // Recording happens in each person's own browser; this just tells everyone (consent matters).
    socket.on('recording', (on) => {
      const { roomId, peer } = ctx();
      if (!peer) return;
      io.to(channel(roomId)).emit('recording', { id: socket.id, name: peer.name, on: !!on });
    });

    // ---- host controls ------------------------------------------------------------
    socket.on('host:mute', (targetId) => {
      const c = hostCtx();
      if (c && c.room.peers.has(targetId) && targetId !== socket.id) io.to(targetId).emit('force-mute');
    });

    socket.on('host:remove', (targetId) => {
      const c = hostCtx();
      const target = io.sockets.sockets.get(targetId);
      const targetPeer = c?.room.peers.get(targetId);
      if (!c || !target || !targetPeer || targetPeer.isHost) return;
      if (targetPeer.clientId) c.room.banned.add(targetPeer.clientId);
      target.emit('removed');
      leaveRoom(io, target);
    });

    socket.on('host:admit', async (targetId) => {
      const c = hostCtx();
      const entry = c?.room.waiting.get(targetId);
      const target = io.sockets.sockets.get(targetId);
      if (!entry || !target) return;
      c.room.waiting.delete(targetId);
      await enterRoom(io, target, c.room, { roomId: c.roomId, name: entry.name, isHost: false, clientId: entry.clientId });
      notifyHosts(io, c.room);
    });

    socket.on('host:deny', (targetId) => {
      const c = hostCtx();
      const target = io.sockets.sockets.get(targetId);
      if (!c || !c.room.waiting.delete(targetId)) return;
      if (target) {
        target.data.roomId = null;
        target.emit('denied');
      }
      notifyHosts(io, c.room);
    });

    socket.on('host:waiting-room', async (on) => {
      const c = hostCtx();
      if (!c) return;
      c.room.waitingRoom = !!on;
      persist(c.roomId, { waitingRoom: !!on });
      io.to(channel(c.roomId)).emit('waiting-room', c.room.waitingRoom);
      if (!on) {
        // turning it off lets everyone who is waiting in
        for (const entry of [...c.room.waiting.values()]) {
          const target = io.sockets.sockets.get(entry.id);
          c.room.waiting.delete(entry.id);
          if (target) await enterRoom(io, target, c.room, { roomId: c.roomId, name: entry.name, isHost: false, clientId: entry.clientId });
        }
        notifyHosts(io, c.room);
      }
    });

    socket.on('host:end', () => {
      const c = hostCtx();
      if (!c) return;
      io.to(channel(c.roomId)).emit('meeting-ended');
      for (const id of c.room.waiting.keys()) io.to(id).emit('meeting-ended');
      persist(c.roomId, { endedAt: new Date() });
      rooms.delete(c.roomId);
    });

    socket.on('leave', () => leaveRoom(io, socket));
    socket.on('disconnect', () => leaveRoom(io, socket));
  });

  return io;
}
