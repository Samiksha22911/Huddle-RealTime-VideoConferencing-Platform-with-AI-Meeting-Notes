import mongoose, { Schema } from 'mongoose';

const meetingSchema = new Schema(
  {
    roomId: { type: String, required: true, unique: true },
    title: { type: String, default: 'Untitled meeting', trim: true, maxlength: 80 },
    host: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    hostName: { type: String, required: true },
    waitingRoom: { type: Boolean, default: false },
    attendeeIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    participantNames: [String],
    chat: [{ _id: false, sender: String, text: String, at: { type: Date, default: Date.now } }],
    transcript: [{ _id: false, speaker: String, text: String, at: { type: Date, default: Date.now } }],
    summary: {
      text: String,
      keyPoints: [String],
      decisions: [String],
      actionItems: [{ _id: false, task: String, owner: String }],
      source: { type: String, enum: ['ai', 'basic'] },
      generatedAt: Date,
    },
    endedAt: Date,
  },
  { timestamps: true }
);

meetingSchema.index({ attendeeIds: 1 });

export const Meeting = mongoose.model('Meeting', meetingSchema);
