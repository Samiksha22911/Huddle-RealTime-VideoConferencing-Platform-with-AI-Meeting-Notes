import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.JWT_SECRET) {
  console.error('JWT_SECRET must be set in production.');
  process.exit(1);
}

const list = (value) =>
  (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const env = {
  isProd,
  port: Number(process.env.PORT) || 8000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/huddle',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  clientOrigins: list(process.env.CLIENT_ORIGIN || 'http://localhost:5173'),
  dnsServers: list(process.env.DNS_SERVERS),
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  geminiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  anthropicKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
  aiEnabled: !!(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY),
  turnUrls: list(process.env.TURN_URLS),
  turnUsername: process.env.TURN_USERNAME || '',
  turnCredential: process.env.TURN_CREDENTIAL || '',
};
