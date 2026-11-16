import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/error.js';
import { env } from './config/env.js';

export const corsOptions = {
  origin(origin, cb) {
    // allow same-origin / curl (no Origin header) and the configured frontends
    if (!origin || env.clientOrigins.includes(origin)) return cb(null, true);
    cb(null, false);
  },
};

export function createApp() {
  const app = express();
  app.set('trust proxy', 1); // correct client IPs behind Render/Railway proxies
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '50kb' }));

  app.get('/health', (req, res) => res.json({ ok: true }));
  app.use('/api/v1', routes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
