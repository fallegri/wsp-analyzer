import { ConversationData } from '../types';
export declare function exportToJson(data: ConversationData): string;
export declare function exportToCsv(data: ConversationData): string;
export declare function exportToExcel(data: ConversationData): Promise<Buffer>;
