import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  changePasswordSchema,
  companySchema,
  deleteAccountSchema,
  emailSchema,
  experienceSchema,
  experienceUpdateSchema,
  loginSchema,
  mergeCompanySchema,
  moderationSchema,
  prepPlanSchema,
  profileSchema,
  registerSchema,
  reportSchema,
  resetPasswordSchema,
  roleUpdateSchema,
  seniorDecisionSchema,
  seniorRequestSchema,
  verifyOtpSchema,
} from '@career-log/shared';
import { env } from '../config/env';
import * as admin from '../controllers/admin.controller';
import * as auth from '../controllers/auth.controller';
import * as companies from '../controllers/companies.controller';
import * as experiences from '../controllers/experiences.controller';
import * as me from '../controllers/me.controller';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

export const api = Router();

const limiter = (limit: number, message: string) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => env.NODE_ENV === 'test',
    message: { message },
  });
const authLimiter = limiter(30, 'Too many attempts. Try again in a few minutes.');
const writeLimiter = limiter(120, 'You are doing that a lot. Take a short break and try again.');

api.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// Auth
api.get('/auth/config', auth.config);
api.post('/auth/register', authLimiter, validateBody(registerSchema), auth.register);
api.post('/auth/verify-otp', authLimiter, validateBody(verifyOtpSchema), auth.verifyOtp);
api.post('/auth/resend-otp', authLimiter, validateBody(emailSchema), auth.resendOtp);
api.post('/auth/login', authLimiter, validateBody(loginSchema), auth.login);
api.post('/auth/forgot', authLimiter, validateBody(emailSchema), auth.forgotPassword);
api.post('/auth/reset', authLimiter, validateBody(resetPasswordSchema), auth.resetPassword);
api.get('/auth/me', requireAuth, auth.me);

// Experiences
api.get('/experiences', optionalAuth, experiences.listExperiences);
api.get('/experiences/facets', experiences.facets);
api.get('/experiences/:id', optionalAuth, experiences.getExperience);
api.post(
  '/experiences',
  requireAuth,
  requireRole('senior', 'admin'),
  writeLimiter,
  validateBody(experienceSchema),
  experiences.createExperience,
);
api.put('/experiences/:id', requireAuth, writeLimiter, validateBody(experienceUpdateSchema), experiences.updateExperience);
api.delete('/experiences/:id', requireAuth, experiences.deleteExperience);
api.post('/experiences/:id/upvote', requireAuth, writeLimiter, experiences.toggleUpvote);
api.post('/experiences/:id/report', requireAuth, writeLimiter, validateBody(reportSchema), experiences.reportExperience);

// Question bank & comparison
api.get('/questions', experiences.listQuestions);
api.get('/compare', experiences.compare);

// Current user
api.get('/me/experiences', requireAuth, me.myExperiences);
api.get('/me/bookmarks', requireAuth, me.listBookmarks);
api.post('/me/bookmarks/:id', requireAuth, me.addBookmark);
api.delete('/me/bookmarks/:id', requireAuth, me.removeBookmark);
api.get('/me/badges', requireAuth, me.badges);
api.patch('/me', requireAuth, validateBody(profileSchema), me.updateProfile);
api.post('/me/password', requireAuth, authLimiter, validateBody(changePasswordSchema), me.changePassword);
api.post('/me/delete', requireAuth, authLimiter, validateBody(deleteAccountSchema), me.deleteAccount);
api.post('/me/senior-request', requireAuth, writeLimiter, validateBody(seniorRequestSchema), me.requestSenior);
api.get('/me/prep', requireAuth, me.getPrep);
api.put('/me/prep', requireAuth, validateBody(prepPlanSchema), me.savePrep);

// Companies & analytics
api.get('/companies', companies.listCompanies);
api.post('/companies', requireAuth, requireRole('senior', 'admin'), writeLimiter, validateBody(companySchema), companies.createCompany);
api.get('/companies/:slug/analytics', companies.getCompanyAnalytics);
api.get('/analytics/overview', companies.overview);

// Admin
const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('admin'));
adminRouter.get('/stats', companies.adminStats);
adminRouter.get('/queue', admin.queue);
adminRouter.get('/reports', admin.reported);
adminRouter.patch('/experiences/:id', validateBody(moderationSchema), admin.moderate);
adminRouter.post('/companies', validateBody(companySchema), companies.createCompany);
adminRouter.put('/companies/:id', validateBody(companySchema), companies.updateCompany);
adminRouter.post('/companies/:id/merge', validateBody(mergeCompanySchema), companies.mergeCompany);
adminRouter.delete('/companies/:id', companies.deleteCompany);
adminRouter.get('/users', admin.listUsers);
adminRouter.patch('/users/:id/role', validateBody(roleUpdateSchema), admin.updateUserRole);
adminRouter.get('/senior-requests', admin.seniorRequests);
adminRouter.patch('/users/:id/senior-request', validateBody(seniorDecisionSchema), admin.decideSeniorRequest);
api.use('/admin', adminRouter);
