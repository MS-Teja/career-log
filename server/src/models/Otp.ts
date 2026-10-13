import { Schema, model } from 'mongoose';

const otpSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, index: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    // TTL index: MongoDB deletes the document once expiresAt has passed.
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true },
);

export const Otp = model('Otp', otpSchema);
