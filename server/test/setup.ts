import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll } from 'vitest';

// Configure the environment before any app module (which validates env on import) loads.
const mongo = await MongoMemoryServer.create();
Object.assign(process.env, {
  NODE_ENV: 'test',
  MONGO_URI: mongo.getUri('careerlog-test'),
  JWT_SECRET: 'test-secret-that-is-long-enough',
  ALLOWED_EMAIL_DOMAIN: 'college.edu',
  SMTP_USER: '',
  SMTP_PASS: '',
  ADMIN_EMAIL: 'admin@college.edu',
  ADMIN_PASSWORD: 'Admin@12345',
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
