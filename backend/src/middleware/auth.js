import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const signToken = (user) =>
  jwt.sign({ name: user.name }, env.jwtSecret, { subject: String(user._id), expiresIn: '7d' });

/** Returns { id, name } or null. Used by both HTTP and Socket.IO. */
export function verifyToken(token) {
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    return { id: payload.sub, name: payload.name };
  } catch {
    return null;
  }
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const user = token && verifyToken(token);
  if (!user) return res.status(401).json({ message: 'Please sign in to continue.' });
  req.user = user;
  next();
}
