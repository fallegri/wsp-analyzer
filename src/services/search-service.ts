import { ConversationData, SearchResult, Message } from '../types';

interface SearchOptions {
  q?: string;
  participant?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export function searchMessages(data: ConversationData, options: SearchOptions): SearchResult {
  let results: Message[] = data.messages.filter(m => !m.isSystem);

  if (options.q) {
    const query = options.q.toLowerCase();
    results = results.filter(m => m.text.toLowerCase().includes(query));
  }

  if (options.participant) {
    results = results.filter(m => m.participant.toLowerCase() === options.participant!.toLowerCase());
  }

  if (options.fromDate) {
    const from = new Date(options.fromDate);
    results = results.filter(m => m.date >= from);
  }

  if (options.toDate) {
    const to = new Date(options.toDate);
    to.setHours(23, 59, 59, 999);
    results = results.filter(m => m.date <= to);
  }

  const total = results.length;
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paged = results.slice(start, start + limit);

  return { results: paged, total, page, totalPages };
}
