import mongoose, { Schema } from 'mongoose';

// A transcript line that ONE user chose to keep (personal, like Coursera notes).
const noteSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    roomId: { type: String, required: true },
    lineId: { type: String, required: true }, // _id of the transcript line inside the meeting
    speaker: String,
    text: { type: String, required: true, maxlength: 600 },
    at: Date, // when the line was spoken
    comment: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true }
);

// one note per user per line, so double clicks never create duplicates
noteSchema.index({ user: 1, roomId: 1, lineId: 1 }, { unique: true });

export const Note = mongoose.model('Note', noteSchema);
