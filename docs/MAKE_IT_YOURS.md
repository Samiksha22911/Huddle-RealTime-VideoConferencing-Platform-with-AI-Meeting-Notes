# Make it yours

This project started from the Apna College "Zoom clone" tutorial. Almost everything has been rebuilt, but a recruiter who has seen the tutorial will look for what *you* added. This guide shows where every feature lives, how it works, and what to build next so you can explain it confidently.

> **Do this first:** the original `app.js` contained a MongoDB connection string with a username and password. If you ever pushed that to GitHub, change that database user's password (or delete the user) in MongoDB Atlas now, and never commit a `.env` file.

## 1. Day-one checklist (30 minutes)

1. Run it locally (see the README) and test a call between two browser windows.
2. **Name it.** Change `APP_NAME` and `TAGLINE` in `frontend/src/config.js`, the `<title>` in `frontend/index.html`, the package names in both `package.json` files, and the README heading.
3. **Colour it.** All colours are variables at the top of `frontend/src/styles/global.css`. Change `--mark` (the highlighter accent), `--blue` and `--text` and the whole app changes. Replace `public/favicon.svg` and the SVG in `components/Logo.jsx` with your own mark.
4. **Write your own README intro** and add 3 screenshots plus a 20-second GIF of a call with captions and the notes page.
5. Commit early and often with meaningful messages (`feat: waiting room`, `fix: ...`). Your Git history is part of your portfolio.

## 2. Feature tour: where it is, how it works, what to try

### WebRTC engine (`frontend/src/hooks/useMeeting.js`, `backend/src/socket/index.js`)
* Socket.IO is only the *signalling* channel: it passes offers, answers and ICE candidates between two specific people (`signal` event). The media then flows directly between browsers.
* **The newcomer offers, everyone else answers.** On `joined` the new person calls `callPeer(id)` for each existing peer. That removes the original project's bug where every peer connection was recreated each time someone joined.
* Each connection always has one audio and one video transceiver. Real tracks are attached with `replaceTrack`, so mute, camera off and screen share never renegotiate.
* STUN is always on; TURN is added from `/api/v1/config/ice` when you set `TURN_*` variables.
* **Try:** add a connection-quality indicator using `pc.getStats()`; add "reconnect" when `connectionState` becomes `failed` (`pc.restartIce()`).

### Live captions (`hooks/useSpeechCaptions.js`, `components/CaptionsBar.jsx`)
* Uses the browser's Web Speech API on *your own* microphone. Interim text is sent as `caption` events so everyone sees it live; **final** sentences are also saved to MongoDB as the transcript.
* The recognizer stops after silence, so `onend` restarts it while captions are on.
* Captions are opt-in per person (the CC button), which is also a privacy choice you can explain.
* **Try:** let people pick their *display* language and translate captions with the same AI API; add a "download captions as .srt" button on the notes page.

### AI notes (`backend/src/services/summary.service.js`)
* `buildPrompt` turns the transcript and chat into text (capped at 60k characters). `callClaude` sends it to the Anthropic Messages API with a system prompt that demands JSON only. The reply is parsed and validated with Zod, then stored on the meeting.
* If there is no API key, or the call fails, `fallbackSummary.js` (rule-based) is used, so the app always works. This is covered by unit tests.
* The key lives only on the server; the endpoint is rate limited (20 per hour per IP) and requires you to have been in the meeting.
* **Try (best resume upgrades):**
  * Add **note templates**: "Stand-up", "Study group", "Interview". Add a `template` field and change the system prompt per template.
  * Ask the model for a `followUpEmail` field and show a "Copy follow-up email" button.
  * Auto-generate notes when the host ends the meeting (call `generateSummary` inside `host:end`).
  * Add a search box across all your transcripts (MongoDB text index on `transcript.text`).
* Models: set `ANTHROPIC_MODEL` in `.env` (for example a smaller, cheaper model for demos).

### Raise hand and reactions
* `hand` and `reaction` socket events (server validates reactions against an allow-list). State is stored on the peer, so people who join later see who has a hand up.
* Reactions are floating emojis (`.float-emoji` CSS animation in `Room.jsx` + `global.css`).
* **Try:** a "hand queue" showing who raised first; sound for hand raise; custom reactions.

### Host controls and waiting room (`socket/index.js`, `components/SidePanel.jsx`)
* The host is the logged-in user who created the meeting. The server decides who is host from the JWT, never from the client.
* Waiting room: guests go into `room.waiting`; the host gets a `waiting-list` event and can admit or deny. Turning the waiting room off admits everyone.
* Remove blocks that browser (`clientId` kept in `localStorage`) from rejoining. Mute sends `force-mute`; the target's browser mutes itself.
* **Try:** "mute all", lock meeting, co-hosts, a meeting password.

### Recording (`hooks/useRecorder.js`)
* Records in your browser with `MediaRecorder`. You choose "This tab" in the browser dialog and tick **Share tab audio** so remote voices are included; your mic is mixed in with the Web Audio API. A file downloads when you stop.
* Everyone gets a "recording" notice and a red badge (consent).
* **Try:** upload recordings to cloud storage and attach them to the meeting.

## 3. What was fixed from the tutorial version

| Problem in the original | Now |
| --- | --- |
| Hard-coded DB credentials in source | `.env` + `.env.example`, `.gitignore` |
| "Join as guest" sent everyone to the same hard-coded room | Random room codes (`abc-defg-hij`), guests join by link |
| Camera permission requested on every render | Acquired once in `useLocalMedia` |
| Peer connections recreated for existing peers | Only the newcomer offers |
| Deprecated `addStream` / `onaddstream` | Transceivers + `ontrack` |
| Random-string token, sent in the URL | JWT in the `Authorization` header, expiring |
| No input validation, errors returned as 200 | Zod validation, proper status codes |
| Chat lost on restart | Chat and transcript saved in MongoDB |
| STUN only | TURN supported |
| Password logged to the console | Removed |
| CRA (deprecated) | Vite |

## 4. Interview questions you should be able to answer

1. **How does a WebRTC call start?** Offer/answer (SDP) exchanged over a signalling channel, then ICE candidates, then media flows peer to peer.
2. **Why do you need a TURN server?** STUN only discovers your public address; strict NATs and firewalls need a relay.
3. **Why a mesh, and when would you stop using it?** Simple, no media server; every person uploads N-1 streams, so it degrades past about 5 people. An SFU (LiveKit, mediasoup) forwards one upload to many.
4. **Why does only the newcomer send offers?** Avoids two sides offering at once (glare) and duplicate connections.
5. **How do you keep the API key safe?** Only the server calls the AI API; the browser never sees it. Endpoint is authenticated and rate limited.
6. **What if the AI returns invalid JSON or is down?** The reply is validated with Zod; on any failure the rule-based fallback runs.
7. **How are host actions secured?** The server derives the host from the JWT and checks `peer.isHost` on every `host:*` event.
8. **How would you scale to many servers?** Socket.IO Redis adapter, room state in Redis, sticky sessions, an SFU for media.
9. **What are the privacy trade-offs of captions and recording?** Opt-in captions, recording notices, Chrome sends speech audio to a cloud service, transcripts are visible only to participants.
10. **What would you improve next?** TypeScript, end-to-end tests (Playwright), an SFU, translated captions.

## 5. Resume bullets (use only what you have actually built and can explain)

> **Huddle: real-time video meetings with AI notes** | React, Node.js, WebRTC, Socket.IO, MongoDB, Docker
> * Built a multi-party WebRTC video app with screen share, waiting room, host controls (mute/remove/end), raise-hand, reactions and persistent chat.
> * Implemented live captions (Web Speech API) and a server-side AI pipeline that turns the transcript into a summary, decisions and owner-tagged action items, with a validated JSON schema and a rule-based fallback.
> * Hardened the backend with JWT auth, Zod validation, rate limiting, Helmet and CORS allow-listing; added unit tests and CI; deployed with Docker, MongoDB Atlas and a TURN server.

Add the live link and repo link under the title, and be ready to say "I started from a tutorial and rebuilt the architecture and added the AI and hosting features."

## 6. Suggested two-week plan

* **Days 1-2:** run it, rename and re-colour, deploy (Atlas + Render + Vercel), add a TURN server.
* **Days 3-5:** pick two upgrades from section 2 (templates + auto-notes on end are a great pair).
* **Days 6-8:** write 3 Playwright tests (login, create meeting, two-browser call) and a short architecture diagram in the README.
* **Days 9-10:** record the demo GIF, screenshots, and write the resume bullets.
* **Days 11-14:** practise explaining the questions above out loud, with the code open.

## 7. Honest limits

* The AI notes are only as good as the speech recognition. Say so in your demo and show the "check before sharing" label.
* Mesh calls are for small groups. Naming that limit (and the SFU upgrade path) in an interview scores better than ignoring it.
