import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { DIFFICULTIES, EXPERIENCE_STATUSES, OFFER_TYPES, OVERALL_RESULTS, ROUND_RESULTS, ROUND_TYPES, TOPIC_IDS } from '@career-log/shared';

const questionSchema = new Schema({
  summary: { type: String, required: true, trim: true },
  topics: [{ type: String, enum: TOPIC_IDS, required: true }],
  difficulty: { type: String, enum: DIFFICULTIES },
  approach: { type: String, trim: true },
});

const roundSchema = new Schema({
  order: { type: Number, required: true },
  type: { type: String, enum: ROUND_TYPES, required: true },
  difficulty: { type: String, enum: DIFFICULTIES, required: true },
  durationMins: { type: Number },
  result: { type: String, enum: ROUND_RESULTS, required: true },
  description: { type: String, trim: true },
  questions: { type: [questionSchema], default: [] },
});

const reportSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true, trim: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const experienceSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    company: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    // Denormalised so lists and search don't need a join.
    companyName: { type: String, required: true },
    companySlug: { type: String, required: true },
    role: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    ctcRange: { type: String, trim: true },
    offerType: { type: String, enum: OFFER_TYPES, required: true },
    overallResult: { type: String, enum: OVERALL_RESULTS, required: true },
    isAnonymous: { type: Boolean, default: false },
    tips: { type: String, trim: true },
    rounds: { type: [roundSchema], default: [] },
    status: { type: String, enum: EXPERIENCE_STATUSES, default: 'pending', index: true },
    rejectionReason: { type: String },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    upvoteCount: { type: Number, default: 0 },
    reports: { type: [reportSchema], default: [] },
  },
  { timestamps: true },
);

experienceSchema.index({ status: 1, company: 1, year: -1 });
experienceSchema.index({ status: 1, createdAt: -1 });
experienceSchema.index({ status: 1, upvoteCount: -1 });
experienceSchema.index({ 'rounds.questions.topics': 1 });
experienceSchema.index({ 'rounds.type': 1 });
experienceSchema.index(
  {
    companyName: 'text',
    role: 'text',
    tips: 'text',
    'rounds.description': 'text',
    'rounds.questions.summary': 'text',
  },
  { name: 'experience_text', weights: { companyName: 10, role: 5 } },
);

export type ExperienceDoc = HydratedDocument<InferSchemaType<typeof experienceSchema>>;
export const Experience = model('Experience', experienceSchema);
