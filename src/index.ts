import { createApp } from './app.js';
import { env } from './config/env.js';

export function createServer() {
  const app = createApp();
  const server = app.listen(env.port, () => {
    if (process.env.NODE_ENV !== 'test') {
      console.log(`API listening on http://localhost:${env.port}`);
    }
  });
  return server;
}

if (process.env.NODE_ENV !== 'test' && process.env.AUTO_START === 'true') {
  createServer();
}


