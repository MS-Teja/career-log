import { connectDb } from './config/db';
import { env } from './config/env';
import { createApp } from './app';

await connectDb();
createApp().listen(env.PORT, () => {
  console.log(`[api] listening on http://localhost:${env.PORT}`);
});
