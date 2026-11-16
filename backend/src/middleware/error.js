import { ZodError } from 'zod';

export const notFound = (req, res) => res.status(404).json({ message: 'Route not found.' });

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ message: err.issues.map((i) => i.message).join(' ') });
  }
  console.error(err);
  res.status(err.status || 500).json({ message: err.status ? err.message : 'Something went wrong on our side.' });
}

// Lets controllers be async without try/catch everywhere.
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
