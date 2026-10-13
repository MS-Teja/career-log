import type { Request, Response } from 'express';
import type { FilterQuery } from 'mongoose';
import { listExperiencesQuerySchema, listQuestionsQuerySchema, type ExperienceInput, type ExperienceUpdateInput } from '@career-log/shared';
import { Company } from '../models/Company';
import { Experience } from '../models/Experience';
import { User } from '../models/User';
import { companyAnalytics } from '../services/analytics';
import { questionBank } from '../services/questions';
import { getViewer, serializeExperience } from '../services/serialize';
import { HttpError, badRequest, conflict, forbidden, notFound } from '../utils/httpError';
import { escapeRegex, toObjectId } from '../utils/misc';

const AUTHOR_FIELDS = 'name branch gradYear';

export async function listExperiences(req: Request, res: Response) {
  const q = listExperiencesQuerySchema.parse(req.query);
  const filter: FilterQuery<typeof Experience> = { status: 'approved' };

  if (q.company) filter.companySlug = q.company;
  if (q.role) filter.role = { $regex: escapeRegex(q.role), $options: 'i' };
  if (q.year) filter.year = q.year;
  if (q.result) filter.overallResult = q.result;
  if (q.roundType && q.topic) {
    // Topic asked *in* a round of this type.
    filter.rounds = { $elemMatch: { type: q.roundType, 'questions.topics': q.topic } };
  } else {
    if (q.roundType) filter['rounds.type'] = q.roundType;
    if (q.topic) filter['rounds.questions.topics'] = q.topic;
  }
  if (q.q) Object.assign(filter, await searchFilter(filter, q.q));

  const sort: Record<string, 1 | -1> = q.sort === 'top' ? { upvoteCount: -1, createdAt: -1 } : { year: -1, createdAt: -1 };

  const [items, total, viewer] = await Promise.all([
    Experience.find(filter)
      .select('-reports')
      .sort(sort)
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate('author', AUTHOR_FIELDS)
      .lean(),
    Experience.countDocuments(filter),
    getViewer(req),
  ]);

  res.json({
    items: items.map((e) => serializeExperience(e, viewer)),
    total,
    page: q.page,
    pages: Math.max(1, Math.ceil(total / q.limit)),
  });
}

/**
 * Full-text search matches whole words ("amazon", not "amaz"). If it finds nothing, or the
 * query is too short to be a word, fall back to a substring match on the main fields.
 */
async function searchFilter(base: FilterQuery<typeof Experience>, text: string): Promise<FilterQuery<typeof Experience>> {
  if (text.length >= 4) {
    const textFilter = { $text: { $search: text } };
    if ((await Experience.countDocuments({ ...base, ...textFilter })) > 0) return textFilter;
  }
  const rx = { $regex: escapeRegex(text), $options: 'i' };
  return { $or: [{ companyName: rx }, { role: rx }, { 'rounds.questions.summary': rx }, { tips: rx }] };
}

export async function facets(_req: Request, res: Response) {
  const [years, roles] = await Promise.all([
    Experience.distinct('year', { status: 'approved' }),
    Experience.distinct('role', { status: 'approved' }),
  ]);
  res.json({ years: (years as number[]).sort((a, b) => b - a), roles: (roles as string[]).sort() });
}

export async function listQuestions(req: Request, res: Response) {
  res.json(await questionBank(listQuestionsQuerySchema.parse(req.query)));
}

export async function compare(req: Request, res: Response) {
  const slugs = String(req.query.c ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
  if (slugs.length === 0) throw badRequest('Pick at least one company');
  const companies = await Company.find({ slug: { $in: slugs } }).lean();
  companies.sort((a, b) => slugs.indexOf(a.slug) - slugs.indexOf(b.slug));
  res.json(await Promise.all(companies.map((c) => companyAnalytics(c))));
}

export async function getExperience(req: Request, res: Response) {
  const exp = await Experience.findById(toObjectId(req.params.id)).populate('author', AUTHOR_FIELDS).lean();
  if (!exp) throw notFound('Experience not found');
  const viewer = await getViewer(req);
  const isOwner = viewer?.id === String(exp.author?._id);
  if (exp.status !== 'approved' && !isOwner && viewer?.role !== 'admin') throw notFound('Experience not found');
  res.json(serializeExperience(exp, viewer));
}

async function buildFields(body: ExperienceInput | ExperienceUpdateInput) {
  const company = await Company.findById(body.companyId).lean();
  if (!company) throw badRequest('Pick a company from the list');
  const { companyId: _companyId, ...rest } = body;
  if ('expectedUpdatedAt' in rest) delete rest.expectedUpdatedAt;
  return {
    ...rest,
    company: company._id,
    companyName: company.name,
    companySlug: company.slug,
    rounds: body.rounds.map((r, i) => ({ ...r, order: i + 1 })),
  };
}

export async function createExperience(req: Request, res: Response) {
  const fields = await buildFields(req.body as ExperienceInput);
  const exp = await Experience.create({ ...fields, author: req.user!.id, status: 'pending' });
  res.status(201).json(serializeExperience(exp.toObject(), await getViewer(req)));
}

export async function updateExperience(req: Request, res: Response) {
  const exp = await Experience.findById(toObjectId(req.params.id));
  if (!exp) throw notFound('Experience not found');
  if (String(exp.author) !== req.user!.id) throw forbidden('You can only edit your own posts');
  if (exp.status === 'approved') {
    throw conflict('Published posts are locked. Ask an admin to unpublish it if something needs fixing.');
  }
  const body = req.body as ExperienceUpdateInput;
  if (body.expectedUpdatedAt && new Date(body.expectedUpdatedAt).getTime() !== exp.updatedAt.getTime()) {
    throw new HttpError(409, 'This post was changed somewhere else (another tab?). Reload to see the latest version.', 'EDIT_CONFLICT');
  }
  const fields = await buildFields(body);
  exp.set({ ...fields, status: 'pending', rejectionReason: undefined, reviewedBy: undefined, reviewedAt: undefined });
  await exp.save();
  res.json(serializeExperience(exp.toObject(), await getViewer(req)));
}

export async function deleteExperience(req: Request, res: Response) {
  const exp = await Experience.findById(toObjectId(req.params.id));
  if (!exp) throw notFound('Experience not found');
  if (String(exp.author) !== req.user!.id && req.user!.role !== 'admin') throw forbidden();
  await exp.deleteOne();
  await User.updateMany({ bookmarks: exp._id }, { $pull: { bookmarks: exp._id } });
  res.status(204).end();
}

export async function toggleUpvote(req: Request, res: Response) {
  const id = toObjectId(req.params.id);
  const uid = toObjectId(req.user!.id);
  // Two atomic attempts: add if absent, otherwise remove.
  let exp = await Experience.findOneAndUpdate(
    { _id: id, status: 'approved', upvotes: { $ne: uid } },
    { $addToSet: { upvotes: uid }, $inc: { upvoteCount: 1 } },
    { new: true, projection: 'upvoteCount' },
  );
  let upvoted = true;
  if (!exp) {
    exp = await Experience.findOneAndUpdate(
      { _id: id, status: 'approved', upvotes: uid },
      { $pull: { upvotes: uid }, $inc: { upvoteCount: -1 } },
      { new: true, projection: 'upvoteCount' },
    );
    upvoted = false;
  }
  if (!exp) throw notFound('Experience not found');
  res.json({ upvoted, upvoteCount: exp.upvoteCount });
}

export async function reportExperience(req: Request, res: Response) {
  const id = toObjectId(req.params.id);
  const uid = toObjectId(req.user!.id);
  const result = await Experience.updateOne(
    { _id: id, status: 'approved', 'reports.user': { $ne: uid } },
    { $push: { reports: { user: uid, reason: (req.body as { reason: string }).reason } } },
  );
  if (result.matchedCount === 0) {
    const exists = await Experience.exists({ _id: id, status: 'approved' });
    if (!exists) throw notFound('Experience not found');
    throw conflict('You have already reported this post');
  }
  res.status(201).json({ message: 'Thanks, an admin will review it' });
}
