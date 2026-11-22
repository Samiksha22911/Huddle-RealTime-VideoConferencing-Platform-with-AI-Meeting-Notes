# Huddle

Video meetings that write their own notes.

Huddle is a full-stack video conferencing app. People meet over WebRTC, turn on live captions, and when the call ends the saved transcript and chat are turned into a summary with decisions and action items.

## Features

| Area | What you get |
| --- | --- |
| Calls | Multi-party video and audio (WebRTC mesh), screen share with a pinned layout, pre-join lobby with camera/mic preview, active-speaker highlight |
| AI | Live captions (Web Speech API), transcript saved per meeting, AI-written summary + decisions + action items with owners (falls back to rule-based notes without an API key) |
| Hosting | Waiting room, mute a participant, remove a participant (and block that browser), end meeting for everyone |
| Engagement | Raise hand, emoji reactions, persistent chat, recording consent banner |
| Recording | Record to a `.webm` file on your own device (your mic is mixed in) |
| Transcript notes | Live transcript panel: click any line to save it to your personal notes, add comments, search, review and download after the meeting |
| Scheduling | Schedule meetings, upcoming list, Add to Google Calendar, QR code + WhatsApp invite |
| Accounts | Email/password and Continue with Google, JWT sessions, meeting history, notes page, delete meetings |
| Quality | Zod validation, rate limiting, Helmet, CORS allow-list, unit tests, CI, Docker |

## Quick start

You need Node 18+ and MongoDB (local, Docker, or a free MongoDB Atlas cluster).

```bash
# 1. database (skip if you use Atlas)
docker compose up -d mongo

# 2. backend
cd backend
cp .env.example .env        # Windows CMD: copy .env.example .env  | then edit MONGO_URI and JWT_SECRET
npm install
npm run dev                 # http://localhost:8000

# 3. frontend (new terminal)
cd frontend
cp .env.example .env        # Windows CMD: copy .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

Open http://localhost:5173, create an account, start a meeting, then open the invite link in a second browser window (or a private window as a guest) to test a call between two participants. Use Chrome or Edge for live captions.

> Camera and microphone only work on `https://` pages or on `localhost`. To test with a phone on your Wi-Fi, use a tunnel such as `ngrok` or deploy the app.

## How it works

```
Browser A ──┐                          ┌── Browser B
  React UI  │   Socket.IO signalling   │  React UI
  WebRTC  ◄─┼──────── Node server ─────┼─► WebRTC
            │   chat, captions, host   │
            └──── media goes peer to peer (STUN/TURN) ───┘
                          │
                       MongoDB  (users, meetings, chat, transcript, notes)
                          │
                 Anthropic API (summary), called only from the server
```

* The newcomer sends a WebRTC offer to everyone already in the room; they answer. Offers never cross, so there is no "glare".
* Muting uses `track.enabled`; screen share swaps the video track with `replaceTrack`, so neither renegotiates the call.
* Captions: each browser transcribes its own microphone and shares the text; final sentences are saved as the transcript.
* The API key never reaches the browser. The server builds the prompt, calls the model, validates the JSON reply, and stores it.

## Project structure

```
backend/src
  app.js, server.js          Express app and startup
  config/env.js              environment variables
  models/                    User, Meeting (chat, transcript, summary)
  controllers/, routes/      REST API (/api/v1)
  middleware/                JWT auth, error handling
  services/summary.service.js  AI notes (+ fallbackSummary.js, rule-based)
  socket/index.js            signalling, waiting room, host controls, chat, captions
frontend/src
  pages/                     Landing, AuthPage, Home, History, MeetingDetail, Room
  hooks/useMeeting.js        WebRTC + Socket.IO engine
  hooks/useLocalMedia.js     camera, mic, screen share
  hooks/useSpeechCaptions.js live captions
  hooks/useRecorder.js       recording
  components/                VideoTile, ControlBar, SidePanel, CaptionsBar, Lobby ...
  styles/global.css          design tokens and all styles
```

## Environment variables

Backend (`backend/.env`): `MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, `ANTHROPIC_API_KEY` (optional), `ANTHROPIC_MODEL` (optional), `TURN_URLS`, `TURN_USERNAME`, `TURN_CREDENTIAL` (optional).
Frontend (`frontend/.env`): `VITE_SERVER_URL`.

## Deploy

**Full step-by-step guide with a test checklist: [docs/DEPLOY.md](docs/DEPLOY.md).** A `render.yaml` blueprint is included. Summary:

1. **Database:** create a free MongoDB Atlas cluster, create a database user, allow your server's IP, copy the connection string.
2. **Backend (Render, Railway, Fly.io):** root directory `backend`, build `npm install`, start `npm start`. Set the environment variables above; `CLIENT_ORIGIN` must be your frontend URL.
3. **Frontend (Vercel or Netlify):** root directory `frontend`, build `npm run build`, output `dist`, set `VITE_SERVER_URL` to the backend URL. SPA rewrites are already configured (`vercel.json`, `public/_redirects`).
4. **TURN:** for reliable calls on mobile data and campus Wi-Fi, add a TURN server (Metered.ca has a free tier, or run coturn) and set the `TURN_*` variables.

## Tests

```bash
cd backend && npm test      # room codes + rule-based summary
```

## Known limits

* Mesh WebRTC suits about 4 to 6 people. For larger meetings, move to an SFU (LiveKit, mediasoup).
* Room state is kept in server memory (chat and transcript are in MongoDB). Use the Socket.IO Redis adapter to run several servers.
* Live captions need a browser with the Web Speech API (Chrome, Edge, Safari). Accuracy depends on the browser's speech service.
* Recording is local to the person who starts it, and everyone is notified when it starts.

See [docs/MAKE_IT_YOURS.md](docs/MAKE_IT_YOURS.md) for a guided tour of every feature and how to extend it.
