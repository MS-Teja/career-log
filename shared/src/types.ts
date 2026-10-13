import type { Difficulty, ExperienceStatus, OfferType, OverallResult, Role, RoundResult, RoundType } from './enums';
import type { TopicId } from './topics';

/** Shapes returned by the API (JSON). */

export type SeniorRequestStatus = 'none' | 'pending' | 'approved' | 'denied';

export interface PublicUser {
  _id: string;
  name: string;
  email: string;
  role: Role;
  branch?: string;
  gradYear?: number;
  isVerified: boolean;
  seniorRequest?: { status: SeniorRequestStatus; note?: string; reason?: string; requestedAt?: string; decidedAt?: string };
  createdAt: string;
}

export interface Company {
  _id: string;
  name: string;
  slug: string;
  aliases: string[];
  website?: string;
  verified: boolean;
  experienceCount?: number;
}

export interface Question {
  _id?: string;
  summary: string;
  topics: TopicId[];
  difficulty?: Difficulty;
  approach?: string;
}

export interface Round {
  _id?: string;
  order: number;
  type: RoundType;
  difficulty: Difficulty;
  durationMins?: number;
  result: RoundResult;
  description?: string;
  questions: Question[];
}

export interface Experience {
  _id: string;
  author?: { _id: string; name: string; branch?: string; gradYear?: number };
  company: string;
  companyName: string;
  companySlug: string;
  role: string;
  year: number;
  ctcRange?: string;
  offerType: OfferType;
  overallResult: OverallResult;
  isAnonymous: boolean;
  tips?: string;
  rounds: Round[];
  status: ExperienceStatus;
  rejectionReason?: string;
  upvoteCount: number;
  hasUpvoted: boolean;
  isBookmarked: boolean;
  isOwner: boolean;
  reportCount?: number;
  reports?: { user: string; reason: string; at: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

export interface Facets {
  years: number[];
  roles: string[];
}

/** One question from the question bank, flattened out of its experience. */
export interface QuestionItem {
  _id: string;
  experienceId: string;
  companyName: string;
  companySlug: string;
  role: string;
  year: number;
  roundType: RoundType;
  roundOrder: number;
  roundDifficulty: Difficulty;
  summary: string;
  approach?: string;
  difficulty?: Difficulty;
  topics: TopicId[];
}

export interface TopicStat {
  topic: TopicId;
  rounds: number;
  questions: number;
  share: number; // 0..1 of technical rounds
}

export interface CompanyAnalytics {
  company: Company;
  experiences: number;
  avgRounds: number;
  selectionRate: number | null;
  decided: number;
  selected: number;
  technicalRounds: number;
  topics: TopicStat[];
  commonSequences: { sequence: RoundType[]; count: number }[];
  results: { result: OverallResult; count: number }[];
  byYear: { year: number; count: number; selected: number }[];
  difficulty: { type: RoundType; easy: number; medium: number; hard: number }[];
  roles: string[];
}

export interface OverviewStats {
  experiences: number;
  companies: number;
  contributors: number;
  topTopics: TopicStat[];
  topCompanies: Company[];
}

export interface PrepTopic {
  topic: TopicId;
  /** Average share across the chosen companies (0..1). */
  weight: number;
  perCompany: Record<string, number>;
  questions: number;
  done: boolean;
}

export interface PrepPlan {
  companies: Company[];
  done: TopicId[];
  topics: PrepTopic[];
}

export interface Badges {
  changesRequested: number;
  reviewQueue?: number;
  seniorRequests?: number;
  reported?: number;
}
