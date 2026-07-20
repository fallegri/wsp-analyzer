export interface Message {
    id: string;
    date: Date;
    rawDate: string;
    participant: string;
    text: string;
    isSystem: boolean;
}
export interface ConversationData {
    id: string;
    fileName: string;
    messages: Message[];
    participants: string[];
    startDate: Date;
    endDate: Date;
    uploadedAt: Date;
}
export interface ParticipantStats {
    participant: string;
    messageCount: number;
    wordCount: number;
    charCount: number;
    avgMessageLength: number;
    firstMessage: Date;
    lastMessage: Date;
    messagesByHour: Record<string, number>;
    messagesByDay: Record<string, number>;
    sentimentScore: number;
}
export interface GeneralStats {
    totalMessages: number;
    totalParticipants: number;
    startDate: string;
    endDate: string;
    durationDays: number;
    messagesByHour: Record<string, number>;
    messagesByDay: Record<string, number>;
    messagesByDate: Record<string, number>;
    totalWords: number;
    avgMessageLength: number;
    busiestHour: number;
    busiestDay: string;
}
export interface SentimentResult {
    overall: {
        positive: number;
        negative: number;
        neutral: number;
        score: number;
    };
    perParticipant: Record<string, {
        positive: number;
        negative: number;
        neutral: number;
        score: number;
        totalMessages: number;
    }>;
    timeline: Array<{
        date: string;
        positive: number;
        negative: number;
        neutral: number;
    }>;
}
export interface WordCloudEntry {
    word: string;
    count: number;
}
export interface SearchResult {
    results: Message[];
    total: number;
    page: number;
    totalPages: number;
}
