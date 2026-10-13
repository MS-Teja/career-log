import { z } from 'zod';
import { DIFFICULTIES, OFFER_TYPES, OVERALL_RESULTS, ROUND_RESULTS, ROUND_TYPES } from './enums';
import { TOPIC_IDS } from './topics';

const currentYear = new Date().getFullYear();

const password = z.string().min(8, 'At least 8 characters').max(72);
const email = z.string().trim().toLowerCase().email('Enter a valid email');
const otpCode = z.string().regex(/^\d{6}$/, 'Enter the 6-digit code');
const gradYear = z
  .number({ invalid_type_error: 'Enter your graduation year' })
  .int('Enter a whole year')
  .min(2000, 'Enter a valid year')
  .max(currentYear + 6, 'Enter a valid year');

// Auth

/** Everyone joins as a junior; seniors request access and an admin approves it. */
export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(80),
  email,
  password,
  branch: z.string().trim().min(2, 'Enter your branch').max(60),
  gradYear,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const emailSchema = z.object({ email });

export const verifyOtpSchema = z.object({ email, code: otpCode });
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const resetPasswordSchema = z.object({ email, code: otpCode, password });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// Account

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(80),
  branch: z.string().trim().min(2, 'Enter your branch').max(60),
  gradYear,
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: password,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const deleteAccountSchema = z.object({ password: z.string().min(1, 'Enter your password') });

export const seniorRequestSchema = z.object({
  note: z.string().trim().min(10, 'Tell the placement cell where you were placed or interviewed').max(500),
});
export type SeniorRequestInput = z.infer<typeof seniorRequestSchema>;

export const seniorDecisionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve') }),
  z.object({ action: z.literal('deny'), reason: z.string().trim().min(3).max(300) }),
]);
export type SeniorDecisionInput = z.infer<typeof seniorDecisionSchema>;

// Experiences

export const questionSchema = z.object({
  summary: z.string().trim().min(5, 'Describe the question in a few words').max(1000),
  topics: z.array(z.enum(TOPIC_IDS)).min(1, 'Pick at least one topic').max(6, 'Pick up to 6 topics'),
  difficulty: z.enum(DIFFICULTIES).optional(),
  approach: z.string().trim().max(2000).optional(),
});
export type QuestionInput = z.infer<typeof questionSchema>;

export const roundSchema = z.object({
  type: z.enum(ROUND_TYPES, { errorMap: () => ({ message: 'Pick a round type' }) }),
  difficulty: z.enum(DIFFICULTIES, { errorMap: () => ({ message: 'How hard was it?' }) }),
  durationMins: z
    .number({ invalid_type_error: 'Enter minutes as a number' })
    .int()
    .min(0)
    .max(600, 'That is more than 10 hours')
    .optional(),
  result: z.enum(ROUND_RESULTS, { errorMap: () => ({ message: 'Did you clear it?' }) }),
  description: z.string().trim().max(3000).optional(),
  questions: z.array(questionSchema).max(20),
});
export type RoundInput = z.infer<typeof roundSchema>;

export const experienceSchema = z.object({
  companyId: z.string().regex(/^[a-f\d]{24}$/i, 'Pick a company'),
  role: z.string().trim().min(2, 'Enter the role').max(80),
  year: z
    .number({ invalid_type_error: 'Enter the year of the interview' })
    .int()
    .min(2010, 'Enter a year after 2010')
    .max(currentYear + 1, 'That year is in the future'),
  ctcRange: z.string().trim().max(40).optional(),
  offerType: z.enum(OFFER_TYPES),
  overallResult: z.enum(OVERALL_RESULTS),
  isAnonymous: z.boolean(),
  tips: z.string().trim().max(3000).optional(),
  rounds: z.array(roundSchema).min(1, 'Add at least one round').max(10),
});
export type ExperienceInput = z.infer<typeof experienceSchema>;

/** Updates carry the version the author started from, so concurrent edits are detected. */
export const experienceUpdateSchema = experienceSchema.extend({
  expectedUpdatedAt: z.string().optional(),
});
export type ExperienceUpdateInput = z.infer<typeof experienceUpdateSchema>;

export const listExperiencesQuerySchema = z.object({
  company: z.string().trim().optional(),
  role: z.string().trim().max(80).optional(),
  year: z.coerce.number().int().optional(),
  roundType: z.enum(ROUND_TYPES).optional(),
  topic: z.enum(TOPIC_IDS).optional(),
  result: z.enum(OVERALL_RESULTS).optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['recent', 'top']).default('recent'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
export type ListExperiencesQuery = z.infer<typeof listExperiencesQuerySchema>;

export const listQuestionsQuerySchema = z.object({
  company: z.string().trim().optional(),
  topic: z.enum(TOPIC_IDS).optional(),
  roundType: z.enum(ROUND_TYPES).optional(),
  year: z.coerce.number().int().optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListQuestionsQuery = z.infer<typeof listQuestionsQuerySchema>;

export const reportSchema = z.object({
  reason: z.string().trim().min(5, 'Tell us what is wrong').max(500),
});

export const moderationSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve') }),
  z.object({ action: z.literal('reject'), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal('unpublish'), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal('dismiss-reports') }),
  // Undo an approval: back into the review queue.
  z.object({ action: z.literal('requeue') }),
]);
export type ModerationInput = z.infer<typeof moderationSchema>;

// Companies

export const companySchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(80),
  aliases: z.array(z.string().trim().min(1).max(80)).max(10).optional(),
  website: z.string().trim().url('Enter a full URL').optional().or(z.literal('')),
  verified: z.boolean().optional(),
});
export type CompanyInput = z.infer<typeof companySchema>;

export const mergeCompanySchema = z.object({
  intoId: z.string().regex(/^[a-f\d]{24}$/i, 'Pick a company'),
});

export const roleUpdateSchema = z.object({
  role: z.enum(['junior', 'senior', 'admin']),
});

// Prep plan

export const MAX_PREP_COMPANIES = 5;
export const prepPlanSchema = z.object({
  companies: z.array(z.string().trim().min(1)).max(MAX_PREP_COMPANIES, `Pick up to ${MAX_PREP_COMPANIES} companies`),
  done: z.array(z.enum(TOPIC_IDS)),
});
export type PrepPlanInput = z.infer<typeof prepPlanSchema>;
