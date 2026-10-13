import type { PipelineStage } from 'mongoose';
import type { ListQuestionsQuery, Paginated, QuestionItem } from '@career-log/shared';
import { Experience } from '../models/Experience';
import { escapeRegex } from '../utils/misc';

/** Flattens approved experiences into one row per question, newest first. */
export async function questionBank(q: ListQuestionsQuery): Promise<Paginated<QuestionItem>> {
  const match: Record<string, unknown> = { status: 'approved' };
  if (q.company) match.companySlug = q.company;
  if (q.year) match.year = q.year;
  if (q.topic) match['rounds.questions.topics'] = q.topic;
  if (q.roundType) match['rounds.type'] = q.roundType;

  const rowMatch: Record<string, unknown> = {};
  if (q.topic) rowMatch['question.topics'] = q.topic;
  if (q.roundType) rowMatch['round.type'] = q.roundType;
  if (q.q) {
    const rx = { $regex: escapeRegex(q.q), $options: 'i' };
    rowMatch.$or = [{ 'question.summary': rx }, { 'question.approach': rx }, { companyName: rx }];
  }

  const pipeline: PipelineStage[] = [
    { $match: match },
    { $project: { companyName: 1, companySlug: 1, role: 1, year: 1, createdAt: 1, round: '$rounds' } },
    { $unwind: '$round' },
    { $project: { companyName: 1, companySlug: 1, role: 1, year: 1, createdAt: 1, round: 1, question: '$round.questions' } },
    { $unwind: '$question' },
    { $match: rowMatch },
    { $sort: { year: -1, createdAt: -1, 'round.order': 1 } },
    {
      $facet: {
        total: [{ $count: 'n' }],
        items: [
          { $skip: (q.page - 1) * q.limit },
          { $limit: q.limit },
          {
            $project: {
              _id: '$question._id',
              experienceId: '$_id',
              companyName: 1,
              companySlug: 1,
              role: 1,
              year: 1,
              roundType: '$round.type',
              roundOrder: '$round.order',
              roundDifficulty: '$round.difficulty',
              summary: '$question.summary',
              approach: '$question.approach',
              difficulty: '$question.difficulty',
              topics: '$question.topics',
            },
          },
        ],
      },
    },
  ];

  const [res] = await Experience.aggregate<{ total: { n: number }[]; items: QuestionItem[] }>(pipeline);
  const total = res?.total[0]?.n ?? 0;
  return { items: res?.items ?? [], total, page: q.page, pages: Math.max(1, Math.ceil(total / q.limit)) };
}
