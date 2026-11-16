import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import { createServer } from 'node:http';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { attachSocket } from './socket/index.js';
import { env } from './config/env.js';

async function start() {
  await mongoose.connect(env.mongoUri);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);

  const server = createServer(createApp());
  attachSocket(server);

  server.listen(env.port, () => {
    console.log(`Huddle server listening on :${env.port}`);
    console.log(env.anthropicKey ? 'AI notes: enabled' : 'AI notes: basic mode (set ANTHROPIC_API_KEY to enable AI)');
  });

  const shutdown = () => server.close(() => mongoose.disconnect().then(() => process.exit(0)));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
