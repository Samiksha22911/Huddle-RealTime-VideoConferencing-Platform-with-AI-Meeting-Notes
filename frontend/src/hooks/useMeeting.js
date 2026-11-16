import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { SERVER_URL } from '../config';
import { getClientId } from '../utils';

/**
 * The meeting engine: Socket.IO for signalling + room features, WebRTC for media.
 *
 * Topology: full mesh (every person connects to every other person). Simple and fine for
 * up to ~5-6 people; beyond that you would use an SFU such as LiveKit or mediasoup.
 *
 * Who offers? The NEW joiner sends an offer to every person already in the room, so two
 * peers never offer at the same time (no "glare"). Existing peers only ever answer.
 */
export function useMeeting({ roomId, name, token, enabled, iceServers, audioTrack, videoTrack, media, onForceMute, notify }) {
  const [status, setStatus] = useState('idle'); // idle|connecting|waiting|in|error|removed|denied|ended
  const [error, setError] = useState('');
  const [selfId, setSelfId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [waitingRoom, setWaitingRoom] = useState(false);
  const [title, setTitle] = useState('');
  const [peers, setPeers] = useState({}); // id -> { id, name, isHost, hand, audio, video, screen, stream }
  const [messages, setMessages] = useState([]);
  const [waiting, setWaiting] = useState([]);
  const [captions, setCaptions] = useState({}); // id -> { name, text, final, ts }
  const [reactions, setReactions] = useState([]);
  const [recorders, setRecorders] = useState([]);
  const [handRaised, setHandRaised] = useState(false);

  const socketRef = useRef(null);
  const pcsRef = useRef(new Map());
  const streamsRef = useRef(new Map());
  const pendingIceRef = useRef(new Map());
  const namesRef = useRef(new Map());
  const selfIdRef = useRef(null);
  const waitingCountRef = useRef(0);
  const closingRef = useRef(false);
  const latest = useRef({});
  latest.current = { name, token, iceServers, audioTrack, videoTrack, media, onForceMute, notify };

  const teardown = useCallback(() => {
    closingRef.current = true;
    pcsRef.current.forEach((pc) => pc.close());
    pcsRef.current.clear();
    streamsRef.current.clear();
    pendingIceRef.current.clear();
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    closingRef.current = false;
    setStatus('connecting');
    setError('');

    const socket = io(SERVER_URL, { auth: { token: latest.current.token || undefined }, reconnection: false });
    socketRef.current = socket;
    const say = (msg, kind) => latest.current.notify?.(msg, kind);

    const getStream = (id) => {
      let s = streamsRef.current.get(id);
      if (!s) {
        s = new MediaStream();
        streamsRef.current.set(id, s);
      }
      return s;
    };
    const toPeer = (p) => ({ ...p, stream: getStream(p.id), v: 0 });
    const patchPeer = (id, patch) => setPeers((p) => (p[id] ? { ...p, [id]: { ...p[id], ...patch } } : p));

    function createPeer(peerId) {
      const existing = pcsRef.current.get(peerId);
      if (existing) return existing;

      const pc = new RTCPeerConnection({ iceServers: latest.current.iceServers });
      const stream = getStream(peerId);

      // Always negotiate one audio + one video m-line, even if we have no camera/mic,
      // so we can still RECEIVE. Real tracks are attached with replaceTrack (no renegotiation).
      const a = pc.addTransceiver('audio', { direction: 'sendrecv' });
      const v = pc.addTransceiver('video', { direction: 'sendrecv' });
      if (latest.current.audioTrack) a.sender.replaceTrack(latest.current.audioTrack).catch(() => {});
      if (latest.current.videoTrack) v.sender.replaceTrack(latest.current.videoTrack).catch(() => {});

      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('signal', { to: peerId, data: { ice: e.candidate } });
      };
      pc.ontrack = (e) => {
        if (!stream.getTracks().includes(e.track)) stream.addTrack(e.track);
        setPeers((p) => (p[peerId] ? { ...p, [peerId]: { ...p[peerId], v: (p[peerId].v || 0) + 1 } } : p));
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') say(`Connection to ${namesRef.current.get(peerId) || 'a participant'} failed. A TURN server may be needed.`, 'error');
      };
      pcsRef.current.set(peerId, pc);
      return pc;
    }

    async function callPeer(peerId) {
      try {
        const pc = createPeer(peerId);
        await pc.setLocalDescription(await pc.createOffer());
        socket.emit('signal', { to: peerId, data: { sdp: pc.localDescription } });
      } catch (err) {
        console.error('offer failed', err);
      }
    }

    async function onSignal({ from, data }) {
      try {
        const pc = createPeer(from);
        if (data.sdp) {
          await pc.setRemoteDescription(data.sdp);
          const queued = pendingIceRef.current.get(from) || [];
          pendingIceRef.current.delete(from);
          for (const c of queued) await pc.addIceCandidate(c).catch(() => {});
          if (data.sdp.type === 'offer') {
            await pc.setLocalDescription(await pc.createAnswer());
            socket.emit('signal', { to: from, data: { sdp: pc.localDescription } });
          }
        } else if (data.ice) {
          if (pc.remoteDescription) await pc.addIceCandidate(data.ice).catch(() => {});
          else pendingIceRef.current.set(from, [...(pendingIceRef.current.get(from) || []), data.ice]);
        }
      } catch (err) {
        console.error('signal failed', err);
      }
    }

    function dropPeer(id) {
      pcsRef.current.get(id)?.close();
      pcsRef.current.delete(id);
      streamsRef.current.delete(id);
      pendingIceRef.current.delete(id);
      setPeers((p) => {
        if (!p[id]) return p;
        const next = { ...p };
        delete next[id];
        return next;
      });
      setCaptions((c) => {
        if (!c[id]) return c;
        const next = { ...c };
        delete next[id];
        return next;
      });
    }

    socket.on('connect', () => {
      socket.emit('join-room', { roomId, name: latest.current.name, clientId: getClientId() }, (res) => {
        if (!res?.ok) {
          setError(res?.error || 'Could not join the meeting.');
          setStatus('error');
          teardown();
          return;
        }
        if (res.status === 'waiting') setStatus('waiting');
      });
    });

    socket.on('connect_error', () => {
      if (closingRef.current) return;
      setError('Cannot reach the meeting server. Check your connection and try again.');
      setStatus('error');
    });

    socket.on('disconnect', () => {
      if (closingRef.current) return;
      setStatus((s) => (['removed', 'denied', 'ended'].includes(s) ? s : 'error'));
      setError((e) => e || 'Connection lost. Rejoin the meeting to continue.');
    });

    socket.on('error-message', (msg) => {
      setError(msg);
      setStatus('error');
    });

    socket.on('joined', (d) => {
      selfIdRef.current = d.selfId;
      setSelfId(d.selfId);
      setIsHost(d.isHost);
      setWaitingRoom(d.waitingRoom);
      setTitle(d.title);
      const map = {};
      d.peers.forEach((p) => {
        namesRef.current.set(p.id, p.name);
        map[p.id] = toPeer(p);
      });
      setPeers(map);
      setMessages(d.messages || []);
      setWaiting(d.waiting || []);
      waitingCountRef.current = (d.waiting || []).length;
      setStatus('in');
      d.peers.forEach((p) => callPeer(p.id)); // we are the newcomer: we offer
    });

    socket.on('peer-joined', (p) => {
      namesRef.current.set(p.id, p.name);
      setPeers((prev) => ({ ...prev, [p.id]: toPeer(p) }));
      say(`${p.name} joined`);
    });

    socket.on('peer-left', ({ id }) => {
      const who = namesRef.current.get(id);
      dropPeer(id);
      if (who) say(`${who} left`);
    });

    socket.on('signal', onSignal);
    socket.on('chat', (m) => setMessages((list) => [...list, m]));
    socket.on('caption', (c) => setCaptions((prev) => ({ ...prev, [c.id]: { name: c.name, text: c.text, final: c.final, ts: Date.now() } })));
    socket.on('peer-media', ({ id, audio, video, screen }) => patchPeer(id, { audio, video, screen }));

    socket.on('peer-hand', ({ id, raised }) => {
      patchPeer(id, { hand: raised });
      if (raised && id !== selfIdRef.current) say(`${namesRef.current.get(id) || 'Someone'} raised a hand`);
    });

    socket.on('reaction', ({ id, name: who, emoji }) => {
      const key = `${id}-${Date.now()}-${Math.random()}`;
      setReactions((r) => [...r.slice(-12), { key, emoji, name: id === selfIdRef.current ? 'You' : who, left: 10 + Math.random() * 80 }]);
      setTimeout(() => setReactions((r) => r.filter((x) => x.key !== key)), 3500);
    });

    socket.on('recording', ({ id, name: who, on }) => {
      setRecorders((r) => (on ? [...new Set([...r, id])] : r.filter((x) => x !== id)));
      if (id !== selfIdRef.current) say(`${who} ${on ? 'started' : 'stopped'} recording`, on ? 'warn' : 'info');
    });

    socket.on('waiting-list', (list) => {
      if (list.length > waitingCountRef.current) say(`${list[list.length - 1].name} is waiting to join`);
      waitingCountRef.current = list.length;
      setWaiting(list);
    });
    socket.on('waiting-room', (on) => setWaitingRoom(on));
    socket.on('force-mute', () => {
      latest.current.onForceMute?.();
      say('The host muted you');
    });
    socket.on('removed', () => {
      setStatus('removed');
      teardown();
    });
    socket.on('denied', () => {
      setStatus('denied');
      teardown();
    });
    socket.on('meeting-ended', () => {
      setStatus('ended');
      teardown();
    });

    return () => teardown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, roomId]);

  // Swap outgoing tracks on every connection when the camera/screen/mic track changes.
  useEffect(() => {
    pcsRef.current.forEach((pc) => {
      pc.getTransceivers().forEach((t) => {
        const kind = t.receiver.track?.kind;
        if (kind === 'audio') t.sender.replaceTrack(audioTrack || null).catch(() => {});
        if (kind === 'video') t.sender.replaceTrack(videoTrack || null).catch(() => {});
      });
    });
  }, [audioTrack, videoTrack]);

  // Tell everyone about mic/camera/screen state (for icons and the "pinned screen" layout).
  useEffect(() => {
    if (status === 'in') socketRef.current?.emit('media-state', media);
  }, [status, media.audio, media.video, media.screen]); // eslint-disable-line react-hooks/exhaustive-deps

  const emit = useCallback((event, payload) => socketRef.current?.emit(event, payload), []);

  return {
    status, error, selfId, isHost, waitingRoom, title,
    peers: Object.values(peers),
    messages, waiting, captions, reactions, recorders, handRaised,
    sendChat: (text) => emit('chat', text),
    sendCaption: (text, final) => emit('caption', { text, final }),
    sendReaction: (emoji) => emit('reaction', emoji),
    sendRecording: (on) => emit('recording', on),
    toggleHand: () => {
      const next = !handRaised;
      setHandRaised(next);
      emit('hand', next);
    },
    hostMute: (id) => emit('host:mute', id),
    hostRemove: (id) => emit('host:remove', id),
    admit: (id) => emit('host:admit', id),
    deny: (id) => emit('host:deny', id),
    setWaitingRoomEnabled: (on) => emit('host:waiting-room', on),
    endForAll: () => {
      emit('host:end');
      teardown();
    },
    leave: () => {
      emit('leave');
      teardown();
    },
  };
}
