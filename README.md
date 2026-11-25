<div align="center">

# 🎥 Huddle

**Video meetings that write their own notes.**

Real-time video conferencing with live captions and AI-generated meeting summaries, decisions and action items.

[**Live Demo**](https://YOUR-VERCEL-URL.vercel.app) · [Deploy Guide](docs/DEPLOY.md) · [Feature Tour](docs/MAKE_IT_YOURS.md)

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-API-000000?logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![WebRTC](https://img.shields.io/badge/WebRTC-P2P-333333?logo=webrtc)
![Socket.IO](https://img.shields.io/badge/Socket.IO-signalling-010101?logo=socket.io)
![CI](https://github.com/Samiksha22911/Huddle-RealTime-VideoConferencing-Platform-with-AI-Meeting-Notes/actions/workflows/ci.yml/badge.svg)

</div>

<!-- Add a screenshot or a short GIF of a live call here: -->
<!-- ![Huddle demo](docs/demo.gif) -->

## Overview

Huddle is a full-stack video conferencing app. People meet over WebRTC, turn on live captions, and when the call ends the saved transcript and chat are turned into a summary with decisions and action items. If the AI service is unavailable, a rule-based fallback still produces notes.

## Features

| Area | What you get |
| --- | --- |
| **Calls** | Multi-party video and audio (WebRTC mesh), screen share with a pinned layout, pre-join lobby with camera/mic preview, active-speaker highlight |
| **AI** | Live captions (Web Speech API), transcript saved per meeting, AI-written summary + decisions + action items with owners (falls back to rule-based notes without an API key) |
| **Hosting** | Waiting room, mute a participant, remove a participant (and block that browser), end meeting for everyone |
| **Engagement** | Raise hand, emoji reactions, persistent chat, recording consent banner |
| **Recording** | Record to a `.webm` file on your own device (your mic is mixed in) |
| **Transcript notes** | Live transcript panel: click any line to save it to your personal notes, add comments, search, review and download after the meeting |
| **Scheduling** | Schedule meetings, upcoming list, Add to Google Calendar, QR code + WhatsApp invite |
| **Accounts** | Email/password and Continue with Google, JWT sessions, meeting history, notes page, delete meetings |
| **Quality** | Zod validation, rate limiting, Helmet, CORS allow-list, unit tests, CI, Docker |

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, React Router, Socket.IO client, `@react-oauth/google` |
| Backend | Node.js, Express, Socket.IO, Zod, JWT |
| Database | MongoDB (Atlas) with Mongoose |
| Realtime media | WebRTC (peer-to-peer mesh) with STUN/TURN |
| AI | Anthropic API (server side only) with a rule-based fallback |
| DevOps | Docker, GitHub Actions CI, Render (API), Vercel (web) |

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

- **Signalling:** the newcomer sends a WebRTC offer to everyone already in the room and they answer. Offers never cross, so there is no "glare".
- **Mute and screen share:** muting uses `track.enabled`, and screen share swaps the video track with `replaceTrack`, so neither renegotiates the call.
- **Captions:** each browser transcribes its own microphone and shares the text. Final sentences are saved as the transcript.
- **AI notes:** the API key never reaches the browser. The server builds the prompt, calls the model, validates the JSON reply, and stores it.

## Quick start

**Requirements:** Node 18+ and MongoDB (local, Docker, or a free MongoDB Atlas cluster).

```bash
# 1. Database (skip if you use Atlas)
docker compose up -d mongo

# 2. Backend
cd backend
cp .env.example .env        # Windows CMD: copy .env.example .env, then edit MONGO_URI and JWT_SECRET
npm install
npm run dev                 # http://localhost:8000

# 3. Frontend (new terminal)
cd frontend
cp .env.example .env        # Windows CMD: copy .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

Open http://localhost:5173, create an account, start a meeting, then open the invite link in a second browser window (or a private window as a guest) to test a call between two participants. Use Chrome or Edge for live captions.

> Camera and microphone only work on `https://` pages or on `localhost`. To test with a phone on your Wi-Fi, use a tunnel such as `ngrok`, or deploy the app.

## Environment variables

**Backend** (`backend/.env`)

| Variable | Required | Purpose |
| --- | :---: | --- |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Long random string used to sign tokens |
| `CLIENT_ORIGIN` | Yes | Allowed frontend origin(s), comma separated, no trailing slash |
| `GOOGLE_CLIENT_ID` | No | Enables "Continue with Google" |
| `ANTHROPIC_API_KEY` | No | Enables AI summaries (rule-based notes without it) |
| `ANTHROPIC_MODEL` | No | Model used for summaries |
| `TURN_URLS`, `TURN_USERNAME`, `TURN_CREDENTIAL` | No | TURN server so calls work on mobile data and strict Wi-Fi |

**Frontend** (`frontend/.env`)

| Variable | Required | Purpose |
| --- | :---: | --- |
| `VITE_SERVER_URL` | Yes | Backend URL, no trailing slash |
| `VITE_GOOGLE_CLIENT_ID` | No | Same Client ID as the backend. Read at build time, so redeploy after changing it |

## Project structure

```
backend/src
  app.js, server.js            Express app and startup
  config/env.js                environment variables
  models/                      User, Meeting (chat, transcript, summary), Note
  controllers/, routes/        REST API (/api/v1)
  middleware/                  JWT auth, error handling
  services/summary.service.js  AI notes (+ fallbackSummary.js, rule-based)
  socket/index.js              signalling, waiting room, host controls, chat, captions
frontend/src
  pages/                       Landing, AuthPage, Home, History, MeetingDetail, Room
  hooks/useMeeting.js          WebRTC + Socket.IO engine
  hooks/useLocalMedia.js       camera, mic, screen share
  hooks/useSpeechCaptions.js   live captions
  hooks/useRecorder.js         recording
  components/                  VideoTile, ControlBar, SidePanel, CaptionsBar, Lobby ...
  styles/global.css            design tokens and all styles
```

## Deployment

A step-by-step guide with a test checklist is in **[docs/DEPLOY.md](docs/DEPLOY.md)**. A `render.yaml` blueprint is included.

1. **Database:** create a free MongoDB Atlas cluster and a database user, allow network access, and copy the connection string.
2. **Backend (Render, Railway or Fly.io):** root directory `backend`, build `npm install`, start `npm start`. Set the backend variables above. `CLIENT_ORIGIN` must be your frontend URL.
3. **Frontend (Vercel or Netlify):** root directory `frontend`, build `npm run build`, output `dist`, and set `VITE_SERVER_URL` to the backend URL. SPA rewrites are already configured (`vercel.json`, `public/_redirects`).
4. **TURN:** for reliable calls on mobile data and campus Wi-Fi, add a TURN server (Metered.ca has a free tier, or run coturn) and set the `TURN_*` variables.
5. **Google sign-in (optional):** add the frontend URL under *Authorized JavaScript origins* for your OAuth client. See [docs/GOOGLE_LOGIN.md](docs/GOOGLE_LOGIN.md).

> **Note:** on free hosting the backend sleeps after inactivity, so the first request can take 30-60 seconds.

## Tests

```bash
cd backend && npm test      # room codes + rule-based summary fallback
```

GitHub Actions runs the backend tests and a frontend production build on every push and pull request.

## Known limits

- Mesh WebRTC suits about 4 to 6 people. For larger meetings, move to an SFU such as LiveKit or mediasoup.
- Room state is kept in server memory (chat and transcript are stored in MongoDB). Use the Socket.IO Redis adapter to run several servers.
- Live captions need a browser with the Web Speech API (Chrome, Edge, Safari). Accuracy depends on the browser's speech service.
- Recording is local to the person who starts it, and everyone is notified when it starts.

## Roadmap

- SFU-based calls for larger meetings
- Redis adapter for horizontal scaling
- Server-side transcription for browsers without the Web Speech API
- Shareable, exportable meeting notes (PDF)

## Author

**Samiksha Sharma**: [GitHub](https://github.com/Samiksha22911)

See [docs/MAKE_IT_YOURS.md](docs/MAKE_IT_YOURS.md) for a guided tour of every feature and how to extend it.
