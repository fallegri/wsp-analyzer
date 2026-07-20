import { ConversationData } from '../types';
import { POSITIVE_WORDS, NEGATIVE_WORDS } from './sentiment-service';
import { SPANISH_STOPWORDS, ENGLISH_STOPWORDS } from './wordcloud-service';

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

const ALL_STOPWORDS = new Set<string>();

for (const w of SPANISH_STOPWORDS) ALL_STOPWORDS.add(w);
for (const w of ENGLISH_STOPWORDS) ALL_STOPWORDS.add(w);

const EXTRA_STOPWORDS = ['que', 'por', 'para', 'con', 'del', 'las', 'los', 'mas', 'pero', 'esta', 'este', 'esto', 'como', 'todo', 'eso', 'esa', 'ese', 'hay', 'cada', 'entre', 'tiene', 'muy', 'puede', 'dice', 'sido', 'sino', 'vez', 'dos', 'tan', 'aqui', 'ahora', 'bien', 'despues', 'antes', 'entonces', 'donde', 'porque', 'solo', 'nunca', 'aun', 'tambien', 'aunque', 'hasta', 'siempre', 'cual', 'quien', 'nada', 'algo', 'otro', 'mismo', 'asi', 'aquel', 'aunq', 'sino', 'tipo', 'gran', 'buen', 'dia', 'hacer', 'hace', "d'", 'pa', 'q', 'x', 'k', 'd'];
for (const w of EXTRA_STOPWORDS) ALL_STOPWORDS.add(w);

function classifySentiment(text: string): 'positivo' | 'negativo' | 'neutral' {
  const words = text.toLowerCase().split(/\s+/);
  let pos = 0, neg = 0;
  for (const w of words) {
    const clean = w.replace(/[^a-záéíóúàâãêôõçüñ]/g, '');
    if (POSITIVE_WORDS.has(clean)) pos++;
    if (NEGATIVE_WORDS.has(clean)) neg++;
  }
  if (pos > neg) return 'positivo';
  if (neg > pos) return 'negativo';
  return 'neutral';
}

export function analyzeTopics(data: ConversationData): Topic[] {
  const messages = data.messages.filter(m => !m.isSystem && m.text.length > 10);
  if (messages.length < 5) return [];

  const N = messages.length;

  const termFreq: Record<string, number> = {};
  const docFreq: Record<string, number> = {};
  const msgTerms: Array<{ msg: typeof messages[0]; terms: Set<string> }> = [];

  for (const m of messages) {
    const clean = m.text.toLowerCase().replace(/[^a-záéíóúàâãêôõçüñ0-9\s]/g, ' ');
    const raw = clean.split(/\s+/).filter(w => w.length > 3);
    const words = raw.filter(w => !ALL_STOPWORDS.has(w) && !/^\d+$/.test(w));
    const unique = new Set(words);

    for (const w of words) {
      termFreq[w] = (termFreq[w] || 0) + 1;
    }
    for (const w of unique) {
      docFreq[w] = (docFreq[w] || 0) + 1;
    }
    msgTerms.push({ msg: m, terms: unique });
  }

  const scored = Object.entries(termFreq)
    .filter(([_, freq]) => freq >= 3)
    .map(([term, freq]) => {
      const df = docFreq[term] || 1;
      const tfidf = Math.log(1 + freq) * Math.log(N / df);
      return { term, freq, df, tfidf };
    })
    .sort((a, b) => b.tfidf - a.tfidf);

  const topTerms = scored.slice(0, 25).map(s => s.term);

  const clusters: Array<{ terms: Set<string>; messages: Set<typeof messages[0]> }> = [];

  for (const term of topTerms) {
    const termMsgs = new Set(
      msgTerms.filter(mt => mt.terms.has(term)).map(mt => mt.msg)
    );
    if (termMsgs.size < 2) continue;

    let bestIdx = -1;
    let bestOverlap = 0;

    for (let i = 0; i < clusters.length; i++) {
      let overlap = 0;
      for (const m of termMsgs) {
        if (clusters[i].messages.has(m)) overlap++;
      }
      if (overlap > bestOverlap && overlap >= Math.min(termMsgs.size, clusters[i].messages.size) * 0.3) {
        bestOverlap = overlap;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0) {
      for (const m of termMsgs) clusters[bestIdx].messages.add(m);
      clusters[bestIdx].terms.add(term);
    } else {
      clusters.push({ terms: new Set([term]), messages: termMsgs });
    }
  }

  const validClusters = clusters.filter(c => c.messages.size >= 3);

  return validClusters.map(cluster => {
    const clusterMsgs = [...cluster.messages];
    const sortedTerms = [...cluster.terms]
      .map(t => ({ term: t, freq: termFreq[t] }))
      .sort((a, b) => b.freq - a.freq);

    const name = sortedTerms.slice(0, 3).map(t => t.term.charAt(0).toUpperCase() + t.term.slice(1)).join(' / ');

    const keywords = sortedTerms.map(t => t.term);

    const sortedMsgs = [...clusterMsgs].sort((a, b) => b.date.getTime() - a.date.getTime());
    const topicMessages = sortedMsgs.slice(0, 30).map(m => ({
      date: m.date.toISOString(),
      participant: m.participant,
      text: m.text.slice(0, 200),
    }));

    const sentiments = clusterMsgs.map(m => classifySentiment(m.text));
    const posCount = sentiments.filter(s => s === 'positivo').length;
    const negCount = sentiments.filter(s => s === 'negativo').length;
    const total = sentiments.length;
    const dominant = posCount > negCount ? 'positivo' : negCount > posCount ? 'negativo' : 'neutral';
    const pct = Math.round(Math.max(posCount, negCount) / total * 100);

    return {
      name,
      keywords,
      messageCount: clusterMsgs.length,
      messages: topicMessages,
      sentiment: `${dominant} (${pct}%)`,
    };
  }).sort((a, b) => b.messageCount - a.messageCount);
}
