import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { User } from '../models/user.model.js';
import { signToken } from '../middleware/auth.js';
import { env } from '../config/env.js';

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(50),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(100),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

const googleClient = env.googleClientId ? new OAuth2Client(env.googleClientId) : null;
const googleSchema = z.object({ credential: z.string().min(20, 'Missing Google credential.') });

const publicUser = (u) => ({ id: String(u._id), name: u.name, email: u.email });

export async function register(req, res) {
  const { name, email, password } = registerSchema.parse(req.body);
  if (await User.exists({ email })) {
    return res.status(409).json({ message: 'An account with this email already exists. Sign in instead.' });
  }
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}

export async function login(req, res) {
  const { email, password } = loginSchema.parse(req.body);
  const user = await User.findOne({ email });
  if (user && !user.passwordHash) {
    return res.status(400).json({ message: 'This account uses Google sign-in. Click "Continue with Google" instead.' });
  }
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) return res.status(401).json({ message: 'Email or password is incorrect.' });
  res.json({ token: signToken(user), user: publicUser(user) });
}

export async function me(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(401).json({ message: 'Account no longer exists.' });
  res.json({ user: publicUser(user) });
}

/**
 * "Continue with Google". The browser sends the ID token Google gave it; we NEVER trust it blindly:
 * verifyIdToken checks the signature, expiry and that it was issued for OUR client id (audience).
 */
export async function googleLogin(req, res) {
  if (!googleClient) return res.status(501).json({ message: 'Google sign-in is not set up on this server.' });
  const { credential } = googleSchema.parse(req.body);

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: env.googleClientId });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ message: 'Google sign-in could not be verified. Please try again.' });
  }
  if (!payload?.email || !payload.email_verified) {
    return res.status(401).json({ message: 'Your Google email address is not verified.' });
  }

  const email = payload.email.toLowerCase();
  const find = async () => (await User.findOne({ googleId: payload.sub })) || (await User.findOne({ email }));
  let user = await find();
  if (!user) {
    try {
      user = await User.create({ name: (payload.name || email.split('@')[0]).slice(0, 50), email, googleId: payload.sub });
    } catch (err) {
      if (err.code !== 11000) throw err; // two sign-ins at once: the other one created it
      user = await find();
    }
  } else if (!user.googleId) {
    // Same verified email as an existing password account: link them instead of duplicating.
    user.googleId = payload.sub;
    await user.save();
  }
  res.json({ token: signToken(user), user: publicUser(user) });
}
