import { ConversationData } from '../types';
export declare const ConversationStore: {
    set(id: string, data: ConversationData, metadata?: {
        userId: string;
        fileHash: string;
    }): Promise<void>;
    get(id: string): Promise<ConversationData | undefined>;
    getConversationsByUser(userId: string): Promise<Array<{
        id: string;
        fileName: string;
        messageCount: number;
        participantCount: number;
        dateRange: string;
        createdAt: Date;
    }>>;
    delete(id: string): Promise<boolean>;
    has(id: string): Promise<boolean>;
    cleanup(): void;
};
