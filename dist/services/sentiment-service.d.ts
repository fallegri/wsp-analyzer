import { ConversationData, SentimentResult } from '../types';
export declare const POSITIVE_WORDS: Set<string>;
export declare const NEGATIVE_WORDS: Set<string>;
export declare function analyzeSentiment(data: ConversationData): SentimentResult;
export declare function getMessagesBySentiment(data: ConversationData, type: 'positive' | 'negative' | 'neutral'): {
    date: string;
    participant: string;
    text: string;
}[];
export declare function getFullSentimentAnalysis(data: ConversationData): {
    date: string;
    participant: string;
    text: string;
    sentiment: "negative" | "neutral" | "positive";
}[];
