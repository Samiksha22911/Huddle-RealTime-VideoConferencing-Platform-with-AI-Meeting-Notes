# Deploy Huddle (free): GitHub + MongoDB Atlas + Render + Vercel

Order matters because each service needs the URL of another. Total time: about 45 minutes.

## 0. Before you start
* A GitHub account and Git installed (`git --version`).
* Your MongoDB Atlas cluster from local setup. **Create a new database user for production** (Database Access > Add New Database User, role *Read and write to any database*) with a new letters-and-digits password, so your local password is never reused online.
* Network Access in Atlas must allow `0.0.0.0/0` (Render's IPs change).

## 1. Put the code on GitHub
```
cd C:\Users\intel\Desktop\huddle
git init
git add .
git status
```
Check the list: you must NOT see any file named `.env` (only `.env.example`). Then:
```
git commit -m "feat: Huddle video meetings with captions, notes and AI summaries"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/huddle.git
git push -u origin main
```
(Create the empty repo `huddle` on github.com first, without a README.)

## 2. Backend on Render
1. render.com > sign in with GitHub > **New** > **Blueprint** > choose the repo. It reads `render.yaml`.
   (Manual alternative: New > Web Service, Root Directory `backend`, Build `npm install`, Start `npm start`.)
2. Fill the values it asks for:
   * `MONGO_URI`: the Atlas string for the production user, ending `.mongodb.net/huddle?retryWrites=true&w=majority`
   * `CLIENT_ORIGIN`: put `http://localhost:5173` for now (you will change it in step 4)
   * leave the optional ones empty for now
3. Deploy. When it is live, open `https://YOUR-SERVICE.onrender.com/health`. You should see `{"ok":true}`. Copy this base URL.

## 3. Frontend on Vercel
1. vercel.com > **Add New** > **Project** > import the repo.
2. **Root Directory:** `frontend`. Framework: Vite (auto-detected).
3. **Environment Variables:**
   * `VITE_SERVER_URL` = your Render URL (no trailing slash)
   * `VITE_GOOGLE_CLIENT_ID` = your Google Client ID (optional)
4. Deploy and copy the Vercel URL (for example `https://huddle-abc.vercel.app`).

## 4. Connect them
Render > your service > **Environment** > set `CLIENT_ORIGIN` to the exact Vercel URL (no trailing slash; several allowed, comma separated). Save: Render redeploys.

## 5. Google sign-in (optional)
In Google Cloud > Credentials > your OAuth client > **Authorized JavaScript origins**, add the Vercel URL. In Render set `GOOGLE_CLIENT_ID`. On the OAuth consent screen click **Publish app** so any Google account can sign in.

## 6. TURN server (strongly recommended)
Without TURN, calls fail for many people on mobile data or college Wi-Fi.
1. Sign up at metered.ca (free tier) and create a TURN credential.
2. In Render set `TURN_URLS` (comma separated URLs from the dashboard), `TURN_USERNAME`, `TURN_CREDENTIAL`.

## 7. AI notes (optional)
Set `ANTHROPIC_API_KEY` in Render. Without it the app still produces simpler rule-based notes.

## 8. Test checklist (do all of these on the live site)
- [ ] Register, sign out, sign in. (Google button works if configured.)
- [ ] Start a meeting; the code appears in the lobby; QR code shows.
- [ ] Join from a phone **on mobile data** (not your Wi-Fi) using the QR code. Both sides see and hear each other.
- [ ] Third person joins: everyone sees everyone.
- [ ] Turn on CC in Chrome, speak: captions appear for the others; Transcript panel fills; click a line to save it.
- [ ] Leave: notes page shows the saved line; Generate notes works.
- [ ] Schedule a meeting for later; it appears under Upcoming; Add to calendar opens Google Calendar.
- [ ] Waiting room, mute, remove, end for everyone.

## 9. Troubleshooting
| Symptom | Cause and fix |
| --- | --- |
| First page load or login is slow (30-60 s) | Render's free plan sleeps after 15 minutes idle. The site pings the API on load to wake it. Open the site a minute before a demo. |
| Browser console shows a CORS error | `CLIENT_ORIGIN` on Render does not exactly match the Vercel URL (check https, no trailing slash). |
| Video works on the same Wi-Fi but not across networks | TURN is not configured (step 6). |
| Camera does not start | The page must be https (Vercel is) and the browser must have camera permission. |
| Google says `origin_mismatch` | Add the exact site URL to Authorized JavaScript origins (step 5). |
| Google says the app is blocked / access denied | OAuth consent screen is in Testing: add your Gmail as a test user or publish the app. |
| Refreshing a page gives 404 | Make sure the frontend Root Directory is `frontend` so `vercel.json` is used. |
| Meeting vanished after a while | Free servers restart; room state lives in memory (chat, transcript and notes stay in MongoDB). Fine for demos. |

## 10. After deploying
Put the live link and the GitHub link on your resume, add 3 screenshots and a short GIF to the README, and keep the repo public.
