/**
 * Seeds demo data: an admin, a few seniors and juniors, companies and sample experiences.
 *   npm run seed            → only runs on an empty database
 *   npm run seed -- --reset → wipes users, companies, experiences and OTPs first
 */
import mongoose from 'mongoose';
import { connectDb } from '../config/db';
import { seedDatabase } from '../services/seedData';

async function main() {
  await connectDb();
  const result = await seedDatabase({ reset: process.argv.includes('--reset') });
  if (!result) {
    console.log('[seed] database already has data. Run `npm run seed -- --reset` to wipe and reseed.');
    return;
  }
  console.log(`[seed] ${result.companies} companies, ${result.experiences} experiences`);
  console.log('[seed] accounts:');
  console.log(`  admin   ${result.accounts.admin.email} / ${result.accounts.admin.password}`);
  console.log(`  senior  ${result.accounts.senior.email} / ${result.accounts.senior.password}  (also rahul@, sneha@, karthik@, meera@)`);
  console.log(`  junior  ${result.accounts.junior.email} / ${result.accounts.junior.password}  (priya@ has a pending senior request)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
