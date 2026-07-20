import mongoose, { Document } from 'mongoose';
export interface IMessage extends Document {
    conversationId: string;
    date: Date;
    participant: string;
    text: string;
    isSystem: boolean;
}
export declare const Message: mongoose.Model<IMessage, {}, {}, {}, mongoose.Document<unknown, {}, IMessage, {}, mongoose.DefaultSchemaOptions> & IMessage & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IMessage>;
