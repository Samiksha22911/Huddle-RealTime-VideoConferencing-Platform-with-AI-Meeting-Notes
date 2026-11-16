import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/user.model.js';
import { signToken } from '../middleware/auth.js';

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(50),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(100),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

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
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) return res.status(401).json({ message: 'Email or password is incorrect.' });
  res.json({ token: signToken(user), user: publicUser(user) });
}

export async function me(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(401).json({ message: 'Account no longer exists.' });
  res.json({ user: publicUser(user) });
}
