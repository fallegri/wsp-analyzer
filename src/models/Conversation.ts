import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document<string> {
  userId: mongoose.Types.ObjectId;
  fileName: string;
  fileHash: string;
  participants: string[];
  participantCount: number;
  messageCount: number;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
}

const ConversationSchema = new Schema<IConversation>({
  _id: { type: String },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  fileName: { type: String, required: true },
  fileHash: { type: String, required: true },
  participants: [{ type: String }],
  participantCount: { type: Number, default: 0 },
  messageCount: { type: Number, default: 0 },
  startDate: { type: Date },
  endDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

ConversationSchema.index({ userId: 1, createdAt: -1 });

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
