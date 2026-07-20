import { ConversationData, SearchResult } from '../types';
interface SearchOptions {
    q?: string;
    participant?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
}
export declare function searchMessages(data: ConversationData, options: SearchOptions): SearchResult;
export {};
