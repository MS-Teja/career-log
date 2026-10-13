export const ROLES = ['junior', 'senior', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const ROUND_TYPES = ['online-assessment', 'coding', 'technical', 'system-design', 'managerial', 'hr', 'group-discussion'] as const;
export type RoundType = (typeof ROUND_TYPES)[number];

export const ROUND_TYPE_LABELS: Record<RoundType, string> = {
  'online-assessment': 'Online assessment',
  coding: 'Coding interview',
  technical: 'Technical interview',
  'system-design': 'System design',
  managerial: 'Managerial',
  hr: 'HR',
  'group-discussion': 'Group discussion',
};

/** Round types that count towards topic analytics. */
export const TECHNICAL_ROUND_TYPES: RoundType[] = ['online-assessment', 'coding', 'technical', 'system-design'];

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const ROUND_RESULTS = ['cleared', 'not-cleared', 'awaiting'] as const;
export type RoundResult = (typeof ROUND_RESULTS)[number];

export const OVERALL_RESULTS = ['selected', 'rejected', 'waitlisted', 'awaiting'] as const;
export type OverallResult = (typeof OVERALL_RESULTS)[number];

export const OFFER_TYPES = ['full-time', 'internship', 'internship-ppo'] as const;
export type OfferType = (typeof OFFER_TYPES)[number];

export const OFFER_TYPE_LABELS: Record<OfferType, string> = {
  'full-time': 'Full-time',
  internship: 'Internship',
  'internship-ppo': 'Internship + PPO',
};

export const EXPERIENCE_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ExperienceStatus = (typeof EXPERIENCE_STATUSES)[number];

/** Reports at or above this count flag a post for admin review. */
export const REPORT_FLAG_THRESHOLD = 3;
