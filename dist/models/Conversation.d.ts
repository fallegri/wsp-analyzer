import mongoose, { Document } from 'mongoose';
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
export declare const Conversation: mongoose.Model<IConversation, {}, {}, {}, mongoose.Document<unknown, {}, IConversation, {}, mongoose.DefaultSchemaOptions> & IConversation & Required<{
    _id: string;
}> & {
    __v: number;
} & {
    id: string;
}, any, IConversation>;
