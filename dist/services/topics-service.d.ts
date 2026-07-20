import { ConversationData } from '../types';
interface Topic {
    name: string;
    keywords: string[];
    messageCount: number;
    messages: Array<{
        date: string;
        participant: string;
        text: string;
    }>;
    sentiment: string;
}
export declare function analyzeTopics(data: ConversationData): Topic[];
export {};
