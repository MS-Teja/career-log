import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(5050),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required (see server/.env.example)'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ALLOWED_EMAIL_DOMAIN: z.string().default(''),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  console.error('Copy server/.env.example to server/.env and fill it in.');
  process.exit(1);
}

export const env = parsed.data;

export const allowedDomains = env.ALLOWED_EMAIL_DOMAIN.split(',')
  .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
  .filter(Boolean);

export function isAllowedEmail(email: string) {
  if (allowedDomains.length === 0) return true;
  const domain = email.split('@')[1]?.toLowerCase();
  return !!domain && allowedDomains.includes(domain);
}
