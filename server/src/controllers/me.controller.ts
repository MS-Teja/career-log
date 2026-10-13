import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import type { ChangePasswordInput, PrepPlanInput, ProfileInput, SeniorRequestInput, TopicId } from '@career-log/shared';
import { Experience } from '../models/Experience';
import { User } from '../models/User';
import { buildPrepPlan } from '../services/prep';
import { getViewer, serializeExperience } from '../services/serialize';
import { badRequest, conflict, notFound, unauthorized } from '../utils/httpError';
import { toObjectId } from '../utils/misc';

export async function myExperiences(req: Request, res: Response) {
  const [items, viewer] = await Promise.all([
    Experience.find({ author: req.user!.id }).select('-reports').sort({ updatedAt: -1 }).populate('author', 'name branch gradYear').lean(),
    getViewer(req),
  ]);
  res.json(items.map((e) => serializeExperience(e, viewer)));
}

export async function listBookmarks(req: Request, res: Response) {
  const viewer = await getViewer(req);
  const items = await Experience.find({ _id: { $in: [...viewer!.bookmarks] }, status: 'approved' })
    .select('-reports')
    .sort({ year: -1 })
    .populate('author', 'name branch gradYear')
    .lean();
  res.json(items.map((e) => serializeExperience(e, viewer)));
}

export async function addBookmark(req: Request, res: Response) {
  const id = toObjectId(req.params.id);
  if (!(await Experience.exists({ _id: id, status: 'approved' }))) throw notFound('Experience not found');
  await User.updateOne({ _id: req.user!.id }, { $addToSet: { bookmarks: id } });
  res.json({ bookmarked: true });
}

export async function removeBookmark(req: Request, res: Response) {
  await User.updateOne({ _id: req.user!.id }, { $pull: { bookmarks: toObjectId(req.params.id) } });
  res.json({ bookmarked: false });
}

export async function updateProfile(req: Request, res: Response) {
  const body = req.body as ProfileInput;
  const user = await User.findByIdAndUpdate(req.user!.id, body, { new: true });
  if (!user) throw notFound();
  res.json({ user });
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body as ChangePasswordInput;
  const user = await User.findById(req.user!.id).select('+passwordHash');
  if (!user) throw notFound();
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) throw badRequest('Your current password is incorrect');
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ message: 'Password updated' });
}

/**
 * Deletes the account. Published posts stay (juniors rely on them) but become anonymous;
 * drafts in review are removed.
 */
export async function deleteAccount(req: Request, res: Response) {
  const user = await User.findById(req.user!.id).select('+passwordHash');
  if (!user) throw notFound();
  if (!(await bcrypt.compare((req.body as { password: string }).password, user.passwordHash))) {
    throw unauthorized('Incorrect password');
  }
  if (user.role === 'admin' && (await User.countDocuments({ role: 'admin' })) === 1) {
    throw conflict('You are the only admin. Promote someone else before deleting your account.');
  }
  await Promise.all([
    Experience.updateMany({ author: user._id, status: 'approved' }, { isAnonymous: true }),
    Experience.deleteMany({ author: user._id, status: { $ne: 'approved' } }),
  ]);
  await user.deleteOne();
  res.status(204).end();
}

export async function requestSenior(req: Request, res: Response) {
  const { note } = req.body as SeniorRequestInput;
  const user = await User.findById(req.user!.id);
  if (!user) throw notFound();
  if (user.role !== 'junior') throw conflict('You can already share experiences');
  if (user.seniorRequest?.status === 'pending') throw conflict('Your request is already with the placement cell');
  user.seniorRequest = { status: 'pending', note, requestedAt: new Date() };
  await user.save();
  res.json({ user });
}

export async function badges(req: Request, res: Response) {
  const isAdmin = req.user!.role === 'admin';
  const [changesRequested, reviewQueue, seniorRequests, reported] = await Promise.all([
    Experience.countDocuments({ author: req.user!.id, status: 'rejected' }),
    isAdmin ? Experience.countDocuments({ status: 'pending' }) : undefined,
    isAdmin ? User.countDocuments({ 'seniorRequest.status': 'pending' }) : undefined,
    isAdmin ? Experience.countDocuments({ status: 'approved', 'reports.0': { $exists: true } }) : undefined,
  ]);
  res.json({ changesRequested, reviewQueue, seniorRequests, reported });
}

export async function getPrep(req: Request, res: Response) {
  const user = await User.findById(req.user!.id).select('prepPlan').lean();
  const plan = user?.prepPlan;
  res.json(await buildPrepPlan(plan?.companies ?? [], (plan?.done ?? []) as TopicId[]));
}

export async function savePrep(req: Request, res: Response) {
  const { companies, done } = req.body as PrepPlanInput;
  const unique = [...new Set(companies)];
  await User.updateOne({ _id: req.user!.id }, { prepPlan: { companies: unique, done: [...new Set(done)] } });
  res.json(await buildPrepPlan(unique, done));
}
