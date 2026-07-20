"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationStore = void 0;
const mongodb_1 = require("../lib/mongodb");
const Conversation_1 = require("../models/Conversation");
const Message_1 = require("../models/Message");
exports.ConversationStore = {
    async set(id, data, metadata) {
        await (0, mongodb_1.connectDB)();
        const conv = new Conversation_1.Conversation({
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
            await Message_1.Message.insertMany(msgDocs, { ordered: false });
        }
    },
    async get(id) {
        await (0, mongodb_1.connectDB)();
        const conv = await Conversation_1.Conversation.findById(id);
        if (!conv)
            return undefined;
        const messages = await Message_1.Message.find({ conversationId: id })
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
    async getConversationsByUser(userId) {
        await (0, mongodb_1.connectDB)();
        const convs = await Conversation_1.Conversation.find({ userId })
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
    async delete(id) {
        await (0, mongodb_1.connectDB)();
        await Message_1.Message.deleteMany({ conversationId: id });
        const result = await Conversation_1.Conversation.deleteOne({ _id: id });
        return result.deletedCount > 0;
    },
    async has(id) {
        await (0, mongodb_1.connectDB)();
        const count = await Conversation_1.Conversation.countDocuments({ _id: id });
        return count > 0;
    },
    cleanup() {
        // No-op: MongoDB handles TTL through indexes
    },
};
