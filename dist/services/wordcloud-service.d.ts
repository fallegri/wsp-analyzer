import { ConversationData, WordCloudEntry } from '../types';
export declare const SPANISH_STOPWORDS: Set<string>;
export declare const ENGLISH_STOPWORDS: Set<string>;
export declare function generateWordCloud(data: ConversationData, limit?: number): WordCloudEntry[];
