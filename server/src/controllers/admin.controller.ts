import type { Request, Response } from 'express';
import type { ModerationInput, Role, SeniorDecisionInput } from '@career-log/shared';
import { Experience } from '../models/Experience';
import { User } from '../models/User';
import { sendNotice } from '../services/mailer';
import { getViewer, serializeExperience } from '../services/serialize';
import { badRequest, notFound } from '../utils/httpError';
import { escapeRegex, toObjectId } from '../utils/misc';

const AUTHOR_FIELDS = 'name email branch gradYear';

export async function queue(req: Request, res: Response) {
  const status = req.query.status === 'rejected' ? 'rejected' : 'pending';
  const [items, viewer] = await Promise.all([
    Experience.find({ status }).sort({ createdAt: 1 }).populate('author', AUTHOR_FIELDS).lean(),
    getViewer(req),
  ]);
  res.json(items.map((e) => serializeExperience(e, viewer)));
}

export async function reported(req: Request, res: Response) {
  const [items, viewer] = await Promise.all([
    Experience.aggregate([
      { $match: { status: 'approved', 'reports.0': { $exists: true } } },
      { $addFields: { reportTotal: { $size: '$reports' } } },
      { $sort: { reportTotal: -1, updatedAt: -1 } },
    ]),
    getViewer(req),
  ]);
  await Experience.populate(items, { path: 'author', select: AUTHOR_FIELDS });
  res.json(items.map((e) => serializeExperience(e, viewer)));
}

export async function moderate(req: Request, res: Response) {
  const body = req.body as ModerationInput;
  const exp = await Experience.findById(toObjectId(req.params.id));
  if (!exp) throw notFound('Experience not found');

  const review = { reviewedBy: req.user!.id, reviewedAt: new Date() };
  switch (body.action) {
    case 'approve':
      exp.set({ status: 'approved', rejectionReason: undefined, ...review });
      break;
    case 'reject':
      if (exp.status === 'approved') throw badRequest('This post is live. Use unpublish instead.');
      exp.set({ status: 'rejected', rejectionReason: body.reason, ...review });
      break;
    case 'unpublish':
      exp.set({ status: 'rejected', rejectionReason: body.reason, reports: [], ...review });
      break;
    case 'dismiss-reports':
      exp.set({ reports: [] });
      break;
    case 'requeue':
      exp.set({ status: 'pending', rejectionReason: undefined, reviewedBy: undefined, reviewedAt: undefined });
      break;
  }
  await exp.save();
  if (body.action === 'approve' || body.action === 'reject' || body.action === 'unpublish') {
    void notifyAuthor(String(exp.author), exp.companyName, exp.role, String(exp._id), body);
  }
  res.json({ _id: exp._id, status: exp.status });
}

export async function listUsers(req: Request, res: Response) {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const filter = q
    ? { $or: [{ name: { $regex: escapeRegex(q), $options: 'i' } }, { email: { $regex: escapeRegex(q), $options: 'i' } }] }
    : {};
  const users = await User.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json(users);
}

export async function updateUserRole(req: Request, res: Response) {
  const { role } = req.body as { role: Role };
  if (req.params.id === req.user!.id) throw badRequest("You can't change your own role");
  const user = await User.findByIdAndUpdate(toObjectId(req.params.id), { role }, { new: true });
  if (!user) throw notFound('User not found');
  res.json(user);
}

async function notifyAuthor(authorId: string, company: string, role: string, expId: string, body: ModerationInput) {
  const author = await User.findById(authorId).select('name email').lean();
  if (!author) return;
  const what = `your ${company} (${role}) experience`;
  if (body.action === 'approve') {
    sendNotice(
      author.email,
      author.name,
      `Your ${company} experience is live`,
      [`Thanks for sharing! The placement cell approved ${what} and juniors can now read it.`],
      `/experiences/${expId}`,
    );
  } else if (body.action === 'reject' || body.action === 'unpublish') {
    sendNotice(
      author.email,
      author.name,
      `Changes requested on your ${company} experience`,
      [`The placement cell asked for changes to ${what}:`, `"${body.reason}"`, 'Edit and resubmit it from My posts.'],
      `/experiences/${expId}/edit`,
    );
  }
}

export async function seniorRequests(_req: Request, res: Response) {
  const users = await User.find({ 'seniorRequest.status': 'pending' }).sort({ 'seniorRequest.requestedAt': 1 });
  res.json(users);
}

export async function decideSeniorRequest(req: Request, res: Response) {
  const body = req.body as SeniorDecisionInput;
  const user = await User.findById(toObjectId(req.params.id));
  if (!user) throw notFound('User not found');
  if (user.seniorRequest?.status !== 'pending') throw badRequest('This request was already handled');

  user.seniorRequest.status = body.action === 'approve' ? 'approved' : 'denied';
  user.seniorRequest.decidedAt = new Date();
  if (body.action === 'approve') {
    if (user.role === 'junior') user.role = 'senior';
    user.seniorRequest.reason = undefined;
  } else {
    user.seniorRequest.reason = body.reason;
  }
  await user.save();

  if (body.action === 'approve') {
    sendNotice(
      user.email,
      user.name,
      'You can now share interview experiences',
      ['The placement cell approved your senior access. Juniors will thank you!'],
      '/submit',
    );
  } else {
    sendNotice(
      user.email,
      user.name,
      'About your senior access request',
      ['The placement cell could not approve your request this time:', `"${body.reason}"`, 'You can send a new request from Settings.'],
      '/settings',
    );
  }
  res.json(user);
}
