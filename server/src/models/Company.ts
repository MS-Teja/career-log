import { Schema, model } from 'mongoose';

export function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-');
}

const companySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, unique: true },
    aliases: [{ type: String, trim: true, lowercase: true }],
    website: { type: String, trim: true },
    // Companies added by seniors from the submission form wait for an admin to verify or merge them.
    verified: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

companySchema.index({ aliases: 1 });

export const Company = model('Company', companySchema);
