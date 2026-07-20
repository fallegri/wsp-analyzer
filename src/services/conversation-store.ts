import { ConversationData } from '../types';
import { connectDB } from '../lib/mongodb';
import { Conversation } from '../models/Conversation';
import { Message as MessageModel, IMessage } from '../models/Message';
import { User } from '../models/User';

export const ConversationStore = {
  async set(id: string, data: ConversationData, metadata?: { userId: string; fileHash: string }): Promise<void> {
    await connectDB();
    const conv = new Conversation({
      _id: id,
      userId: metadata?.userId || 'unknown',
      fileName: data.fileName,
      fileHash: metadata?.fileHash || '',
      participants: data.participants,
      participantCount: data.participants.length,
      messageCount: data.messages.length,
      startDate: data.startDate,
      endDate: data.endDate,
    });
    await conv.save();

    const msgDocs = data.messages.map(m => ({
      conversationId: id,
      date: m.date,
      participant: m.participant,
      text: m.text,
      isSystem: m.isSystem,
    }));

    if (msgDocs.length > 0) {
      await MessageModel.insertMany(msgDocs, { ordered: false });
    }
  },

  async get(id: string): Promise<ConversationData | undefined> {
    await connectDB();
    const conv = await Conversation.findById(id);
    if (!conv) return undefined;

    const messages = await MessageModel.find({ conversationId: id })
      .sort({ date: 1 })
      .lean();

    return {
      id: conv._id.toString(),
      fileName: conv.fileName,
      messages: messages.map(m => ({
        id: m._id.toString(),
        date: m.date,
        rawDate: m.date.toISOString(),
        participant: m.participant,
        text: m.text,
        isSystem: m.isSystem,
      })),
      participants: conv.participants,
      startDate: conv.startDate,
      endDate: conv.endDate,
      uploadedAt: conv.createdAt,
    };
  },

  async getConversationsByUser(userId: string): Promise<Array<{
    id: string;
    fileName: string;
    messageCount: number;
    participantCount: number;
    dateRange: string;
    createdAt: Date;
  }>> {
    await connectDB();
    const convs = await Conversation.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
    return convs.map(c => ({
      id: c._id.toString(),
      fileName: c.fileName,
      messageCount: c.messageCount,
      participantCount: c.participantCount,
      dateRange: c.startDate && c.endDate
        ? `${c.startDate.toISOString().split('T')[0]} - ${c.endDate.toISOString().split('T')[0]}`
        : '',
      createdAt: c.createdAt,
    }));
  },

  async delete(id: string): Promise<boolean> {
    await connectDB();
    await MessageModel.deleteMany({ conversationId: id });
    const result = await Conversation.deleteOne({ _id: id });
    return result.deletedCount > 0;
  },

  async has(id: string): Promise<boolean> {
    await connectDB();
    const count = await Conversation.countDocuments({ _id: id });
    return count > 0;
  },

  cleanup(): void {
    // No-op: MongoDB handles TTL through indexes
  },
};
