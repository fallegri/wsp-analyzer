import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  conversationId: string;
  date: Date;
  participant: string;
  text: string;
  isSystem: boolean;
}

const MessageSchema = new Schema<IMessage>({
  conversationId: { type: String, ref: 'Conversation', required: true, index: true },
  date: { type: Date, required: true },
  participant: { type: String, required: true },
  text: { type: String, required: true },
  isSystem: { type: Boolean, default: false },
});

MessageSchema.index({ conversationId: 1, date: 1 });
MessageSchema.index({ conversationId: 1, participant: 1 });
MessageSchema.index({ conversationId: 1, text: 'text' });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
