import type { FilterQuery, Types } from 'mongoose';
import {
  TECHNICAL_ROUND_TYPES,
  type CompanyAnalytics,
  type OverallResult,
  type RoundType,
  type TopicId,
  type TopicStat,
} from '@career-log/shared';
import { Experience } from '../models/Experience';

type Match = FilterQuery<typeof Experience>;

/**
 * For every technical round, collect the set of topics asked in it, then count
 * in how many rounds each topic appeared. "share" is the fraction of technical
 * rounds that touched the topic, e.g. DP appeared in 0.7 of Amazon's coding rounds.
 */
export async function topicStats(match: Match, limit?: number): Promise<{ total: number; topics: TopicStat[] }> {
  const [res] = await Experience.aggregate<{
    total: { n: number }[];
    rounds: { _id: TopicId; rounds: number }[];
    questions: { _id: TopicId; questions: number }[];
  }>([
    { $match: match },
    { $unwind: '$rounds' },
    { $match: { 'rounds.type': { $in: TECHNICAL_ROUND_TYPES } } },
    {
      $project: {
        roundTopics: {
          $reduce: {
            input: '$rounds.questions',
            initialValue: [],
            in: { $setUnion: ['$$value', '$$this.topics'] },
          },
        },
        questionTopics: {
          $reduce: {
            input: '$rounds.questions',
            initialValue: [],
            in: { $concatArrays: ['$$value', '$$this.topics'] },
          },
        },
      },
    },
    {
      $facet: {
        total: [{ $count: 'n' }],
        rounds: [{ $unwind: '$roundTopics' }, { $group: { _id: '$roundTopics', rounds: { $sum: 1 } } }],
        questions: [{ $unwind: '$questionTopics' }, { $group: { _id: '$questionTopics', questions: { $sum: 1 } } }],
      },
    },
  ]);

  const total = res?.total[0]?.n ?? 0;
  const questionCounts = new Map(res?.questions.map((q) => [q._id, q.questions]));
  const topics = (res?.rounds ?? [])
    .map((r) => ({
      topic: r._id,
      rounds: r.rounds,
      questions: questionCounts.get(r._id) ?? 0,
      share: total ? r.rounds / total : 0,
    }))
    .sort((a, b) => b.rounds - a.rounds || b.questions - a.questions);

  return { total, topics: limit ? topics.slice(0, limit) : topics };
}

export async function companyAnalytics(company: {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  aliases: string[];
  website?: string | null;
  verified?: boolean | null;
}): Promise<CompanyAnalytics> {
  const match: Match = { company: company._id, status: 'approved' };

  const [topicRes, [summary], sequences, results, byYear, difficulty] = await Promise.all([
    topicStats(match),
    Experience.aggregate<{ experiences: number; avgRounds: number; roles: string[] }>([
      { $match: match },
      {
        $group: {
          _id: null,
          experiences: { $sum: 1 },
          avgRounds: { $avg: { $size: '$rounds' } },
          roles: { $addToSet: '$role' },
        },
      },
    ]),
    Experience.aggregate<{ _id: RoundType[]; count: number }>([
      { $match: match },
      { $group: { _id: '$rounds.type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 },
    ]),
    Experience.aggregate<{ _id: OverallResult; count: number }>([
      { $match: match },
      { $group: { _id: '$overallResult', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Experience.aggregate<{ _id: number; count: number; selected: number }>([
      { $match: match },
      {
        $group: {
          _id: '$year',
          count: { $sum: 1 },
          selected: { $sum: { $cond: [{ $eq: ['$overallResult', 'selected'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Experience.aggregate<{ _id: RoundType; easy: number; medium: number; hard: number }>([
      { $match: match },
      { $unwind: '$rounds' },
      {
        $group: {
          _id: '$rounds.type',
          easy: { $sum: { $cond: [{ $eq: ['$rounds.difficulty', 'easy'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$rounds.difficulty', 'medium'] }, 1, 0] } },
          hard: { $sum: { $cond: [{ $eq: ['$rounds.difficulty', 'hard'] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const decided = results.filter((r) => r._id === 'selected' || r._id === 'rejected');
  const decidedTotal = decided.reduce((s, r) => s + r.count, 0);
  const selected = results.find((r) => r._id === 'selected')?.count ?? 0;

  return {
    company: {
      _id: String(company._id),
      name: company.name,
      slug: company.slug,
      aliases: company.aliases,
      website: company.website ?? undefined,
      verified: company.verified ?? true,
    },
    experiences: summary?.experiences ?? 0,
    avgRounds: summary ? Math.round(summary.avgRounds * 10) / 10 : 0,
    selectionRate: decidedTotal ? selected / decidedTotal : null,
    decided: decidedTotal,
    selected,
    technicalRounds: topicRes.total,
    topics: topicRes.topics,
    commonSequences: sequences.map((s) => ({ sequence: s._id, count: s.count })),
    results: results.map((r) => ({ result: r._id, count: r.count })),
    byYear: byYear.map((y) => ({ year: y._id, count: y.count, selected: y.selected })),
    difficulty: difficulty.map((d) => ({ type: d._id, easy: d.easy, medium: d.medium, hard: d.hard })),
    roles: (summary?.roles ?? []).sort(),
  };
}
