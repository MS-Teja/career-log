import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { api } from './routes';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: env.CLIENT_URL.split(',').map((s) => s.trim()) }));
  app.use(express.json({ limit: '200kb' }));

  app.use('/api', api);
  app.use('/api', notFoundHandler);

  // In production, serve the built React app from the same origin.
  const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (env.NODE_ENV === 'production' && fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('/{*splat}', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
