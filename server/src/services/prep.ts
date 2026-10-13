import type { PrepPlan, PrepTopic, TopicId } from '@career-log/shared';
import { Company } from '../models/Company';
import { topicStats } from './analytics';

/**
 * Ranks topics for the chosen companies. Each topic's weight is its average share of
 * technical rounds across those companies (a company that never asked it counts as 0).
 */
export async function buildPrepPlan(slugs: string[], done: TopicId[]): Promise<PrepPlan> {
  const companies = await Company.find({ slug: { $in: slugs } }).lean();
  // Keep the user's chosen order.
  companies.sort((a, b) => slugs.indexOf(a.slug) - slugs.indexOf(b.slug));

  const stats = await Promise.all(companies.map((c) => topicStats({ company: c._id, status: 'approved' })));
  const byTopic = new Map<TopicId, PrepTopic>();
  companies.forEach((c, i) => {
    for (const t of stats[i]!.topics) {
      const row = byTopic.get(t.topic) ?? { topic: t.topic, weight: 0, perCompany: {}, questions: 0, done: false };
      row.perCompany[c.slug] = t.share;
      row.questions += t.questions;
      byTopic.set(t.topic, row);
    }
  });

  const doneSet = new Set(done);
  const topics = [...byTopic.values()]
    .map((t) => ({
      ...t,
      weight: Object.values(t.perCompany).reduce((s, v) => s + v, 0) / Math.max(1, companies.length),
      done: doneSet.has(t.topic),
    }))
    .sort((a, b) => b.weight - a.weight || b.questions - a.questions);

  return {
    companies: companies.map((c) => ({
      _id: String(c._id),
      name: c.name,
      slug: c.slug,
      aliases: c.aliases,
      website: c.website ?? undefined,
      verified: c.verified ?? true,
    })),
    done,
    topics,
  };
}
