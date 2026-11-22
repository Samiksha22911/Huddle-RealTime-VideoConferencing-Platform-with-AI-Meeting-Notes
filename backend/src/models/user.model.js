import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Accounts created with Google have no password
    passwordHash: { type: String, required() { return !this.googleId; } },
    googleId: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
