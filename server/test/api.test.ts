import mongoose from 'mongoose';
import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';

// Capture OTP codes instead of emailing them.
const sentCodes = new Map<string, string>();
vi.mock('../src/services/mailer', () => ({
  sendOtpEmail: vi.fn(async (to: string, _name: string, code: string) => {
    sentCodes.set(to, code);
  }),
  sendNotice: vi.fn(),
}));

const { createApp } = await import('../src/app');
const { seedDatabase } = await import('../src/services/seedData');
const { Otp } = await import('../src/models/Otp');

const app = createApp();
const api = request(app);

async function login(email: string, password: string) {
  const res = await api.post('/api/auth/login').send({ email, password });
  expect(res.status, res.body.message).toBe(200);
  return res.body.token as string;
}
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

let admin: string, senior: string, junior: string;
let amazonId: string;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI!);
  await seedDatabase({ reset: true });
  [admin, senior, junior] = await Promise.all([
    login('admin@college.edu', 'Admin@12345'),
    login('ananya@college.edu', 'Senior@12345'),
    login('junior@college.edu', 'Junior@12345'),
  ]);
  const companies = (await api.get('/api/companies')).body as { _id: string; slug: string }[];
  amazonId = companies.find((c) => c.slug === 'amazon')!._id;
});

const sampleExperience = () => ({
  companyId: amazonId,
  role: 'SDE-1',
  year: 2025,
  offerType: 'full-time',
  overallResult: 'selected',
  isAnonymous: true,
  rounds: [
    {
      type: 'coding',
      difficulty: 'hard',
      result: 'cleared',
      questions: [{ summary: 'Edit distance between two strings', topics: ['dp', 'strings'] }],
    },
  ],
});

describe('auth', () => {
  it('rejects emails outside the college domain', async () => {
    const res = await api
      .post('/api/auth/register')
      .send({ name: 'Out Sider', email: 'x@gmail.com', password: 'Password1', branch: 'CSE', gradYear: 2027 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('DOMAIN_NOT_ALLOWED');
  });

  it('registers as a junior, blocks login until verified, then verifies with the OTP once', async () => {
    const email = 'newbie@college.edu';
    const reg = await api
      .post('/api/auth/register')
      .send({ name: 'New Junior', email, password: 'Password1', branch: 'CSE', gradYear: 2027 });
    expect(reg.status).toBe(201);

    const blocked = await api.post('/api/auth/login').send({ email, password: 'Password1' });
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('UNVERIFIED');

    const wrong = await api.post('/api/auth/verify-otp').send({ email, code: '000000' === sentCodes.get(email) ? '111111' : '000000' });
    expect(wrong.status).toBe(400);

    const ok = await api.post('/api/auth/verify-otp').send({ email, code: sentCodes.get(email) });
    expect(ok.status).toBe(200);
    expect(ok.body.user.role).toBe('junior');
    expect(ok.body.user).not.toHaveProperty('passwordHash');

    const reuse = await api.post('/api/auth/verify-otp').send({ email, code: sentCodes.get(email) });
    expect(reuse.status).toBe(400);
  });

  it('ignores a role sent at registration', async () => {
    const email = 'sneaky@college.edu';
    await api
      .post('/api/auth/register')
      .send({ name: 'Sneaky', email, password: 'Password1', branch: 'CSE', gradYear: 2025, role: 'admin' });
    const ok = await api.post('/api/auth/verify-otp').send({ email, code: sentCodes.get(email) });
    expect(ok.body.user.role).toBe('junior');
  });

  it('resets a forgotten password with an emailed code', async () => {
    const email = 'karthik@college.edu';
    await Otp.deleteMany({ email });
    const forgot = await api.post('/api/auth/forgot').send({ email });
    expect(forgot.status).toBe(200);
    const unknown = await api.post('/api/auth/forgot').send({ email: 'nobody@college.edu' });
    expect(unknown.status).toBe(200);
    expect(unknown.body.message).toBe(forgot.body.message);

    const reset = await api.post('/api/auth/reset').send({ email, code: sentCodes.get(email), password: 'NewPassword1' });
    expect(reset.status).toBe(200);
    expect(reset.body.token).toBeTruthy();
    await login(email, 'NewPassword1');
  });
});

describe('roles and senior access', () => {
  it('stops juniors from submitting', async () => {
    const res = await api.post('/api/experiences').set(bearer(junior)).send(sampleExperience());
    expect(res.status).toBe(403);
  });

  it('lets a junior request senior access and an admin approve it', async () => {
    const req = await api.post('/api/me/senior-request').set(bearer(junior)).send({ note: 'Placed at Zoho in the 2025 drive' });
    expect(req.status).toBe(200);
    expect(req.body.user.seniorRequest.status).toBe('pending');

    const dup = await api.post('/api/me/senior-request').set(bearer(junior)).send({ note: 'Placed at Zoho in the 2025 drive' });
    expect(dup.status).toBe(409);

    const list = await api.get('/api/admin/senior-requests').set(bearer(admin));
    const target = list.body.find((u: { email: string }) => u.email === 'junior@college.edu');
    expect(target).toBeTruthy();
    expect(list.body.some((u: { email: string }) => u.email === 'priya@college.edu')).toBe(true);

    const decided = await api.patch(`/api/admin/users/${target._id}/senior-request`).set(bearer(admin)).send({ action: 'approve' });
    expect(decided.body.role).toBe('senior');

    // Role is read from the DB on each request, so the existing token now works.
    const create = await api.post('/api/experiences').set(bearer(junior)).send(sampleExperience());
    expect(create.status).toBe(201);
  });
});

describe('experience lifecycle', () => {
  let id: string;

  it('validates and creates pending posts', async () => {
    const bad = await api
      .post('/api/experiences')
      .set(bearer(senior))
      .send({ ...sampleExperience(), rounds: [] });
    expect(bad.status).toBe(400);
    expect(bad.body.message).toBe('Add at least one round');

    const nanYear = await api
      .post('/api/experiences')
      .set(bearer(senior))
      .send({ ...sampleExperience(), year: null });
    expect(nanYear.body.message).toBe('Enter the year of the interview');

    const res = await api.post('/api/experiences').set(bearer(senior)).send(sampleExperience());
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending');
    id = res.body._id;
  });

  it('hides pending posts from juniors and browse, shows them to admins', async () => {
    expect((await api.get(`/api/experiences/${id}`).set(bearer(junior))).status).toBe(404);
    const list = await api.get('/api/experiences?limit=50');
    expect(list.body.items.some((e: { _id: string }) => e._id === id)).toBe(false);
    const queue = await api.get('/api/admin/queue').set(bearer(admin));
    expect(queue.body.some((e: { _id: string }) => e._id === id)).toBe(true);
    expect((await api.get('/api/admin/queue').set(bearer(senior))).status).toBe(403);
  });

  it('detects conflicting edits', async () => {
    const current = (await api.get(`/api/experiences/${id}`).set(bearer(senior))).body;
    const first = await api
      .put(`/api/experiences/${id}`)
      .set(bearer(senior))
      .send({ ...sampleExperience(), role: 'SDE-2', expectedUpdatedAt: current.updatedAt });
    expect(first.status).toBe(200);
    const stale = await api
      .put(`/api/experiences/${id}`)
      .set(bearer(senior))
      .send({ ...sampleExperience(), expectedUpdatedAt: current.updatedAt });
    expect(stale.status).toBe(409);
    expect(stale.body.code).toBe('EDIT_CONFLICT');
  });

  it('approves, supports undo (requeue), and locks published posts', async () => {
    let r = await api.patch(`/api/admin/experiences/${id}`).set(bearer(admin)).send({ action: 'approve' });
    expect(r.body.status).toBe('approved');
    r = await api.patch(`/api/admin/experiences/${id}`).set(bearer(admin)).send({ action: 'requeue' });
    expect(r.body.status).toBe('pending');
    await api.patch(`/api/admin/experiences/${id}`).set(bearer(admin)).send({ action: 'approve' });
    expect((await api.put(`/api/experiences/${id}`).set(bearer(senior)).send(sampleExperience())).status).toBe(409);
  });

  it('hides the author of anonymous posts from everyone but admins and the author', async () => {
    expect((await api.get(`/api/experiences/${id}`).set(bearer(junior))).body).not.toHaveProperty('author');
    expect((await api.get(`/api/experiences/${id}`)).body).not.toHaveProperty('author');
    expect((await api.get(`/api/experiences/${id}`).set(bearer(admin))).body.author.name).toBe('Ananya Rao');
  });

  it('toggles upvotes and bookmarks, and counts change-request badges', async () => {
    let r = await api.post(`/api/experiences/${id}/upvote`).set(bearer(junior));
    expect(r.body).toEqual({ upvoted: true, upvoteCount: 1 });
    r = await api.post(`/api/experiences/${id}/upvote`).set(bearer(junior));
    expect(r.body).toEqual({ upvoted: false, upvoteCount: 0 });

    await api.post(`/api/me/bookmarks/${id}`).set(bearer(junior));
    const marks = await api.get('/api/me/bookmarks').set(bearer(junior));
    expect(marks.body.some((e: { _id: string; isBookmarked: boolean }) => e._id === id && e.isBookmarked)).toBe(true);

    const badges = await api.get('/api/me/badges').set(bearer(admin));
    expect(badges.body.reviewQueue).toBeGreaterThanOrEqual(1);
  });

  it('accepts one report per user and surfaces it to admins', async () => {
    expect(
      (await api.post(`/api/experiences/${id}/report`).set(bearer(junior)).send({ reason: 'Looks like a verbatim test question' })).status,
    ).toBe(201);
    expect((await api.post(`/api/experiences/${id}/report`).set(bearer(junior)).send({ reason: 'again again' })).status).toBe(409);
    const reports = await api.get('/api/admin/reports').set(bearer(admin));
    expect(reports.body.some((e: { _id: string; reportCount: number }) => e._id === id && e.reportCount === 1)).toBe(true);
  });
});

describe('browse, search and facets', () => {
  it('filters by company and topic', async () => {
    const byCompany = await api.get('/api/experiences?company=amazon');
    expect(byCompany.body.total).toBeGreaterThan(0);
    expect(byCompany.body.items.every((e: { companySlug: string }) => e.companySlug === 'amazon')).toBe(true);

    const byTopic = await api.get('/api/experiences?topic=dbms');
    expect(byTopic.body.total).toBeGreaterThan(0);
  });

  it('matches partial words as well as whole words', async () => {
    expect((await api.get('/api/experiences?q=matrix')).body.total).toBeGreaterThan(0);
    expect((await api.get('/api/experiences?q=Amaz')).body.total).toBeGreaterThan(0);
    expect((await api.get('/api/experiences?q=gol')).body.items[0].companyName).toBe('Goldman Sachs');
  });

  it('returns facets from real data', async () => {
    const res = await api.get('/api/experiences/facets');
    expect(res.body.years).toEqual([...res.body.years].sort((a: number, b: number) => b - a));
    expect(res.body.years).toContain(2024);
    expect(res.body.roles).toContain('SDE-1');
  });
});

describe('analytics, question bank, compare, prep plan', () => {
  it('computes topic share per technical round', async () => {
    const all = (await api.get('/api/experiences?company=amazon&limit=50')).body.items as {
      rounds: { type: string; questions: { topics: string[] }[] }[];
    }[];
    const tech = all.flatMap((e) => e.rounds).filter((r) => ['online-assessment', 'coding', 'technical', 'system-design'].includes(r.type));
    const dpRounds = tech.filter((r) => r.questions.some((q) => q.topics.includes('dp'))).length;

    const res = await api.get('/api/companies/amazon/analytics');
    expect(res.body.technicalRounds).toBe(tech.length);
    const dp = res.body.topics.find((t: { topic: string }) => t.topic === 'dp');
    expect(dp.share).toBeCloseTo(dpRounds / tech.length);
    expect(res.body.decided).toBeGreaterThanOrEqual(res.body.selected);
  });

  it('lists questions filtered by company, topic and round type', async () => {
    const res = await api.get('/api/questions?company=amazon&topic=dp&limit=100');
    expect(res.body.total).toBeGreaterThan(0);
    for (const q of res.body.items) {
      expect(q.companySlug).toBe('amazon');
      expect(q.topics).toContain('dp');
      expect(q.experienceId).toBeTruthy();
    }
    const hr = await api.get('/api/questions?roundType=hr&limit=100');
    expect(hr.body.items.every((q: { roundType: string }) => q.roundType === 'hr')).toBe(true);
    const search = await api.get('/api/questions?q=LRU');
    expect(search.body.items[0].summary).toMatch(/LRU/);
  });

  it('compares companies in the requested order', async () => {
    const res = await api.get('/api/compare?c=google,amazon');
    expect(res.body.map((c: { company: { slug: string } }) => c.company.slug)).toEqual(['google', 'amazon']);
  });

  it('builds and saves a prep plan ranked by average share', async () => {
    const res = await api
      .put('/api/me/prep')
      .set(bearer(junior))
      .send({ companies: ['amazon', 'microsoft'], done: ['dp'] });
    expect(res.status).toBe(200);
    expect(res.body.companies.map((c: { slug: string }) => c.slug)).toEqual(['amazon', 'microsoft']);
    const weights = res.body.topics.map((t: { weight: number }) => t.weight);
    expect(weights).toEqual([...weights].sort((a: number, b: number) => b - a));
    expect(res.body.topics.find((t: { topic: string }) => t.topic === 'dp').done).toBe(true);

    const again = await api.get('/api/me/prep').set(bearer(junior));
    expect(again.body.done).toEqual(['dp']);
  });
});

describe('companies', () => {
  it('resolves aliases to the existing company', async () => {
    const res = await api.post('/api/companies').set(bearer(senior)).send({ name: 'Amazon India' });
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe('amazon');
  });

  it('marks senior-created companies unverified and lets admins merge them', async () => {
    const created = await api.post('/api/companies').set(bearer(senior)).send({ name: 'Amzn Labs' });
    expect(created.status).toBe(201);
    expect(created.body.verified).toBe(false);

    const merged = await api.post(`/api/admin/companies/${created.body._id}/merge`).set(bearer(admin)).send({ intoId: amazonId });
    expect(merged.status).toBe(200);
    expect(merged.body.company.aliases).toContain('amzn labs');
  });
});

describe('account', () => {
  it('updates the profile and changes the password', async () => {
    const t = await login('meera@college.edu', 'Senior@12345');
    const prof = await api.patch('/api/me').set(bearer(t)).send({ name: 'Meera N', branch: 'CSE', gradYear: 2024 });
    expect(prof.body.user.name).toBe('Meera N');

    expect((await api.post('/api/me/password').set(bearer(t)).send({ currentPassword: 'wrong', newPassword: 'Another123' })).status).toBe(
      400,
    );
    expect(
      (await api.post('/api/me/password').set(bearer(t)).send({ currentPassword: 'Senior@12345', newPassword: 'Another123' })).status,
    ).toBe(200);
    await login('meera@college.edu', 'Another123');
  });

  it('deletes an account, keeping published posts anonymously', async () => {
    const t = await login('sneha@college.edu', 'Senior@12345');
    const mine = (await api.get('/api/me/experiences').set(bearer(t))).body as { _id: string; status: string }[];
    const published = mine.find((e) => e.status === 'approved')!;

    expect((await api.post('/api/me/delete').set(bearer(t)).send({ password: 'nope' })).status).toBe(401);
    expect((await api.post('/api/me/delete').set(bearer(t)).send({ password: 'Senior@12345' })).status).toBe(204);

    const after = await api.get(`/api/experiences/${published._id}`);
    expect(after.status).toBe(200);
    expect(after.body.isAnonymous).toBe(true);
    expect((await api.get('/api/auth/me').set(bearer(t))).status).toBe(401);
  });
});
