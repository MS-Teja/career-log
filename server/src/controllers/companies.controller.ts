import type { Request, Response } from 'express';
import type { CompanyInput } from '@career-log/shared';
import { Company, slugify } from '../models/Company';
import { Experience } from '../models/Experience';
import { User } from '../models/User';
import { companyAnalytics, topicStats } from '../services/analytics';
import { badRequest, conflict, notFound } from '../utils/httpError';
import { toObjectId } from '../utils/misc';

async function approvedCounts() {
  const rows = await Experience.aggregate<{ _id: unknown; n: number }>([
    { $match: { status: 'approved' } },
    { $group: { _id: '$company', n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.n]));
}

export async function listCompanies(_req: Request, res: Response) {
  const [companies, counts] = await Promise.all([Company.find().sort({ name: 1 }).lean(), approvedCounts()]);
  res.json(companies.map((c) => ({ ...c, verified: c.verified ?? true, experienceCount: counts.get(String(c._id)) ?? 0 })));
}

export async function getCompanyAnalytics(req: Request, res: Response) {
  const company = await Company.findOne({ slug: String(req.params.slug) }).lean();
  if (!company) throw notFound('Company not found');
  res.json(await companyAnalytics(company));
}

export async function overview(_req: Request, res: Response) {
  const match = { status: 'approved' } as const;
  const [experiences, contributors, topics, companies, counts] = await Promise.all([
    Experience.countDocuments(match),
    Experience.distinct('author', match).then((a) => a.length),
    topicStats(match, 10),
    Company.find().lean(),
    approvedCounts(),
  ]);
  const topCompanies = companies
    .map((c) => ({ ...c, verified: c.verified ?? true, experienceCount: counts.get(String(c._id)) ?? 0 }))
    .filter((c) => c.experienceCount > 0)
    .sort((a, b) => b.experienceCount - a.experienceCount)
    .slice(0, 8);
  res.json({
    experiences,
    companies: counts.size,
    contributors,
    topTopics: topics.topics,
    topCompanies,
  });
}

/** Finds a company by name, slug or alias so "Amazon India" doesn't become a second Amazon. */
async function findExisting(name: string) {
  const slug = slugify(name);
  return Company.findOne({ $or: [{ slug }, { aliases: name.toLowerCase() }] });
}

/** Seniors can add a missing company from the submission form; duplicates resolve to the existing one. */
export async function createCompany(req: Request, res: Response) {
  const body = req.body as CompanyInput;
  const existing = await findExisting(body.name);
  if (existing) {
    res.status(200).json(existing);
    return;
  }
  const slug = slugify(body.name);
  if (!slug) throw badRequest('Enter a valid company name');
  const isAdmin = req.user!.role === 'admin';
  const company = await Company.create({
    name: body.name,
    slug,
    aliases: body.aliases ?? [],
    website: body.website || undefined,
    // Seniors can use a new company right away; an admin verifies or merges it later.
    verified: isAdmin ? (body.verified ?? true) : false,
    createdBy: req.user!.id,
  });
  res.status(201).json(company);
}

export async function updateCompany(req: Request, res: Response) {
  const body = req.body as CompanyInput;
  const company = await Company.findById(toObjectId(req.params.id));
  if (!company) throw notFound('Company not found');
  const slug = slugify(body.name);
  company.set({
    name: body.name,
    slug,
    aliases: body.aliases ?? [],
    website: body.website || undefined,
    verified: body.verified ?? company.verified,
  });
  await company.save();
  // Keep the denormalised copies in sync.
  await Experience.updateMany({ company: company._id }, { companyName: company.name, companySlug: slug });
  res.json(company);
}

/** Folds a duplicate company into another: moves its experiences and keeps its name as an alias. */
export async function mergeCompany(req: Request, res: Response) {
  const from = await Company.findById(toObjectId(req.params.id));
  const into = await Company.findById(toObjectId((req.body as { intoId: string }).intoId));
  if (!from || !into) throw notFound('Company not found');
  if (from._id.equals(into._id)) throw badRequest('Pick a different company to merge into');

  const moved = await Experience.updateMany({ company: from._id }, { company: into._id, companyName: into.name, companySlug: into.slug });
  const aliases = new Set([...into.aliases, ...from.aliases, from.name.toLowerCase()]);
  aliases.delete(into.name.toLowerCase());
  into.aliases = [...aliases];
  await into.save();
  await from.deleteOne();
  res.json({ company: into, moved: moved.modifiedCount });
}

export async function deleteCompany(req: Request, res: Response) {
  const id = toObjectId(req.params.id);
  const used = await Experience.countDocuments({ company: id });
  if (used > 0) throw conflict(`This company has ${used} experience(s). Reassign or delete them first.`);
  const deleted = await Company.findByIdAndDelete(id);
  if (!deleted) throw notFound('Company not found');
  res.status(204).end();
}

export async function adminStats(_req: Request, res: Response) {
  const [pending, approved, rejected, flagged, users] = await Promise.all([
    Experience.countDocuments({ status: 'pending' }),
    Experience.countDocuments({ status: 'approved' }),
    Experience.countDocuments({ status: 'rejected' }),
    Experience.countDocuments({ 'reports.0': { $exists: true }, status: 'approved' }),
    User.countDocuments({ isVerified: true }),
  ]);
  res.json({ pending, approved, rejected, flagged, users });
}
