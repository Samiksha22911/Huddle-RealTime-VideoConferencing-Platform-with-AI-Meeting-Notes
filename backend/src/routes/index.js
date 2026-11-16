import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import { wrap } from '../middleware/error.js';
import { login, me, register } from '../controllers/auth.controller.js';
import {
  createMeeting,
  createSummary,
  deleteMeeting,
  getDetails,
  getPublicInfo,
  listMeetings,
} from '../controllers/meetings.controller.js';
import { env } from '../config/env.js';

const router = Router();

const limiter = (windowMs, limit) => rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false });
const authLimiter = limiter(15 * 60 * 1000, 30);
const summaryLimiter = limiter(60 * 60 * 1000, 20); // protects your AI credits

// auth
router.post('/auth/register', authLimiter, wrap(register));
router.post('/auth/login', authLimiter, wrap(login));
router.get('/auth/me', requireAuth, wrap(me));

// meetings
router.post('/meetings', requireAuth, wrap(createMeeting));
router.get('/meetings', requireAuth, wrap(listMeetings));
router.get('/meetings/:roomId', wrap(getPublicInfo));
router.get('/meetings/:roomId/details', requireAuth, wrap(getDetails));
router.post('/meetings/:roomId/summary', requireAuth, summaryLimiter, wrap(createSummary));
router.delete('/meetings/:roomId', requireAuth, wrap(deleteMeeting));

// WebRTC ICE servers (STUN always, TURN when configured)
router.get('/config/ice', (req, res) => {
  const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
  if (env.turnUrls.length) {
    iceServers.push({ urls: env.turnUrls, username: env.turnUsername, credential: env.turnCredential });
  }
  res.json({ iceServers });
});

export default router;
