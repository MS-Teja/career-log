import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { ROLES, TOPIC_IDS } from '@career-log/shared';

const seniorRequestSchema = new Schema(
  {
    status: { type: String, enum: ['none', 'pending', 'approved', 'denied'], default: 'none' },
    note: { type: String, trim: true },
    reason: { type: String, trim: true },
    requestedAt: { type: Date },
    decidedAt: { type: Date },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'junior', required: true },
    branch: { type: String, trim: true },
    gradYear: { type: Number },
    isVerified: { type: Boolean, default: false },
    seniorRequest: { type: seniorRequestSchema, default: () => ({ status: 'none' }) },
    bookmarks: [{ type: Schema.Types.ObjectId, ref: 'Experience' }],
    prepPlan: {
      companies: [{ type: String }],
      done: [{ type: String, enum: TOPIC_IDS }],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.passwordHash;
        delete ret.bookmarks;
        delete ret.prepPlan;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Accounts that never verified their email are removed after a day.
userSchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60, partialFilterExpression: { isVerified: false } });
userSchema.index({ 'seniorRequest.status': 1 });

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;
export const User = model('User', userSchema);
